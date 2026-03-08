import {
  LEAGUE_ID, SLEEPER, SCARCITY, PRIME, POS_ORDER, SCORING, SITUATION_PATTERNS,
} from "./constants";
import {
  calcAge, ageScore, normalise, calcSleeperPts, idpScarcity,
  sitMultiplier, resolveBreakoutFlag, detectSituation, deriveSignal,
} from "./scoring";
import { loadMarketValues } from "./ktc";

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
const STAT_FIELDS = [
  "pass_yd","pass_td","pass_int",
  "rush_yd","rush_td","rush_att",
  "rec","rec_yd","rec_td","rec_tgt",
  "def_sack","def_tackle_solo","def_tackle_for_loss",
  "def_pass_def","def_int","def_forced_fumble","def_fumble_rec",
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
  const draftRounds = lg.settings?.draft_rounds || lg.settings?.rounds || 10;
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
    else if (p.pos === "RB")             p.statLine = `${Math.round(t.rush_yd||0)}ru ${t.rush_td||0}td · ${t.rec||0}rec ${Math.round(t.rec_yd||0)}yds`;
    else if (["WR","TE"].includes(p.pos)) p.statLine = `${t.rec||0}rec ${Math.round(t.rec_yd||0)}yds ${t.rec_td||0}td · ${t.rec_tgt||0}tgt`;
    else if (["DL","LB","DB"].includes(p.pos)) p.statLine = `${t.def_tackle_solo||0}tkl ${t.def_sack||0}sck ${t.def_int||0}int ${t.def_pass_def||0}pd`;
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
    p.scarcityUsed = sc;

    const baseProd = p.ppg != null
      ? p.ppg * sc
      : sc * p.effRole * startPenalty * 10;

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

    p.prodProxy = baseProd * sitMultiplier(p);
    p.demandRaw = p.trades * 3 + p.adds - p.drops * 0.5;
    p.roleStab  = p.depthOrder ? Math.max(0, 100 - (p.depthOrder - 1) * 30) : 55;
  });

  // ── Market values (KTC + FantasyCalc) ──────────────────────────────────────
  // Attaches p.fcValue, p.ktcValue, p.marketValue to each player.
  // Non-fatal — if both sources fail, falls back to internal scoring only.
  pl = await loadMarketValues(pl, log);

  pl = normalise(pl, "prodProxy");
  pl = normalise(pl, "ageGated");
  pl = normalise(pl, "demandRaw");
  pl = normalise(pl, "roleStab");
  pl = normalise(pl, "marketValue"); // no-op for players without a match (all→50)

  pl.forEach(p => {
    // If market value was matched, use it as the 50% anchor.
    // Prod (your league's actual scoring) + ageGated (real-life situation) fine-tune.
    // demandRaw (what your league values via transactions) rounds it out.
    // For players with no market match, fall back to the internal-only formula.
    if (p.marketValue != null) {
      p.score = Math.round(Math.min(100, Math.max(0,
        p.marketValue_n * 0.50 +
        p.prodProxy_n   * 0.25 +
        p.ageGated_n    * 0.15 +
        p.demandRaw_n   * 0.10
      )));
    } else {
      p.score = Math.round(Math.min(100, Math.max(0,
        p.prodProxy_n * 0.45 + p.ageGated_n * 0.30 + p.demandRaw_n * 0.15 + p.roleStab_n * 0.10
      )));
    }
  });

  const srt = [...pl].sort((a, b) => b.score - a.score);
  const n   = srt.length;
  const [t90, t70, t45, t20] = [0.10, 0.30, 0.55, 0.80].map(q => srt[Math.floor(n * q)]?.score || 50);
  pl.forEach(p => {
    p.tier = p.score >= t90 ? "Elite" : p.score >= t70 ? "Starter" : p.score >= t45 ? "Flex" : p.score >= t20 ? "Depth" : "Stash";
  });

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

  return { players: pl.sort((a, b) => b.score - a.score), nflDb: allP, seasonState, draftPicksByOwner, rosterIdToOwner, userIdToOwner: userMap };
};

// ─── INTEL SCAN ───────────────────────────────────────────────────────────────
// Rule-based signal derivation from ESPN headlines + Sleeper trending.
// Returns newsMap { playerName: { status, situation, signal, note, situationFlag, situationNote } }
export const runIntel = async (players) => {
  let headlines = [];
  try {
    const r = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=100",
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const d = await r.json();
      headlines = (d.articles || []).map(a => a.headline || a.title || "").filter(Boolean);
    }
  } catch {}

  let trending = [];
  try {
    const r = await fetch(
      "https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=48&limit=50",
      { signal: AbortSignal.timeout(6000) }
    );
    if (r.ok) {
      const d = await r.json();
      trending = d.map(t => t.player_id || t);
    }
  } catch {}

  // Auto-detect situations from headlines for players without a manual flag
  const enrichedPlayers = players.map(p => {
    if (p.situationFlag) return p;
    const autoFlag = detectSituation(p.name, headlines);
    if (autoFlag) {
      const resolved = resolveBreakoutFlag(autoFlag, p.age);
      return { ...p, situationFlag: resolved, situationNote: "Auto-detected from news", situationGames: null };
    }
    return p;
  });

  const result = {};
  enrichedPlayers
    .filter(p => ["QB","RB","WR","TE"].includes(p.pos))
    .forEach(p => {
      const intel = deriveSignal(p, headlines);
      if (trending.includes(p.pid) && intel.signal === "HOLD") intel.signal = "WATCH";
      // Situation flag overrides
      if ((p.situationFlag === "BREAKOUT_YOUNG" || p.situationFlag === "BREAKOUT_ROLE") && intel.signal === "HOLD") intel.signal = "BUY";
      if (p.situationFlag === "DEPTH_PROMOTED"  && intel.signal === "HOLD") intel.signal = "BUY";
      if (p.situationFlag === "CAMP_BATTLE"     && intel.signal === "HOLD") intel.signal = "WATCH";
      if (p.situationFlag === "IR_RETURN"       && intel.signal === "HOLD") intel.signal = "WATCH";
      if (p.situationFlag === "TRADE_DEMAND")                                intel.signal = "SELL";
      if (p.situationFlag === "SUSPENSION")                                  intel.signal = "WATCH";
      if (p.situationFlag === "AGE_CLIFF"       && intel.signal === "HOLD") intel.signal = "WATCH";
      if (p.situationFlag === "FREE_AGENT")                                  intel.signal = "WATCH";
      result[p.name] = { ...intel, situationFlag: p.situationFlag, situationNote: p.situationNote };
    });

  return { newsMap: result, enrichedPlayers };
};

// ─── DEEP ANALYSE ─────────────────────────────────────────────────────────────
// Rule-based fallback. Used when no API key is set.
const HEADLINE_RULES = [
  { flag:"TRADE_DEMAND",  terms:["trade request","requested trade","wants out","unhappy","demands trade"] },
  { flag:"FREE_AGENT",    terms:["released","cut by","waived","terminated contract"] },
  { flag:"SUSPENSION",    terms:["suspended","suspension","banned"] },
  { flag:"IR_RETURN",     terms:["return from ir","activated from ir","cleared to return","off injured reserve"] },
  { flag:"CAMP_BATTLE",   terms:["competition","camp battle","depth chart battle","competing for starting","position battle"] },
  { flag:"DEPTH_PROMOTED",terms:["named starter","takes over as starter","steps in at","starting in place","promoted to starter"] },
  { flag:"BREAKOUT_ROLE", terms:["lead back","featured back","bell cow","every down back","expanded role","target share increase"] },
  { flag:"NEW_OC",        terms:["traded to","acquired by","sent to","new team","offensive coordinator","new oc","scheme change"] },
  { flag:"CONTRACT_YEAR", terms:["contract year","final year of","extension talks","upcoming free agent"] },
];

const SIG_MAP = {
  SUSPENSION:"WATCH", TRADE_DEMAND:"SELL", FREE_AGENT:"WATCH",
  IR_RETURN:"WATCH",  CAMP_BATTLE:"WATCH", DEPTH_PROMOTED:"BUY",
  BREAKOUT_ROLE:"BUY",BREAKOUT_YOUNG:"BUY",NEW_OC:"HOLD", CONTRACT_YEAR:"HOLD",
  AGE_CLIFF:"WATCH",
};

export const deepAnalyse = (name, headlines, p) => {
  const sources = [];

  // Layer 1: Sleeper roster data (authoritative)
  if (p) {
    if (p.team === "FA" || ["Cut","Inactive","Released"].includes(p.status)) {
      return { flag:"FREE_AGENT", note:`${name} is a free agent — no team, scheme, or role confirmed`,
               signal:"WATCH", reasoning:`Sleeper: team="${p.team||"FA"}", status="${p.status||"unknown"}".`,
               status:"done", approved:false };
    }
    if (["IR","PUP"].includes(p.injStatus)) {
      return { flag:"IR_RETURN", note:`${name} on ${p.injStatus} — timeline and return workload uncertain`,
               signal:"WATCH", reasoning:`Sleeper injury status: ${p.injStatus}.`,
               status:"done", approved:false };
    }
    if (p.trades >= 1) {
      sources.push({ flag:"NEW_OC", confidence:p.trades*3,
        reason:`Dynasty traded ${p.trades}x — new team/scheme, role uncertain` });
    }
    if (p.trades === 0 && p.adds >= 3 && p.depthOrder === 1 && p.yrsExp <= 3) {
      const flag = resolveBreakoutFlag("BREAKOUT_ROLE", p.age);
      sources.push({ flag, confidence:p.adds, reason:`Depth #1, ${p.adds} FA adds, ${p.yrsExp} yrs exp` });
    }
    if (p.depthOrder >= 2 && (p.ppg === 0 || p.ppg == null) && p.gamesStarted === 0) {
      sources.push({ flag:"CAMP_BATTLE", confidence:1,
        reason:`Depth #${p.depthOrder} with no starts — role competition likely` });
    }
  }

  // Layer 2: Headline scan
  const normName  = name.toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
  const normParts = normName.split(" ").filter(Boolean);
  const lastName  = normParts[normParts.length-1];
  const firstName = normParts[0];
  const relevant  = headlines.filter(h => {
    const hl = h.toLowerCase().replace(/[^a-z0-9 ]/g,"");
    return hl.includes(lastName) && hl.includes(firstName.slice(0,2));
  });
  const text = relevant.join(" ").toLowerCase().replace(/[^a-z0-9 ]/g,"");

  if (text) {
    HEADLINE_RULES.forEach(({ flag, terms }) => {
      const normTerms = terms.map(t => t.toLowerCase().replace(/[^a-z0-9 ]/g,""));
      const hits = normTerms.filter(t => text.includes(t)).length;
      if (hits > 0) sources.push({ flag, confidence:hits,
        reason:`Headline: "${terms.filter((t,i)=>text.includes(normTerms[i]))[0]}"` });
    });
  }

  if (!sources.length) return null;
  sources.sort((a,b) => b.confidence-a.confidence);
  const top         = sources[0];
  const resolvedFlag= resolveBreakoutFlag(top.flag, p?.age);
  const rule        = HEADLINE_RULES.find(r => r.flag===top.flag);
  const noteSrc     = relevant.find(h => rule?.terms.some(t => h.toLowerCase().includes(t))) || relevant[0];
  const note        = noteSrc ? (noteSrc.length>100 ? noteSrc.slice(0,97)+"..." : noteSrc) : top.reason;

  return {
    flag:      resolvedFlag,
    note,
    signal:    SIG_MAP[resolvedFlag]||"HOLD",
    reasoning: top.reason + (sources.length>1?` · ${sources.length-1} other signal(s) detected.`:""),
    status:    "done",
    approved:  false,
  };
};

// ─── CLAUDE AI ANALYSE ────────────────────────────────────────────────────────
// AI-powered player situation analysis. Uses Claude Haiku for speed + cost.
// Falls back gracefully — callers should always have deepAnalyse as a backup.
export const claudeAnalyse = async (name, headlines, playerData, apiKey) => {
  if (!apiKey) return null;

  const playerContext = playerData ? [
    `Position: ${playerData.pos}`,
    `Team: ${playerData.team}`,
    `Age: ${playerData.age}`,
    `Dynasty Score: ${playerData.score}`,
    `Depth Chart: #${playerData.depthOrder || "?"}`,
    `Injury Status: ${playerData.injStatus || "Healthy"}`,
    `Years Experience: ${playerData.yrsExp}`,
    `FA Adds This Season: ${playerData.adds}`,
    `Dynasty Trades: ${playerData.trades}`,
    `PPG: ${playerData.ppg ?? "N/A"}`,
  ].join("\n") : "No roster data available.";

  const relevant = headlines
    .filter(h => {
      const hl = h.toLowerCase();
      const parts = name.toLowerCase().replace(/[^a-z ]/g,"").split(" ").filter(Boolean);
      // Require at least first 4 chars of first name AND last name present
      return parts.length >= 2 && hl.includes(parts[0].slice(0,4)) && hl.includes(parts[parts.length-1]);
    })
    .slice(0, 8)
    .join("\n");

  const prompt = `You are a dynasty fantasy football analyst. Evaluate this player for a dynasty league owner.

PLAYER: ${name}
${playerContext}

RECENT HEADLINES (ESPN):
${relevant || "No recent headlines found for this player."}

Respond ONLY with valid JSON — no explanation, no markdown fences:
{"signal":"BUY"|"SELL"|"HOLD"|"WATCH","flag":"BREAKOUT_YOUNG"|"BREAKOUT_ROLE"|"DEPTH_PROMOTED"|"CAMP_BATTLE"|"IR_RETURN"|"TRADE_DEMAND"|"SUSPENSION"|"AGE_CLIFF"|"FREE_AGENT"|"NEW_OC"|"CONTRACT_YEAR"|null,"note":"One sentence situation summary, max 120 chars","reasoning":"2-3 sentence dynasty analysis. Be specific about age, role, and value."}`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 350,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      console.warn("claudeAnalyse HTTP error:", res.status);
      return null;
    }
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { ...parsed, status: "done", approved: false, aiPowered: true };
  } catch(e) {
    console.warn("claudeAnalyse failed:", e.message);
    return null;
  }
};

// ─── CLAUDE TRADE ANALYSIS ────────────────────────────────────────────────────
// Generates a plain-English dynasty trade verdict narrative.
// Returns a string or null on failure.
export const claudeTradeAnalysis = async (sideA, sideB, ownerA, ownerB, apiKey) => {
  if (!apiKey || (sideA.length === 0 && sideB.length === 0)) return null;

  const formatSide = (items) => items.map(x =>
    x.type === "pick"
      ? `${x.label} draft pick (est. dynasty value: ${x.customVal ?? x.score})`
      : `${x.name} — ${x.pos}, ${x.team}, age ${x.age}, dynasty score ${x.score}/100`
  ).join("\n  ") || "  (nothing)";

  const prompt = `You are a dynasty fantasy football expert. Give a direct, specific trade verdict.

${ownerA || "Team A"} gives:
  ${formatSide(sideA)}

${ownerB || "Team B"} gives:
  ${formatSide(sideB)}

In 2-3 sentences: state clearly who wins this trade and why. Focus on dynasty value — age curves, position scarcity, role security — not just redraft stats. Be direct, not wishy-washy.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 220,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch(e) {
    console.warn("claudeTradeAnalysis failed:", e.message);
    return null;
  }
};
