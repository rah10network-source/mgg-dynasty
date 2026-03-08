# Ω MGG Dynasty

A dynasty fantasy football intelligence platform built on the Sleeper API.  
Live at: **https://rah10network-source.github.io/mgg-dynasty/**

---

## What It Does

MGG Dynasty syncs your Sleeper league and gives every team a data-driven dynasty score anchored to real-world trade market values (KTC + FantasyCalc), fine-tuned by your league's actual scoring, real-life player situations, and your own transaction history. It then surfaces actionable insights — sell-high candidates with realistic pick asks, positional gaps vs the rest of the league, injury and age-cliff alerts, and AI-powered trade analysis.

---

## Feature Overview

| Module | Description |
|--------|-------------|
| **Dashboard** | League-wide tier breakdown, top assets by position, season state |
| **League Hub** | All roster grades side-by-side, owner comparison table |
| **Team Hub** | Per-team deep dive — grade card, top 2 per position, full roster table with expand/notes, sell-high suggestions with pick equivalency, injury/cliff alerts, targets by positional need |
| **Player Hub** | Filterable big board, player detail drawer, IDP support, FA Browser |
| **Trade Analyzer** | Score-based verdict + Claude AI dynasty narrative |
| **Situations** | Manual flags (BREAKOUT, NEW_OC, SUSPENSION…) + Intel Scan auto-detect from ESPN |
| **Watchlist** | Deep research with Claude AI or rule-based signal engine |
| **Draft Hub** | Mock Draft (snake, AI auto-picks) + Live Draft Sleeper connector + Big Board |
| **Intel Scan** | ESPN headlines → BUY/SELL/HOLD/WATCH signals + Sleeper trending overlay |
| **XLSX Export** | Multi-sheet workbook snapshot of current state |

---

## Scoring Model

Each rostered player receives a **score 0–100** and a tier (Elite / Starter / Flex / Depth / Stash).

### When KTC + FantasyCalc data is matched (expected ~85% of players):

| Factor | Weight | Source |
|--------|--------|--------|
| Market Value | 50% | KTC + FantasyCalc average — external anchor, prevents internal inflation |
| Production | 25% | Your league's actual fantasy points scored (Sleeper weekly stats) |
| Age / Situation | 15% | Age curve, depth chart role, injury status, situation flags |
| League Demand | 10% | Trade count + FA adds − drops in your league this season |

### Fallback (no market match):
Previous 4-factor internal model: production 45%, age 30%, demand 15%, role stability 10%.

### Pick Equivalency
Market values map to honest pick tiers — used throughout sell-high suggestions and trade analysis:

| Market Value | Pick Equivalent |
|-------------|-----------------|
| 7000+ | Franchise piece |
| 4500–7000 | 1st (top 3) |
| 2800–4500 | 1st (mid/late) |
| 1500–2800 | 2nd round |
| 700–1500 | 3rd round |
| 300–700 | 4th round / depth |
| < 300 | Conditional / stash |

---

## Getting Started

### Prerequisites
- Node 18+
- A Sleeper account in the configured league

### Install & run locally
```bash
npm install
npm run dev
```

### Deploy to GitHub Pages
```bash
npm run build
npm run deploy
```
The `deploy` script pushes `dist/` to the `gh-pages` branch.

---

## Configuration

### `src/constants.js`

```js
export const LEAGUE_ID = "your_sleeper_league_id";
export const LEAGUE_API_KEY = "sk-ant-..."; // optional — shared Anthropic key for AI features
```

### Commissioner passphrase
Change `COMMISSIONER_PASS` in `src/identity.js` before deploying:
```js
export const COMMISSIONER_PASS = "your-secret-here";
```
Unlocks read-only team view mode. Not cryptographically secure — treat as a convenience lock.

### Anthropic API key
Powers Claude AI in Watchlist research and Trade Analyzer.
- Set `LEAGUE_API_KEY` in constants.js for all members to share it automatically.
- Individual members can also enter a personal key via the account modal — it takes priority over the league key.
- When running inside claude.ai the API is auto-proxied and no key is needed.
- Get a key at [console.anthropic.com](https://console.anthropic.com).

---

## Identity & Multi-User

Since v1.0.4 the app supports per-user data isolation with no backend:

1. Click **◎ LOG IN** and enter your Sleeper username.
2. The app verifies your account against the Sleeper API and silently matches your Sleeper user ID to your league roster.
3. Your watchlist, big board, situations, and FA watchlist are stored under a namespaced key (`mgg_{type}_{userId}`) — multiple users can share a browser without data bleed.

**Commissioner view mode** — enter the passphrase in the account modal → click `👁` next to any team name → browse their full roster read-only. A banner tracks the active view with a one-click exit. Your own data is untouched.

**Wrong team?** Open the account modal → expand `▸ Wrong team? Correct it` to re-map your identity to a different roster.

---

## Project Structure

```
src/
├── App.jsx              # Root — state orchestration, sync handler
├── identity.js          # useIdentity hook — Sleeper login, commissioner, view mode
├── storage.js           # Namespaced localStorage utilities
├── api.js               # Sleeper sync, Intel scan, Claude API calls
├── ktc.js               # KTC + FantasyCalc market value loader, pick equivalency
├── scoring.js           # Dynasty scoring engine — age curves, normalisation, signals
├── constants.js         # League ID, API keys, pick values, situation flags, tier styles
├── export.js            # XLSX multi-sheet workbook export
└── tabs/
    ├── Dashboard.jsx
    ├── LeagueHub.jsx
    ├── TeamHub.jsx        # Grade card, top-2-per-pos, roster table, alerts, targets
    ├── Hub.jsx            # Player Hub container
    ├── AnalysisTools.jsx
    ├── DraftHub.jsx
    ├── Log.jsx
    └── playerhub/
        ├── Rankings.jsx
        ├── FADatabase.jsx
        ├── Watchlist.jsx
        ├── NewsSituations.jsx
        └── Situations.jsx
```

---

## Tech Stack

- **React + Vite** — SPA, no router
- **Sleeper API** — rosters, stats, picks, transactions (public, no auth)
- **ESPN API** — NFL news headlines for Intel Scan
- **FantasyCalc API** — dynasty trade values (primary market source)
- **KTC API** — dynasty trade values (secondary market source)
- **Claude API (Anthropic)** — AI watchlist research + trade narratives (optional)
- **SheetJS** — XLSX export
- **GitHub Pages** — hosting

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

---

## License

Private project — MGG Dynasty league use only. Not for redistribution.
