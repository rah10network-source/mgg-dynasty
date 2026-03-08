import { PRIME, SCARCITY, SCORING, SITUATION_FLAGS, SITUATION_PATTERNS } from "./constants";

// ─── AGE ──────────────────────────────────────────────────────────────────────
export const calcAge = (bd) => {
  if (!bd) return null;
  const today = new Date(2026, 2, 6);
  const b = new Date(typeof bd === "number" ? bd * 1000 : bd);
  if (isNaN(b.getTime())) return null;
  return +((today - b) / (365.25 * 86400000)).toFixed(1);
};

export const ageScore = (age, pos) => {
  if (!age) return 45;
  const [rise, peak, cliff] = PRIME[pos] || [23, 29, 33];
  if (age < 21)     return 60;
  if (age <= rise)  return 70 + (age - 21) / (rise - 21) * 15;
  if (age <= peak)  return 85 + (age - rise) / (peak - rise) * 15;
  if (age <= cliff) return Math.max(100 - (age - peak) / (cliff - peak) * 60, 40);
  return Math.max(40 - (age - cliff) * 8, 0);
};

// ─── NORMALISATION ────────────────────────────────────────────────────────────
export const normalise = (arr, key) => {
  const vals = arr.map(x => x[key] ?? 0);
  const mn = Math.min(...vals), mx = Math.max(...vals);
  return arr.map(x => ({
    ...x,
    [`${key}_n`]: mx > mn ? ((x[key] ?? 0) - mn) / (mx - mn) * 100 : 50,
  }));
};

// ─── FANTASY POINTS ───────────────────────────────────────────────────────────
export const calcSleeperPts = (s) => {
  if (!s) return 0;
  return (
    // Offense
    (s.pass_yd  || 0) * SCORING.pass_yd  +
    (s.pass_td  || 0) * SCORING.pass_td  +
    (s.pass_int || 0) * SCORING.pass_int +
    (s.rush_yd  || 0) * SCORING.rush_yd  +
    (s.rush_td  || 0) * SCORING.rush_td  +
    (s.rec      || 0) * SCORING.rec      +
    (s.rec_yd   || 0) * SCORING.rec_yd   +
    (s.rec_td   || 0) * SCORING.rec_td   +
    // IDP — all fields now tracked
    (s.def_sack             || 0) * SCORING.def_sack             +
    (s.def_tackle_solo      || 0) * SCORING.def_tackle_solo      +
    (s.def_tackle_ast       || 0) * SCORING.def_tackle_ast       +
    (s.def_tackle_for_loss  || 0) * SCORING.def_tackle_for_loss  +
    (s.def_qb_hit           || 0) * SCORING.def_qb_hit           +
    (s.def_pass_def         || 0) * SCORING.def_pass_def         +
    (s.def_int              || 0) * SCORING.def_int              +
    (s.def_forced_fumble    || 0) * SCORING.def_forced_fumble    +
    (s.def_fumble_rec       || 0) * SCORING.def_fumble_rec       +
    (s.def_safe             || 0) * SCORING.def_safe             +
    (s.def_td               || 0) * SCORING.def_td
  );
};

// IDP scarcity — dynamic multiplier on top of base SCARCITY value.
// Differentiates elite producers from average depth at the same position.
// LB: tackle volume is the primary value driver (not INTs — that was wrong)
// DL: sack production separates pass rushers from run stuffers
// DB: hybrid safety types (high tackles + INTs) score significantly higher
export const idpScarcity = (pos, t) => {
  if (!t) return SCARCITY[pos] || 1.0;
  const sacks   = t.def_sack        || 0;
  const solo    = t.def_tackle_solo || 0;
  const ast     = t.def_tackle_ast  || 0;
  const ints    = t.def_int         || 0;
  const totalTkl = solo + ast * 0.5;   // weighted tackle total

  if (pos === "DL") {
    // Pure pass rusher tiers — sacks are the differentiator
    if (sacks >= 10) return 1.40;   // elite pass rusher (Garrett/Parsons tier)
    if (sacks >= 6)  return 1.20;   // solid starter
    if (sacks >= 3)  return 1.00;   // rotational rusher
    return 0.75;                    // run stuffer — limited dynasty value
  }
  if (pos === "LB") {
    // 3-down LB value is in tackle volume + coverage versatility
    if (totalTkl >= 90) return 1.35;  // Jack Campbell / Roquan Smith tier
    if (totalTkl >= 70) return 1.15;  // solid every-down starter
    if (totalTkl >= 50) return 1.00;  // starter-level
    return 0.80;                      // limited role / spec teams
  }
  if (pos === "DB") {
    // Hybrid safeties (high tackles AND INTs) are the most valuable
    const hybridSafety = solo >= 65 && ints >= 2;
    if (hybridSafety || ints >= 4)         return 1.30;  // elite hybrid / ball-hawk
    if (ints >= 2 || solo >= 60)           return 1.15;  // solid starter
    if (ints >= 1 || solo >= 45)           return 1.00;  // average DB1
    return 0.85;                                         // coverage-only / limited
  }
  return SCARCITY[pos] || 1.0;
};

// ─── SITUATION ────────────────────────────────────────────────────────────────
export const sitMultiplier = (p) => {
  const flag = p.situationFlag;
  if (!flag) return 1.0;
  if (flag === "SUSPENSION") {
    const games = p.situationGames || 6;
    return Math.max(0.1, (17 - games) / 17);
  }
  if (flag === "AGE_CLIFF") return 1 + SITUATION_FLAGS.AGE_CLIFF.impact;
  return 1 + (SITUATION_FLAGS[flag]?.impact || 0);
};

export const resolveBreakoutFlag = (flag, age) => {
  if (flag === "BREAKOUT_ROLE" && age != null && age <= 23) return "BREAKOUT_YOUNG";
  return flag;
};

export const detectSituation = (playerName, headlines) => {
  const nameParts = playerName.toLowerCase().split(" ");
  const lastName  = nameParts[nameParts.length - 1];
  const relevant  = headlines.filter(h => h.toLowerCase().includes(lastName));
  if (!relevant.length) return null;
  const combined  = relevant.join(" ").toLowerCase();
  for (const { flag, patterns } of SITUATION_PATTERNS) {
    if (patterns.some(p => combined.includes(p))) return flag;
  }
  return null;
};

// ─── INTEL SIGNAL (rule-based, no API call needed) ────────────────────────────
export const deriveSignal = (p, headlines) => {
  const inj = p.injStatus;
  const age = p.age || 0;
  const [, peak, cliff] = ({"QB":[25,34,38],"RB":[23,27,30],"WR":[23,29,33],"TE":[24,31,35]}[p.pos] || [23, 29, 33]);

  let status    = "Starter";
  if (inj === "IR" || inj === "PUP" || inj === "Out")            status = "Injured";
  else if (inj === "Doubtful")                                    status = "Uncertain";
  else if (inj === "Questionable")                                status = "Uncertain";
  else if (p.depthOrder >= 2)                                     status = "Backup";
  else if (p.gamesStarted != null && p.gamesStarted < 6 && p.pos === "QB") status = "Backup";

  let situation = "Stable";
  if (age > cliff)                        situation = "Declining";
  else if (age > peak)                    situation = "Declining";
  else if (age < 24 && p.depthOrder === 1) situation = "Improving";
  else if (inj && inj !== "Questionable") situation = "Unknown";

  let signal = "HOLD";
  if (status === "Injured" || inj === "IR" || inj === "PUP")           signal = "SELL";
  else if (status === "Backup" && age > peak)                           signal = "SELL";
  else if (status === "Backup" && p.pos === "QB")                       signal = "WATCH";
  else if (inj === "Questionable" || inj === "Doubtful")                signal = "WATCH";
  else if (age < 24 && p.depthOrder === 1 && (p.yrsExp || 0) < 3)      signal = "BUY";
  else if (situation === "Declining" && p.depthOrder !== 1)             signal = "SELL";
  else if (situation === "Improving")                                    signal = "BUY";

  const parts = [];
  if (inj) parts.push(`${inj} — ${inj === "IR" ? "on IR" : inj === "PUP" ? "on PUP list" : "injury listed"}`);
  if (p.depthOrder) parts.push(`Depth chart #${p.depthOrder}`);
  if (p.gamesStarted != null) parts.push(`${p.gamesStarted}/${p.gamesPlayed} starts in 2025`);
  if (age > cliff) parts.push(`Age ${age} — past positional cliff (${cliff})`);
  else if (age > peak) parts.push(`Age ${age} — entering decline window`);
  else if (age < 24)   parts.push(`Age ${age} — prime development window`);
  if (p.trades > 0)    parts.push(`Traded ${p.trades}x this season`);

  const playerHeadline = headlines.find(h =>
    h.toLowerCase().includes((p.name.split(" ")[1] || "").toLowerCase()) &&
    h.toLowerCase().includes((p.team || "").toLowerCase())
  );
  if (playerHeadline) parts.push(playerHeadline.slice(0, 80));

  return {
    status,
    situation,
    signal,
    note: parts.slice(0, 2).join(" · ").slice(0, 120) || `${p.pos} for ${p.team}`,
  };
};
