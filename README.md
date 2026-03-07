# MGG Dynasty — Live Intelligence Board

> Dynasty fantasy football analytics for the MGG league. Live data, real scoring, trade analysis, and roster grading — all in a single HTML file.

**League ID:** `1178580692040589312` · **Format:** SuperFlex IDP · **Platform:** Sleeper

---

## Quick Start

1. Download `index.html`
2. Double-click to open in any browser
3. Click **⟳ SYNC DATA** — loads in ~15 seconds
4. Select your owner identity from the modal
5. Explore your roster, run trades, browse free agents

No installation. No build step. No login. Works offline after first sync.

---

## Features

| Tab | What it does |
|---|---|
| **◈ BOARD** | Full dynasty board — sortable, filterable, tier badges, player detail panel |
| **⬡ POSITIONS** | Card grid per position group with tier colour coding |
| **⇄ TRADE** | Dynasty trade evaluator — players + draft picks, verdict bar, position impact |
| **⬡ ROSTER** | Per-team letter grades, window classification, league leaderboard |
| **◉ INTEL** | ESPN news scan with BUY/SELL/HOLD/WATCH signals |
| **⬡ PLAYER HUB** | Situation flag editor + FA browser with on-demand scoring watchlist |
| **▸ LOG** | Live sync log with timestamped progress |

---

## Data Sources

| Source | Data | Endpoint |
|---|---|---|
| Sleeper API | Rosters, depth charts, injuries, metadata | `api.sleeper.app/v1/league/{id}` |
| Sleeper Stats | Real PPG from 18-week 2025 season | `api.sleeper.app/v1/stats/nfl/regular/2025/{wk}` |
| Sleeper Trending | FA add trends (48hr/168hr) | `api.sleeper.app/v1/players/nfl/trending/add` |
| ESPN NFL News | Headlines for Intel Scan signals | `site.api.espn.com/apis/site/v2/sports/football/nfl/news` |

All APIs are public and require no authentication.

---

## Dynasty Score Formula

```
Score = (Production × Scarcity) × 0.45
      + (Age / Longevity)        × 0.30
      + Market Demand            × 0.15
      + Role Stability           × 0.10
```

| Component | Source | Notes |
|---|---|---|
| Production × Scarcity | Real PPG × position multiplier | Fallback to role proxy for FAs |
| Age / Longevity | Age curve × role gate | Positional prime windows per pos |
| Market Demand | Trades × 3 + Adds − Drops × 0.5 | 18-week transaction history |
| Role Stability | Depth chart order | #1=100, #2=70, #3+=40 |

**Scarcity multipliers:** QB 2.0× · RB 1.7× · TE 1.5× · WR 1.3× · DL/LB 1.0× · DB 0.95× · K 0.6×

---

## Situation Flags

Applied as score multipliers at sync time. Set manually in **Player Hub → Situations**.

| Flag | Impact | Description |
|---|---|---|
| `BREAKOUT_YOUNG` | +15% | Auto-upgraded from BREAKOUT_ROLE when age ≤ 23 |
| `BREAKOUT_ROLE` | +8% | 24+ breakout; sell-high window |
| `DEPTH_PROMOTED` | +12% | Starter by injury |
| `CONTRACT_YEAR` | +5% | Playing for next deal |
| `NEW_OC` | 0% | Scheme change; direction unknown |
| `CAMP_BATTLE` | −8% | Depth chart competition |
| `IR_RETURN` | −5% | Returning from IR |
| `FREE_AGENT` | −20% | Released; landing spot unknown |
| `TRADE_DEMAND` | −15% | Requested trade |
| `SUSPENSION` | (17−N)/17 | Requires games count |
| `AGE_CLIFF` | −12% | Auto-set when age > positional cliff |

`AGE_CLIFF` fires automatically every sync — no manual input needed.

---

## IDP Scoring Config

```
Pass: 0.04/yd · 4/TD · -2/INT
Rush: 0.1/yd · 6/TD
Rec:  0.5/rec · 0.1/yd · 4/TD
Def:  4/sack · 1/solo tackle · 2/TFL · 2/pass def
      6/INT · 3/forced fumble · 4/fumble rec · 8/safety
```

---

## Tech Stack

```
index.html          Single self-contained file — open directly in browser
├── React 18        UI rendering (UMD CDN — no build toolchain)
├── Babel 7         JSX compilation in-browser
├── SheetJS         XLSX export
└── Sleeper/ESPN    Public APIs — no auth required
```

**Persistence:** `localStorage` — owner identity, manual situations, FA watchlist, research results all survive browser refresh.

---

## Deployment (GitHub Pages)

1. Fork or create a new repository
2. Upload `index.html` → rename to `index.html` at repo root
3. Upload `CHANGELOG.md` and `README.md`
4. **Settings → Pages → Branch: main / folder: / (root) → Save**
5. Live at `https://YOUR_USERNAME.github.io/REPO_NAME`

Updates: replace `index.html` in the repo → live within 60 seconds.

---

## Repository Structure

```
/
├── index.html          Main app (self-contained)
├── README.md           This file
└── CHANGELOG.md        Version history
```

---

## Roadmap

See [CHANGELOG.md](./CHANGELOG.md) for the full version history and `[Unreleased]` section for what's coming next.

Current version: **v0.7.1**

---

## League Info

- **Platform:** Sleeper
- **Format:** SuperFlex IDP
- **League ID:** `1178580692040589312`
- **Season:** 2025
