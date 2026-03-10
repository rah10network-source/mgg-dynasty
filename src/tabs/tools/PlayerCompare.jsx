// ─── PLAYER COMPARE ───────────────────────────────────────────────────────────
// Side-by-side comparison of 2 players across all key dynasty metrics.
// Supports comparing rostered players or searching the full nflDb.
// Logic: deterministic — no LLM. Future: AI narrative via intel.js.
import { useState, useMemo } from "react";
import { TIER_STYLE, SIG_COLORS, INJ_COLOR, PRIME } from "../../constants";
import { calcAge } from "../../scoring";

// ── Metric rows ────────────────────────────────────────────────────────────────
const METRICS = [
  { key:"score",        label:"Dynasty Score",   fmt: v => v ?? "—",              higher:true  },
  { key:"tier",         label:"Tier",            fmt: v => v ?? "—",              higher:null  },
  { key:"age",          label:"Age",             fmt: v => v ? `${v}y` : "—",     higher:false },
  { key:"ppg",          label:"PPG (season)",    fmt: v => v != null ? v : "—",   higher:true  },
  { key:"gamesStarted", label:"Games Started",   fmt: v => v ?? "—",              higher:true  },
  { key:"yrsExp",       label:"Years Experience",fmt: v => v != null ? `${v}yr` : "—", higher:null },
  { key:"depthOrder",   label:"Depth Chart",     fmt: v => v ? `#${v}` : "—",    higher:false },
  { key:"roleConf",     label:"Role Confidence", fmt: v => v != null ? `${(v*100).toFixed(0)}%` : "—", higher:true },
];

const WINDOW_FROM = (age, pos) => {
  if (!age || !pos) return null;
  const [rise, peak, cliff] = PRIME[pos] || [23,29,33];
  if (age < rise)  return { label:"DEVELOPING", color:"#60a5fa" };
  if (age <= peak) return { label:"PRIME",       color:"#22c55e" };
  if (age <= cliff)return { label:"DECLINING",   color:"#f59e0b" };
  return               { label:"PAST CLIFF",  color:"#ef4444" };
};

// ── Player search ──────────────────────────────────────────────────────────────
function PlayerSearch({ label, selected, onSelect, players, nflDb, slotIndex }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    if (!q.trim() || q.length < 2) return [];
    const ql = q.toLowerCase();
    // Search rostered players first
    const rostered = players.filter(p =>
      p.name.toLowerCase().includes(ql)
    ).slice(0, 5).map(p => ({ ...p, isRostered: true }));

    // Fill up to 8 results from nflDb
    if (rostered.length < 8 && Object.keys(nflDb).length > 0) {
      const rIds = new Set(rostered.map(p => p.pid));
      const fa = Object.entries(nflDb)
        .filter(([pid, p]) =>
          !rIds.has(pid) &&
          p.position && ["QB","RB","WR","TE","DL","LB","DB"].includes(p.position) &&
          (p.full_name || "").toLowerCase().includes(ql)
        )
        .slice(0, 8 - rostered.length)
        .map(([pid, p]) => ({
          pid, name: p.full_name || `${p.first_name||""} ${p.last_name||""}`.trim(),
          pos: p.position, team: p.team || "FA",
          age: calcAge(p.birth_date),
          depthOrder: p.depth_chart_order || null,
          yrsExp: p.years_exp ?? null,
          roleConf: null, score: null, tier: null,
          ppg: null, gamesStarted: null,
          injStatus: p.injury_status || null,
          isRostered: false,
        }));
      return [...rostered, ...fa];
    }
    return rostered;
  }, [q, players, nflDb]);

  if (selected) {
    const ts   = TIER_STYLE[selected.tier] || TIER_STYLE.Stash;
    const win  = WINDOW_FROM(selected.age, selected.pos);
    const inj  = selected.injStatus && INJ_COLOR[selected.injStatus];
    return (
      <div style={{ background:"#0a1118", border:`2px solid ${ts.text}44`,
        borderRadius:12, padding:"16px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"flex-start", marginBottom:12 }}>
          <div>
            <div style={{ fontSize:9, color:"#4d6880", letterSpacing:2,
              marginBottom:4 }}>SLOT {slotIndex + 1}</div>
            <div style={{ fontSize:16, fontWeight:900, color:"#e2e8f0",
              lineHeight:1.2 }}>{selected.name}</div>
            <div style={{ fontSize:10, color:"#7a95ae", marginTop:4 }}>
              {selected.pos} · {selected.team}
              {selected.age ? ` · ${selected.age}y` : ""}
            </div>
            {win && (
              <div style={{ fontSize:8, color:win.color, fontWeight:700,
                letterSpacing:1, marginTop:4 }}>{win.label}</div>
            )}
          </div>
          <div style={{ textAlign:"center" }}>
            {selected.dynastyValue != null && (
              <div style={{ fontSize:36, fontWeight:900, color:ts.text,
                lineHeight:1 }}>{selected.dynastyValue ?? selected.score}</div>
            )}
            <div style={{ fontSize:8, color:ts.text, letterSpacing:1 }}>
              {selected.tier || "FA"}
            </div>
            {inj && (
              <div style={{ fontSize:8, color:inj, fontWeight:700,
                marginTop:4 }}>{selected.injStatus}</div>
            )}
          </div>
        </div>
        <button onClick={() => onSelect(null)}
          style={{ fontSize:8, color:"#4d6880", background:"none",
            border:"1px solid #1e2d3d", borderRadius:4, padding:"4px 10px",
            fontFamily:"inherit", cursor:"pointer", letterSpacing:1 }}>
          ↺ CHANGE PLAYER
        </button>
      </div>
    );
  }

  return (
    <div style={{ background:"#0a1118", border:"2px dashed #1e2d3d",
      borderRadius:12, padding:"16px 18px" }}>
      <div style={{ fontSize:9, color:"#4d6880", letterSpacing:2, marginBottom:10 }}>
        SLOT {slotIndex + 1} — {label}
      </div>
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Search by name..."
        style={{ width:"100%", boxSizing:"border-box", background:"#080d14",
          border:"1px solid #1e2d3d", color:"#e2e8f0", padding:"8px 12px",
          borderRadius:6, fontFamily:"inherit", fontSize:11 }}
      />
      {results.length > 0 && (
        <div style={{ marginTop:6, border:"1px solid #1e2d3d",
          borderRadius:6, overflow:"hidden" }}>
          {results.map(p => (
            <div key={p.pid}
              onClick={() => { onSelect(p); setQ(""); }}
              style={{ padding:"8px 12px", background:"#080d14",
                borderBottom:"1px solid #0f1923", cursor:"pointer",
                display:"flex", alignItems:"center", gap:8 }}
              onMouseOver={e => e.currentTarget.style.background = "#0a1118"}
              onMouseOut={e  => e.currentTarget.style.background = "#080d14"}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0" }}>{p.name}</div>
                <div style={{ fontSize:9, color:"#7a95ae" }}>
                  {p.pos} · {p.team}{p.age ? ` · ${p.age}y` : ""}
                </div>
              </div>
              {p.dynastyValue != null && (
                <span style={{ fontSize:12, fontWeight:900,
                  color:(TIER_STYLE[p.tier]||TIER_STYLE.Stash).text }}>{p.dynastyValue ?? p.score}</span>
              )}
              {p.isRostered
                ? <span style={{ fontSize:7, color:"#22c55e", letterSpacing:1 }}>ROSTERED</span>
                : <span style={{ fontSize:7, color:"#4d6880", letterSpacing:1 }}>FA</span>
              }
            </div>
          ))}
        </div>
      )}
      {q.length >= 2 && results.length === 0 && (
        <div style={{ marginTop:6, fontSize:9, color:"#4d6880", textAlign:"center",
          padding:8 }}>No players found</div>
      )}
    </div>
  );
}

// ── Comparison table ───────────────────────────────────────────────────────────
function ComparisonTable({ playerA, playerB, newsMap }) {
  if (!playerA || !playerB) return null;

  const nA = newsMap?.[playerA.name];
  const nB = newsMap?.[playerB.name];

  const winner = (metricKey, higher) => {
    if (higher === null) return null;
    const a = playerA[metricKey];
    const b = playerB[metricKey];
    if (a == null || b == null) return null;
    if (a === b) return null;
    return higher ? (a > b ? "A" : "B") : (a < b ? "A" : "B");
  };

  return (
    <div style={{ background:"#0a1118", border:"1px solid #1e2d3d",
      borderRadius:12, overflow:"hidden" }}>

      {/* Signal banner if intel available */}
      {(nA?.signal || nB?.signal) && (
        <div style={{ display:"flex", borderBottom:"1px solid #1e2d3d" }}>
          {[playerA, playerB].map((p, i) => {
            const n = i === 0 ? nA : nB;
            return (
              <div key={p.pid} style={{ flex:1, padding:"8px 14px",
                borderRight: i === 0 ? "1px solid #1e2d3d" : "none",
                background: n?.signal ? SIG_COLORS[n.signal]+"11" : "transparent" }}>
                {n?.signal && (
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:8, background:SIG_COLORS[n.signal],
                      color:"#080d14", borderRadius:3, padding:"2px 6px",
                      fontWeight:900 }}>{n.signal}</span>
                    {n.note && <span style={{ fontSize:8, color:"#7a95ae",
                      fontStyle:"italic" }}>{n.note}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Metric rows */}
      {METRICS.map(({ key, label, fmt, higher }) => {
        const w    = winner(key, higher);
        const colA = w === "A" ? "#22c55e" : w === "B" ? "#ef4444" : "#e2e8f0";
        const colB = w === "B" ? "#22c55e" : w === "A" ? "#ef4444" : "#e2e8f0";
        return (
          <div key={key} style={{ display:"flex", borderBottom:"1px solid #0f1923" }}>
            <div style={{ flex:1, padding:"9px 14px", textAlign:"right",
              borderRight:"1px solid #0f1923" }}>
              <span style={{ fontSize:11, fontWeight:w==="A"?900:400, color:colA }}>
                {fmt(playerA[key])}
              </span>
            </div>
            <div style={{ width:110, padding:"9px 8px", textAlign:"center",
              background:"#080d14", flexShrink:0 }}>
              <span style={{ fontSize:8, color:"#4d6880", letterSpacing:1 }}>{label}</span>
            </div>
            <div style={{ flex:1, padding:"9px 14px", textAlign:"left",
              borderLeft:"1px solid #0f1923" }}>
              <span style={{ fontSize:11, fontWeight:w==="B"?900:400, color:colB }}>
                {fmt(playerB[key])}
              </span>
            </div>
          </div>
        );
      })}

      {/* Stat lines */}
      {(playerA.statLine || playerB.statLine) && (
        <div style={{ display:"flex", borderTop:"1px solid #1e2d3d" }}>
          {[playerA, playerB].map((p, i) => (
            <div key={p.pid} style={{ flex:1, padding:"10px 14px",
              borderRight: i===0 ? "1px solid #1e2d3d" : "none" }}>
              <div style={{ fontSize:8, color:"#4d6880", letterSpacing:1,
                marginBottom:4 }}>SEASON STATS</div>
              <div style={{ fontSize:10, color:"#7a95ae" }}>
                {p.statLine || "No stats available"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Situation flags */}
      {(playerA.situationFlag || playerB.situationFlag) && (
        <div style={{ display:"flex", borderTop:"1px solid #1e2d3d" }}>
          {[playerA, playerB].map((p, i) => (
            <div key={p.pid} style={{ flex:1, padding:"10px 14px",
              borderRight: i===0 ? "1px solid #1e2d3d" : "none" }}>
              {p.situationFlag && (
                <div>
                  <div style={{ fontSize:8, color:"#f59e0b", fontWeight:700,
                    letterSpacing:1 }}>{p.situationFlag.replace(/_/g," ")}</div>
                  {p.situationNote && (
                    <div style={{ fontSize:8, color:"#4d6880", marginTop:2 }}>
                      {p.situationNote}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function PlayerCompare({ phase, players, nflDb, newsMap = {} }) {
  const [playerA, setPlayerA] = useState(null);
  const [playerB, setPlayerB] = useState(null);

  if (phase !== "done") {
    return (
      <div style={{ textAlign:"center", padding:48, border:"1px dashed #1e2d3d",
        borderRadius:12 }}>
        <div style={{ fontSize:11, color:"#7a95ae", letterSpacing:2 }}>
          SYNC DATA FIRST TO USE PLAYER COMPARE
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:900, letterSpacing:3, color:"#6366f1",
          marginBottom:4 }}>⬡ PLAYER COMPARE</div>
        <div style={{ fontSize:9, color:"#4d6880" }}>
          Side-by-side dynasty metric comparison. Search rostered players or any NFL player.
          Green = better for dynasty, red = worse.
        </div>
      </div>

      {/* Selector row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        <PlayerSearch
          label="SELECT PLAYER A"
          selected={playerA}
          onSelect={setPlayerA}
          players={players}
          nflDb={nflDb}
          slotIndex={0}
        />
        <PlayerSearch
          label="SELECT PLAYER B"
          selected={playerB}
          onSelect={setPlayerB}
          players={players}
          nflDb={nflDb}
          slotIndex={1}
        />
      </div>

      {/* Comparison */}
      {playerA && playerB ? (
        <ComparisonTable playerA={playerA} playerB={playerB} newsMap={newsMap} />
      ) : (
        <div style={{ padding:32, textAlign:"center", border:"1px dashed #1e2d3d",
          borderRadius:12, color:"#4d6880", fontSize:10 }}>
          Select two players above to compare
        </div>
      )}

      {/* Reset */}
      {(playerA || playerB) && (
        <div style={{ marginTop:12, textAlign:"center" }}>
          <button onClick={() => { setPlayerA(null); setPlayerB(null); }}
            style={{ background:"#1e2d3d", color:"#7a95ae", border:"1px solid #374151",
              borderRadius:6, padding:"6px 16px", fontFamily:"inherit",
              fontSize:9, cursor:"pointer", letterSpacing:1 }}>
            ↺ RESET COMPARISON
          </button>
        </div>
      )}
    </div>
  );
}
