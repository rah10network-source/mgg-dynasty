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
  // ── In-season / roster flags ─────────────────────────────────────────────
  { flag: "TRADE_DEMAND",   terms: ["trade request", "requested trade", "wants out", "unhappy", "demands trade"] },
  { flag: "FREE_AGENT",     terms: ["released", "cut by", "waived", "terminated contract"] },
  { flag: "SUSPENSION",     terms: ["suspended", "suspension", "banned"] },
  { flag: "IR_RETURN",      terms: ["return from ir", "activated from ir", "cleared to return", "off injured reserve"] },
  { flag: "CAMP_BATTLE",    terms: ["competition", "camp battle", "depth chart battle", "competing for starting", "position battle"] },
  { flag: "DEPTH_PROMOTED", terms: ["named starter", "takes over as starter", "steps in at", "starting in place", "promoted to starter"] },
  { flag: "BREAKOUT_ROLE",  terms: ["lead back", "featured back", "bell cow", "every down back", "expanded role", "target share increase"] },
  { flag: "NEW_OC",         terms: ["traded to", "acquired by", "sent to", "new team", "offensive coordinator", "new oc", "scheme change"] },
  { flag: "CONTRACT_YEAR",  terms: ["contract year", "final year of", "extension talks", "upcoming free agent"] },
  // ── Draft / combine / prospect flags ────────────────────────────────────
  { flag: "BREAKOUT_ROLE",  terms: ["first round pick", "top prospect", "elite prospect", "projected first round", "round one talent", "top 10 pick", "top 5 pick", "number one overall"] },
  { flag: "BREAKOUT_ROLE",  terms: ["scheme fit", "ideal landing spot", "best fit", "plug-and-play", "immediate starter", "day one starter"] },
  { flag: "DEPTH_PROMOTED", terms: ["signed by", "rookie contract", "undrafted free agent", "udfa", "signed as udfa", "practice squad signing"] },
  { flag: "CAMP_BATTLE",    terms: ["combine workout", "pro day", "draft visit", "pre-draft visit", "top 30 visit", "private workout", "on-field workout"] },
  { flag: "IR_RETURN",      terms: ["medicals cleared", "passed physical", "clean bill of health", "cleared medicals", "injury concern cleared"] },
  { flag: "SUSPENSION",     terms: ["character concerns", "off-field issues", "conduct flag", "red flag", "do not draft"] },
  { flag: "FREE_AGENT",     terms: ["going undrafted", "draft stock falling", "sliding in draft", "dropping in rankings", "fell out of draft"] },
  { flag: "BREAKOUT_ROLE",  terms: ["combine standout", "pro day standout", "raised draft stock", "stock rising", "rocketed up boards"] },
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
// Sources:
//   1. ESPN NFL news         — in-season player news, injuries, transactions
//   2. ESPN CFB news         — college player news, pre-draft coverage, pro days
//   3. ESPN NFL draft news   — combine, draft stock, prospect rankings
//   4. NFL.com RSS           — official league news, signings, transactions
//   5. Yahoo Sports NFL RSS  — broader NFL coverage, fantasy-focused angles
//   6. Fox Sports NFL RSS    — transactions, injuries, roster news
//   7. Sleeper trending      — community add trends (dynasty/redraft signal)
// Returns { headlines, trending } — both non-fatal (return empty on failure).

export const fetchIntelSources = async () => {
  let headlines = [];
  let trending  = [];

  const fetchHeadlines = async (url, parser) => {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const d = await parser(r);
        headlines = [...headlines, ...d];
      }
    } catch {}
  };

  // 1. ESPN NFL — primary in-season source
  await fetchHeadlines(
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=100",
    async r => {
      const d = await r.json();
      return (d.articles || []).map(a => a.headline || a.title || "").filter(Boolean);
    }
  );

  // 2. ESPN College Football — pro days, combine, prospect news, senior bowl
  await fetchHeadlines(
    "https://site.api.espn.com/apis/site/v2/sports/football/college-football/news?limit=80",
    async r => {
      const d = await r.json();
      return (d.articles || []).map(a => a.headline || a.title || "").filter(Boolean);
    }
  );

  // 3. ESPN NFL Draft — draft stock, combine workouts, team visits, mocks
  await fetchHeadlines(
    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=60&topic=nfl-draft",
    async r => {
      const d = await r.json();
      return (d.articles || []).map(a => a.headline || a.title || "").filter(Boolean);
    }
  );

  // 4. NFL.com RSS — official signings, transactions, roster moves
  await fetchHeadlines(
    "https://www.nfl.com/feeds/news/en_US/nfl_news_feed.rss",
    async r => {
      const text = await r.text();
      // Parse RSS <title> tags — lightweight, no DOM parser needed
      const titles = [];
      const re = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        const t = (m[1] || m[2] || "").trim();
        if (t && !t.toLowerCase().includes("nfl.com")) titles.push(t);
      }
      return titles;
    }
  );

  // 5. Yahoo Sports NFL RSS — fantasy-focused angles, injuries, transactions
  await fetchHeadlines(
    "https://sports.yahoo.com/nfl/rss.xml",
    async r => {
      const text = await r.text();
      const titles = [];
      const re = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        const t = (m[1] || m[2] || "").trim();
        if (t && !t.toLowerCase().includes("yahoo sports")) titles.push(t);
      }
      return titles;
    }
  );

  // 6. Fox Sports NFL RSS — transactions, injuries, roster moves
  await fetchHeadlines(
    "https://api.foxsports.com/v2/content/optimized-rss?partnerKey=MB0Wehpmuj2lUhuRhQaafhBjAJfteDze&size=50&tags=fs/nfl",
    async r => {
      const text = await r.text();
      const titles = [];
      const re = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g;
      let m;
      while ((m = re.exec(text)) !== null) {
        const t = (m[1] || m[2] || "").trim();
        if (t && !t.toLowerCase().includes("fox sports")) titles.push(t);
      }
      return titles;
    }
  );

  // 7. Sleeper trending adds — dynasty community signal
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

  // Deduplicate headlines
  headlines = [...new Set(headlines)];

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
