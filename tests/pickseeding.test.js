// ─── Pick-seeding integration test (live Sleeper API) ────────────────────────
// Verifies the C2 fix: with the league in pre_draft, the CURRENT season's
// picks must be seeded and current-season traded picks applied.
import { describe, it, expect } from "vitest";
import { LEAGUE_ID, SLEEPER } from "../src/constants";

// Reimplements loadData's pick-reconstruction block verbatim (loadData itself
// also pulls 18 weeks of stats — too slow for a test). Logic mirrored from
// src/api.js lines 81-155; if api.js changes, update here.
async function reconstructPicks() {
  const sf = async (p) => (await fetch(`${SLEEPER}${p}`)).json();
  const lg      = await sf(`/league/${LEAGUE_ID}`);
  const users   = await sf(`/league/${LEAGUE_ID}/users`);
  const rosters = await sf(`/league/${LEAGUE_ID}/rosters`);

  const userMap = {};
  users.forEach(u => { userMap[u.user_id] = u.metadata?.team_name || u.display_name || u.username; });
  const rosterIdToOwner = {};
  rosters.forEach(r => { rosterIdToOwner[r.roster_id] = userMap[r.owner_id] || r.owner_id; });

  const draftPicksByOwner = {};
  const draftRounds   = lg.settings?.draft_rounds || lg.settings?.rounds || 5;
  const currentSeason = Number(lg.season || new Date().getFullYear());
  const currentDraftPending = ["pre_draft", "drafting"].includes(lg.status);
  const futureSeasons = [
    ...(currentDraftPending ? [currentSeason] : []),
    currentSeason + 1, currentSeason + 2, currentSeason + 3,
  ];

  rosters.forEach(r => {
    const name = userMap[r.owner_id] || r.owner_id;
    if (!draftPicksByOwner[name]) draftPicksByOwner[name] = [];
    futureSeasons.forEach(season => {
      for (let round = 1; round <= draftRounds; round++) {
        draftPicksByOwner[name].push({
          season: String(season), round,
          rosterId: r.roster_id, ownerRosterId: r.roster_id, isTraded: false,
        });
      }
    });
  });

  const tradedPicks = await sf(`/league/${LEAGUE_ID}/traded_picks`);
  tradedPicks.forEach(tp => {
    const season = String(tp.season);
    const round  = tp.round;
    if (Number(season) < currentSeason) return;
    if (Number(season) === currentSeason && !currentDraftPending) return;
    const origId = tp.roster_id, newId = tp.owner_id;
    for (const holderName of Object.keys(draftPicksByOwner)) {
      const idx = draftPicksByOwner[holderName].findIndex(
        p => String(p.season) === season && p.round === round && p.rosterId === origId);
      if (idx !== -1) { draftPicksByOwner[holderName].splice(idx, 1); break; }
    }
    const newOwnerName = rosterIdToOwner[newId];
    if (newOwnerName) {
      if (!draftPicksByOwner[newOwnerName]) draftPicksByOwner[newOwnerName] = [];
      const already = draftPicksByOwner[newOwnerName].some(
        p => String(p.season) === season && p.round === round && p.rosterId === origId);
      if (!already) draftPicksByOwner[newOwnerName].push({
        season, round, rosterId: origId, ownerRosterId: newId, isTraded: origId !== newId,
      });
    }
  });

  return { lg, rosters, draftPicksByOwner, currentSeason, draftRounds, tradedPicks, currentDraftPending };
}

describe("C2 fix: current-season pick seeding (live Sleeper)", () => {
  it("seeds 2026 picks when league is pre_draft, conserving total pick count", async () => {
    const { lg, rosters, draftPicksByOwner, currentSeason, draftRounds, tradedPicks, currentDraftPending } =
      await reconstructPicks();

    // Sanity: this is the league we think it is, in the state we think it's in
    expect(String(LEAGUE_ID)).toBe("1315875703715016704");
    expect(currentSeason).toBe(2026);
    expect(lg.status).toBe("pre_draft");
    expect(currentDraftPending).toBe(true);

    const all = Object.values(draftPicksByOwner).flat();
    const cur = all.filter(p => Number(p.season) === currentSeason);

    // THE regression this fix kills: 2026 picks must exist
    expect(cur.length).toBe(rosters.length * draftRounds);

    // Conservation: no pick duplicated or lost across all seeded seasons
    const seasons = 4; // current + 3 future
    expect(all.length).toBe(rosters.length * draftRounds * seasons);
    const keys = new Set(all.map(p => `${p.season}-${p.round}-${p.rosterId}`));
    expect(keys.size).toBe(all.length);

    // Every current-season traded pick is reflected: its current holder is
    // the trade's owner_id, not the original team
    const curTrades = tradedPicks.filter(tp => Number(tp.season) === currentSeason);
    for (const tp of curTrades) {
      const holder = cur.find(p => p.round === tp.round && p.rosterId === tp.roster_id);
      expect(holder, `2026 R${tp.round} orig roster ${tp.roster_id} missing`).toBeTruthy();
      expect(holder.ownerRosterId).toBe(tp.owner_id);
    }
    // eslint-disable-next-line no-console
    console.log(`2026 picks: ${cur.length} · traded 2026 picks applied: ${curTrades.length} · owners: ${Object.keys(draftPicksByOwner).length}`);
  }, 30000);
});
