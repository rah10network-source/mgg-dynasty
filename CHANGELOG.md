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
