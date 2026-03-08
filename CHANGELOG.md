# MGG Dynasty Changelog

## v1.0.6 — 2026-03-07

### New
- **Team Hub — full build** (`src/tabs/TeamHub.jsx`)
  - **Overview tab**: Dynasty grade card, quick-alert row (sell-high / injury / cliff counts), top 10 player cards
  - **My Roster tab**: Full sortable/filterable table with score, tier, depth, games started, PPG, stat line, injury status, Intel signal
  - **Alerts tab**: Sell-High Candidates · Injury Watch · Age Cliff Risks — all with badge counts on tab
  - **Targets tab**: Trade targets weighted to your weakest positions vs league average, BUY-signal players prioritised

### Fixed
- **Auto owner matching after sync**: Uses direct Sleeper `userId → ownerName` lookup instead of fuzzy name matching (`api.js` now returns `userIdToOwner` map)
- **Login handler**: Tries direct userId match first; fuzzy fallback only used pre-sync
- `newsMap` now passed as prop to TeamHub

### Files changed
- `src/App.jsx` — userId matching, newsMap prop, userIdToOwner state
- `src/api.js` — returns `userIdToOwner` from `loadData`
- `src/tabs/TeamHub.jsx` — full rebuild
