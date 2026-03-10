import { PRIME, SCARCITY, SCORING, SITUATION_FLAGS, SITUATION_PATTERNS } from "./constants";

// ─── AGE ──────────────────────────────────────────────────────────────────────
export const calcAge = (bd) => {
  if (!bd) return null;
  const today = new Date();
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
    // Special teams returns
    (s.pr_yd       || 0) * SCORING.pr_yd       +
    (s.kr_yd       || 0) * SCORING.kr_yd       +
    (s.pr_td       || 0) * SCORING.pr_td       +
    (s.kr_td       || 0) * SCORING.kr_td       +
    (s.st_td       || 0) * SCORING.st_td       +
    (s.int_ret_yd  || 0) * SCORING.int_ret_yd  +
    (s.fum_ret_yd  || 0) * SCORING.fum_ret_yd  +
    // IDP — idp_ prefix (Sleeper API confirmed)
    (s.idp_sack        || 0) * SCORING.idp_sack        +
    (s.idp_tkl_solo    || 0) * SCORING.idp_tkl_solo    +
    (s.idp_tkl_ast     || 0) * SCORING.idp_tkl_ast     +
    (s.idp_tkl_loss    || 0) * SCORING.idp_tkl_loss    +
    (s.idp_qb_hit      || 0) * SCORING.idp_qb_hit      +
    (s.idp_pass_def    || 0) * SCORING.idp_pass_def    +
    (s.idp_int         || 0) * SCORING.idp_int         +
    (s.idp_ff          || 0) * SCORING.idp_ff          +
    (s.idp_fum_rec     || 0) * SCORING.idp_fum_rec     +
    (s.idp_safe        || 0) * SCORING.idp_safe        +
    (s.idp_def_td      || 0) * SCORING.idp_def_td      +
    (s.idp_blk_kick    || 0) * SCORING.idp_blk_kick    +
    (s.idp_int_ret_yd  || 0) * SCORING.idp_int_ret_yd  +
    (s.idp_fum_ret_yd  || 0) * SCORING.idp_fum_ret_yd
  );
};

// IDP scarcity — dynamic multiplier on top of base SCARCITY value.
// Uses idp_ prefixed fields matching Sleeper's actual API.
export const idpScarcity = (pos, t) => {
  if (!t) return SCARCITY[pos] || 1.0;
  const sacks    = t.idp_sack     || 0;
  const solo     = t.idp_tkl_solo || 0;
  const ast      = t.idp_tkl_ast  || 0;
  const ints     = t.idp_int      || 0;
  const totalTkl = solo + ast * 0.5;

  if (pos === "DL") {
    if (sacks >= 10) return 1.40;   // elite pass rusher
    if (sacks >= 6)  return 1.20;
    if (sacks >= 3)  return 1.00;
    return 0.75;                    // run stuffer — limited dynasty value
  }
  if (pos === "LB") {
    if (totalTkl >= 90) return 1.35;
    if (totalTkl >= 70) return 1.15;
    if (totalTkl >= 50) return 1.00;
    return 0.80;
  }
  if (pos === "DB") {
    const hybridSafety = solo >= 65 && ints >= 2;
    if (hybridSafety || ints >= 4) return 1.30;
    if (ints >= 2 || solo >= 60)   return 1.15;
    if (ints >= 1 || solo >= 45)   return 1.00;
    return 0.85;
  }
  return SCARCITY[pos] || 1.0;
};

// ─── DYNASTY VALUE (0-1000) ───────────────────────────────────────────────────
// Non-linear, position-ranked exponential decay. Purpose: trade fairness, draft
// pick comparisons, waiver adds. Only shown in Trade/Waiver/Draft tools.
//
// Rank within position group determined by dynastyRaw (age-weighted production).
// Value falls exponentially from rank — the cliff accelerates through tiers,
// matching how the real dynasty trade market prices players.

const DV_TOP = { QB:900, RB:950, WR:980, TE:820, DL:720, LB:750, DB:700, K:200 };
const DV_K   = { QB:0.15, RB:0.18, WR:0.12, TE:0.18, DL:0.15, LB:0.15, DB:0.15, K:0.10 };

export const calcDynastyValues = (players, eloScores = {}) => {
  const byPos = {};
  players.forEach(p => {
    if (!byPos[p.pos]) byPos[p.pos] = [];
    byPos[p.pos].push(p);
  });

  const eloList   = Object.values(eloScores);
  const eloActive = eloList.length >= 6;
  const eloMin    = eloActive ? Math.min(...eloList) : 1200;
  const eloRange  = eloActive ? Math.max(Math.max(...eloList) - eloMin, 1) : 1;

  const result = {};

  Object.entries(byPos).forEach(([pos, group]) => {
    const top = DV_TOP[pos] || 500;
    const k   = DV_K[pos]   || 0.15;

    // Sort by dynasty-relevant composite: age upside + production + demand
    const ranked = [...group].sort((a, b) => {
      const ra = (a.ageGated_n || 0) * 0.50 + (a.prodProxy_n || 0) * 0.30 + (a.demandRaw_n || 0) * 0.20;
      const rb = (b.ageGated_n || 0) * 0.50 + (b.prodProxy_n || 0) * 0.30 + (b.demandRaw_n || 0) * 0.20;
      return rb - ra;
    });

    ranked.forEach((p, idx) => {
      // Exponential base from rank
      let dv = top * Math.exp(-k * idx);

      // Age multiplier — young players get dynasty premium, old past cliff get steep discount
      const [rise, peak, cliff] = PRIME[p.pos] || [23, 28, 33];
      const age = p.age || 26;
      let ageMult;
      if      (age < rise)   ageMult = Math.min(1.2, 1.1 + (rise - age) * 0.03);  // young premium
      else if (age <= peak)  ageMult = 1.0;
      else if (age <= cliff) ageMult = Math.max(0.65, 0.95 - (age - peak) * 0.06);
      else                   ageMult = Math.max(0.25, 0.65 - (age - cliff) * 0.12);

      dv *= ageMult;

      // Elo peer blend (15% once active, keeps the community signal in range)
      if (eloActive && eloScores[p.pid]) {
        const peerNorm = (eloScores[p.pid] - eloMin) / eloRange; // 0-1
        dv = dv * 0.85 + top * peerNorm * 0.15;
      }

      result[p.pid] = Math.round(Math.max(1, Math.min(999, dv)));
    });
  });

  return result;
};

// ─── START VALUE (0-100) ──────────────────────────────────────────────────────
// Current-week production metric. Purpose: who to start, who to drop.
// Position-relative absolute mapping — each position has its own PPG ceiling/floor
// so players spread across the full 0-100 range within their position group.
// No cross-position normalization (that caused tier-step clustering).

// PPG ceiling = elite starter for that position. Floor = benchwarmer/taxi.
const SV_CEIL  = { QB:32, RB:22, WR:18, TE:14, DL:13, LB:15, DB:11, K:11 };
const SV_FLOOR = { QB: 6, RB: 3, WR: 2,  TE: 1,  DL: 1,  LB: 2,  DB: 1,  K: 3 };
// PPG fallback for players with no stats (estimated from depth/role)
export const START_PPG_FLOOR = { QB:14, RB:9, WR:8, TE:6, DL:5, LB:7, DB:5, K:7 };

export const calcStartRaw = (p) => {
  const floor   = START_PPG_FLOOR[p.pos] || 7;
  const effPpg  = p.ppg ?? (floor * p.effRole * (p.gamesStarted === 0 ? 0.35 : 0.75));
  const injMult = ["Out","IR","PUP"].includes(p.injStatus) ? 0.20
                : p.injStatus === "Doubtful"               ? 0.50
                : p.injStatus === "Questionable"           ? 0.85
                : 1.0;
  const ppgAdj = Math.max(0, effPpg * injMult);

  // Map PPG to 0-99 using position ceiling/floor with a slight upward curve
  // for elite producers (raw^0.82 boosts the top end slightly)
  const hi   = SV_CEIL[p.pos]  || 15;
  const lo   = SV_FLOOR[p.pos] || 2;
  const raw  = Math.min(1.0, Math.max(0.0, (ppgAdj - lo) / (hi - lo)));
  const curved = Math.pow(raw, 0.82);
  return Math.max(5, Math.min(99, Math.round(curved * 99)));
};

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
