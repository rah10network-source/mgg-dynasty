# MGG Dynasty — Working Context

**Version:** v1.3.5 | **Branch:** main | **Node:** 20  
**Build:** `npm run build` from this directory  
**Deploy:** push to `main` → GitHub Actions → `gh-pages` branch → live site  
**Live:** https://rah10network-source.github.io/mgg-dynasty/

---

## First thing in a new shell session
```bash
npm install   # node_modules from Windows won't work on Linux — always reinstall
npm run build # verify clean before touching anything
```

---

## Architecture at a glance

| File | Role |
|------|------|
| `src/App.jsx` | Root — layout, modals, tab routing (63k, biggest file) |
| `src/constants.js` | All config: league ID, scoring, TIER_STYLE, palette |
| `src/api.js` | Sleeper API pipeline — `loadData()` |
| `src/scoring.js` | DV + SV pipeline — **pipeline order is locked** |
| `src/roster.js` | `gradeRoster()`, `sellHighCandidates()`, `tradeTargets()` |
| `src/intel.js` | `runIntel()`, `deriveSignal()`, situation flags |
| `src/trade.js` | `claudeTradeAnalysis()`, `tradeVerdict()` |
| `src/identity.js` | `useIdentity()` — Sleeper login, commissioner mode |
| `src/storage.js` | `lsGet`/`lsSet` — per-user localStorage namespace |
| `src/anthropic.js` | Anthropic API wrapper |

---

## DV Scoring Pipeline — ORDER IS LOCKED
Changing the call order breaks Dynasty Value output. Do not reorder.
```
1. normalise(pl, "prodProxy")
2. normalise(pl, "ageGated")
3. normalise(pl, "demandRaw")
4. normalise(pl, "roleStab")
5. calcDynastyValues(pl)  →  p.dynastyValue
6. Tier assignment from DV percentiles
7. calcStartRaw(p)         →  p.startValue
```

---

## Design Rules — LOCKED (Flat 2.0)
- **No gradients** on cards or containers
- **No border-radius** on major cards (`borderRadius: 0`)
- **No box-shadows**
- Active nav: 3px solid left border (not glow)
- Squared everything — buttons, cards, tabs, modals

### Palette
```
--bg:      #0d1117   deep navy base
--s1:      #161b26   card surface
--s2:      #1d2535   elevated surface
--border:  #242d40
--purple:  #9580FF   primary accent
--green:   #00FF87   elite / positive
--cyan:    #00D4FF   neutral data
--yellow:  #FFD700   warnings
--orange:  #FF9040   depth / age cliff
--red:     #FF4757   risks / sell
```

### Fonts (injected in main.jsx via Google Fonts)
- **Bebas Neue** → labels, headings, nav, grades, buttons
- **Inter** → body, descriptions, player names
- **JetBrains Mono** → all numeric data (DV, SV, PPG)

### Tier Styles (from constants.js TIER_STYLE)
```
Elite:   border #00FF87  bg #0d1f14
Starter: border #9580FF  bg #130f2e
Flex:    border #FFD700  bg #1a1800
Depth:   border #FF9040  bg #1a1000
Stash:   border #2e3a50  bg #161b26
```

---

## League Config
- **League ID:** `1315875703715016704`
- **Platform:** Sleeper | **Format:** Dynasty IDP | **Teams:** 10
- **Lineup:** QB, RB×2, WR×3, TE, FLEX×2, FLEX(WR/TE), SUPERFLEX, IDP FLEX, K, DL, LB, DB
- **Bench:** 25 | **IR:** 6 | **Taxi:** 8
- **Scoring:** PPR 0.5 | SF | IDP (sack×4, tkl_solo×1, pass_def×2, int×2)

---

## Known Issues / Pending Work

| Item | Status |
|------|--------|
| `Positions.jsx` built but not wired into any tab | Pending |
| `storage.js` runMigration missing `player_notes` + `elo_scores` | Pending |
| IDP scarcity thresholds — needs 2025 season validation | Pending |
| KTC market value integration (`ktc.js`) | Stub only |
| "Who Should I Start" tool | Not built |
| Commissioner scoring vote toggle in UI | Not built |
| 2026 rookie rankings in Draft Hub | Not built |
| GitHub Gist sync for cross-device persistence | Not started |
| `idp_tkl_solo` +1 → +1.5 | League vote pending |
| `intel.js` mixed static/dynamic import warning in build | Known, non-breaking |

---

## Do Not Touch (during visual/UI work)
- `api.js`, `scoring.js`, `roster.js` — logic files, pipeline order locked
- `constants.js` SCORING object — confirmed against league constitution
- `identity.js` auth flow

## Environment / Secrets
- `VITE_LEAGUE_API_KEY` → GitHub Actions Secret → Anthropic API key in bundle
- `.env.local` → local dev key
- API key is visible in DevTools (known, accepted — access gated by Sleeper login)
