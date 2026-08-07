// ─── Trade verdict + pick-scale unit tests (v1.3.9) ──────────────────────────
import { describe, it, expect } from "vitest";
import { tradeVerdict, pickValue, itemScore } from "../src/trade";
import { PICK_VALUES, PICK_ROUNDS } from "../src/constants";

const player = (dv) => ({ dynastyValue: dv });
const pick   = (round, off = 0) => ({ type: "pick", score: pickValue(round, off) });

describe("pick values on DV scale", () => {
  it("covers all 10 rounds with 3-year decay", () => {
    expect(PICK_ROUNDS.length).toBe(10);
    PICK_ROUNDS.forEach(r => {
      const v = PICK_VALUES[r];
      expect(v.length).toBe(3);
      expect(v[0]).toBeGreaterThan(v[1]);
      expect(v[1]).toBeGreaterThan(v[2]);
    });
  });
  it("a current 1st is worth roughly a mid Starter-tier player (not 72)", () => {
    expect(pickValue("1st", 0)).toBeGreaterThanOrEqual(400);
    expect(pickValue("1st", 0)).toBeLessThanOrEqual(700);
  });
  it("rounds strictly decrease in value", () => {
    for (let i = 1; i < PICK_ROUNDS.length; i++) {
      expect(PICK_VALUES[PICK_ROUNDS[i]][0]).toBeLessThan(PICK_VALUES[PICK_ROUNDS[i-1]][0]);
    }
  });
});

describe("tradeVerdict percentage thresholds", () => {
  it("1st-round pick vs a ~550 DV player is FAIR (the old bug read LOPSIDED)", () => {
    const v = tradeVerdict([pick("1st")], [player(550)]);
    expect(v.label).toBe("FAIR TRADE");
  });
  it("elite player for a 3rd is lopsided", () => {
    const v = tradeVerdict([player(900)], [pick("3rd")]);
    expect(v.label).toBe("LOPSIDED LOSS");
  });
  it("scale-invariant: same ratio gives same verdict at any magnitude", () => {
    const small = tradeVerdict([player(100)], [player(110)]);
    const large = tradeVerdict([player(500)], [player(550)]);
    expect(small.label).toBe(large.label);
  });
  it("customVal still overrides", () => {
    expect(itemScore({ customVal: 42, dynastyValue: 900 })).toBe(42);
  });
});
