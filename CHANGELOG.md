# MGG Dynasty — Changelog

All notable changes to MGG Dynasty are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.0.8] — 2026-03-07 · Market Value Integration (KTC + FantasyCalc)

### Added
- **`src/ktc.js`** — new module that fetches dynasty trade values from FantasyCalc (primary) and KTC (secondary) in parallel on every sync. Both sources are non-fatal — if one is unavailable the other carries it; if both fail the app falls back to the internal scoring model gracefully.
- **Name fuzzy-matching** — three-pass algorithm strips Jr./Sr./II/III/IV suffixes, then tries exact match → last name + first initial → unambiguous last name only. Handles common mismatches between Sleeper names and external databases.
- **`p.fcValue` / `p.ktcValue` / `p.marketValue`** — three new fields on every matched player. `marketValue` is the average of whichever sources were available, used as the scoring anchor.
- **`pickEquivLabel(value)`** export — maps a raw market value to an honest pick-equivalent tier with colour and plain-English note. Sutton (~350) → "4th round / depth". Jefferson (~9000) → "Franchise piece — don't sell without a king's ransom".
- **Market value badge on Sell-High cards** — each sell candidate now shows its KTC aggregate value and pick-equivalent tier label so the realistic ask is immediately visible.
- **Market value in player expand panel** — My Roster expanded row now shows FC Value, KTC Value, and Market Value (aggregate) alongside dynasty metrics.

### Changed
- **Score formula updated** — when market data is matched (expected 80–90%+ of rostered players):
  - `marketValue_n × 0.50` — external market floor / anchor (KTC + FC aggregate)
  - `prodProxy_n × 0.25` — your league's actual fantasy scoring output
  - `ageGated_n × 0.15` — real-life situation (age curve, role, depth chart)
  - `demandRaw_n × 0.10` — what your league values via trades and waiver adds
  - Falls back to the previous 4-factor formula for unmatched players.
- **`pickRoundCeiling(marketValue)`** — pick suggestions in Sell-High are now hard-gated by real market value. A player at ~350 cannot generate a 1st-round pick suggestion under any circumstance.
- **Sell-High suggestion engine** — contending teams (B+/WIN NOW/CONTEND) remain primary pick targets, but round ceiling is anchored to market value not internal tier. Picks from rebuilding teams only appear if the player's market value actually warrants them.

---

## [1.0.7] — 2026-03-07 · Team Hub Refinement

### Fixed
- **Account modal team-switching bug** — "YOUR TEAM" section called `setOwnerMapping` unconditionally, permanently switching identity and causing watchlist data to bleed across teams. Full owner list now hidden behind a `▸ Wrong team? Correct it` collapsible.
- **Targets tab only showed QBs** — suggestion list sorted all positions into a flat array dominated by QB scarcity values. Now grouped per position with a separate top-3 grid each.
- **`draftPicksByOwner` not passed to TeamHub** — prop was missing from the TeamHub render call in App.jsx.

### Changed
- **Top Players section** — replaced flat row-of-boxes with a position grid. Each position gets its own card showing top 2 players with score, age, depth slot, PPG, and Intel signal.
- **My Roster** — click any row to expand a 3-panel detail view: Profile, Dynasty Metrics, Intel + per-player Notes/Memo field.
- **Alerts tab** — decorative summary boxes removed. Sell High / Injury Watch / Age Cliff are now proper expandable panels. Red badge shows total count.
- **Sell-High suggestions** — context-aware engine: contending teams prioritised as pick sources; rebuilding teams as sources of young players; middle teams only when positional need is clear.
- **Targets tab** — positional gap banner, personal target list (add/remove by name), top 3 available per position across the league, BUY-signal bump, ⚠ GAP flag.

---

## [1.0.6] — 2026-03-06 · Team Hub Full Build + Owner Matching Fix

### Fixed
- **Owner auto-matching via Sleeper userId** — fuzzy display name matching failed when Sleeper name and league team name differed. `loadData` now returns `userIdToOwner`; App.jsx uses `userIdToOwner[identity.userId]` for direct silent matching.

### Added
- **Team Hub full build** — Overview (grade card, position depth bars), My Roster (sortable/filterable table), Alerts (sell-high / injury / cliff panels), Targets (positional need weighting).
- **`newsMap` prop** threaded to TeamHub so Intel signals appear on roster and alert views.

---

## [1.0.5] — 2026-03 · Login Auto-Open + Cleanup

### Fixed
- Login modal didn't open on first load — `loginOpen` now initialises to `true` when no identity exists.
- Settings wheel removed, consolidated into account modal.
- Owner matching moved to App.jsx where the live owners array is available.

---

## [1.0.4] — 2026-03 · Identity System + Claude API + Storage Extraction

### Added
- Sleeper username login — verifies against Sleeper API, auto-matches to roster. No passwords, no backend.
- Namespaced localStorage (`src/storage.js`) — `mgg_{type}_{userId}` keys per user.
- Commissioner mode — passphrase-gated, read-only team browsing with `👁 VIEWING` banner.
- Claude AI trade narrative — `⚡ AI ANALYSIS` in Trade Analyzer.
- Claude AI watchlist research — uses Claude Haiku when API key is present.
- `isProxied()` helper — skips key requirement inside claude.ai.
- Shared league API key (`LEAGUE_API_KEY` in constants.js).
- Traded picks season guard — fixed ghost picks from current/past seasons appearing in future projections.

### New Files
- `src/storage.js` — namespaced localStorage utilities.
- `src/identity.js` — `useIdentity` hook (login, commissioner, view mode).

---

## [1.0.3] — 2026-02 · Analysis Tools + API Key Settings

### Added
- Analysis Tools tab: Situations editor, Watchlist research, FA Browser.
- Manual situation flags CRUD editor (BREAKOUT_YOUNG, BREAKOUT_ROLE, NEW_OC, SUSPENSION…).
- Intel Scan auto-detection from ESPN headlines.
- API key settings modal.

---

## [1.0.2] — 2026-02 · Bug Fixes

### Fixed
- Watchlist persistence and FA database filter state bugs.
- IDP stat line display.

---

## [1.0.1] — 2026-02 · News + API Key Fixes

### Fixed
- ESPN news fetch CORS handling.
- API key storage and retrieval edge cases.

---

## [1.0.0] — 2026-01 · Initial Release

### Core features
- Sleeper API sync — rosters, depth charts, 18-week transaction history, draft pick reconstruction (3 future seasons, own + traded picks).
- Dynasty scoring engine — production, age curve, role confidence, transaction demand, situation multipliers.
- Five-tier system — Elite / Starter / Flex / Depth / Stash.
- Dashboard, League Hub, Player Hub (big board + IDP), Trade Analyzer, Draft Hub (mock + live), Intel Scan, XLSX Export.
- GitHub Pages deployment via Vite + gh-pages.

---

## [1.0.8c] — 2026-03-08 · Draft Hub Bug Fixes

### Fixed
- **Big Board fake/retired players** — pool filter now applies an active player gate. Filters out any player with status `Inactive`, `Retired`, `Suspended`, `Cut`, `Released`, or `PracticeSquad`. Veterans with no team and more than 2 years experience (almost certainly cut or retired) are also excluded. Rookies (`years_exp === 0`) with no team are kept — they haven't been assigned yet.
- **Mock Draft capped at 8 rounds** — rounds options extended to `[5,6,7,8,9,10]`, default set to 10 to match league settings.
- **Mock Draft pool had same fake player problem** — same active player gate applied to the MockDraft pool in `DraftRoom.jsx`.
- **Big Board round colors recycled after round 5** — `ROUND_COLORS` extended to 10 distinct colors (green, blue, amber, orange, purple, cyan, pink, lime, slate, gray). No more confusing color repetition in a 10-round board.
- **Big Board pool cap too low** — raised from 120 to 300 players to ensure `ROOKIES + VETS` mode doesn't truncate the available pool.
- **LiveDraft `picked_by` showed raw user ID** — now maps through `draft.slot_to_roster_id` to show team name, with `pk.metadata.team` as fallback.
- **`rosterIdToOwner` not passed to DraftRoom/LiveDraft** — prop now threaded from `DraftHub` → `DraftRoom` → `LiveDraft` for owner name resolution.

### Planned for 1.0.9
- Extract `src/draft.js` — snake order, pool filtering, player scoring as standalone logic module
- Mock Draft opponent archetypes (RB Needy, Win Now, Trade Heavy, BPA, Rebuilder)
- Big Board Intel Scan — news briefings on players you've added to your board
- `src/trade.js` extraction from App.jsx

---

## [1.0.9] — 2026-03-08 · Draft Hub Overhaul + Logic Architecture

### Added
- **`src/draft.js`** — new standalone logic module, single source of truth for all draft logic:
  - `isActivePlayer(p)` — active player gate (no more retired/cut/phantom players)
  - `filterDraftPool(nflDb, options)` — unified pool builder used by both BigBoard and MockDraft
  - `buildSnakeOrder(teams, rounds)` — snake draft order generator (moved out of DraftRoom)
  - `scoreDraftPlayer(p, bigBoard, players, archetype)` — archetype-aware player scoring
  - `aiAutoPick(pool, archetype, context, bigBoard, players)` — AI pick logic per opponent
  - `ARCHETYPES` — 6 opponent draft philosophies: BPA, Win Now, Rebuilder, RB Needy, Zero RB, Trade Happy
  - `ROUND_LABEL`, `ROUND_COLORS` — shared across BigBoard and DraftRoom (no more duplication)

- **Mock Draft opponent archetypes** — each opponent slot in the setup screen now has a dropdown to assign a draft philosophy. Archetypes change how the AI weighs players — Win Now ignores rookies, Rebuilder loves them, RB Needy inflates RB scores until 3 are taken, Zero RB stacks WR/TE/QB early, Trade Happy picks unpredictably. "Randomise Opponents" button for quick setup.

- **Archetype display on draft board** — column headers show the opponent's archetype label in their colour so you can track who's drafting what philosophy during the sim.

### Changed
- **`BigBoard.jsx`** — pool now built via `filterDraftPool` from `draft.js`. Active player gate and position/search filters all in one place. `ROUND_COLORS` and `ROUND_LABEL` imported from `draft.js` instead of duplicated locally.
- **`DraftRoom.jsx`** — `buildSnakeOrder`, pool building, and player scoring all imported from `draft.js`. Mock Draft default rounds now reads from `seasonState.draftRounds` (your actual league setting).
- **`DraftHub.jsx`** — `seasonState` now passed through to DraftRoom so mock draft defaults match league config.
- Round colors on my picks list now use `ROUND_COLORS` from draft.js — consistent 10-round palette throughout.

### Philosophy Note
AI in the draft tools follows the advisor-not-decision-maker principle. Suggestions are based on your Big Board first (your own research is authoritative), dynasty model second, and archetype-adjusted estimates third. The mock draft archetypes make simulation useful for prep — you learn how different opponent types behave — without removing the decision-making from you.

---

## [1.0.9a] — 2026-03-08 · Logic Architecture — Full Module Extraction

### Architecture
Complete extraction of all business logic out of UI files and api.js into dedicated modules. This is the "basket of JS files" — one file per domain, each independently debuggable and testable.

**New logic modules:**

**`src/trade.js`**
- `pickValue(round, yearOffset)` — pick valuation (was inline in App.jsx)
- `itemScore(item)` — unified player/pick scorer (was inline in App.jsx)
- `tradeTotal(items)` — side total (was inline in App.jsx)
- `tradeVerdict(sideA, sideB)` — FAIR/SLIGHT WIN/CLEAR WIN/LOPSIDED (was inline in App.jsx)
- `pickRoundCeiling(marketValue)` — market-value to round ceiling (was in TeamHub.jsx/ktc.js)
- `pickEquivLabel(value)` — market-value badge label + colour (was in ktc.js)
- `claudeTradeAnalysis(...)` — AI trade narrative (moved from api.js, now uses `callAnthropic`)

**`src/intel.js`**
- `HEADLINE_RULES` — situation flag definitions (was in api.js)
- `SIG_MAP` — flag → signal mapping (was in api.js)
- `deepAnalyse(name, headlines, p)` — rule-based player analysis (was in api.js)
- `fetchIntelSources()` — shared ESPN + Sleeper trending fetch (extracted helper)
- `runIntel(players)` — full Intel Scan orchestration (was in api.js)
- `claudeAnalyse(name, headlines, p, apiKey)` — AI player analysis (was in api.js, now uses `callAnthropic`)

**`src/roster.js`**
- `gradeRoster(owner, players)` — full roster grade object (moved from Roster.jsx UI file)
- `isSellHigh(p, newsMap, ownerRoster)` — **canonical single definition** — fixes the bug where Dashboard.jsx used score≥60 and TeamHub.jsx used score≥55. Now uses relative threshold: top 35% of owner's roster OR score≥45 floor
- `leagueAvgByPos(players)` — positional average across league (was inline in Dashboard.jsx)
- `weakPositions(myGrade, players)` — weakest positions vs league avg (was inline in Dashboard.jsx)
- `sellHighCandidates(roster, newsMap)` — sorted sell-high list using canonical isSellHigh
- `tradeTargets(owner, myGrade, players, newsMap)` — trade target suggestions based on positional need

**`src/watchlist.js`**
- `runWatchlistResearch(names, options)` — AI + rule-based watchlist research orchestration (was in App.jsx). Calls incrementally via `onResult` callback so UI updates per player. Uses `claudeAnalyse` + `deepAnalyse` from intel.js.

### Changed
- **`src/api.js`** — slimmed from 593 → ~344 lines. Now owns only Sleeper data loading (`loadData`). Re-exports `runIntel`, `deepAnalyse`, `claudeAnalyse`, `claudeTradeAnalysis` for backward compat while consumers migrate.
- **`src/App.jsx`** — imports updated. Inline `pickValue`, `itemScore`, `tradeTotal`, `tradeVerdict` definitions removed. All now delegated to `trade.js`.
- **`src/anthropic.js`** — was being ignored by api.js (raw fetch used instead). Now used by all AI functions in `intel.js` and `trade.js` — single place for key management, rate limit handling, and header injection.

### Bug Fix
- **Sell-High never triggered** — root cause was absolute score thresholds (55-60) set before market-value reweighted score distributions. Fixed by switching to relative threshold in `roster.js isSellHigh`. Consumers (TeamHub, Dashboard) should now update to import `isSellHigh` and `sellHighCandidates` from `roster.js`.

### Module Dependency Map
```
anthropic.js   ← no dependencies (key management only)
constants.js   ← no dependencies
scoring.js     ← constants.js
draft.js       ← constants.js, scoring.js
roster.js      ← constants.js
intel.js       ← anthropic.js, scoring.js
trade.js       ← constants.js, anthropic.js
watchlist.js   ← intel.js
api.js         ← constants.js, scoring.js, intel.js (re-export), trade.js (re-export)
App.jsx        ← api.js, intel.js, trade.js, watchlist.js, roster.js
```

---

## [1.0.10] — 2026-03-08 · Team Hub Build + Waiver & Compare Infrastructure

### Changed
- **`src/tabs/TeamHub.jsx`** — full build replacing the placeholder. Four tabs:
  - **Overview** — roster grade card (letter + window + contender score + league rank), sell-high alerts strip, positional gap panel, injury alerts, league standings table
  - **My Roster** — full sortable/filterable roster list with position filter, sort by score/age/PPG, Intel signals, injury badges, situation flags
  - **Sell-High** — dedicated view using `sellHighCandidates` from `roster.js`. Explicit SELL signals from Intel Scan surface first. Context note explaining when to sell.
  - **Targets** — trade targets using `tradeTargets` from `roster.js`. Positional weakness context shown above the list. BUY-signal players highlighted.
  - Imports `gradeRoster`, `isSellHigh`, `sellHighCandidates`, `tradeTargets`, `weakPositions` all from `roster.js` — no inline logic.

- **`src/tabs/Dashboard.jsx`** — removed inline `isSellHigh` (score≥60) and `weakPositions` definitions. Now imports canonical versions from `roster.js`. `sellHighCandidates` and `tradeTargets` replace inline filter chains.

### Added
- **`src/tabs/tools/WaiverTool.jsx`** — base infrastructure for waiver wire analysis.
  - Unrostered player pool via `filterDraftPool` from `draft.js` (active player gate applied)
  - Waiver priority score: dynasty value estimate + positional need bonus + trending bonus + injury penalty
  - Three sort modes: BY NEED (default — positional fit first), BY VALUE, TRENDING
  - Position filter, search, weak position badges
  - Add to FA Watchlist button per player
  - No LLM — fully deterministic, works without API key

- **`src/tabs/tools/PlayerCompare.jsx`** — side-by-side player comparison tool.
  - Search rostered players or any player in nflDb
  - Compares: Dynasty Score, Tier, Age, PPG, Games Started, Years Exp, Depth Chart, Role Confidence
  - Green/red colouring shows which player wins each metric
  - Intel signal banners when Intel Scan data is available
  - Season stat lines and situation flags shown below metric table
  - Foundation for future AI narrative comparison via `intel.js`

- **`src/tabs/AnalysisTools.jsx`** — Waiver Tool and Player Compare tabs now active (were disabled placeholders). Props threaded from App.jsx.

- **`src/App.jsx`** — `newsMap`, `setDetail` passed to TeamHub; `players`, `nflDb`, `currentOwner`, `newsMap`, `faWatchlist`, `onAddToFaWatchlist` passed to AnalysisTools.

---

## [1.1.1] — 2026-03-08 · IDP Scoring Fix + Scarcity Recalibration

### Bug Fixes

- **`src/constants.js` — SCORING values corrected** (6 wrong values, 2 missing fields)
  - `pass_int`: −2 → **−1** (per constitution §7.1)
  - `def_pass_def`: 2 → **1** (per constitution §7.3)
  - `def_int`: 6 → **2** (was using Team DEF value, not player IDP)
  - `def_forced_fumble`: 3 → **1** (same)
  - `def_fumble_rec`: 4 → **1** (same)
  - `def_safe`: 8 → **2** (same)
  - Added `def_tackle_ast: 0.5` — assisted tackle, was missing entirely
  - Added `def_qb_hit: 0.5` — QB hit, was missing entirely
  - Added `def_td: 6` — IDP TD, was missing

- **`src/api.js` — STAT_FIELDS** — added `def_tackle_ast`, `def_qb_hit`, `def_safe`, `def_td` to weekly accumulator. These stats were never being summed, so assisted tackles and QB hits were excluded from every IDP player's PPG.

- **`src/api.js` — IDP statLine** — now shows `tkl ast sck qbh int pd` (added assisted tackles + QB hits to the display string).

- **`src/scoring.js` — calcSleeperPts** — now includes all 11 IDP scoring fields. Previously omitted `def_tackle_ast`, `def_qb_hit`, `def_safe`, `def_td`.

### Changed

- **`src/constants.js` — SCARCITY recalibrated for IDP**
  - `LB`: 1.0 → **2.2** — elite 3-down LBs are ~8-10 in the NFL. Jack Campbell-tier should score in TE1 range.
  - `DL`: 1.0 → **1.9** — elite pass rushers are equally scarce; run stuffers dilute the pool so base is slightly lower than LB.
  - `DB`: 0.95 → **1.5** — deeper position, but hybrid safeties are genuinely valuable.

- **`src/constants.js` — PRIME windows updated for IDP**
  - `DL`: [23,29,33] → **[22,27,31]** — pass rushers peak earlier, cliff sooner
  - `LB`: [23,28,32] → **[22,27,31]** — physical position, similar to DL
  - `DB`: [23,28,32] → **[22,29,34]** — safeties age better than corners, cliff extended

- **`src/scoring.js` — idpScarcity() fully rewritten**
  - LB: now driven by **tackle volume** (was incorrectly using INTs as primary driver). Thresholds: 90+ tkl → 1.35, 70+ → 1.15, 50+ → 1.00, below → 0.80
  - DL: sack tiers tightened. 10+ sacks → 1.40 (elite pass rusher), 6+ → 1.20, 3+ → 1.00, below → 0.75 (run stuffer)
  - DB: now detects hybrid safeties (high tackles + INTs). 65+ solo & 2+ int → 1.30, 4+ int → 1.30, lower tiers scaled accordingly.

- **`src/tabs/tools/WaiverTool.jsx`** — position filter now includes DL, LB, DB. Previously only showed QB/RB/WR/TE.

### Pending (league vote required)
Proposed scoring changes for vote — to further close IDP/offense gap:
- Solo Tackle: +1 → +1.5
- Pass Defended: +1 → +2
- QB Hit: +0.5 → +1

Impact if all three pass: LB Elite 10.5 → 14.0 PPG · DL Elite 9.7 → 11.9 PPG · DB Elite 7.9 → 10.8 PPG.
Once vote passes, update `SCORING.def_tackle_solo`, `SCORING.def_pass_def`, `SCORING.def_qb_hit` in constants.js.
