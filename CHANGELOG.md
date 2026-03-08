# MGG Dynasty Changelog

## [1.1.3] — 2026-03-08 · Full Fix Release

Complete consolidated release. Deploy ALL files to src/.
Make sure src/tabs/tools/ directory exists in your repo.

### Fixes in this release (cumulative from v1.1.0)

**Blank screen fix (critical)**
- Added missing src files never included in previous zips:
  intel.js, trade.js, roster.js, watchlist.js, draft.js
- App.jsx imports all five — Vite failed silently without them

**weakPos not defined (this release)**
- Dashboard.jsx patch removed the weakPos Set but left two references to it
- Re-added: const weakPos = new Set(weak.filter(w => w.gap < -5).map(w => w.pos))

**IDP field prefix (critical)**
- Sleeper API uses idp_ prefix not def_ — all IDP stats were 0 since day one
- Fixed in api.js (STAT_FIELDS), constants.js (SCORING), scoring.js (calcSleeperPts + idpScarcity)

**Scoring constants corrected**
- 6 wrong IDP values (def_int was 6, should be 2 etc) — were Team DEF values
- 2 missing fields added: idp_tkl_ast, idp_qb_hit

**SCARCITY recalibrated**
- LB: 1.0 → 2.2 | DL: 1.0 → 1.9 | DB: 0.95 → 1.5

**calcAge hardcoded date removed**
- new Date(2026, 2, 6) → new Date() — ages now stay accurate

**MANUAL_SITUATIONS cleared**
- Was populated with test entries — now empty, use UI or Intel Scan
