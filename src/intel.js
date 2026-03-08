// ─── INTEL LOGIC ──────────────────────────────────────────────────────────────
// Single source of truth for all signal derivation and news analysis.
// Owns: headline rules, situation flags, signal mapping, deep analysis,
//       Intel Scan orchestration, and Claude AI player analysis.
//
// Consumers:
//   api.js         — runIntel (re-exported for backward compat)
//   App.jsx        — runWatchlistResearch calls claudeAnalyse + deepAnalyse
//   scoring.js     — detectSituation, deriveSignal (re-exported here for single import)
//   draft.js       — future: Big Board Intel Scan per player

import { callAnthropic } from "./anthropic";
import { resolveBreakoutFlag, detectSituation, deriveSignal } from "./scoring";

// ─── HEADLINE RULES ───────────────────────────────────────────────────────────
// Ordered by priority — first match wins in deepAnalyse.

export const HEADLINE_RULES = [
  { flag: "TRADE_DEMAND",   terms: ["trade request", "requested trade", "wants out", "unhappy", "demands trade"] },
  { flag: "FREE_AGENT",     terms: ["released", "cut by", "waived", "terminated contract"] },
  { flag: "SUSPENSION",     terms: ["suspended", "suspension", "banned"] },
  { flag: "IR_RETURN",      terms: ["return from ir", "activated from ir", "cleared to return", "off injured reserve"] },
  { flag: "CAMP_BATTLE",    terms: ["competition", "camp battle", "depth chart battle", "competing for starting", "position battle"] },
  { flag: "DEPTH_PROMOTED", terms: ["named starter", "takes over as starter", "steps in at", "starting in place", "promoted to starter"] },
  { flag: "BREAKOUT_ROLE",  terms: ["lead back", "featured back", "bell cow", "every down back", "expanded role", "target share increase"] },
  { flag: "NEW_OC",         terms: ["traded to", "acquired by", "sent to", "new team", "offensive coordinator", "new oc", "scheme change"] },
  { flag: "CONTRACT_YEAR",  terms: ["contract year", "final year of", "extension talks", "upcoming free agent"] },
];

// ─── SIGNAL MAP ───────────────────────────────────────────────────────────────
// Situation flag → default BUY/SELL/HOLD/WATCH signal.

export const SIG_MAP = {
  SUSPENSION:      "WATCH",
  TRADE_DEMAND:    "SELL",
  FREE_AGENT:      "WATCH",
  IR_RETURN:       "WATCH",
  CAMP_BATTLE:     "WATCH",
  DEPTH_PROMOTED:  "BUY",
  BREAKOUT_ROLE:   "BUY",
  BREAKOUT_YOUNG:  "BUY",
  NEW_OC:          "HOLD",
  CONTRACT_YEAR:   "HOLD",
  AGE_CLIFF:       "WATCH",
};

// ─── DEEP ANALYSE ─────────────────────────────────────────────────────────────
// Rule-based analysis of a single player.
// Layer 1: Sleeper roster data (authoritative — team, injury, depth, transactions)
// Layer 2: Headline scan against HEADLINE_RULES
// Returns a result object or null if no signals found.
//
// This is the non-AI fallback — always available, no API key required.

export const deepAnalyse = (name, headlines, p) => {
  const sources = [];

  // ── Layer 1: Sleeper data ──────────────────────────────────────────────────
  if (p) {
    if (p.team === "FA" || ["Cut", "Inactive", "Released"].includes(p.status)) {
      return {
        flag:      "FREE_AGENT",
        note:      `${name} is a free agent — no team, scheme, or role confirmed`,
        signal:    "WATCH",
        reasoning: `Sleeper: team="${p.team || "FA"}", status="${p.status || "unknown"}".`,
        status:    "done",
        approved:  false,
      };
    }
    if (["IR", "PUP"].includes(p.injStatus)) {
      return {
        flag:      "IR_RETURN",
        note:      `${name} on ${p.injStatus} — timeline and return workload uncertain`,
        signal:    "WATCH",
        reasoning: `Sleeper injury status: ${p.injStatus}.`,
        status:    "done",
        approved:  false,
      };
    }
    if (p.trades >= 1) {
      sources.push({
        flag:       "NEW_OC",
        confidence: p.trades * 3,
        reason:     `Dynasty traded ${p.trades}x — new team/scheme, role uncertain`,
      });
    }
    if (p.trades === 0 && p.adds >= 3 && p.depthOrder === 1 && p.yrsExp <= 3) {
      const flag = resolveBreakoutFlag("BREAKOUT_ROLE", p.age);
      sources.push({
        flag,
        confidence: p.adds,
        reason:     `Depth #1, ${p.adds} FA adds, ${p.yrsExp} yrs exp`,
      });
    }
    if (p.depthOrder >= 2 && (p.ppg === 0 || p.ppg == null) && p.gamesStarted === 0) {
      sources.push({
        flag:       "CAMP_BATTLE",
        confidence: 1,
        reason:     `Depth #${p.depthOrder} with no starts — role competition likely`,
      });
    }
  }

  // ── Layer 2: Headline scan ─────────────────────────────────────────────────
  const normName  = name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const nameParts = normName.split(" ").filter(Boolean);
  const lastName  = nameParts[nameParts.length - 1];
  const firstName = nameParts[0];

  const relevant = headlines.filter(h => {
    const hl = h.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    return hl.includes(lastName) && hl.includes(firstName.slice(0, 2));
  });
  const text = relevant.join(" ").toLowerCase().replace(/[^a-z0-9 ]/g, "");

  if (text) {
    HEADLINE_RULES.forEach(({ flag, terms }) => {
      const normTerms = terms.map(t => t.toLowerCase().replace(/[^a-z0-9 ]/g, ""));
      const hits = normTerms.filter(t => text.includes(t)).length;
      if (hits > 0) sources.push({
        flag,
        confidence: hits,
        reason:     `Headline: "${terms.filter((t, i) => text.includes(normTerms[i]))[0]}"`,
      });
    });
  }

  if (!sources.length) return null;

  sources.sort((a, b) => b.confidence - a.confidence);
  const top          = sources[0];
  const resolvedFlag = resolveBreakoutFlag(top.flag, p?.age);
  const rule         = HEADLINE_RULES.find(r => r.flag === top.flag);
  const noteSrc      = relevant.find(h => rule?.terms.some(t => h.toLowerCase().includes(t))) || relevant[0];
  const note         = noteSrc
    ? (noteSrc.length > 100 ? noteSrc.slice(0, 97) + "..." : noteSrc)
    : top.reason;

  return {
    flag:      resolvedFlag,
    note,
    signal:    SIG_MAP[resolvedFlag] || "HOLD",
    reasoning: top.reason + (sources.length > 1 ? ` · ${sources.length - 1} other signal(s) detected.` : ""),
    status:    "done",
    approved:  false,
  };
};

// ─── CLAUDE ANALYSE ───────────────────────────────────────────────────────────
// AI-powered single player analysis using Claude Haiku.
// Uses `anthropic.js` callAnthropic — no raw fetch.
// Returns a structured result object or null.
// Always call deepAnalyse as fallback if this returns null.

export const claudeAnalyse = async (name, headlines, playerData, apiKey) => {
  const p = playerData;

  const context = p ? [
    `Position: ${p.pos}`,
    `Age: ${p.age ?? "unknown"}`,
    `Team: ${p.team || "FA"}`,
    `Depth chart: #${p.depthOrder ?? "?"}`,
    `Games started: ${p.gamesStarted ?? "unknown"}`,
    `PPG: ${p.ppg ?? "unknown"}`,
    `Injury status: ${p.injStatus || "none"}`,
    `Dynasty score: ${p.score ?? "unknown"}`,
    `Tier: ${p.tier || "unknown"}`,
    `Years exp: ${p.yrsExp ?? "?"}`,
  ].join(" | ") : "No roster data available";

  const headlineBlock = headlines.length > 0
    ? headlines.slice(0, 12).join("\n")
    : "No recent headlines found.";

  const flagList = [
    "BREAKOUT_YOUNG", "BREAKOUT_ROLE", "DEPTH_PROMOTED", "CAMP_BATTLE",
    "IR_RETURN", "TRADE_DEMAND", "SUSPENSION", "AGE_CLIFF",
    "FREE_AGENT", "NEW_OC", "CONTRACT_YEAR",
  ].join(" | ");

  const prompt = `You are a dynasty fantasy football analyst. Analyse this player's current situation.

Player: ${name}
Roster data: ${context}

Recent NFL headlines (scan for relevance to this player only):
${headlineBlock}

Return ONLY valid JSON — no explanation, no markdown:
{"signal":"BUY"|"SELL"|"HOLD"|"WATCH","flag":"${flagList}"|null,"note":"One sentence situation summary, max 120 chars","reasoning":"2-3 sentence dynasty analysis. Be specific about age, role, and dynasty value."}`;

  try {
    const data = await callAnthropic({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages:   [{ role: "user", content: prompt }],
    }, apiKey);

    const raw = data?.content?.[0]?.text?.trim();
    if (!raw) return null;

    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (!parsed.signal) return null;

    return { ...parsed, status: "done", approved: false };
  } catch (e) {
    console.warn("claudeAnalyse failed:", e.message);
    return null;
  }
};

// ─── FETCH HEADLINES ─────────────────────────────────────────────────────────
// Shared headline + trending fetch used by runIntel and watchlist research.
// Returns { headlines, trending } — both non-fatal (return empty on failure).

export const fetchIntelSources = async () => {
  let headlines = [];
  let trending  = [];

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

  return { headlines, trending };
};

// ─── RUN INTEL SCAN ───────────────────────────────────────────────────────────
// Full Intel Scan — processes all rostered skill players.
// Auto-detects situations from headlines, derives BUY/SELL/HOLD/WATCH signals.
// Returns { newsMap, enrichedPlayers }.

export const runIntel = async (players) => {
  const { headlines, trending } = await fetchIntelSources();

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
    .filter(p => ["QB", "RB", "WR", "TE"].includes(p.pos))
    .forEach(p => {
      const intel = deriveSignal(p, headlines);

      // Trending override
      if (trending.includes(p.pid) && intel.signal === "HOLD") intel.signal = "WATCH";

      // Situation flag → signal overrides
      if ((p.situationFlag === "BREAKOUT_YOUNG" || p.situationFlag === "BREAKOUT_ROLE") && intel.signal === "HOLD") intel.signal = "BUY";
      if (p.situationFlag === "DEPTH_PROMOTED"  && intel.signal === "HOLD") intel.signal = "BUY";
      if (p.situationFlag === "CAMP_BATTLE"     && intel.signal === "HOLD") intel.signal = "WATCH";
      if (p.situationFlag === "IR_RETURN"       && intel.signal === "HOLD") intel.signal = "WATCH";
      if (p.situationFlag === "TRADE_DEMAND")                                intel.signal = "SELL";
      if (p.situationFlag === "SUSPENSION")                                  intel.signal = "WATCH";
      if (p.situationFlag === "AGE_CLIFF"       && intel.signal === "HOLD") intel.signal = "WATCH";
      if (p.situationFlag === "FREE_AGENT")                                  intel.signal = "WATCH";

      result[p.name] = {
        ...intel,
        situationFlag: p.situationFlag,
        situationNote: p.situationNote,
      };
    });

  return { newsMap: result, enrichedPlayers };
};
