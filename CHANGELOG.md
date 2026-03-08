# MGG Dynasty — Changelog

## [1.0.9] — 2026-03-08 · Draft Hub Overhaul + Logic Architecture

### New Files
**`src/draft.js`** — single source of truth for all draft logic
- `isActivePlayer(p)` — active player gate (no more retired/cut/phantom players in pool)
- `filterDraftPool(nflDb, options)` — unified pool builder used by BigBoard and MockDraft
- `buildSnakeOrder(teams, rounds)` — snake draft order generator
- `scoreDraftPlayer(p, bigBoard, players, archetype)` — archetype-aware player scoring
- `aiAutoPick(pool, archetype, context)` — AI pick logic per opponent
- `ARCHETYPES` — 6 opponent philosophies: BPA, Win Now, Rebuilder, RB Needy, Zero RB, Trade Happy
- `ROUND_LABEL`, `ROUND_COLORS` — shared constants, no more duplication across components

**`src/trade.js`** — all trade evaluation logic
- `pickValue(round, yearOffset)` — pick valuation (extracted from App.jsx)
- `itemScore(item)` — unified player/pick scorer (extracted from App.jsx)
- `tradeTotal(items)` — side total (extracted from App.jsx)
- `tradeVerdict(sideA, sideB)` — FAIR / SLIGHT WIN / CLEAR WIN / LOPSIDED (extracted from App.jsx)
- `pickRoundCeiling(marketValue)` — market value to round ceiling
- `pickEquivLabel(value)` — market value badge label + colour
- `claudeTradeAnalysis(...)` — AI trade narrative, now uses `callAnthropic` from `anthropic.js`

**`src/intel.js`** — all signal detection and AI player analysis
- `HEADLINE_RULES` — situation flag definitions (extracted from api.js)
- `SIG_MAP` — flag → BUY/SELL/HOLD/WATCH mapping (extracted from api.js)
- `deepAnalyse(name, headlines, p)` — rule-based player analysis (extracted from api.js)
- `fetchIntelSources()` — shared ESPN + Sleeper trending fetch
- `runIntel(players)` — full Intel Scan orchestration (extracted from api.js)
- `claudeAnalyse(name, headlines, p, apiKey)` — AI player analysis, now uses `callAnthropic`

**`src/roster.js`** — all roster evaluation logic
- `gradeRoster(owner, players)` — full grade object (moved out of Roster.jsx UI file)
- `isSellHigh(p, newsMap, ownerRoster)` — **single canonical definition** fixing the duplication bug where Dashboard.jsx used score≥60 and TeamHub.jsx used score≥55. Now uses relative threshold: top 35% of owner's roster with a 45-point floor
- `leagueAvgByPos(players)` — positional league average (extracted from Dashboard.jsx)
- `weakPositions(myGrade, players)` — weakest positions vs league (extracted from Dashboard.jsx)
- `sellHighCandidates(roster, newsMap)` — sorted sell-high list using canonical isSellHigh
- `tradeTargets(owner, myGrade, players, newsMap)` — trade targets based on positional need

**`src/watchlist.js`** — watchlist research orchestration
- `runWatchlistResearch(names, options)` — AI + rule-based research per player (extracted from App.jsx). Calls `onResult` incrementally so UI updates per player. Uses `claudeAnalyse` + `deepAnalyse`.

### Changed
- **`src/api.js`** — slimmed from 593 → ~344 lines. Now owns only Sleeper data fetching (`loadData`). Re-exports `runIntel`, `deepAnalyse`, `claudeAnalyse`, `claudeTradeAnalysis` for backward compat.
- **`src/App.jsx`** — imports updated to pull from new modules. Inline `pickValue`, `itemScore`, `tradeTotal`, `tradeVerdict` removed. `runWatchlistResearch` delegated to `watchlist.js`.
- **`src/tabs/drafthub/BigBoard.jsx`** — pool now built via `filterDraftPool` from `draft.js`. `ROUND_COLORS` and `ROUND_LABEL` imported from `draft.js`. Pool cap raised 120→300.
- **`src/tabs/drafthub/DraftRoom.jsx`** — `buildSnakeOrder`, pool building, and player scoring all imported from `draft.js`. Mock draft default rounds reads from `seasonState.draftRounds`. Archetype selector on setup screen.
- **`src/tabs/DraftHub.jsx`** — `seasonState` and `rosterIdToOwner` now passed through to DraftRoom.
- **`src/anthropic.js`** — was being bypassed by api.js (raw fetch used instead). Now the single gateway for all Claude API calls across `intel.js` and `trade.js`.

### Bug Fixes
- Fake/retired players appearing in BigBoard and MockDraft pool — fixed via `isActivePlayer` gate in `draft.js`
- Mock draft capped at 8 rounds — options now `[5,6,7,8,9,10]`, default 10
- BigBoard round colors recycled after round 5 — extended to 10 distinct colours
- LiveDraft `picked_by` showed raw user ID — now maps through `slot_to_roster_id`
- Sell-High never triggered — absolute score threshold replaced with relative threshold in `roster.js`

### Module Dependency Map
```
anthropic.js   ← no dependencies (key management + API gateway)
constants.js   ← no dependencies
scoring.js     ← constants.js
draft.js       ← constants.js, scoring.js
roster.js      ← constants.js
intel.js       ← anthropic.js, scoring.js
trade.js       ← constants.js, anthropic.js
watchlist.js   ← intel.js
api.js         ← constants.js, scoring.js + re-exports from intel/trade
App.jsx        ← api.js, intel.js, trade.js, watchlist.js, roster.js
```

---

## [1.0.8c] — 2026-03-08 · Draft Hub Bug Fixes

- Active player gate on BigBoard and MockDraft pool
- Mock draft rounds extended to 10, default raised to 10
- Round colors extended to 10 distinct values
- BigBoard pool cap raised 120→300
- LiveDraft `picked_by` now shows team name instead of raw user ID
- `rosterIdToOwner` threaded from DraftHub → DraftRoom → LiveDraft

---

## [1.0.8b] — Prior · 10-Round Draft Fix + Sync Crash Hotfix

- Fixed sync crash: `userIdToOwner` missing from api.js return object
- `App.jsx` destructure guard: `uid2o = {}` default
- `constants.js` PICK_VALUES/PICK_ROUNDS extended to all 10 rounds
- `MyPicks.jsx` ROUND_LABEL/ROUND_COLOR extended to round 10
- `ktc.js` pickEquivLabel and pickRoundCeiling updated for 10-round scale

---

## [1.0.8] — Prior · Market Value Integration (KTC + FantasyCalc)

- New `src/ktc.js` — FantasyCalc + KTC parallel fetch with fuzzy name matching
- Updated score formula: marketValue_n × 0.50 when matched (~85% of players)
- `pickRoundCeiling` hard-gates pick suggestions by real market value
- Sell-High card shows KTC aggregate value + pick-equivalent badge
- My Roster expand panel shows FC Value, KTC Value, Market Value
