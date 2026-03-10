// ─── ROSTER LOGIC ─────────────────────────────────────────────────────────────
// Single source of truth for all roster evaluation logic.
// Pure functions — no React, no fetch.
//
// Consumers:
//   Roster.jsx     — gradeRoster (was defined here, now imported)
//   TeamHub.jsx    — gradeRoster, isSellHigh, ownerGrades
//   Dashboard.jsx  — gradeRoster, isSellHigh, weakPositions
//   LeagueHub.jsx  — gradeRoster for league-wide standings
//
// KEY FIX: isSellHigh was duplicated with DIFFERENT thresholds:
//   Dashboard.jsx → dynastyValue >= 250
//   TeamHub.jsx   → dynastyValue >= 280
// Canonical threshold is now dynastyValue >= top 35% of owner's roster (relative),
// with a minimum absolute floor of 45 to catch value regardless of roster depth.

import { PRIME, POS_ORDER } from "./constants";

// ─── GRADE ROSTER ─────────────────────────────────────────────────────────────
// Takes an owner name and full player list.
// Returns a rich grade object used across Roster, TeamHub, Dashboard, and LeagueHub.

export function gradeRoster(owner, players) {
  const roster = players.filter(p => p.owner === owner);
  if (!roster.length) return null;

  const scores     = roster.map(p => p.dynastyValue).sort((a, b) => b - a);
  const avgScore   = scores.reduce((a, b) => a + b, 0) / scores.length;
  const topScore   = scores[0] || 0;
  const eliteCount = roster.filter(p => p.tier === "Elite").length;
  const starterCnt = roster.filter(p => p.tier === "Starter").length;
  const avgAge     = roster.reduce((s, p) => s + (p.age || 0), 0) / roster.length;
  const cliffCnt   = roster.filter(p => p.situationFlag === "AGE_CLIFF").length;
  const injCnt     = roster.filter(p => p.injStatus &&
    ["Out", "IR", "PUP", "Doubtful", "Questionable"].includes(p.injStatus)).length;

  // Positional depth map — avg score + count per position
  const posDep = {};
  POS_ORDER.forEach(pos => {
    const atPos = roster.filter(p => p.pos === pos);
    posDep[pos] = {
      count: atPos.length,
      avg:   atPos.length ? atPos.reduce((s, p) => s + p.dynastyValue, 0) / atPos.length : 0,
      top:   atPos[0]?.dynastyValue || 0,
    };
  });

  const contenderScore = Math.round(
    topScore   * 0.25 +
    avgScore   * 0.30 +
    eliteCount * 8    +
    starterCnt * 3    -
    cliffCnt   * 5    -
    injCnt     * 2
  );

  const window =
    avgAge < 25  ? "REBUILD"
  : avgAge < 27  ? "RISING"
  : avgAge < 29  ? "CONTEND"
  : avgAge < 31  ? "WIN NOW"
  : avgAge < 33  ? "DECLINING"
  : "AGEING OUT";

  const windowColor = {
    "REBUILD":    "#60a5fa",
    "RISING":     "#a855f7",
    "CONTEND":    "#22c55e",
    "WIN NOW":    "#f59e0b",
    "DECLINING":  "#ef4444",
    "AGEING OUT": "#6b7280",
  }[window];

  const grade =
    contenderScore >= 110 ? "A+"
  : contenderScore >= 95  ? "A"
  : contenderScore >= 80  ? "B+"
  : contenderScore >= 65  ? "B"
  : contenderScore >= 50  ? "C+"
  : contenderScore >= 35  ? "C"
  : contenderScore >= 20  ? "D"
  : "F";

  const gradeColor =
    grade.startsWith("A") ? "#22c55e"
  : grade.startsWith("B") ? "#60a5fa"
  : grade.startsWith("C") ? "#f59e0b"
  : "#ef4444";

  return {
    owner, roster, scores, avgScore, topScore,
    eliteCount, starterCnt, avgAge, cliffCnt, injCnt,
    posDep, contenderScore, window, windowColor, grade, gradeColor,
  };
}

// ─── IS SELL HIGH ─────────────────────────────────────────────────────────────
// Canonical sell-high check — single definition used by ALL consumers.
// Triggers if:
//   (a) Intel Scan returned a SELL signal for this player, OR
//   (b) Player is in the top 35% of the owner's roster by score AND
//       is at or past their position's peak age
//
// The relative threshold (top 35%) fixes the previous bug where an absolute
// score cutoff of 55-60 silently returned zero candidates after market value
// reweighted the scoring distribution.

export function isSellHigh(p, newsMap, ownerRoster = []) {
  // Always trust an explicit SELL signal from Intel Scan
  if (newsMap?.[p.name]?.signal === "SELL") return true;

  const [, peak, cliff] = PRIME[p.pos] || [23, 29, 33];
  const isAgePastPeak   = (p.age ?? 0) >= peak && (p.age ?? 0) < cliff + 2;
  if (!isAgePastPeak) return false;

  // Relative threshold — top 35% of the owner's roster or absolute floor of 45
  if (ownerRoster.length > 0) {
    const sorted    = [...ownerRoster].sort((a, b) => b.dynastyValue - a.dynastyValue);
    const cutoffIdx = Math.ceil(sorted.length * 0.35) - 1;
    const threshold = Math.max(sorted[cutoffIdx]?.dynastyValue ?? 200, 200);
    return p.dynastyValue >= threshold;
  }

  // No roster context — use absolute floor
  return p.dynastyValue >= 200;
}

// ─── LEAGUE AVERAGE BY POSITION ───────────────────────────────────────────────
// Used by Dashboard and TeamHub to show positional strength vs league.

export function leagueAvgByPos(players) {
  const result = {};
  POS_ORDER.forEach(pos => {
    const atPos = players.filter(p => p.pos === pos);
    result[pos] = atPos.length ? atPos.reduce((s, p) => s + p.dynastyValue, 0) / atPos.length : 0;
  });
  return result;
}

// ─── WEAK POSITIONS ───────────────────────────────────────────────────────────
// Returns the owner's weakest positions relative to league average.
// Sorted ascending by gap — worst first.

export function weakPositions(myGrade, players, topN = 4) {
  const leagueAvg = leagueAvgByPos(players);
  return POS_ORDER
    .filter(pos => (myGrade.posDep[pos]?.count ?? 0) > 0 || leagueAvg[pos] > 0)
    .map(pos => ({
      pos,
      mine:   myGrade.posDep[pos]?.avg || 0,
      league: leagueAvg[pos],
      gap:    (myGrade.posDep[pos]?.avg || 0) - leagueAvg[pos],
    }))
    .sort((a, b) => a.gap - b.gap)
    .slice(0, topN);
}

// ─── SELL HIGH CANDIDATES ─────────────────────────────────────────────────────
// Returns sorted list of sell-high candidates for a roster.
// Used by TeamHub SellHigh component and Dashboard sell-high strip.

export function sellHighCandidates(roster, newsMap) {
  return roster
    .filter(p => isSellHigh(p, newsMap, roster))
    .sort((a, b) => {
      // Explicit SELL signals first, then by score descending
      const aS = newsMap?.[a.name]?.signal === "SELL" ? 1000 : 0;
      const bS = newsMap?.[b.name]?.signal === "SELL" ? 1000 : 0;
      return (bS + b.dynastyValue) - (aS + a.dynastyValue);
    });
}

// ─── TRADE TARGETS ────────────────────────────────────────────────────────────
// Returns suggested trade targets based on the owner's weakest positions.
// Filters out the owner's own players and surfaces high-value candidates
// at positions of need. Used by TeamHub and Dashboard.

export function tradeTargets(currentOwner, myGrade, players, newsMap, topN = 8) {
  const weak = new Set(weakPositions(myGrade, players, 3).map(w => w.pos));
  return players
    .filter(p =>
      p.owner !== currentOwner &&
      p.dynastyValue >= 250 &&
      weak.has(p.pos)
    )
    .map(p => ({
      ...p,
      _priority:
        (weak.has(p.pos)                         ? 20 : 0) +
        (newsMap?.[p.name]?.signal === "BUY"     ? 15 : 0) +
        p.dynastyValue,
    }))
    .sort((a, b) => b._priority - a._priority)
    .slice(0, topN);
}
