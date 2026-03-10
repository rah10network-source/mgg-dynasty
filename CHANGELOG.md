# MGG Dynasty Changelog

## [1.2.2] — 2026-03-08 · BigBoard Intel Scan + Draft Prep + PlayerCompare Fix

### Added

**BigBoard Intel Scan (`src/tabs/drafthub/BigBoard.jsx` — full rewrite)**
- ◈ INTEL SCAN button on the board header — runs `deepAnalyse` from `intel.js`
  against every player on your board using live ESPN headlines
- Each board player shows a signal badge (BUY/WATCH/SELL/HOLD), situation flag,
  and a short note from the news source
- Board rows are colour-tinted by signal — green for BUY, amber for WATCH, red for SELL
- Intel summary bar above the board shows signal counts at a glance
- Sources (headlines) fetched once and cached for the session — re-scan reuses them
- Dynamic import of intel.js so the scan only loads when triggered

**Draft pool via `filterDraftPool` (active player gate)**
- Pool now uses `filterDraftPool` from `draft.js` — retired, cut, and inactive
  players are excluded automatically. Previously the raw nflDb was filtered inline
  with no active player check, so phantom entries could appear.

**Prospect scores in pool and on board**
- Every player in the available pool shows a dynasty estimate score (0–100)
  via `scoreDraftPlayer` with BPA archetype
- Board players show their score on the right side — colour coded green/amber/grey

### Fixed
- `src/tabs/tools/PlayerCompare.jsx` — was incorrectly placed at `src/tabs/PlayerCompare.jsx`.
  Moved to `src/tabs/tools/` where `AnalysisTools.jsx` imports it from. Previously
  the import resolved to a missing file and crashed the Analysis Tools tab.
- `src/tabs/tools/WaiverTool.jsx` — DL/LB/DB added to position filter buttons

### Files in this zip
Deploy ALL to src/ — complete set, no partial updates needed.
Ensure src/tabs/drafthub/ and src/tabs/tools/ directories exist.

## [1.2.3] — 2026-03-10 · IDP Scoring Vote + Player Notes + Team Comparison

### Changed
**IDP scoring — league vote applied (`src/constants.js`)**
- `idp_qb_hit`: +0.5 → +1 per hit
- `idp_pass_def`: +1 → +2 per defended pass
- Comment updated from "Pending" to "PASSED"

### Added
**Player notes persistence (`src/App.jsx`, `src/tabs/TeamHub.jsx`)**
- `playerNotes` state stored in `localStorage` keyed by `pid` under `mgg_player_notes_{userId}`
- Notes survive refreshes, are namespaced per user (same as watchlist/bigboard)
- Notes are editable from the expanded player row in My Roster tab
- Shows ✎ NOTE badge on collapsed row when a note exists
- SAVE / CANCEL / CLEAR controls. Empty save removes the key (no stale entries)

**Team Comparison tab (`src/tabs/TeamHub.jsx`)**
- New ⬤ COMPARE tab in Team Hub
- Owner selector dropdown — pick any other team to compare against
- Side-by-side grade cards (grade letter, contender score, window, all 6 stats)
- Trade intel strip — YOUR STRENGTHS and YOUR NEEDS derived from positional gaps >15 avg
- Dual-sided positional depth bars (mine left, theirs right) — green = winner per position
- Side-by-side roster lists (top 20 by score) with signal badges
