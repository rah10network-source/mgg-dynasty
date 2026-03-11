import {
  LEAGUE_ID, SLEEPER, SCARCITY, PRIME, POS_ORDER, SCORING, SITUATION_PATTERNS,
} from "./constants";
import {
  calcAge, ageScore, normalise, calcSleeperPts, idpScarcity,
  sitMultiplier, resolveBreakoutFlag, detectSituation, deriveSignal,
  calcDynastyValues, calcStartRaw,
} from "./scoring";

// ─── RE-EXPORTS FOR BACKWARD COMPAT ──────────────────────────────────────────
// These functions now live in their dedicated logic modules.
// Re-exported here so existing import paths continue to work.
// TODO: Update consumers to import directly from intel.js / trade.js
export { runIntel, deepAnalyse, claudeAnalyse, fetchIntelSources } from "./intel";
export { claudeTradeAnalysis } from "./trade";

// ─── RAW FETCH ────────────────────────────────────────────────────────────────
export const sf = async (path) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`${SLEEPER}${path}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status} on ${path}`);
    return await r.json();
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
};

// ─── STAT FIELDS TO ACCUMULATE ────────────────────────────────────────────────
// CRITICAL: Sleeper stats API uses "idp_" prefix for individual defensive stats.
// "def_" prefix = Team DEF only. Previously all IDP stats were 0.
const STAT_FIELDS = [
  // Offense
  "pass_yd","pass_td","pass_int",
  "rush_yd","rush_td","rush_att",
  "rec","rec_yd","rec_td","rec_tgt",
  // Special teams returns (constitution §7.2)
  "pr_yd","kr_yd","pr_td","kr_td","st_td",
  "int_ret_yd","fum_ret_yd",
  // IDP — idp_ prefix confirmed from live Sleeper API data
  "idp_sack","idp_tkl_solo","idp_tkl_ast","idp_tkl_loss",
  "idp_qb_hit","idp_pass_def","idp_int","idp_ff","idp_fum_rec",
  "idp_safe","idp_def_td","idp_blk_kick",
  "idp_int_ret_yd","idp_fum_ret_yd",
];

// ─── LOAD DATA ────────────────────────────────────────────────────────────────
// Pulls all Sleeper data, builds player profiles, runs dynasty scoring.
// Calls log(msg, type) for progress updates.
// Returns { players, nflDb, syncedAt } or throws.
export const loadData = async (log, manualSitsRef) => {
  log("Connecting to Sleeper API...");
  const lg = await sf(`/league/${LEAGUE_ID}`);
  log(`League: "${lg.name || LEAGUE_ID}" · Season ${lg.season}`, "success");

  log("Loading owners...");
  const users = await sf(`/league/${LEAGUE_ID}/users`);
  const userMap = {};
  users.forEach(u => { userMap[u.user_id] = u.metadata?.team_name || u.display_name || u.username; });
  log(`${users.length} owners loaded`, "success");

  log("Loading rosters...");
  const rosters = await sf(`/league/${LEAGUE_ID}/rosters`);
  const ownerMap = {}, taxiMap = {}, rosterIdToOwner = {};
  rosters.forEach(r => {
    const name = userMap[r.owner_id] || r.owner_id;
    rosterIdToOwner[r.roster_id] = name;
    (r.players || []).forEach(pid => { ownerMap[pid] = name; });
    (r.taxi    || []).forEach(pid => { taxiMap[pid]  = true; });
  });
  log(`${Object.keys(ownerMap).length} rostered players`, "success");

  // ── Draft pick reconstruction ──────────────────────────────────────────────
  // Sleeper rosters[n].draft_picks only holds traded picks already received.
  // We reconstruct full ownership: every team starts with all their own picks
  // for the next 3 seasons, then apply traded_picks to move picks around.
  log("Loading draft picks...");
  const draftPicksByOwner = {};
  const draftRounds = lg.settings?.draft_rounds || lg.settings?.rounds || 5;
  const currentSeason = Number(lg.season || new Date().getFullYear());
  const futureSeasons = [currentSeason + 1, currentSeason + 2, currentSeason + 3];

  // 1. Seed every roster with their own picks for all future seasons
  rosters.forEach(r => {
    const name = userMap[r.owner_id] || r.owner_id;
    if (!draftPicksByOwner[name]) draftPicksByOwner[name] = [];
    futureSeasons.forEach(season => {
      for (let round = 1; round <= draftRounds; round++) {
        draftPicksByOwner[name].push({
          season:       String(season),
          round,
          rosterId:     r.roster_id,   // original team (for labelling)
          ownerRosterId: r.roster_id,  // current holder (starts as own)
          isTraded:     false,
        });
      }
    });
  });

  // 2. Fetch traded picks and apply movements
  try {
    const tradedPicks = await sf(`/league/${LEAGUE_ID}/traded_picks`);
    let appliedCount = 0;
    tradedPicks.forEach(tp => {
      const season = String(tp.season);
      const round  = tp.round;

      // ── FIX: skip current and past season picks ──────────────────────────
      // Sleeper returns ALL traded picks including already-used ones.
      // Only future drafts are relevant for the My Picks portfolio view.
      if (Number(season) <= currentSeason) return;

      const origId = tp.roster_id;          // whose pick it originally was
      const newId  = tp.owner_id;           // who now owns it
      const prevId = tp.previous_owner_id;

      // Remove from whoever currently holds it
      const prevOwnerName = rosterIdToOwner[prevId] || rosterIdToOwner[origId];
      if (prevOwnerName && draftPicksByOwner[prevOwnerName]) {
        const idx = draftPicksByOwner[prevOwnerName].findIndex(
          p => String(p.season) === season && p.round === round && p.rosterId === origId
        );
        if (idx !== -1) draftPicksByOwner[prevOwnerName].splice(idx, 1);
      }

      // Add to new owner
      const newOwnerName = rosterIdToOwner[newId];
      if (newOwnerName) {
        if (!draftPicksByOwner[newOwnerName]) draftPicksByOwner[newOwnerName] = [];
        // Avoid duplicates
        const already = draftPicksByOwner[newOwnerName].some(
          p => String(p.season) === season && p.round === round && p.rosterId === origId
        );
        if (!already) {
          draftPicksByOwner[newOwnerName].push({
            season,
            round,
            rosterId:      origId,
            ownerRosterId: newId,
            isTraded:      origId !== newId,
          });
          appliedCount++;
        }
      }
    });
    log(`Draft picks loaded · ${appliedCount} future traded picks applied`, "success");
  } catch(e) {
    log(`Draft picks: traded picks fetch failed (${e.message}) — showing original allocations`, "info");
  }

  log("Downloading NFL player database...");
  const allP = await sf(`/players/nfl`);
  log(`${Object.keys(allP).length} players in database`, "success");

  log("Parsing transactions (18 weeks)...");
  const tradeCnt = {}, faAdd = {}, dropCnt = {};
  for (let wk = 1; wk <= 18; wk++) {
    try {
      const txs = await sf(`/league/${LEAGUE_ID}/transactions/${wk}`);
      if (!Array.isArray(txs)) continue;
      txs.forEach(tx => {
        if (tx.type === "trade")
          Object.keys(tx.adds || {}).forEach(pid => { tradeCnt[pid] = (tradeCnt[pid] || 0) + 1; });
        if (["free_agent","waiver"].includes(tx.type)) {
          Object.keys(tx.adds  || {}).forEach(pid => { faAdd[pid]   = (faAdd[pid]   || 0) + 1; });
          Object.keys(tx.drops || {}).forEach(pid => { dropCnt[pid] = (dropCnt[pid] || 0) + 1; });
        }
      });
    } catch {}
  }
  log(`Transactions done · ${Object.keys(tradeCnt).length} traded`, "success");

  // Build player profiles
  log("Building player profiles...");
  let pl = Object.keys(ownerMap).map(pid => {
    const p = allP[pid];
    if (!p || !SCARCITY[p.position]) return null;
    const depthOrder = p.depth_chart_order || null;
    const roleConf   = depthOrder === 1 ? 1.0 : depthOrder === 2 ? 0.55 : depthOrder >= 3 ? 0.25 : 0.65;
    return {
      pid, pos: p.position,
      name: p.full_name || `${p.first_name} ${p.last_name}`,
      age: calcAge(p.birth_date),
      team: p.team || "FA", owner: ownerMap[pid], onTaxi: taxiMap[pid] || false,
      injStatus: p.injury_status || null, depthOrder, depthPos: p.depth_chart_position || "",
      roleConf, yrsExp: p.years_exp, height: p.height, weight: p.weight, status: p.status,
      trades: tradeCnt[pid] || 0, adds: faAdd[pid] || 0, drops: dropCnt[pid] || 0,
      gamesStarted: null, gamesPlayed: null, ppg: null, statLine: null, seasonTotals: null,
      // Dual-position flag: player eligible at both offense and defense (e.g. Travis Hunter WR/DB)
      dualPos: (() => {
        const fp = p.fantasy_positions || [];
        const hasOff = fp.some(x => ["QB","RB","WR","TE"].includes(x));
        const hasDef = fp.some(x => ["DL","LB","DB"].includes(x));
        return hasOff && hasDef ? fp : null;
      })(),
    };
  }).filter(Boolean);

  // Sleeper season stats (18 weekly bulk calls)
  log("Fetching Sleeper season stats (18 weeks)...");
  const sleeperTotals = {};
  for (let wk = 1; wk <= 18; wk++) {
    try {
      const r = await fetch(
        `https://api.sleeper.app/v1/stats/nfl/regular/${lg.season}/${wk}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!r.ok) continue;
      const weekStats = await r.json();
      Object.entries(weekStats).forEach(([pid, s]) => {
        if (!s) return;
        if (!Object.values(s).some(v => v > 0)) return;
        if (!sleeperTotals[pid]) sleeperTotals[pid] = { pts: 0, gs: 0, gp: 0 };
        const t = sleeperTotals[pid];
        t.pts += calcSleeperPts(s);
        t.gp  += 1;
        t.gs  += (s.gs || s.gms_active || 0);
        STAT_FIELDS.forEach(f => { t[f] = (t[f] || 0) + (s[f] || 0); });
      });
    } catch (e) {
      console.warn(`Week ${wk} stats failed:`, e.message);
    }
    if (wk % 6 === 0) log(`Sleeper stats: ${wk}/18 weeks aggregated...`);
  }
  log(`Sleeper stats complete · ${Object.keys(sleeperTotals).length} players with data`, "success");

  // Apply stats to rostered players
  let hits = 0;
  pl.forEach(p => {
    const t = sleeperTotals[p.pid];
    if (!t || t.gp === 0) return;
    p.gamesPlayed  = t.gp;
    p.gamesStarted = t.gs;
    p.ppg          = +(t.pts / t.gp).toFixed(1);
    p.seasonTotals = t;
    hits++;
    if      (p.pos === "QB")             p.statLine = `${Math.round(t.pass_yd||0)}yds ${t.pass_td||0}td ${t.pass_int||0}int`;
    else if (p.pos === "RB") {
      const retYds = Math.round((t.kr_yd||0) + (t.pr_yd||0));
      p.statLine = `${Math.round(t.rush_yd||0)}ru ${t.rush_td||0}td · ${t.rec||0}rec ${Math.round(t.rec_yd||0)}yds`
        + (retYds > 0 ? ` · ${retYds}ret` : "");
    }
    else if (["WR","TE"].includes(p.pos)) {
      const retYds = Math.round((t.kr_yd||0) + (t.pr_yd||0));
      const idpLine = p.dualPos ? ` · ${t.idp_tkl_solo||0}tkl ${t.idp_int||0}int ${t.idp_pass_def||0}pd` : "";
      p.statLine = `${t.rec||0}rec ${Math.round(t.rec_yd||0)}yds ${t.rec_td||0}td · ${t.rec_tgt||0}tgt`
        + (retYds > 0 ? ` · ${retYds}ret` : "") + idpLine;
    }
    else if (["DL","LB","DB"].includes(p.pos)) p.statLine = `${t.idp_tkl_solo||0}tkl ${t.idp_tkl_ast||0}ast ${t.idp_sack||0}sck ${t.idp_qb_hit||0}qbh ${t.idp_int||0}int ${t.idp_pass_def||0}pd`;
  });
  log(`Stats applied to ${hits}/${pl.length} rostered players`, hits > 0 ? "success" : "info");

  // Dynasty scoring
  pl.forEach(p => {
    p.ageRaw = ageScore(p.age, p.pos);
    const espnRate = (p.gamesStarted != null && p.gamesPlayed > 0) ? p.gamesStarted / p.gamesPlayed : null;
    p.effRole = espnRate != null ? p.roleConf * 0.35 + espnRate * 0.65 : p.roleConf;

    let startPenalty = 1.0;
    if (p.pos === "QB") {
      if (p.gamesStarted != null) {
        if      (p.gamesStarted < 5)  startPenalty = 0.30;
        else if (p.gamesStarted < 9)  startPenalty = 0.55;
        else if (p.gamesStarted < 13) startPenalty = 0.78;
      } else {
        startPenalty = p.depthOrder === 1 ? 0.72 : 0.45;
      }
    } else if (p.gamesStarted != null && p.gamesStarted < 4) {
      startPenalty = 0.50;
    } else if (p.gamesStarted === null && ["RB","WR","TE"].includes(p.pos) && p.depthOrder > 1) {
      startPenalty = 0.65;
    }

    p.ageGated = p.ageRaw * Math.min(p.effRole, 1.0) * startPenalty;

    const sc = ["DL","LB","DB"].includes(p.pos)
      ? idpScarcity(p.pos, p.seasonTotals)
      : SCARCITY[p.pos] || 1.0;
    // Dual-position bonus: player eligible at both offense and defense (e.g. Travis Hunter)
    // Gets a 15% scarcity boost — unique two-way contributors are extremely rare
    p.scarcityUsed = p.dualPos ? Math.min(sc * 1.15, 2.5) : sc;

    // Position-aware fallback PPG — calibrated to realistic starter production per position.
    // The old flat * 10 constant was tuned for offensive PPG (10-25 range) and
    // massively over-inflated IDP players with no stats data (LB fallback was 22,
    // beating real starter WRs). IDPs naturally score 3-12 PPG so they need a lower base.
    // Elite IDP with REAL stats still competes correctly (LB 17.5 ≈ WR 17.6).
    const FALLBACK_PPG = { QB:18, RB:12, WR:10, TE:8, DL:5, LB:8, DB:6, K:6 };
    const fallbackBase = FALLBACK_PPG[p.pos] || 8;

    const baseProd = p.ppg != null
      ? p.ppg * sc
      : fallbackBase * sc * p.effRole * startPenalty;

    // Manual situations (seeded before any Intel scan)
    const manualSit = manualSitsRef.current[p.name];
    if (manualSit) {
      p.situationFlag  = resolveBreakoutFlag(manualSit.flag, p.age);
      p.situationNote  = manualSit.note;
      p.situationGames = manualSit.games || null;
    } else {
      p.situationFlag  = null;
      p.situationNote  = null;
      p.situationGames = null;
    }

    // Auto AGE_CLIFF if no other flag
    if (!p.situationFlag) {
      const [,, cliff] = PRIME[p.pos] || [23, 29, 33];
      if ((p.age || 0) > cliff) {
        p.situationFlag = "AGE_CLIFF";
        p.situationNote = `Age ${p.age} — past ${p.pos} cliff (${cliff})`;
      }
    }
    if (p.situationFlag === "BREAKOUT_ROLE" && (p.age || 99) <= 23) {
      p.situationFlag = "BREAKOUT_YOUNG";
    }

    // Auto DUAL_POS — two-way player (e.g. Travis Hunter WR/DB)
    // Takes priority over AGE_CLIFF/BREAKOUT since it's structurally unique
    if (p.dualPos) {
      p.situationFlag = "DUAL_POS";
      p.situationNote = `Two-way eligible: ${p.dualPos.join("/")} — scores on both sides of the ball`;
    }

    // Auto RETURN_THREAT — player accumulating meaningful return yards
    // Only set if no other flag already present (don't override DUAL_POS etc.)
    if (!p.situationFlag && p.seasonTotals) {
      const retYds = (p.seasonTotals.pr_yd || 0) + (p.seasonTotals.kr_yd || 0);
      if (retYds >= 200) {
        p.situationFlag = "RETURN_THREAT";
        p.situationNote = `${Math.round(retYds)} return yards this season — adds meaningful PPG floor`;
      }
    }

    p.prodProxy = baseProd * sitMultiplier(p);
    p.demandRaw = p.trades * 3 + p.adds - p.drops * 0.5;
    p.roleStab  = p.depthOrder ? Math.max(0, 100 - (p.depthOrder - 1) * 30) : 55;
  });

  pl = normalise(pl, "prodProxy");
  pl = normalise(pl, "ageGated");
  pl = normalise(pl, "demandRaw");
  pl = normalise(pl, "roleStab");

  // ── Dynasty Value (p.dynastyValue, 0-1000) ─── computed FIRST ────────────
  // Used below to project SV for no-stats players.
  const dvMap = calcDynastyValues(pl);
  pl.forEach(p => { p.dynastyValue = dvMap[p.pid] || 1; });

  // Tiers from dynastyValue
  const srt = [...pl].sort((a, b) => b.dynastyValue - a.dynastyValue);
  const n   = srt.length;
  const [t90, t70, t45, t20] = [0.10, 0.30, 0.55, 0.80].map(q => srt[Math.floor(n * q)]?.dynastyValue || 200);
  pl.forEach(p => {
    p.tier = p.dynastyValue >= t90 ? "Elite" : p.dynastyValue >= t70 ? "Starter" : p.dynastyValue >= t45 ? "Flex" : p.dynastyValue >= t20 ? "Depth" : "Stash";
  });

  // ── Start Value (p.startValue, 0-100) ────────────────────────────────────
  // For players WITH stats → position-relative absolute PPG mapping (real production).
  // For players WITHOUT stats → project from DV rank within position (offseason nuance).
  //   DV rank 0 gets projected PPG at 85% of position ceiling.
  //   DV rank last gets projected PPG at 25% above floor.
  //   Injury multipliers applied after projection.
  const SV_CEIL  = { QB:32, RB:22, WR:18, TE:14, DL:13, LB:15, DB:11, K:11 };
  const SV_FLOOR = { QB: 6, RB: 3, WR: 2,  TE: 1,  DL: 1,  LB: 2,  DB: 1,  K: 3 };

  // First pass: players with stats use calcStartRaw (PPG → SV directly)
  pl.forEach(p => {
    if (p.ppg != null) {
      p.startValue = calcStartRaw(p);
    }
  });

  // Second pass: no-stats players — project from DV rank within position group
  const byPos = {};
  pl.filter(p => p.ppg == null).forEach(p => {
    if (!byPos[p.pos]) byPos[p.pos] = [];
    byPos[p.pos].push(p);
  });
  Object.entries(byPos).forEach(([pos, group]) => {
    const sorted = [...group].sort((a, b) => b.dynastyValue - a.dynastyValue);
    const total  = sorted.length;
    const lo = SV_FLOOR[pos] ?? 2;
    const hi = SV_CEIL[pos]  ?? 15;
    const injMult = (p) =>
      ["Out","IR","PUP"].includes(p.injStatus) ? 0.20
      : p.injStatus === "Doubtful"             ? 0.50
      : p.injStatus === "Questionable"         ? 0.85 : 1.0;

    sorted.forEach((p, idx) => {
      const frac    = 1.0 - idx / Math.max(total - 1, 1); // 1.0 at rank 0 → 0.0 at last
      const projPpg = (lo + (hi - lo) * (0.25 + frac * 0.60)) * injMult(p);
      const raw     = Math.min(1.0, Math.max(0.0, (projPpg - lo) / (hi - lo)));
      p.startValue  = Math.max(5, Math.min(99, Math.round(Math.pow(raw, 0.82) * 99)));
    });
  });

  pl.forEach(p => { p.score = p.startValue ?? 0; }); // legacy alias

  const tc = ["Elite","Starter","Flex","Depth","Stash"]
    .map(t => `${t}:${pl.filter(x => x.tier === t).length}`).join(" · ");
  log(`Scores complete · ${tc}`, "success");
  log("Ready — use ◈ INTEL SCAN for news, ⬇ EXPORT XLSX for snapshot", "done");

  // ── Season state ─────────────────────────────────────────────────────────
  const lStatus = lg.status || "pre_draft";
  const leg     = lg.settings?.leg || 0;
  const lastLeg = lg.settings?.last_scored_leg || 0;
  const season  = lg.season || new Date().getFullYear();
  const seasonMode =
    lStatus === "in_season"   ? (leg > 14 ? "playoffs" : "inseason")
  : lStatus === "post_season" ? "playoffs"
  : lStatus === "complete"    ? "complete"
  : lStatus === "drafting"    ? "preseason"
  : "offseason";
  const seasonState = {
    mode:           seasonMode,
    currentWeek:    leg  || null,
    lastScoredWeek: lastLeg || null,
    hasMatchups:    lStatus === "in_season" && leg > 0,
    leagueStatus:   lStatus,
    season:         String(season),
    leagueName:     lg.name || LEAGUE_ID,
  };
  log(`Season: ${seasonState.season} · ${seasonState.mode.toUpperCase()}${seasonState.currentWeek ? " · Week " + seasonState.currentWeek : ""}`, "success");

  return { players: pl.sort((a, b) => b.dynastyValue - a.dynastyValue), nflDb: allP, seasonState, draftPicksByOwner, rosterIdToOwner, leagueUsers: users };
};

