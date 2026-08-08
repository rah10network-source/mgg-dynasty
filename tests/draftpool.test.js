// ─── Draft pool + FA-vet gate unit tests ─────────────────────────────────────
import { describe, it, expect } from "vitest";
import { filterDraftPool, isDraftableVet, isActivePlayer, buildSnakeOrder } from "../src/draft";

const mk = (over = {}) => ({
  position: "WR", full_name: "Test Player", first_name: "Test", last_name: "Player",
  team: "KC", years_exp: 3, status: "Active", active: true,
  birth_date: "1999-01-01", depth_chart_order: 2, injury_status: null, college: "Test U",
  ...over,
});

const db = {
  rookie1:      mk({ full_name: "Rook One",   years_exp: 0, team: null,  status: "Active" }),
  rookie2:      mk({ full_name: "Rook Two",   years_exp: 0, team: "DAL" }),
  rookieTaken:  mk({ full_name: "Rook Taken", years_exp: 0, team: "SF" }),
  faVet:        mk({ full_name: "FA Vet",     years_exp: 6, team: null,  status: "Inactive", birth_date: "1996-01-01" }),
  faVetOld:     mk({ full_name: "Old FA Vet", years_exp: 18, team: null, status: "Inactive", birth_date: "1984-01-01" }),
  retiredVet:   mk({ full_name: "Retired Guy", years_exp: 8, team: null, status: "Retired" }),
  outOfLeague:  mk({ full_name: "Gone Guy",   years_exp: 5, team: null,  status: "Inactive", active: false }),
  signedVet:    mk({ full_name: "Signed Vet", years_exp: 5, team: "BUF" }),
  rosteredVet:  mk({ full_name: "Rostered Vet", years_exp: 4, team: "MIA" }),
  kicker:       mk({ full_name: "Leg Man", position: "K", years_exp: 2, team: "NYJ" }),
  longSnapper:  mk({ full_name: "Snap Guy", position: "LS", years_exp: 2, team: "NYJ" }),
};

const rostered = new Set(["rosteredVet", "rookieTaken"]);

describe("isDraftableVet (FA-vet gate)", () => {
  it("keeps an unsigned FA vet that isActivePlayer would drop", () => {
    expect(isActivePlayer(db.faVet)).toBe(false);      // the old bug
    expect(isDraftableVet(db.faVet)).toBe(true);        // the fix
  });
  it("still excludes retired / out-of-league / ancient players", () => {
    expect(isDraftableVet(db.retiredVet)).toBe(false);
    expect(isDraftableVet(db.outOfLeague)).toBe(false);
    expect(isDraftableVet(db.faVetOld)).toBe(false);
  });
  it("keeps signed vets and applies normal status gate to them", () => {
    expect(isDraftableVet(db.signedVet)).toBe(true);
    expect(isDraftableVet(mk({ team: "KC", status: "Retired" }))).toBe(false);
  });
});

describe("filterDraftPool modes", () => {
  const names = (pool) => pool.map(p => p.name).sort();

  it("rookies mode: only rookies, rostered rookies excluded", () => {
    const pool = filterDraftPool(db, { mode: "rookies", rosteredPids: rostered });
    expect(names(pool)).toEqual(["Rook One", "Rook Two"]);
  });

  it("vets mode: FA + signed vets, no rookies, no rostered, no retired", () => {
    const pool = filterDraftPool(db, { mode: "vets", rosteredPids: rostered });
    expect(names(pool)).toEqual(["FA Vet", "Leg Man", "Signed Vet"]);
  });

  it("all mode: rookies + vets together, rostered still excluded", () => {
    const pool = filterDraftPool(db, { mode: "all", rosteredPids: rostered });
    expect(names(pool)).toEqual(["FA Vet", "Leg Man", "Rook One", "Rook Two", "Signed Vet"]);
  });

  it("rostered players are excluded in EVERY mode (draft-day correctness)", () => {
    for (const mode of ["rookies", "vets", "all"]) {
      const pool = filterDraftPool(db, { mode, rosteredPids: rostered });
      expect(pool.find(p => p.name === "Rostered Vet")).toBeUndefined();
      expect(pool.find(p => p.name === "Rook Taken")).toBeUndefined();
    }
  });

  it("invalid positions and excludePids are dropped", () => {
    const pool = filterDraftPool(db, { mode: "all", rosteredPids: rostered, excludePids: new Set(["signedVet"]) });
    expect(pool.find(p => p.name === "Snap Guy")).toBeUndefined();
    expect(pool.find(p => p.name === "Signed Vet")).toBeUndefined();
  });
});

describe("buildSnakeOrder sanity", () => {
  it("10 teams x 10 rounds = 100 picks, round 2 reversed", () => {
    const order = buildSnakeOrder(10, 10);
    expect(order.length).toBe(100);
    expect(order[0].slot).toBe(1);
    expect(order[10].slot).toBe(10);   // first pick of round 2
    expect(order[order.length - 1].pick).toBe(100);
  });
});

describe("prospect estimates on DV scale (v1.3.10)", async () => {
  const { scoreDraftPlayer } = await import("../src/draft");
  it("young depth-1 rookie estimates in the DV hundreds, not <100", () => {
    const s = scoreDraftPlayer({ pid:"x", age:21, depth:1, yrsExp:0 }, [], [], "BPA");
    expect(s).toBeGreaterThan(500);
    expect(s).toBeLessThanOrEqual(950);
  });
  it("Big Board rank always outranks any estimate", () => {
    const board = Array.from({length:60},(_,i)=>({pid:`b${i}`}));
    const lastBoard = scoreDraftPlayer({ pid:"b59" }, board, [], "BPA");
    const bestEst   = scoreDraftPlayer({ pid:"z", age:21, depth:1, yrsExp:0 }, board, [], "BPA");
    expect(lastBoard).toBeGreaterThan(bestEst);
  });
  it("rostered players score by dynastyValue on the same scale", () => {
    const s = scoreDraftPlayer({ pid:"r1" }, [], [{ pid:"r1", dynastyValue: 640, score: 55 }], "BPA");
    expect(s).toBe(640);
  });
});
