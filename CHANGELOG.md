# MGG Dynasty — Changelog

All notable changes to MGG Dynasty are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.8.0] — 2025-03-07 · Batch 2 — Identity System

### Added
- **Sleeper username login** — users verify their identity against `api.sleeper.app/v1/user/{username}`, which auto-matches their Sleeper display name to a league roster. No passwords, no backend.
- **Namespaced localStorage** — all personal data (watchlist, big board, situations, FA watchlist) is now keyed by `mgg_{type}_{userId}` so multiple users can share a device without data bleed. See `storage.js`.
- **Legacy data migration** — on first login, any pre-0.8.0 non-namespaced data is automatically copied into the user's namespace so nothing is lost on upgrade.
- **Manual login fallback** — if league data is already loaded, users can skip Sleeper verification and pick their team directly from the owner list.
- **Commissioner mode** — passphrase-gated (set `COMMISSIONER_PASS` in `identity.js` before deploying). Unlocks full team browsing with read-only view mode.
- **View mode** — commissioner can click any team to browse it in full read-only context. A persistent `👁 VIEWING: TeamName` banner tracks the active view with a one-click exit.
- **Account panel** — clicking the identity pill in the header re-opens the account modal where users can correct their owner-roster mapping or log out.
- **Quick-jump team buttons** in Settings modal for commissioners to instantly enter view mode for any team.

### Changed
- Owner picker modal replaced entirely by the Sleeper login flow.
- Identity pill in header now shows commissioner star `★` when commissioner mode is active.
- `onViewTeam` prop added to Dashboard and LeagueHub — only passed when `isCommissioner` is true.
- TeamHub, PlayerHub now receive `isViewMode`, `activeOwner`, and `currentOwner` as distinct props so tabs can differentiate the user's own data from a viewed team.
- `AnalysisTools` / `DraftHub` always use `currentOwner` (not `activeOwner`) so personal trade / draft data is never overwritten during view mode.

### New Files
- `src/storage.js` — `lsKey`, `lsGet`, `lsSet`, `lsDel`, `runMigration` pure utility functions.
- `src/identity.js` — `useIdentity` React hook encapsulating all login / commissioner / view-mode state and actions.

### Refactored
- `App.jsx` reduced from ~960 lines to ~470 lines by extracting identity logic into `identity.js` and storage helpers into `storage.js`.
- All `localStorage.setItem/getItem` calls inside App replaced with `ls.get` / `ls.set` shorthand backed by namespaced keys.

---

## [0.7.1] — 2025-02 · Batch 1 — Bug Fixes + Claude API

### Fixed
- **Traded picks season filter** — `loadData` was applying all traded picks including past/current season picks to future pick projections, causing duplicate or ghost picks in My Picks. Added `if (Number(season) <= currentSeason) return;` guard inside the `tradedPicks.forEach` loop.
- **`SEASON_MODES` not defined** — constant was declared inside the App component body, making it unavailable during render. Moved to module level.
- **`saveKey` / `clearKey` / `getStoredKey` not defined** — these functions were accidentally dropped during a prior patch. Restored inside the App component.
- **`getStoredKey` called before definition** — reordered function declarations so `saveKey` / `clearKey` / `getStoredKey` (line 337–349) are defined before `requestClaudeTradeNarrative` (line 351) which calls them.

### Added
- **Claude AI watchlist research** (`claudeAnalyse`) — when an Anthropic API key is present (or running in claude.ai where the API is auto-proxied), the Watchlist Research feature uses Claude Haiku to analyse player situations from ESPN headlines instead of the rule-based `deepAnalyse` fallback.
- **Claude trade narrative** (`claudeTradeAnalysis`) — Trade Analyzer verdict bar gains an `⚡ AI ANALYSIS` button that calls Claude for a 2–3 sentence dynasty-context narrative beyond the score-difference heuristic.
- **`isProxied()` helper** — detects claude.ai / anthropic.com hostname to skip API key requirement when running inside the Claude artifact environment.
- **`claudeTradeNarrative` / `claudeTradeLoading` state** — purple narrative panel renders below the verdict bar after Claude responds.
- **`hasApiKey` prop** to `AnalysisTools` → `Trade` — AI button only renders when key is available.
- **`tradeReset()` updated** to clear `claudeTradeNarrative` on trade reset.
- **`claudeAnalyse` export** added to `api.js`.
- **`claudeTradeAnalysis` export** added to `api.js`.

---

## [0.7.0] — 2025-01 · Initial Public Release

### Core features at launch
- Sleeper API sync — rosters, depth charts, 18-week transaction history, draft pick reconstruction (own + traded picks for next 3 seasons).
- Sleeper Stats — 18-week weekly bulk calls, PPG, starts, game log per player.
- Dynasty scoring engine — weighted composite of PPG production, age curve, role confidence, transaction demand, situation multipliers.
- Five-tier system — Elite / Starter / Flex / Depth / Stash derived from normalised score distribution.
- **Dashboard** — league-wide overview, tier breakdowns, top assets by position.
- **League Hub** — all rosters ranked side-by-side, owner grade cards.
- **Team Hub** — placeholder (full build planned Batch 2).
- **Player Hub** — filterable big board with sort, tier, position filters; player detail drawer; IDP support.
- **Analysis Tools → Trade Analyzer** — add players and picks, custom pick values, score-based heuristic verdict.
- **Analysis Tools → Situations** — manual situation flags (BREAKOUT, NEW_OC, SUSPENSION, etc.) with CRUD editor; Intel Scan auto-detection from ESPN headlines.
- **Analysis Tools → Watchlist** — player names tracked for deep research; rule-based `deepAnalyse` signal engine.
- **Analysis Tools → FA Browser** — filters unrostered players from Sleeper's full NFL DB by position, age, depth, injury.
- **Draft Hub** — Mock Draft mode (snake, AI auto-picks) + Live Draft connector for Sleeper draft IDs. Big Board with drag-sort, notes, rookie/all filter.
- **Intel Scan** — ESPN headline fetch, BUY/SELL/HOLD/WATCH signals, Sleeper trending add overlay.
- **XLSX Export** — multi-sheet workbook (Roster, Big Board, Situations, FA Watchlist, Draft Picks, Log).
- Season mode pills (offseason / preseason / inseason / playoffs / complete) — auto-detected from Sleeper, manually overrideable.
- Owner picker modal — simple team selection saved to `mgg_owner` in localStorage (replaced in 0.8.0).
- API key modal — Anthropic key stored in `mgg_anthropic_key`, warning dot when missing.
- Sync log tab with colour-coded progress entries.
- GitHub Pages deployment via `gh-pages` branch, Vite build.

---

## [0.8.1] — 2025-03-07 · Patch — Login + League Key

### Fixed
- **Login modal never showed on first load** — `loginOpen` was hardcoded to `false` in `useIdentity`. Now initialises to `true` when no `mgg_identity` exists in localStorage, so the Sleeper login prompt appears immediately on first visit.
- **Old owner picker still visible** — `mgg_owner` key from pre-0.8.0 was persisting in localStorage and causing confusion. `finaliseLogin` and `doManualLogin` now explicitly call `localStorage.removeItem("mgg_owner")` on login.
- **Owner matching never worked** — `useIdentity` received `owners: []` at hook init time because players hadn't loaded yet. Owner matching + lockout logic moved to `handleSleeperLogin` in App.jsx where the live `owners` array is available.
- **`loginLoading` not reset on error** — added `setLoginLoading(false)` inside `doSleeperLogin` error path.

### Added
- **Shared league key** (`LEAGUE_API_KEY` in `constants.js`) — a single Anthropic API key that works for all league members automatically. No per-user key setup needed. Falls back to personal key in Settings if set, falls back to league key if not. Add the constant to `constants.js` alongside `LEAGUE_ID`.
- **Non-league-member lockout** — after Sleeper verification, if the display name doesn't fuzzy-match any loaded roster owner, login is denied with a clear error message. Only possible to bypass via "skip verification" fallback (collapible, hidden by default).
- **`getApiKey()` helper** (module-level in App.jsx) — resolves key priority: proxied → personal localStorage key → `LEAGUE_API_KEY` constant → empty string.
- **League key status banner** in Settings modal — shows "✓ LEAGUE KEY ACTIVE" when `LEAGUE_API_KEY` is set, so users know AI features are enabled without needing to enter anything.
- **Manual login hidden behind `<details>`** — "skip verification" fallback is collapsed by default so the primary Sleeper verification flow is the obvious path.
