# Ω MGG Dynasty

A dynasty fantasy football intelligence app built on the Sleeper API.  
Live at: `https://rah10network-source.github.io/mgg-dynasty/`

---

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | League-wide tier breakdown, top assets, recent news |
| **League Hub** | All roster grades side-by-side, owner comparisons |
| **Team Hub** | Per-team deep dive — roster, picks, grades *(full build in progress)* |
| **Player Hub** | Filterable big board, player detail drawer, IDP support |
| **Trade Analyzer** | Score-based verdict + Claude AI narrative |
| **Situations** | Manual flags (BREAKOUT, NEW_OC, SUSPENSION…) + Intel Scan auto-detect |
| **Watchlist** | Deep research with Claude AI or rule-based signal engine |
| **FA Browser** | Filter the full Sleeper NFL DB by position, age, depth, injury |
| **Draft Hub** | Mock Draft (snake, AI auto-picks) + Live Draft connector |
| **Intel Scan** | ESPN headlines → BUY/SELL/HOLD/WATCH signals, Sleeper trending |
| **XLSX Export** | Multi-sheet workbook snapshot |

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
The `deploy` script pushes the `dist/` folder to the `gh-pages` branch.

---

## Configuration

### League ID
Set in `src/constants.js` or via the `VITE_LEAGUE_ID` environment variable:
```
VITE_LEAGUE_ID=1178580692040589312
```

### Commissioner passphrase
Change `COMMISSIONER_PASS` at the top of `src/identity.js` before deploying:
```js
export const COMMISSIONER_PASS = "your-secret-here";
```
This unlocks team view mode for the commissioner. It is not cryptographically secure — treat it as a convenience lock, not a security boundary.

### Anthropic API key
Optional. Powers Claude AI analysis in the Watchlist and Trade Analyzer.  
- Enter via the ⚙ Settings modal — stored in `localStorage` only, never sent anywhere except Anthropic.  
- When running inside claude.ai the API is auto-proxied and no key is needed.  
- Get a key at [console.anthropic.com](https://console.anthropic.com).

---

## Identity & Multi-User

Since v0.8.0 the app supports per-user data isolation:

1. Click **◎ LOG IN** and enter your Sleeper username.
2. The app verifies your account against the Sleeper API and maps your display name to your league roster.
3. Your watchlist, big board, situations, and FA watchlist are stored under a namespaced key (`mgg_{type}_{userId}`) so multiple users can share a browser without data bleed.

**No backend required** — everything lives in the browser's `localStorage`.

### View Mode (Commissioner)
1. Open ⚙ Settings and enter the commissioner passphrase.
2. Click any team name in Settings or use the quick-jump buttons to enter read-only view mode for that team.
3. A `👁 VIEWING: TeamName` banner appears at the top. Your own personal data is untouched.

---

## Project Structure

```
src/
├── App.jsx              # Root component — state orchestration
├── identity.js          # useIdentity hook — Sleeper login, commissioner, view mode
├── storage.js           # Namespaced localStorage utilities
├── api.js               # Sleeper data loading, Intel scan, Claude API calls
├── scoring.js           # Dynasty scoring engine — age curves, normalisation
├── constants.js         # League ID, pick values, situation flags, tier styles
├── export.js            # XLSX workbook export
└── tabs/
    ├── Dashboard.jsx
    ├── LeagueHub.jsx
    ├── TeamHub.jsx
    ├── PlayerHub.jsx
    ├── AnalysisTools.jsx
    ├── DraftHub.jsx
    └── Log.jsx
```

---

## Tech Stack

- **React + Vite** — SPA, no router
- **Sleeper API** — rosters, stats, picks, transactions (public, no auth)
- **ESPN API** — NFL news headlines for Intel Scan
- **Claude API (Anthropic)** — AI watchlist research + trade narratives (optional)
- **SheetJS** — XLSX export
- **GitHub Pages** — hosting

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

## License

Private project — not for redistribution.
