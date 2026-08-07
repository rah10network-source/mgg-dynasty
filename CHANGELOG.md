# MGG Dynasty — v1.3.8 Draft-Day Fixes (2026-08-07)

Pre-draft audit pass (full report: `_Archive`-level audit doc in project root /
claude.ai project). Four critical fixes + Rookie/Vet draft pool toggle.
Verified by unit + live-API tests (`npm test`) and a Playwright walkthrough
of every tab against the built bundle.

## Fixed
- **DraftRoom.jsx** — Live Draft fetched LAST YEAR'S league: stale hardcoded
  fallback league ID replaced with `LEAGUE_ID` import from constants. The 2026
  draft now auto-selects.
- **api.js** — 2026 picks were invisible in My Picks: pick seeding skipped the
  current season even though its draft hasn't happened. Now seeds the current
  season while league status is `pre_draft`/`drafting` and applies
  current-season traded picks. Also fixed traded-pick removal to search all
  holders (Sleeper's `previous_owner_id` can reference an intermediate hop,
  which caused duplicated picks — verified 400/400 conservation in tests).
- **LeagueHub.jsx** — League Hub → Standings crashed the whole app in
  offseason mode (`pv` used but never imported). One-line import fix.
- **DraftRoom.jsx** — Mock draft AI suggestions were random: sorted on a
  nonexistent `dynastyValue` field (NaN no-op). Now scores the pool and sorts
  on it; rostered players excluded from all mock pools.

## Added
- **Rookie/Vet draft pool toggle** — Big Board and Mock Draft now offer
  ROOKIES / FA VETS / ALL. New `isDraftableVet()` gate in draft.js lets
  unsigned FA veterans (draftable in this league, previously filtered out as
  "inactive") into vet pools while still excluding retired/out-of-league
  players. Rostered players excluded in every mode.
- **tests/** — vitest unit tests for the pool gates + a live-Sleeper
  integration test for pick reconstruction; Playwright nav script
  (`tests/browser_nav.py`).

## Known (not in this pass — see audit report)
- Trade Analyzer pick/player value scales mixed; XLSX export column shift;
  KTC endpoint dead; 1QB market values in a 2QB league; deployed Anthropic
  key exposure (rotate + spend cap); QuickRank modal pops post-sync pre-draft.

---

# MGG Dynasty — v1.3.4 Design Rebuild (safe)

## What changed
Visual-only redesign. Zero logic was touched. All API calls, state management,
expand/collapse, intel scan, sync, and authentication are 100% original code.

### Color palette (old → new)
- Primary accent: #22c55e green → #9580FF purple
- Cards/surfaces: #0f1923/#0a1118 → #161b26/#1d2535
- Borders: #1e2d3d → #242d40
- Amber: #f59e0b → #FFD700
- Red/alert: #ef4444 → #FF4757
- Blue data: #0ea5e9/#60a5fa → #00D4FF
- Orange: #f97316 → #FF9040

### Style rules (Flat 2.0)
- No gradient backgrounds on cards (flat surface colors only)
- borderRadius removed from major cards (still present on small badges/pills)
- Box shadows removed
- Active nav underline: 3px instead of 2px

### Fonts (injected via main.jsx at runtime)
- Bebas Neue → buttons (via Btn.jsx)
- Inter → base body font (replaces Courier New)
- JetBrains Mono → data values

### Files modified (all others untouched)
- src/main.jsx — font injection + global body reset
- src/constants.js — TIER_STYLE, SIG_COLORS, INJ_COLOR colors updated (all exports preserved)
- src/components/Btn.jsx — flat style, same API
- src/App.jsx — color strings only
- src/tabs/Dashboard.jsx — color strings only
- src/tabs/TeamHub.jsx — color strings only
- src/tabs/LeagueHub.jsx — color strings only
