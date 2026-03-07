// ─── DASHBOARD ────────────────────────────────────────────────────────────────
// v1.0.0 planned content:
//   • Your roster grade + win window at a glance
//   • Top 3 alerts (sell-highs, injury risk, breakout targets)
//   • League rank snapshot (score vs avg)
//   • Quick links to Team Hub and Analysis Tools
//   • Last synced timestamp + one-click re-sync

export function Dashboard({ phase }) {
  const planned = [
    { icon: "◎", title: "Your Team Snapshot",   desc: "Roster grade, win window, avg score vs league average" },
    { icon: "⚑", title: "Top Alerts",            desc: "Sell-high candidates, injury risks, breakout targets on your roster" },
    { icon: "⇄", title: "Trade Targets",          desc: "3-5 players you should be targeting based on value gaps" },
    { icon: "◈", title: "League Activity",        desc: "Recent transactions, who is trending, biggest movers this week" },
    { icon: "▸", title: "Quick Actions",          desc: "Jump to Trade Analyzer, Waiver Tool, or your Watchlist" },
  ];

  return (
    <div>
      {/* Coming soon header */}
      <div style={{
        background: "linear-gradient(135deg,#0f2b1a,#0c1e35)",
        border: "1px solid #1e2d3d", borderRadius: 12,
        padding: "28px 32px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg,#22c55e22,#0ea5e922)",
          border: "1px solid #22c55e44",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
        }}>Ω</div>
        <div>
          <div style={{
            fontSize: 18, fontWeight: 900, letterSpacing: 3, marginBottom: 4,
            background: "linear-gradient(90deg,#22c55e,#0ea5e9)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>DASHBOARD</div>
          <div style={{ fontSize: 10, color: "#4d6880", lineHeight: 1.7 }}>
            Your personalized command center — coming in <span style={{ color: "#f59e0b", fontWeight: 700 }}>v1.0.0</span><br/>
            {phase === "done"
              ? <span style={{ color: "#22c55e" }}>✓ Data synced — dashboard will populate automatically once built</span>
              : <span style={{ color: "#7a95ae" }}>Sync data first with ⟳ SYNC DATA to power the dashboard</span>}
          </div>
        </div>
      </div>

      {/* Planned panels preview */}
      <div style={{ fontSize: 9, color: "#4d6880", letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>
        PLANNED PANELS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 10 }}>
        {planned.map(({ icon, title, desc }) => (
          <div key={title} style={{
            background: "#0a1118", border: "1px dashed #1e2d3d",
            borderRadius: 10, padding: "16px 18px",
            opacity: 0.7,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 16, color: "#22c55e" }}>{icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e8f0", letterSpacing: 1 }}>{title}</span>
            </div>
            <div style={{ fontSize: 10, color: "#4d6880", lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, fontSize: 9, color: "#2a3d52", letterSpacing: 1, lineHeight: 1.8 }}>
        Dashboard reads from already-synced data — no extra API calls required.<br/>
        Use the other tabs in the meantime: League Hub, Team Hub, Player Hub, Analysis Tools.
      </div>
    </div>
  );
}
