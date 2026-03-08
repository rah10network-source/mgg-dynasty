// ─── TEAM HUB ─────────────────────────────────────────────────────────────────
// Full build: roster grade, my players, sell-high alerts, trade targets, injury watch
import { useState, useMemo } from "react";
import { gradeRoster }       from "./Roster";
import { TIER_STYLE, INJ_COLOR, SIG_COLORS, POS_ORDER, PRIME } from "../constants";

// ── helpers ───────────────────────────────────────────────────────────────────
const WIN_COLOR = {
  REBUILD:"#60a5fa", RISING:"#22c55e", CONTEND:"#f59e0b", "WIN NOW":"#ef4444", DECLINING:"#6b7280",
};

function StatBar({ label, val, max, color }) {
  const pct = max > 0 ? Math.min(100, (val / max) * 100) : 0;
  return (
    <div style={{ flex: "1 1 55px", minWidth: 48 }}>
      <div style={{ fontSize: 8, color: "#7a95ae", marginBottom: 3, letterSpacing: 1,
        display: "flex", justifyContent: "space-between" }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{typeof val === "number" ? val.toFixed(0) : val}</span>
      </div>
      <div style={{ height: 4, background: "#1e2d3d", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ── ROSTER GRADE CARD ─────────────────────────────────────────────────────────
function GradeCard({ grade, owners, players }) {
  const rank = owners
    .map(o => gradeRoster(o, players))
    .filter(Boolean)
    .sort((a, b) => b.contenderScore - a.contenderScore)
    .findIndex(g => g.owner === grade.owner) + 1;

  const winColor = WIN_COLOR[grade.window] || "#6b7280";

  return (
    <div style={{
      background: "linear-gradient(135deg,#0a1118,#0f1923)",
      border: "2px solid #22c55e", borderRadius: 14, padding: "22px 26px",
      boxShadow: "0 0 30px rgba(34,197,94,0.12)", marginBottom: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        {/* Grade + window */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 64, fontWeight: 900, color: grade.gradeColor, lineHeight: 1,
              textShadow: `0 0 30px ${grade.gradeColor}66` }}>{grade.grade}</div>
            <div style={{ fontSize: 8, color: "#4d6880", letterSpacing: 2, marginTop: 2 }}>DYNASTY GRADE</div>
          </div>
          <div>
            <div style={{ fontSize: 8, color: "#22c55e", letterSpacing: 2, marginBottom: 4, fontWeight: 700 }}>
              {grade.owner.toUpperCase()}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: winColor, letterSpacing: 2, marginBottom: 4 }}>
              {grade.window}
            </div>
            <div style={{ fontSize: 10, color: "#7a95ae" }}>
              Ranked <strong style={{ color: "#e2e8f0" }}>#{rank}</strong> of {owners.length} teams
            </div>
            <div style={{ fontSize: 9, color: "#4d6880", marginTop: 3 }}>
              Contender score: <span style={{ color: grade.gradeColor, fontWeight: 700 }}>{grade.contenderScore}</span>
            </div>
          </div>
        </div>
        {/* Stats row */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          {[
            ["AVG SCORE", grade.avgScore.toFixed(1), "#e2e8f0"],
            ["ELITE",     grade.eliteCount,           "#22c55e"],
            ["STARTERS",  grade.starterCnt,            "#60a5fa"],
            ["AVG AGE",   grade.avgAge.toFixed(1),     "#f59e0b"],
            ["ON CLIFF",  grade.cliffCnt,              "#f97316"],
            ["INJURED",   grade.injCnt,                "#ef4444"],
          ].map(([k, v, c]) => (
            <div key={k} style={{ textAlign: "center", minWidth: 46 }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 7, color: "#4d6880", letterSpacing: 1, marginTop: 2 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Position depth bars */}
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        {POS_ORDER.map(pos => {
          const dep = grade.posDep[pos];
          if (!dep?.count) return null;
          const col = dep.avg >= 70 ? "#22c55e" : dep.avg >= 45 ? "#60a5fa" : dep.avg >= 25 ? "#f59e0b" : "#ef4444";
          return (
            <div key={pos} style={{ flex: "1 1 55px", minWidth: 48 }}>
              <div style={{ fontSize: 8, color: "#7a95ae", marginBottom: 3, letterSpacing: 1,
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{pos}</span>
                <span style={{ color: col, fontWeight: 700 }}>{dep.avg.toFixed(0)}</span>
              </div>
              <div style={{ height: 5, background: "#1e2d3d", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, dep.avg)}%`, background: col, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 7, color: "#4d6880", marginTop: 2 }}>{dep.count} rostered</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MY PLAYERS TABLE ──────────────────────────────────────────────────────────
function MyPlayers({ roster, newsMap, onDetail }) {
  const [posFilter, setPosFilter] = useState("ALL");
  const [sort, setSort]           = useState({ key: "score", asc: false });
  const [search, setSearch]       = useState("");

  const filtered = useMemo(() => {
    let r = roster;
    if (posFilter !== "ALL") r = r.filter(p => p.pos === posFilter);
    if (search) r = r.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return [...r].sort((a, b) => {
      const va = a[sort.key] ?? 0, vb = b[sort.key] ?? 0;
      const diff = typeof va === "string" ? va.localeCompare(vb) : va - vb;
      return sort.asc ? diff : -diff;
    });
  }, [roster, posFilter, sort, search]);

  const TH = ({ label, k, w }) => (
    <th onClick={() => setSort(s => ({ key: k, asc: s.key === k ? !s.asc : false }))}
      style={{ padding: "7px 8px", background: "#0c151e", color: "#7a95ae", fontSize: 9,
        letterSpacing: 1.5, fontWeight: 700, cursor: "pointer", userSelect: "none",
        borderRight: "1px solid #1e2d3d", width: w, whiteSpace: "nowrap", textAlign: "center" }}>
      {label}{sort.key === k ? (sort.asc ? " ↑" : " ↓") : ""}
    </th>
  );
  const TD = ({ children, style = {} }) => (
    <td style={{ padding: "6px 7px", textAlign: "center", borderBottom: "1px solid #0f1923",
      borderRight: "1px solid #0f1923", fontSize: 11, verticalAlign: "middle", ...style }}>
      {children}
    </td>
  );

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {["ALL", ...POS_ORDER].map(pos => (
          <button key={pos} onClick={() => setPosFilter(pos)}
            style={{ background: posFilter === pos ? "#0f2b1a" : "transparent",
              border: `1px solid ${posFilter === pos ? "#22c55e44" : "#1e2d3d"}`,
              color: posFilter === pos ? "#22c55e" : "#4b6580",
              borderRadius: 5, padding: "4px 10px", fontFamily: "inherit", fontSize: 9,
              cursor: "pointer", fontWeight: posFilter === pos ? 700 : 400, letterSpacing: 1 }}>
            {pos}{pos !== "ALL" ? ` (${roster.filter(p => p.pos === pos).length})` : ""}
          </button>
        ))}
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="SEARCH..." style={{ marginLeft: "auto", background: "#0f1923",
            border: "1px solid #1e2d3d", color: "#e2e8f0", padding: "5px 12px",
            borderRadius: 6, fontFamily: "inherit", fontSize: 10, letterSpacing: 1, width: 150 }} />
        <span style={{ fontSize: 9, color: "#4d6880", letterSpacing: 1 }}>{filtered.length} PLAYERS</span>
      </div>

      <div style={{ overflowX: "auto", borderRadius: 8, border: "1px solid #1e2d3d" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <TH label="#"      k=""             w={32} />
              <TH label="PLAYER" k="name"         w={170} />
              <TH label="POS"    k="pos"          w={44} />
              <TH label="TEAM"   k="team"         w={52} />
              <TH label="AGE"    k="age"          w={44} />
              <TH label="SCORE"  k="score"        w={60} />
              <TH label="TIER"   k="tier"         w={72} />
              <TH label="DEPTH"  k="depthOrder"   w={56} />
              <TH label="G STR"  k="gamesStarted" w={58} />
              <TH label="PPG"    k="ppg"          w={50} />
              <TH label="STATS"  k=""             w={160} />
              <TH label="INJ"    k="injStatus"    w={90} />
              <TH label="SIG"    k=""             w={50} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
              const news = newsMap[p.name];
              return (
                <tr key={p.pid} onClick={() => onDetail(p)}
                  style={{ background: i % 2 === 0 ? "#080d14" : "#0a1118", cursor: "pointer" }}>
                  <TD><span style={{ color: "#4d6880", fontSize: 9 }}>{i + 1}</span></TD>
                  <TD style={{ textAlign: "left", fontWeight: 700, color: ts.text }}>
                    {p.name}
                    {p.onTaxi && <span style={{ fontSize: 8, color: "#f59e0b", marginLeft: 4 }}>TAXI</span>}
                  </TD>
                  <TD style={{ color: "#60a5fa", fontWeight: 700 }}>{p.pos}</TD>
                  <TD style={{ color: "#a8bccf" }}>{p.team}</TD>
                  <TD style={{ color: "#a8bccf" }}>{p.age ?? "—"}</TD>
                  <TD style={{ fontWeight: 900, fontSize: 14, color: ts.text, textShadow: `0 0 8px ${ts.glow}` }}>
                    {p.score}
                  </TD>
                  <TD>
                    <span style={{ background: ts.bg, color: ts.text, border: `1px solid ${ts.border}`,
                      borderRadius: 4, padding: "2px 6px", fontSize: 9, fontWeight: 700, letterSpacing: 1 }}>
                      {p.tier.toUpperCase()}
                    </span>
                  </TD>
                  <TD style={{ fontWeight: 700,
                    color: p.depthOrder === 1 ? "#22c55e" : p.depthOrder === 2 ? "#f59e0b" : "#ef4444" }}>
                    {p.depthOrder ? `#${p.depthOrder}` : "—"}
                  </TD>
                  <TD style={{ fontSize: 10 }}>
                    {p.gamesStarted != null
                      ? <><span style={{ color: "#e2e8f0", fontWeight: 700 }}>{p.gamesStarted}</span>
                          <span style={{ color: "#4d6880", fontSize: 9 }}>/{p.gamesPlayed}</span></>
                      : "—"}
                  </TD>
                  <TD style={{ fontWeight: 700,
                    color: p.ppg != null ? p.ppg > 20 ? "#22c55e" : p.ppg > 12 ? "#60a5fa" : p.ppg > 6 ? "#f59e0b" : "#94a3b8" : "#2a3d52" }}>
                    {p.ppg ?? "—"}
                  </TD>
                  <TD style={{ textAlign: "left", fontSize: 10, color: "#7a95ae" }}>{p.statLine || "—"}</TD>
                  <TD>
                    {p.injStatus
                      ? <span style={{ color: INJ_COLOR[p.injStatus] || "#ef4444", fontWeight: 700, fontSize: 9 }}>
                          {p.injStatus.toUpperCase()}
                        </span>
                      : <span style={{ color: "#2d5a35", fontSize: 8 }}>OK</span>}
                  </TD>
                  <TD>
                    {news
                      ? <span style={{ background: SIG_COLORS[news.signal] || "#4b6580", color: "#080d14",
                          fontSize: 8, fontWeight: 900, borderRadius: 3, padding: "2px 5px", letterSpacing: 1 }}>
                          {news.signal}
                        </span>
                      : <span style={{ color: "#3a5068", fontSize: 8 }}>—</span>}
                  </TD>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={13} style={{ padding: 24, textAlign: "center", color: "#4d6880", fontSize: 10 }}>
                No players match filters
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── SELL-HIGH PANEL ───────────────────────────────────────────────────────────
function SellHighPanel({ roster, newsMap }) {
  const candidates = useMemo(() => {
    return roster.filter(p => {
      const news = newsMap[p.name];
      if (news?.signal === "SELL") return true;
      const [, peak, cliff] = PRIME[p.pos] || [23, 29, 33];
      return p.score >= 60 && p.age >= peak && p.age < cliff + 2;
    }).sort((a, b) => b.score - a.score).slice(0, 8);
  }, [roster, newsMap]);

  if (!candidates.length) return (
    <div style={{ padding: "24px 0", textAlign: "center", color: "#4d6880", fontSize: 10 }}>
      No obvious sell-high candidates right now
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {candidates.map(p => {
        const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
        const news = newsMap[p.name];
        const [, peak] = PRIME[p.pos] || [23, 29, 33];
        const reason = news?.signal === "SELL"
          ? news.note || "SELL signal from Intel"
          : `Age ${p.age} — past ${p.pos} peak (${peak})`;
        return (
          <div key={p.pid} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", background: "#0a1118",
            border: `1px solid ${ts.border}44`, borderRadius: 8 }}>
            <div style={{ background: ts.bg, border: `1px solid ${ts.border}`,
              borderRadius: 6, padding: "6px 10px", textAlign: "center", minWidth: 48, flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: ts.text, lineHeight: 1 }}>{p.score}</div>
              <div style={{ fontSize: 7, color: ts.text, letterSpacing: 0.5, marginTop: 1 }}>{p.tier.toUpperCase()}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{p.name}</div>
              <div style={{ fontSize: 10, color: "#7a95ae", marginTop: 1 }}>{p.pos} · {p.team} · {p.age}y</div>
              <div style={{ fontSize: 9, color: "#f97316", marginTop: 3, fontStyle: "italic" }}>{reason}</div>
            </div>
            <div style={{ flexShrink: 0, textAlign: "right" }}>
              {news?.signal && (
                <span style={{ background: SIG_COLORS[news.signal] || "#4b6580", color: "#080d14",
                  fontSize: 9, fontWeight: 900, borderRadius: 3, padding: "3px 7px", letterSpacing: 1 }}>
                  {news.signal}
                </span>
              )}
              {!news && p.age >= (PRIME[p.pos]?.[1] || 29) && (
                <span style={{ background: "#f97316", color: "#080d14",
                  fontSize: 9, fontWeight: 900, borderRadius: 3, padding: "3px 7px", letterSpacing: 1 }}>
                  SELL
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── INJURY WATCH ──────────────────────────────────────────────────────────────
function InjuryWatch({ roster }) {
  const injured = roster.filter(p =>
    p.injStatus && ["Out", "IR", "PUP", "Doubtful", "Questionable"].includes(p.injStatus)
  ).sort((a, b) => {
    const sev = { IR: 0, PUP: 1, Out: 2, Doubtful: 3, Questionable: 4 };
    return (sev[a.injStatus] ?? 5) - (sev[b.injStatus] ?? 5);
  });

  if (!injured.length) return (
    <div style={{ padding: "24px 0", textAlign: "center", color: "#22c55e", fontSize: 10 }}>
      ✓ No significant injuries on your roster
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {injured.map(p => {
        const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
        const injCol = INJ_COLOR[p.injStatus] || "#ef4444";
        return (
          <div key={p.pid} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", background: "#0a1118",
            border: `1px solid ${injCol}33`, borderRadius: 8,
            borderLeft: `3px solid ${injCol}` }}>
            <div style={{ background: ts.bg, border: `1px solid ${ts.border}`,
              borderRadius: 6, padding: "6px 10px", textAlign: "center", minWidth: 48, flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: ts.text, lineHeight: 1 }}>{p.score}</div>
              <div style={{ fontSize: 7, color: ts.text, letterSpacing: 0.5, marginTop: 1 }}>{p.tier.toUpperCase()}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{p.name}</div>
              <div style={{ fontSize: 10, color: "#7a95ae", marginTop: 1 }}>{p.pos} · {p.team} · {p.age}y</div>
              {p.statLine && <div style={{ fontSize: 9, color: "#4d6880", marginTop: 2 }}>{p.statLine}</div>}
            </div>
            <div style={{ flexShrink: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: injCol, letterSpacing: 1 }}>
                ⚠ {p.injStatus.toUpperCase()}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── TRADE TARGETS ─────────────────────────────────────────────────────────────
function TradeTargets({ roster, allPlayers, newsMap, grade }) {
  // Find my weakest positions vs league average
  const leagueAvg = {};
  POS_ORDER.forEach(pos => {
    const pp = allPlayers.filter(p => p.pos === pos);
    leagueAvg[pos] = pp.length ? pp.reduce((s, p) => s + p.score, 0) / pp.length : 0;
  });
  const myOwner = roster[0]?.owner;
  const weakPos = new Set(
    POS_ORDER.filter(pos => {
      const mine = grade.posDep[pos]?.avg || 0;
      return mine < leagueAvg[pos] - 5;
    })
  );

  const targets = allPlayers
    .filter(p => p.owner !== myOwner && p.score >= 50)
    .map(p => ({
      ...p,
      _pri: (weakPos.has(p.pos) ? 20 : 0) + (newsMap[p.name]?.signal === "BUY" ? 15 : 0) + p.score,
    }))
    .sort((a, b) => b._pri - a._pri)
    .slice(0, 8);

  if (!targets.length) return (
    <div style={{ padding: "24px 0", textAlign: "center", color: "#4d6880", fontSize: 10 }}>
      Run ◈ Intel Scan to surface targets
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {weakPos.size > 0 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#4d6880", letterSpacing: 1 }}>YOUR GAPS:</span>
          {[...weakPos].map(pos => (
            <span key={pos} style={{ fontSize: 9, background: "#f9731622", color: "#f97316",
              border: "1px solid #f9731633", borderRadius: 3, padding: "1px 7px", fontWeight: 700 }}>
              {pos} ⚠
            </span>
          ))}
        </div>
      )}
      {targets.map((p, i) => {
        const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
        const news = newsMap[p.name];
        const fillsGap = weakPos.has(p.pos);
        return (
          <div key={p.pid} style={{ display: "flex", alignItems: "center", gap: 10,
            padding: "8px 12px", background: fillsGap ? "#0f2b1a" : "#0a1118",
            border: `1px solid ${fillsGap ? "#22c55e22" : "#1e2d3d"}`, borderRadius: 7 }}>
            <div style={{ fontSize: 9, color: "#2a3d52", width: 16, textAlign: "center" }}>{i + 1}</div>
            <div style={{ background: ts.bg, border: `1px solid ${ts.border}`,
              borderRadius: 5, padding: "4px 8px", textAlign: "center", minWidth: 42, flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: ts.text, lineHeight: 1 }}>{p.score}</div>
              <div style={{ fontSize: 7, color: ts.text, marginTop: 1 }}>{p.pos}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{p.name}</div>
              <div style={{ fontSize: 9, color: "#7a95ae" }}>{p.team} · {p.age}y · {p.owner}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
              {fillsGap && (
                <span style={{ fontSize: 7, color: "#22c55e", fontWeight: 700, letterSpacing: 0.5 }}>FILLS GAP</span>
              )}
              {news?.signal === "BUY" && (
                <span style={{ fontSize: 7, background: "#22c55e", color: "#080d14",
                  borderRadius: 2, padding: "1px 4px", fontWeight: 900 }}>BUY</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── AGE CLIFF PANEL ───────────────────────────────────────────────────────────
function AgeCliffPanel({ roster }) {
  const atRisk = roster
    .filter(p => p.situationFlag === "AGE_CLIFF" || p.situationFlag === "DECLINING")
    .sort((a, b) => b.score - a.score);

  if (!atRisk.length) return (
    <div style={{ padding: "24px 0", textAlign: "center", color: "#22c55e", fontSize: 10 }}>
      ✓ No players past their position cliff
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {atRisk.map(p => {
        const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
        const [,, cliff] = PRIME[p.pos] || [23, 29, 33];
        const over = p.age ? (p.age - cliff).toFixed(1) : "?";
        return (
          <div key={p.pid} style={{ display: "flex", alignItems: "center", gap: 12,
            padding: "10px 14px", background: "#0a1118",
            border: "1px solid #f9731633", borderRadius: 8, borderLeft: "3px solid #f97316" }}>
            <div style={{ background: ts.bg, border: `1px solid ${ts.border}`,
              borderRadius: 6, padding: "6px 10px", textAlign: "center", minWidth: 48, flexShrink: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: ts.text, lineHeight: 1 }}>{p.score}</div>
              <div style={{ fontSize: 7, color: ts.text, letterSpacing: 0.5, marginTop: 1 }}>{p.tier.toUpperCase()}</div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2e8f0" }}>{p.name}</div>
              <div style={{ fontSize: 10, color: "#7a95ae", marginTop: 1 }}>{p.pos} · {p.team}</div>
              <div style={{ fontSize: 9, color: "#f97316", marginTop: 2 }}>
                Age {p.age} · cliff {cliff} · <strong>+{over}y past</strong>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ALERT CARD WRAPPER ────────────────────────────────────────────────────────
function AlertCard({ title, color, icon, count, children }) {
  return (
    <div style={{ background: "#0a1118", border: `1px solid ${color}33`,
      borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
        <span style={{ fontSize: 14, color }}>{icon}</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color }}>{title}</span>
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 900, color,
          background: color + "22", borderRadius: 4, padding: "1px 7px" }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

// ── MAIN TEAM HUB ─────────────────────────────────────────────────────────────
const TABS = [
  ["overview",  "◎ OVERVIEW"],
  ["roster",    "⬡ MY ROSTER"],
  ["alerts",    "⚑ ALERTS"],
  ["targets",   "⇄ TARGETS"],
];

export function TeamHub({ phase, players, owners, currentOwner, newsMap = {} }) {
  const [tab, setTab] = useState("overview");

  if (phase === "idle" || phase === "loading") return (
    <div style={{ textAlign: "center", padding: "72px 20px", border: "1px dashed #1e2d3d", borderRadius: 12 }}>
      <div style={{ fontSize: 11, color: "#7a95ae", letterSpacing: 2 }}>
        {phase === "loading" ? "◌ SYNCING DATA..." : "SYNC DATA FIRST TO VIEW YOUR TEAM"}
      </div>
    </div>
  );

  if (!currentOwner) return (
    <div style={{ textAlign: "center", padding: 56, border: "1px dashed #1e2d3d", borderRadius: 12 }}>
      <div style={{ fontSize: 11, color: "#f59e0b", letterSpacing: 2, marginBottom: 8 }}>SET YOUR TEAM FIRST</div>
      <div style={{ fontSize: 10, color: "#4d6880" }}>Click ◎ in the top bar to identify your team</div>
    </div>
  );

  const grade = gradeRoster(currentOwner, players);
  if (!grade) return (
    <div style={{ padding: 40, textAlign: "center", color: "#4d6880", fontSize: 11 }}>
      No roster data found for {currentOwner}
    </div>
  );

  const roster = players.filter(p => p.owner === currentOwner);
  const sellCount = roster.filter(p => {
    const news = newsMap[p.name];
    if (news?.signal === "SELL") return true;
    const [, peak, cliff] = PRIME[p.pos] || [23, 29, 33];
    return p.score >= 60 && p.age >= peak && p.age < cliff + 2;
  }).length;
  const injCount = roster.filter(p =>
    p.injStatus && ["Out", "IR", "PUP", "Doubtful", "Questionable"].includes(p.injStatus)
  ).length;
  const cliffCount = roster.filter(p => p.situationFlag === "AGE_CLIFF").length;

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #1e2d3d", marginBottom: 20 }}>
        {TABS.map(([key, label]) => {
          const badge = key === "alerts" && (sellCount + injCount + cliffCount) > 0
            ? sellCount + injCount + cliffCount : null;
          return (
            <button key={key} onClick={() => setTab(key)}
              style={{ background: "none", border: "none",
                borderBottom: tab === key ? "2px solid #0ea5e9" : "2px solid transparent",
                color: tab === key ? "#0ea5e9" : "#4b6580",
                padding: "6px 18px", fontFamily: "inherit", fontSize: 10,
                letterSpacing: 2, fontWeight: 700, cursor: "pointer",
                position: "relative" }}>
              {label}
              {badge && (
                <span style={{ marginLeft: 5, background: "#ef4444", color: "#fff",
                  fontSize: 8, borderRadius: 8, padding: "1px 5px", fontWeight: 900 }}>
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && (
        <div>
          <GradeCard grade={grade} owners={owners} players={players} />

          {/* Quick-look alert row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 12, marginBottom: 20 }}>
            {[
              ["SELL-HIGH", sellCount, "#ef4444", "↑", "Players at or past peak value"],
              ["INJURY WATCH", injCount, "#f97316", "⚠", "Players with active injury status"],
              ["AGE CLIFF", cliffCount, "#6b7280", "↓", "Players past their position cliff"],
              ["ROSTER SIZE", roster.length, "#60a5fa", "◎", "Total rostered players"],
            ].map(([label, count, color, icon, desc]) => (
              <div key={label} style={{ background: "#0a1118", border: `1px solid ${color}33`,
                borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color, letterSpacing: 1.5, fontWeight: 700 }}>{icon} {label}</span>
                  <span style={{ fontSize: 24, fontWeight: 900, color }}>{count}</span>
                </div>
                <div style={{ fontSize: 9, color: "#4d6880" }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Top players quick view */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, color: "#4d6880", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
              ◈ TOP PLAYERS
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[...roster].sort((a, b) => b.score - a.score).slice(0, 10).map(p => {
                const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
                const news = newsMap[p.name];
                return (
                  <div key={p.pid} style={{ background: ts.bg, border: `1px solid ${ts.border}`,
                    borderRadius: 8, padding: "8px 12px", minWidth: 130 }}>
                    <div style={{ fontSize: 8, color: ts.text, letterSpacing: 1, marginBottom: 2 }}>
                      {p.tier.toUpperCase()}
                    </div>
                    <div style={{ fontWeight: 900, color: "#e2e8f0", fontSize: 12 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: "#7a95ae", marginTop: 2 }}>
                      {p.team} · {p.age} · <span style={{ color: ts.text, fontWeight: 700 }}>{p.score}</span>
                    </div>
                    {p.depthOrder && (
                      <div style={{ fontSize: 8, color: p.depthOrder === 1 ? "#22c55e" : "#f59e0b", marginTop: 2 }}>
                        Depth #{p.depthOrder}{p.ppg != null ? ` · ${p.ppg}PPG` : ""}
                      </div>
                    )}
                    {news && (
                      <span style={{ fontSize: 7, background: SIG_COLORS[news.signal], color: "#080d14",
                        borderRadius: 3, padding: "1px 4px", marginTop: 4, display: "inline-block", fontWeight: 900 }}>
                        {news.signal}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MY ROSTER */}
      {tab === "roster" && (
        <MyPlayers
          roster={roster}
          newsMap={newsMap}
          onDetail={() => {}} // TODO: wire to PlayerHub detail
        />
      )}

      {/* ALERTS */}
      {tab === "alerts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <AlertCard title="SELL-HIGH CANDIDATES" color="#ef4444" icon="↑" count={sellCount}>
            <SellHighPanel roster={roster} newsMap={newsMap} />
          </AlertCard>
          <AlertCard title="INJURY WATCH" color="#f97316" icon="⚠" count={injCount}>
            <InjuryWatch roster={roster} />
          </AlertCard>
          <AlertCard title="AGE CLIFF RISKS" color="#6b7280" icon="↓" count={cliffCount}>
            <AgeCliffPanel roster={roster} />
          </AlertCard>
        </div>
      )}

      {/* TRADE TARGETS */}
      {tab === "targets" && (
        <div>
          <div style={{ fontSize: 9, color: "#4d6880", letterSpacing: 1, lineHeight: 1.8, marginBottom: 16 }}>
            Targets are weighted to your weakest positions vs league average.
            BUY-signal players get priority. Run ◈ Intel Scan for best results.
          </div>
          <TradeTargets
            roster={roster}
            allPlayers={players}
            newsMap={newsMap}
            grade={grade}
          />
        </div>
      )}
    </div>
  );
}
