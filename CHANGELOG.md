# MGG Dynasty — v1.3.14 Mobility-Aware QB Aging (2026-08-08, post-draft)

The base QB age window ([23,28,33] — peak ending at 28) was RB-grade brutal:
Josh Allen (22.3 ppg, best in football) ranked QB12 at DV 390 on age alone.

- **scoring.js** — new `qbMobility(seasonTotals)`: 0 (pure pocket, ≤10 rush
  ypg) to 1 (fully mobile, ≥35 ypg), neutral 0.5 without stats. ALL QBs get
  +1.5 years of prime window; pure pocket passers get up to +3 (peak ~31,
  cliff ~36); mobile QBs stay closer to the base curve since rushing value
  declines with athleticism. Post-peak/post-cliff decline slopes softened the
  same way. Applied consistently to ageScore (rank composite) AND the DV age
  multiplier.
- **api.js** — passes mobility into ageScore for QBs.

Verified QB board after: Lawrence 896, Allen 894, Hurts 869, Purdy 835,
Herbert 771, Lamar 712 ... Goff 375 (pocket relief but still age-priced),
Dart 295 (wild-card slot). Owner-approved direction: "too brutal on age for
QBs, but for more mobile QBs it makes sense."

---

# MGG Dynasty — v1.3.13 Valuation Calibration (2026-08-08, post-draft)

Root-caused "Jaxson Dart DV 999 > Jalen Hurts": with no current-season stats,
DV ranked on age+role+demand only, and two structural flaws let a young QB1
with ONE offseason trade take the top slot. Verified live: Dart 999 → 440
(QB11); overall top-10 now Hurts/Lawrence/Nacua/Cook/JSN/Purdy/Bijan/Chase;
zero players saturated at 999.

## Fixed
- **api.js** — when the current season has no stats yet (pre-draft, preseason,
  early September), load LAST season's totals via one aggregate call
  (`/stats/nfl/regular/<season-1>`, includes gp/gs) so ppg, games started,
  and stat lines feed DV/SV. Current-season weekly stats take over
  automatically once games are played. `seasonState.statsSeason` reports which
  season is in use. Also fixed mojibake in the season log line.
- **scoring.js** — demand term on a FIXED scale (demandRaw/15, capped 1.0)
  instead of position min-max: one league trade previously made a player the
  "max demand" asset (+0.20 composite — this was the Dart bump). Soft ceiling
  above DV 850 (slope 0.35) replaces the hard 999 clip: stacked young-age ×
  superflex multipliers (up to 1274 pre-clip) had every young top-3 QB pinned
  at exactly 999 with no visible ordering.

---

# MGG Dynasty — v1.3.12 Draft-Day QoL (2026-08-08)

- **api.js** — fast pre-draft sync: skip the 18 weekly stats fetches (season
  not started, all empty — verified live) and fetch transactions week 1 only
  (all offseason moves live there; weeks 2-18 empty). ~35 fewer API calls per
  sync; matters when re-syncing mid-draft. Full 18-week behavior unchanged
  once the season starts.
- **main.jsx** — React error boundary: an unexpected render error now shows an
  in-place error card with a RELOAD button instead of white-screening the app
  and eating the session. TeamHub "avg dv" unit label on gaps panel (from the
  SV-side audit).

---

# MGG Dynasty — v1.3.11 Honest Position Ranks (2026-08-07, late)

- **TeamHub.jsx / Dashboard.jsx** — the 0-100 "position score" was league rank
  in costume ((teams below)/(n-1)×100 — with 10 teams it could only be 0, 11,
  22 ... 100) and read as an absolute quality rating it isn't. All three
  surfaces (TeamHub bars, Dashboard bars, Dashboard gaps panel) now show the
  rank plainly (#3/10), bar fill = rank strength, plus the real starter-avg DV
  so the number matches the scale used everywhere else. Weak-position flag is
  now rank-based (bottom 40%).

---

# MGG Dynasty — v1.3.10 Live-Draft Hotfix (2026-08-07, late)

- **DraftRoom.jsx** — pasted draft IDs are trimmed (whitespace from a paste
  built `/draft/%20<id>` URLs → "Failed to load draft"); the 15s live poll now
  also runs while the draft is `pre_draft`, so the board follows the draft the
  moment it goes live instead of requiring a manual re-LOAD.
- **draft.js / BigBoard.jsx / DraftRoom.jsx** — prospect estimates moved to the
  DV scale (0-950): pool values were 0-95 under a "0-1000" label, reading as
  suppressed (max ~90) next to real dynasty values. Big Board rank priority now
  10000-rank so user rankings stay above any estimate; rostered fallback uses
  dynastyValue (not the 0-100 start value); color thresholds rescaled.

---

# MGG Dynasty — v1.3.9 Draft-Eve Polish (2026-08-07)

Second pass on audit findings, verified by 17 unit tests + full Playwright
walkthrough (grades confirmed differentiating A/B/C, live 2026 draft selected).

## Fixed
- **constants.js / trade.js** — picks moved to the DYNASTY-VALUE scale
  (1st ≈ 550 → 10th ≈ 12, 3-year decay, all 10 rounds) so the Trade Analyzer
  compares picks and players on one scale; verdict thresholds now a % of the
  larger side (old absolute 5/15/30 cutoffs called every DV-scale trade
  lopsided). PICK_ROUNDS extended 1st–10th in the trade UI.
- **MyPicks.jsx** — rounds 4–10 no longer valued as 3rds; round chips and
  breakdown dots cover all 10 rounds.
- **ktc.js** — FantasyCalc fetched as 2QB superflex 0.5 PPR (was 1QB full-PPR,
  systematically undervaluing QBs in this league's format).
- **DraftRoom.jsx** — live pick feed OWNER column shows team names instead of
  raw Sleeper user IDs; Big Board badge uses exact name match (precedence bug
  matched any shared last name).
- **App.jsx** — QuickRank modal suppressed while league is pre_draft/drafting
  (no full-screen Elo interruption on draft day, no DV mutation off stale
  rankings).
- **RosterGrades.jsx** — imports canonical `gradeRoster` from roster.js; the
  stale duplicate in tabs/Roster.jsx graded every team A+.
- **export.js** — XLSX column shift fixed (both sheets): "SV" header added, so
  Tier/Depth/etc. no longer read one cell off; "2025 Stats" → "Season Stats".

---

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
