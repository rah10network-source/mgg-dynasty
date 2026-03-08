// ─── WATCHLIST RESEARCH LOGIC ─────────────────────────────────────────────────
// Extracted from App.jsx runWatchlistResearch.
// Orchestrates AI + rule-based analysis for the Hub watchlist research feature.
//
// Consumers:
//   App.jsx  — calls runWatchlistResearch, receives result map via callback
//   Hub.jsx  — renders research results, approve button saves to situations
//
// Philosophy:
//   AI as advisor — generates a flag + signal + reasoning per player.
//   The user must explicitly approve before it saves to their situations list.
//   deepAnalyse is always run as a fallback so the feature works without an API key.

import { claudeAnalyse, deepAnalyse, fetchIntelSources } from "./intel";

// ─── RUN WATCHLIST RESEARCH ───────────────────────────────────────────────────
// Analyses a list of player names against ESPN headlines + Sleeper data.
// Calls onResult(name, result) after each player so the UI can update incrementally.
// Returns the final complete results map.
//
// options.apiKey    — Anthropic API key (or null if proxied)
// options.isProxied — true if running inside claude.ai (no key needed)
// options.nflDb     — raw Sleeper player database for player data lookup
// options.players   — rostered players list (for ppg, gamesStarted, etc.)

export const runWatchlistResearch = async (
  names,
  { apiKey, isProxied, nflDb, players, onResult, onProgress }
) => {
  const useAI = isProxied || !!apiKey;
  const results = {};

  onProgress?.(`Fetching news sources...`);
  const { headlines, trending } = await fetchIntelSources();

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    onProgress?.(`Researching ${name} (${i + 1}/${names.length})...`);

    // Find player data — check rostered players first, then nflDb
    const rostered = players.find(p => p.name === name);
    let p = rostered;

    // If not rostered, build a minimal profile from nflDb
    if (!p && nflDb) {
      const entry = Object.entries(nflDb).find(([, pl]) => {
        const n = (pl.full_name || `${pl.first_name || ""} ${pl.last_name || ""}`)
          .toLowerCase().trim();
        return n === name.toLowerCase().trim();
      });
      if (entry) {
        const [, pl] = entry;
        p = {
          name,
          pos:        pl.position,
          team:       pl.team || "FA",
          age:        null,
          depthOrder: pl.depth_chart_order || null,
          injStatus:  pl.injury_status || null,
          status:     pl.status || null,
          yrsExp:     pl.years_exp ?? null,
          trades:     0,
          adds:       0,
          gamesStarted: null,
          ppg:        null,
          score:      null,
          tier:       null,
        };
      }
    }

    const isTrending = trending.includes(rostered?.pid);
    let result = null;

    // ── AI analysis (primary) ────────────────────────────────────────────────
    if (useAI) {
      try {
        result = await claudeAnalyse(name, headlines, p, isProxied ? null : apiKey);
        if (result) {
          if (isTrending && result.signal === "HOLD") result.signal = "WATCH";
          if (isTrending) result.reasoning += " Also trending on Sleeper adds.";
        }
      } catch {}
    }

    // ── Rule-based fallback ──────────────────────────────────────────────────
    if (!result) {
      const rr = deepAnalyse(name, headlines, p);
      if (rr) {
        if (isTrending && rr.signal === "BUY") rr.reasoning += " Also trending on Sleeper adds.";
        result = rr;
      } else {
        result = {
          flag:      null,
          note:      `No notable situation found in ${headlines.length} recent articles`,
          signal:    isTrending ? "WATCH" : "HOLD",
          reasoning: isTrending
            ? "No news flags but player is trending on Sleeper adds."
            : "Player appears stable — no injury, role change, or situation flags detected.",
          status:    "done",
          approved:  false,
        };
      }
    }

    results[name] = result;
    onResult?.(name, result);
  }

  return results;
};
