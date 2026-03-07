# Changelog

All notable changes to **MGG Dynasty — Live Intelligence Board** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).  
Versioning follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

| Type | When |
|---|---|
| `MAJOR` (x.0.0) | Architecture change requiring localStorage clear or data migration |
| `MINOR` (0.x.0) | New tab, new data source, new scoring component, new feature set |
| `PATCH` (0.0.x) | Bug fix, styling update, non-breaking change |

---

## [Unreleased]
- Sell-High / Buy-Low alert system
- Dashboard home tab with personalised roster snapshot and alerts
- GitHub Pages deployment

---

## [0.7.1] — 2026-03-07

### Fixed
- **Critical: blank page on load** — script load order race condition. All CDN scripts
  (React, ReactDOM, XLSX, Babel) moved to `<body>` after `<div id="root">`, guaranteeing
  they are fully parsed before Babel compiles the app script
- **JSX root violation** — owner picker modal was placed outside the root `<div>` element,
  causing Babel to throw a compile-time parse error and render nothing
- Missing closing `</div>` tags from incremental edits causing div depth imbalance

### Changed
- Contrast pass — 96 colour values updated across the full file for WCAG readability:
  - `#4b6580` → `#7a95ae` (49 instances) — secondary labels, column headers — 3.2:1 → 6:1
  - `#2a3d52` → `#4d6880` (33 instances) — hint text, timestamps — 2.1:1 → 4.5:1
  - `#94a3b8` → `#a8bccf` (9 instances) — mid-level text — 5.5:1 → 7:1
  - `#1e2d3d` → `#3a5068` (2 instances) — near-invisible hints — 1.8:1 → 3.5:1

---

## [0.7.0] — 2026-03-07

### Added
- **Player Hub** main tab with nested sub-navigation: `⚑ Situations` and `◎ FA Watchlist`
- **FA browser** — full Sleeper NFL DB (2000+ players) filtered to unrostered active
  players, sorted by depth chart order then age; capped at 80 results per filter state
- FA browser filters: position, team, age range (min/max), hide injured, name/team search
- **+ WATCH** — scores a FA player immediately on add using the full dynasty formula
  (role proxy replaces PPG since player has no real stats while unrostered)
- FA Watchlist persists in `localStorage` — survives browser refresh, per device
- Watchlist cards show: tier colour, dynasty score, depth order, injury status, situation
  flag badge if applicable
- `nflDb` state — Sleeper full NFL player DB preserved post-sync so FA browser
  queries it without a re-fetch

### Changed
- Manual situation flags apply to FA watchlist players on add — same flag resolution
  as rostered players (`manualSitsRef` checked, then auto AGE_CLIFF)
- `tab === "situations"` renamed to `tab === "hub"` with nested `hubTab` sub-state

### Notes
- FA scores intentionally skew lower than rostered players. Without real PPG data the
  scoring falls back to `sc × effRole × startPenalty × 10` proxy. This is correct
  behaviour — unverified talent should carry a discount.

---

## [0.6.0] — 2026-03-07

### Added
- **Roster Grade tab** — per-team letter grades A+ through D, contender score ranking
- Window classification: `REBUILD` (avg age <25) → `RISING` → `CONTEND` → `WIN NOW`
  → `DECLINING` (avg age 31+), with colour coding
- League leaderboard — all 12 teams ranked by contender score, 9 metric columns:
  grade, window, avg score, elite count, starter count, avg age, on-cliff, injured
- Your roster callout card — highlighted grade, position depth bars (avg score per
  position group with green/blue/amber/red fill)
- Window classification legend with age range descriptions
- **Owner identity system**:
  - Pre-sync: text input on idle splash screen — type name, press Enter
  - Post-sync: full-screen modal with all league owner buttons and player counts
  - Persists in `localStorage` — returning users skip picker entirely
  - Header badge showing current owner — click to reopen modal and switch

### Changed
- All hardcoded `"PunterParty"` references replaced with dynamic `currentOwner` state
- Trade Analyzer side A now defaults to `currentOwner` on load

---

## [0.5.0] — 2026-03-07

### Added
- **Trade Analyzer tab** — full dynasty trade evaluator
- Owner picker per side — player search scoped to that owner's roster
- Draft pick support: 2026 / 2027 / 2028 × 1st / 2nd / 3rd rounds
  - Default values: 1st 72/60/48, 2nd 38/30/24, 3rd 18/14/10
  - Inline custom value override per pick
- Verdict bar: dynasty score totals per side, point differential, avg age comparison
- Position impact panel: net score change per position group for each side
- Verdict tiers:
  - `FAIR TRADE` ≤ 5 pts differential
  - `SLIGHT WIN/LOSS` 6–15 pts
  - `CLEAR WIN/LOSS` 16–30 pts
  - `STRONG WIN / LOPSIDED LOSS` 30+ pts

---

## [0.4.0] — 2026-03-07

### Added
- **Situation flag system** — two-tier architecture applied as score multipliers at sync time

  | Flag | Impact | Notes |
  |---|---|---|
  | `BREAKOUT_YOUNG` | +15% | Auto-upgraded from BREAKOUT_ROLE when age ≤ 23 |
  | `BREAKOUT_ROLE` | +8% | 24+ breakout; sell-high window |
  | `DEPTH_PROMOTED` | +12% | Starter by injury |
  | `CONTRACT_YEAR` | +5% | Playing for next deal |
  | `NEW_OC` | 0% | Scheme change, direction unknown |
  | `CAMP_BATTLE` | -8% | Depth chart competition |
  | `IR_RETURN` | -5% | Returning from IR |
  | `FREE_AGENT` | -20% | Released; landing spot unknown |
  | `TRADE_DEMAND` | -15% | Requested trade |
  | `SUSPENSION` | (17−N)/17 | Requires `games: N` field |
  | `AGE_CLIFF` | -12% | Auto-set when age > positional cliff |

- `AGE_CLIFF` auto-derived every sync — no manual input required
- `BREAKOUT_YOUNG` auto-upgrades `BREAKOUT_ROLE` when player age ≤ 23
- **Situations tab** — manual flag editor: add / edit / remove, score impact column,
  reset to defaults button
- Default situations seeded to `localStorage` on first run:
  - Kyler Murray: `FREE_AGENT` — "Released by ARI 3/11"
  - Bryce Young: `CAMP_BATTLE` — "Starting job not guaranteed"
  - Anthony Richardson: `IR_RETURN` — "Returning from shoulder surgery"
  - Christian Kirk: `IR_RETURN` — "Returning from IR"
  - Jacoby Brissett: `BREAKOUT_ROLE` — "3,366 yds 23 TD as ARI starter"
- Watchlist deep research — ESPN + Sleeper analysis per player; approve/reject before
  applying to situations list
- Situation flag badges rendered on player name cells in the board

### Changed
- Intel Scan refactored: manual flags win unconditionally; Intel Scan fills gaps only
  for players without a manual flag (`if (p.situationFlag) return p`)

---

## [0.3.0] — 2026-03-06

### Added
- **Sleeper Stats API** — real fantasy PPG from 18 weekly stat pulls
- IDP scoring config (applied to all stat aggregation):

  | Stat | Points |
  |---|---|
  | Pass yard | 0.04 |
  | Pass TD | 4 |
  | Pass INT | -2 |
  | Rush yard | 0.1 |
  | Rush TD | 6 |
  | Reception | 0.5 |
  | Rec yard | 0.1 |
  | Rec TD | 4 |
  | Sack | 4 |
  | Solo tackle | 1 |
  | TFL | 2 |
  | Pass defense | 2 |
  | INT | 6 |
  | Forced fumble | 3 |
  | Fumble rec | 4 |
  | Safety | 8 |

- **Intel Scan tab** — ESPN NFL news headlines, rule-based `BUY/SELL/HOLD/WATCH`
  signal detection per player
- Sleeper trending adds (48hr/168hr lookback) as conviction boost for Intel Scan signals
- Start penalty: benched players and no-data players gate their age score contribution
  to prevent inflation of backup/unverified players

### Changed
- `prodProxy` scoring component updated: uses real PPG normalised by position group
  average instead of role proxy alone (role proxy retained as fallback)

### Fixed
- Column alignment in board table
- HTML structure rebuilt clean after progressive edit instability caused render failures

---

## [0.2.0] — 2026-03-06

### Added
- Self-contained single-file HTML app replacing the static Excel workbook
- **Sleeper API** integration: live rosters, depth charts, injuries, player metadata,
  18-week transaction history (trade counts, FA adds, drop counts per player)
- **Dynasty Board tab** — sortable table with 15 columns, tier filter badges, position
  filter dropdown, player search, expandable detail panel per player
- **Positions tab** — card grid per position group with tier colour coding
- **XLSX Export** — 4-tab workbook: Dynasty Board, By Position, Player Intel, Snapshot Info
- Sync log panel with timestamped progress entries
- Expandable player detail panel: profile, dynasty metrics, intel columns

### Fixed
- League ID corrected: `178580692040589312` → `1178580692040589312`

### Tech
- React 18 (UMD) + Babel Standalone + SheetJS via CDN — zero build toolchain

---

## [0.1.0] — 2026-03-06

### Added
- Initial static Excel workbook built from `Sleeper_Data_Import_v7.xlsx`
- **Dynasty Score formula** — four-component weighted model:
  - Production × Scarcity: 45%
  - Age / Longevity: 30%
  - Market Demand: 15%
  - Role Stability: 10%
- Position scarcity multipliers: QB 2.0×, RB 1.7×, TE 1.5×, WR 1.3×,
  DL/LB 1.0×, DB 0.95×, K 0.6×
- Positional age curves with rise / peak / cliff windows per position
- Tier classification: Elite / Starter / Flex / Depth / Stash (percentile-based)
- IDP position support: DL, LB, DB with appropriate scarcity weights
- Dynasty Board sheet, By Position sheet, Snapshot Info sheet

### Fixed
- Dynasty Score formula corrected to weight positions properly for SuperFlex IDP
- Age curve corrected — production now measured across all rostered weeks, not just
  fantasy starts

### Output
- `MGG_Dynasty_Player_Analytics_v2.xlsx`

---

[Unreleased]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.7.1...HEAD
[0.7.1]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/rah10network-source/mgg-dynasty/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/rah10network-source/mgg-dynasty/releases/tag/v0.1.0
