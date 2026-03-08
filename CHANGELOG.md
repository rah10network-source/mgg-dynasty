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
