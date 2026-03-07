import * as XLSX from "xlsx";
import { LEAGUE_ID, POS_ORDER } from "./constants";

export const doExport = (players, newsMap) => {
  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Dynasty Board ───────────────────────────────────────────────────
  const bh = ["Rank","Player","Pos","Team","Age","Yrs Exp","Score","Tier","Depth","Role%",
               "G Started","G Played","PPG","2025 Stats","Trades","FA Adds","Injury","Owner",
               "Signal","Situation","News Note"];
  const bd = players.map((p, i) => {
    const n = newsMap[p.name] || {};
    return [
      i + 1, p.name, p.pos, p.team, p.age ?? '', p.yrsExp ?? '',
      p.score, p.tier,
      p.depthOrder ? `#${p.depthOrder}` : '—',
      Math.round(p.roleConf * 100),
      p.gamesStarted ?? '', p.gamesPlayed ?? '', p.ppg ?? '', p.statLine || '',
      p.trades || 0, p.adds || 0, p.injStatus || 'Active', p.owner,
      n.signal || '', n.situation || '', n.note || '',
    ];
  });
  const ws1 = XLSX.utils.aoa_to_sheet([bh, ...bd]);
  ws1['!cols'] = [
    {wch:5},{wch:22},{wch:5},{wch:6},{wch:5},{wch:7},{wch:7},{wch:9},{wch:7},{wch:6},
    {wch:8},{wch:8},{wch:6},{wch:28},{wch:7},{wch:7},{wch:12},{wch:18},{wch:7},{wch:11},{wch:50},
  ];
  XLSX.utils.book_append_sheet(wb, ws1, "Dynasty Board");

  // ── Sheet 2: By Position ─────────────────────────────────────────────────────
  const rows2 = [["Pos","Rank","Player","Team","Age","Score","Tier","Depth","G Started","PPG","Stats","Owner","Signal"]];
  POS_ORDER.forEach(pos => {
    players.filter(p => p.pos === pos).forEach((p, i) => {
      const n = newsMap[p.name] || {};
      rows2.push([pos, i+1, p.name, p.team, p.age ?? '', p.score, p.tier,
                  p.depthOrder ? `#${p.depthOrder}` : '—',
                  p.gamesStarted ?? '', p.ppg ?? '', p.statLine || '', p.owner, n.signal || '']);
    });
    rows2.push([]);
  });
  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2['!cols'] = [{wch:5},{wch:5},{wch:22},{wch:6},{wch:5},{wch:7},{wch:9},{wch:7},{wch:8},{wch:6},{wch:28},{wch:18},{wch:7}];
  XLSX.utils.book_append_sheet(wb, ws2, "By Position");

  // ── Sheet 3: Player Intel (only if scan was run) ──────────────────────────────
  if (Object.keys(newsMap).length > 0) {
    const ih = ["Player","Pos","Team","Owner","Score","Tier","Status","Signal","Situation","Note"];
    const id = Object.entries(newsMap).map(([name, n]) => {
      const p = players.find(pl => pl.name === name);
      return [name, p?.pos||'', p?.team||'', p?.owner||'', p?.score||'', p?.tier||'',
              n.status||'', n.signal||'', n.situation||'', n.note||''];
    });
    const ws3 = XLSX.utils.aoa_to_sheet([ih, ...id]);
    ws3['!cols'] = [{wch:22},{wch:5},{wch:6},{wch:18},{wch:6},{wch:9},{wch:10},{wch:7},{wch:11},{wch:55}];
    XLSX.utils.book_append_sheet(wb, ws3, "Player Intel");
  }

  // ── Sheet 4: Snapshot Info ────────────────────────────────────────────────────
  const ws4 = XLSX.utils.aoa_to_sheet([
    ["MGG Dynasty — Value Snapshot"], [""],
    ["Generated", new Date().toLocaleString()],
    ["League ID", LEAGUE_ID],
    ["Players",   players.length],
    ["Intel scanned", Object.keys(newsMap).length > 0 ? `${Object.keys(newsMap).length} players` : "Not run"],
    [""], ["FORMULA"],
    ["Production × Scarcity", "45% — Sleeper PPG × pos scarcity (IDP role-weighted)"],
    ["Age / Longevity",       "30% — pos-specific prime windows, gated by role + starts"],
    ["Market Demand",         "15% — trades×3 + FA adds − drops×0.5"],
    ["Role Stability",        "10% — depth chart order"],
    [""], ["SCARCITY MULTIPLIERS"],
    ["QB","2.0×"],["RB","1.7×"],["TE","1.5×"],["WR","1.3×"],
    ["LB","1.0-1.3×"],["DL","0.9-1.6×"],["DB","0.9-1.25×"],["K","0.6×"],
  ]);
  ws4['!cols'] = [{wch:26},{wch:50}];
  XLSX.utils.book_append_sheet(wb, ws4, "Snapshot Info");

  XLSX.writeFile(wb, `MGG_Dynasty_${new Date().toISOString().split("T")[0]}.xlsx`);
};
