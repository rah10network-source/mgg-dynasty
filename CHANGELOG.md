# MGG Dynasty — v1.3.4 Design System Upgrade

## v1.3.4 — Flat 2.0 / Sleeper-Inspired Design

### Design System Changes

#### Typography
- **Bebas Neue** → all labels, headings, nav items, grades, stat labels, section titles
- **Inter** → body text, descriptions, notes, player names
- **JetBrains Mono** → all numeric data values (DV, SV, PPG, scores)
- Replaced `'Courier New', monospace` base font across entire UI

#### Color Palette (complete swap)
| Old | New | Role |
|-----|-----|------|
| `#080d14` | `#0d1117` | Base background |
| `#0f1923` | `#161b26` | Card surface |
| `#0a1118` | `#1d2535` | Elevated surface |
| `#1e2d3d` | `#242d40` | Default border |
| `#22c55e` (primary) | `#9580FF` | Primary accent (nav active, grades, your team) |
| `#22c55e` (positive) | `#00FF87` | Elite / positive values |
| `#0ea5e9` | `#00D4FF` | Neutral data / cyan accent |
| `#f59e0b` | `#FFD700` | Warnings / contend window |
| `#ef4444` | `#FF4757` | Risks / alerts / sell signals |
| `#f97316` | `#FF9040` | Depth tier / age cliff |

#### Style Rules (Flat 2.0)
- **No gradient backgrounds** on cards or containers (flat surface colors only)
- **No border-radius** on main cards, modals, or buttons (`borderRadius: 0`)
- **No box-shadows** (removed entirely)
- **3px accent bars** on active nav states instead of glow effects
- **Squared everything** — cards, buttons, tabs, panels

### Files Modified
- `src/main.jsx` — Google Fonts import (Bebas Neue, Inter, JetBrains Mono) + CSS variables + global reset
- `src/constants.js` — New TIER_STYLE, SIG_COLORS, INJ_COLOR, SITUATION_FLAGS colors; new C{} and FONT{} tokens
- `src/components/Btn.jsx` — Flat 2.0 redesign; gradient prop mapped to flat accent tints
- `src/App.jsx` — Header, sidebar, nav, modals, all inline styles updated
- `src/tabs/Dashboard.jsx` — Hero card, position bars, alerts, all inline styles
- `src/tabs/TeamHub.jsx` — Overview, roster list, sell-high, all inline styles
- `src/tabs/LeagueHub.jsx` — Sub-tabs, standings, power rankings
