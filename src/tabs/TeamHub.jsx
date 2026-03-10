// ─── TEAM HUB ─────────────────────────────────────────────────────────────────
// Your team's command centre — grade, sell-high alerts, trade targets,
// positional depth vs league, and your full roster breakdown.
import { useState, useMemo } from "react";
import { TIER_STYLE, INJ_COLOR, SIG_COLORS, POS_ORDER, SCARCITY, SITUATION_FLAGS, pv, pvColor } from "../constants";
import { gradeRoster, isSellHigh, sellHighCandidates, tradeTargets, weakPositions } from "../roster";
import { sitMultiplier } from "../scoring";

const TABS = [
  ["overview",  "◎ OVERVIEW"],
  ["roster",    "⬡ MY ROSTER"],
  ["sellhigh",  "⚑ SELL-HIGH"],
  ["targets",   "⇄ TARGETS"],
  ["compare",   "⬤ COMPARE"],
];

function Stat({ label, value, color = "#e2e8f0", size = 18 }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: size, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 7, color: "#7a95ae", letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PlayerRow({ p, newsMap, playerNotes, savePlayerNote, viewMode = "dynasty" }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [noteVal, setNoteVal] = useState("");
  const n   = newsMap?.[p.name];
  const ts  = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
  const inj = p.injStatus && INJ_COLOR[p.injStatus];
  const sf  = p.situationFlag ? SITUATION_FLAGS[p.situationFlag] : null;
  const savedNote = playerNotes?.[p.pid] || "";

  return (
    <div style={{ borderBottom:"1px solid #0f1923" }}>
      {/* ── Summary row ── */}
      <div onClick={() => setExpanded(x => !x)}
        style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px",
          background: expanded ? ts.bg : "#080d14",
          cursor:"pointer", transition:"background .15s" }}
        onMouseOver={e => { if (!expanded) e.currentTarget.style.background = "#0a1118"; }}
        onMouseOut={e  => { if (!expanded) e.currentTarget.style.background = "#080d14"; }}>

        {/* Score + tier */}
        <div style={{ width:38, textAlign:"center", flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:900, color:ts.text,
            textShadow:`0 0 8px ${ts.glow}` }}>{pv(p,viewMode)}</div>
          <div style={{ fontSize:7, color:ts.text, letterSpacing:1 }}>{p.tier}</div>
        </div>

        {/* Name + badges */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{p.name}</span>
            {p.onTaxi && <span style={{ fontSize:7, background:"#0c1e35", color:"#60a5fa",
              border:"1px solid #3b82f644", borderRadius:3, padding:"1px 5px" }}>TAXI</span>}
            {inj && <span style={{ fontSize:7, background:inj+"22", color:inj,
              border:`1px solid ${inj}44`, borderRadius:3, padding:"1px 5px" }}>{p.injStatus}</span>}
            {n?.signal && <span style={{ fontSize:7, background:SIG_COLORS[n.signal],
              color:"#080d14", borderRadius:3, padding:"1px 5px", fontWeight:900 }}>{n.signal}</span>}
            {savedNote && <span style={{ fontSize:7, color:"#f59e0b", background:"#f59e0b18",
              border:"1px solid #f59e0b44", borderRadius:3, padding:"1px 5px" }}>✎ NOTE</span>}
          </div>
          <div style={{ fontSize:9, color:"#7a95ae", marginTop:2 }}>
            {p.pos} · {p.team}{p.age ? ` · ${p.age}y` : ""}{p.ppg != null ? ` · ${p.ppg} ppg` : ""}
          </div>
        </div>

        {/* Situation flag + chevron */}
        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {p.situationFlag && (
            <div style={{ fontSize:7, color:"#f59e0b", textAlign:"right",
              maxWidth:80, lineHeight:1.3 }}>{p.situationFlag.replace(/_/g," ")}</div>
          )}
          <span style={{ fontSize:9, color:"#4d6880" }}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ background:ts.bg, borderTop:`1px solid ${ts.border}`,
          padding:"16px 18px" }}>

          {/* Top 3 columns */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18, marginBottom:16 }}>

          {/* Profile */}
          <div>
            <div style={{ fontSize:8, color:ts.text, letterSpacing:2,
              fontWeight:700, marginBottom:8 }}>PROFILE</div>
            {[
              ["Team",     p.team],
              ["Age",      p.age || "—"],
              ["Yrs Exp",  p.yrsExp ?? "—"],
              ["Ht / Wt",  `${p.height||"—"} / ${p.weight||"—"}`],
              ["Status",   p.status || "Active"],
              ["Depth",    p.depthOrder ? `#${p.depthOrder} ${p.depthPos||""}` : "Unknown"],
              ["Injury",   p.injStatus || "None"],
            ].map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                borderBottom:"1px solid rgba(255,255,255,0.04)", padding:"3px 0", fontSize:11 }}>
                <span style={{ color:"#7a95ae" }}>{k}</span>
                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Dynasty metrics */}
          <div>
            <div style={{ fontSize:8, color:ts.text, letterSpacing:2,
              fontWeight:700, marginBottom:8 }}>DYNASTY METRICS</div>
            {[
              ["DV / SV", `${p.dynastyValue ?? "—"} / ${p.startValue ?? "—"}`],
              ["Dynasty Value",  p.dynastyValue ?? "—"],
              ["Tier",           p.tier],
              ["Scarcity Mult", `${(p.scarcityUsed || SCARCITY[p.pos] || 1).toFixed(2)}×`],
              ["Age Score",     p.ageRaw != null ? Math.round(p.ageRaw) : "—"],
              ["Role Conf",     p.roleConf != null ? `${Math.round(p.roleConf*100)}%` : "—"],
              ["Starts (2025)", p.gamesStarted != null ? `${p.gamesStarted}/${p.gamesPlayed}` : "No data"],
              ["PPG (2025)",    p.ppg != null ? p.ppg : "No data"],
              ["Season Stats",  p.statLine || "—"],
              ["Trades",        p.trades ?? "—"],
              ["FA Adds",       p.adds ?? "—"],
              ...(p.peerScore != null ? [["Peer Score", `${p.peerScore} (Elo ${p.eloRating})`]] : []),
              ["Situation",     sf ? sf.label : "None"],
              ...(p.situationNote ? [["Sit. Note", p.situationNote]] : []),
              ...(p.situationFlag === "SUSPENSION" ? [["Value Mult", `${(sitMultiplier(p)*100).toFixed(0)}%`]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                borderBottom:"1px solid rgba(255,255,255,0.04)", padding:"3px 0", fontSize:11 }}>
                <span style={{ color:"#7a95ae" }}>{k}</span>
                <span style={{ color:ts.text, fontWeight:700 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Intel */}
          <div>
            <div style={{ fontSize:8, color:ts.text, letterSpacing:2,
              fontWeight:700, marginBottom:8 }}>INTEL</div>
            {n ? (
              <div style={{ background:`${SIG_COLORS[n.signal]}18`,
                border:`1px solid ${SIG_COLORS[n.signal]}`,
                borderRadius:8, padding:"12px" }}>
                <div style={{ fontSize:13, fontWeight:900,
                  color:SIG_COLORS[n.signal], letterSpacing:2,
                  marginBottom:6 }}>{n.signal}</div>
                {n.note && (
                  <div style={{ fontSize:11, color:"#e2e8f0",
                    lineHeight:1.7, marginBottom:6 }}>{n.note}</div>
                )}
                {n.situationFlag && (
                  <div style={{ fontSize:9, color:"#f59e0b", fontWeight:700 }}>
                    {n.situationFlag.replace(/_/g," ")}
                  </div>
                )}
                {n.situationNote && (
                  <div style={{ fontSize:9, color:"#7a95ae",
                    marginTop:3, fontStyle:"italic" }}>{n.situationNote}</div>
                )}
              </div>
            ) : (
              <div style={{ fontSize:10, color:"#4d6880",
                fontStyle:"italic" }}>Run ◈ INTEL SCAN for news signals</div>
            )}
          </div>
          </div>

          {/* Notes row — full width */}
          <div style={{ borderTop:"1px solid rgba(255,255,255,0.06)", paddingTop:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between",
              alignItems:"center", marginBottom:6 }}>
              <div style={{ fontSize:8, color:"#f59e0b", letterSpacing:2, fontWeight:700 }}>
                MY NOTES
              </div>
              {!editingNote && (
                <button onClick={() => { setEditingNote(true); setNoteVal(savedNote); }}
                  style={{ fontSize:8, background:"none", border:"1px solid #2a3f55",
                    color:"#60a5fa", borderRadius:4, padding:"2px 8px",
                    cursor:"pointer", fontFamily:"inherit" }}>
                  {savedNote ? "EDIT" : "+ ADD NOTE"}
                </button>
              )}
            </div>
            {editingNote ? (
              <div>
                <textarea
                  value={noteVal}
                  onChange={e => setNoteVal(e.target.value)}
                  placeholder="Trade value thoughts, injury notes, role changes..."
                  autoFocus
                  style={{ width:"100%", minHeight:64, background:"#050a10",
                    border:"1px solid #2a3f55", borderRadius:6, color:"#e2e8f0",
                    padding:"8px 10px", fontSize:11, fontFamily:"inherit",
                    resize:"vertical", outline:"none", boxSizing:"border-box" }}
                />
                <div style={{ display:"flex", gap:8, marginTop:6 }}>
                  <button onClick={() => { savePlayerNote(p.pid, noteVal.trim()); setEditingNote(false); }}
                    style={{ fontSize:8, background:"#22c55e22", border:"1px solid #22c55e66",
                      color:"#22c55e", borderRadius:4, padding:"3px 12px",
                      cursor:"pointer", fontFamily:"inherit", fontWeight:700 }}>
                    SAVE
                  </button>
                  <button onClick={() => setEditingNote(false)}
                    style={{ fontSize:8, background:"none", border:"1px solid #2a3f55",
                      color:"#4d6880", borderRadius:4, padding:"3px 10px",
                      cursor:"pointer", fontFamily:"inherit" }}>
                    CANCEL
                  </button>
                  {savedNote && (
                    <button onClick={() => { savePlayerNote(p.pid, ""); setEditingNote(false); }}
                      style={{ fontSize:8, background:"#ef444422", border:"1px solid #ef444466",
                        color:"#ef4444", borderRadius:4, padding:"3px 10px",
                        cursor:"pointer", fontFamily:"inherit" }}>
                      CLEAR
                    </button>
                  )}
                </div>
              </div>
            ) : savedNote ? (
              <div style={{ fontSize:11, color:"#e2e8f0", lineHeight:1.7,
                background:"#f59e0b0d", border:"1px solid #f59e0b22",
                borderRadius:6, padding:"8px 12px" }}>
                {savedNote}
              </div>
            ) : (
              <div style={{ fontSize:10, color:"#4d6880", fontStyle:"italic" }}>
                No notes yet — click + ADD NOTE to record trade thoughts
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function Overview({ myGrade, owners, players, newsMap, currentOwner, setTab, viewMode="dynasty" }) {
  const allGrades = useMemo(() =>
    owners.map(o => gradeRoster(o, players)).filter(Boolean)
      .sort((a,b) => b.contenderScore - a.contenderScore),
    [owners, players]
  );
  const myRank  = allGrades.findIndex(g => g.owner === currentOwner) + 1;
  const sells   = sellHighCandidates(myGrade.roster, newsMap).slice(0,3);
  const weak    = weakPositions(myGrade, players);
  const injured = myGrade.roster.filter(p =>
    ["Out","IR","PUP","Doubtful"].includes(p.injStatus)).slice(0,4);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Grade card */}
      <div style={{ background:"#0a1118", border:`2px solid ${myGrade.gradeColor}`,
        borderRadius:12, padding:"18px 22px",
        boxShadow:`0 0 24px ${myGrade.gradeColor}22` }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap", gap:14 }}>
          <div>
            <div style={{ fontSize:8, color:myGrade.gradeColor, letterSpacing:2,
              fontWeight:700, marginBottom:6 }}>YOUR ROSTER — {currentOwner.toUpperCase()}</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:12 }}>
              <span style={{ fontSize:56, fontWeight:900, color:myGrade.gradeColor, lineHeight:1 }}>
                {myGrade.grade}
              </span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:myGrade.windowColor, letterSpacing:2 }}>
                  {myGrade.window}
                </div>
                <div style={{ fontSize:10, color:"#7a95ae" }}>#{myRank} of {owners.length} teams</div>
                <div style={{ fontSize:9, color:"#4d6880", marginTop:2 }}>
                  Contender score: <span style={{ color:myGrade.gradeColor, fontWeight:700 }}>
                    {myGrade.contenderScore}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            <Stat label="AVG DV" value={Math.round(myGrade.avgScore)} />
            <Stat label="ELITE"    value={myGrade.eliteCount} color="#22c55e" />
            <Stat label="STARTERS" value={myGrade.starterCnt} color="#60a5fa" />
            <Stat label="AVG AGE"  value={myGrade.avgAge.toFixed(1)} color="#f59e0b" />
            <Stat label="ON CLIFF" value={myGrade.cliffCnt}   color="#f97316" />
            <Stat label="INJURED"  value={myGrade.injCnt}     color="#ef4444" />
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap" }}>
          {POS_ORDER.map(pos => {
            const dep = myGrade.posDep[pos];
            if (!dep?.count) return null;
            const fill = Math.min(100, dep.avg / 10);
            const col  = dep.avg>=700?"#22c55e":dep.avg>=450?"#60a5fa":dep.avg>=250?"#f59e0b":"#ef4444";
            return (
              <div key={pos} style={{ flex:"1 1 55px", minWidth:48 }}>
                <div style={{ fontSize:8, color:"#7a95ae", marginBottom:3, letterSpacing:1,
                  display:"flex", justifyContent:"space-between" }}>
                  <span>{pos}</span><span style={{ color:col }}>{dep.avg.toFixed(0)}</span>
                </div>
                <div style={{ height:4, background:"#1e2d3d", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${fill}%`, background:col, borderRadius:2 }}/>
                </div>
                <div style={{ fontSize:7, color:"#4d6880", marginTop:2 }}>{dep.count}p</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
        <div style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:10, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#ef4444", letterSpacing:2, fontWeight:700 }}>
              ⚑ SELL-HIGH ({sells.length})
            </div>
            {sells.length > 0 && (
              <button onClick={() => setTab("sellhigh")}
                style={{ fontSize:8, color:"#4d6880", background:"none", border:"none",
                  cursor:"pointer", letterSpacing:1 }}>SEE ALL →</button>
            )}
          </div>
          {sells.length === 0
            ? <div style={{ fontSize:9, color:"#4d6880" }}>No sell-high candidates right now</div>
            : sells.map(p => (
              <div key={p.pid} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"5px 0", borderBottom:"1px solid #0f1923" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0" }}>{p.name}</div>
                  <div style={{ fontSize:9, color:"#7a95ae" }}>{p.pos} · Age {p.age}</div>
                </div>
                <span style={{ fontSize:9, color:"#ef4444", fontWeight:700 }}>{pv(p,viewMode)}</span>
              </div>
            ))
          }
        </div>

        <div style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontSize:9, color:"#f59e0b", letterSpacing:2, fontWeight:700, marginBottom:10 }}>
            ◈ POSITIONAL GAPS
          </div>
          {weak.length === 0
            ? <div style={{ fontSize:9, color:"#4d6880" }}>No significant gaps detected</div>
            : weak.map(w => (
              <div key={w.pos} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"5px 0", borderBottom:"1px solid #0f1923" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#e2e8f0" }}>{w.pos}</span>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9 }}>
                    <span style={{ color:w.gap < -10?"#ef4444":"#f59e0b" }}>{w.mine.toFixed(0)}</span>
                    <span style={{ color:"#4d6880" }}> vs {w.league.toFixed(0)} avg</span>
                  </div>
                  <div style={{ fontSize:8, color:"#4d6880" }}>
                    {w.gap < 0 ? `${Math.abs(w.gap).toFixed(0)} below avg` : "Above avg"}
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {injured.length > 0 && (
          <div style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:9, color:"#ef4444", letterSpacing:2, fontWeight:700, marginBottom:10 }}>
              ⚠ INJURY ALERTS ({injured.length})
            </div>
            {injured.map(p => {
              const c = INJ_COLOR[p.injStatus] || "#ef4444";
              return (
                <div key={p.pid} style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", padding:"5px 0", borderBottom:"1px solid #0f1923" }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0" }}>{p.name}</div>
                    <div style={{ fontSize:9, color:"#7a95ae" }}>{p.pos} · {p.team}</div>
                  </div>
                  <span style={{ fontSize:9, color:c, fontWeight:700 }}>{p.injStatus}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* League standings */}
      <div style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:10, padding:"14px 16px" }}>
        <div style={{ fontSize:9, color:"#60a5fa", letterSpacing:2, fontWeight:700, marginBottom:12 }}>
          LEAGUE STANDINGS
        </div>
        {allGrades.map((g, i) => {
          const isMe = g.owner === currentOwner;
          return (
            <div key={g.owner} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"6px 10px", borderRadius:6,
              background:isMe?"#0c1e35":"transparent",
              border:isMe?"1px solid #60a5f644":"1px solid transparent" }}>
              <span style={{ fontSize:9, color:"#4d6880", minWidth:20 }}>#{i+1}</span>
              <span style={{ flex:1, fontSize:10, fontWeight:isMe?700:400,
                color:isMe?"#60a5fa":"#e2e8f0" }}>{g.owner}</span>
              <span style={{ fontSize:11, fontWeight:900, color:g.gradeColor }}>{g.grade}</span>
              <span style={{ fontSize:8, color:g.windowColor, minWidth:72, textAlign:"right" }}>
                {g.window}
              </span>
              <span style={{ fontSize:10, color:"#4d6880", minWidth:28, textAlign:"right" }}>
                {g.contenderScore}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SELL-HIGH TAB ─────────────────────────────────────────────────────────────
function SellHighTab({ roster, newsMap, viewMode="dynasty" }) {
  const candidates = sellHighCandidates(roster, newsMap);
  return (
    <div>
      <div style={{ fontSize:9, color:"#4d6880", lineHeight:1.8, marginBottom:16,
        background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:8, padding:"10px 14px" }}>
        Players at or past their position's peak age who still carry high dynasty value.
        Best time to sell is while they're still producing — not after the decline starts.
        Intel Scan provides SELL signals when headlines confirm a situation.
      </div>
      {candidates.length === 0 ? (
        <div style={{ padding:32, textAlign:"center", color:"#4d6880", fontSize:11 }}>
          No sell-high candidates on your roster right now
        </div>
      ) : (
        <div style={{ border:"1px solid #1e2d3d", borderRadius:10, overflow:"hidden" }}>
          {candidates.map(p => {
            const n  = newsMap?.[p.name];
            const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
            const isSell = n?.signal === "SELL";
            return (
              <div key={p.pid} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"12px 16px", borderBottom:"1px solid #0f1923",
                background:isSell?"#1a0a0a":"#080d14" }}>
                <div style={{ width:42, textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:ts.text }}>{pv(p,viewMode)}</div>
                  <div style={{ fontSize:7, color:ts.text }}>{p.tier}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{p.name}</span>
                    {isSell && <span style={{ fontSize:8, background:"#ef4444", color:"#080d14",
                      borderRadius:3, padding:"2px 7px", fontWeight:900 }}>SELL SIGNAL</span>}
                  </div>
                  <div style={{ fontSize:9, color:"#7a95ae", marginTop:3 }}>
                    {p.pos} · {p.team} · Age {p.age}
                    {p.ppg != null ? ` · ${p.ppg} ppg` : ""}
                  </div>
                  {n?.note && <div style={{ fontSize:9, color:"#4d6880", marginTop:4,
                    fontStyle:"italic" }}>{n.note}</div>}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, color:"#ef4444", fontWeight:700, marginBottom:2 }}>
                    SELL WHILE HOT
                  </div>
                  <div style={{ fontSize:8, color:"#4d6880" }}>Age {p.age}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TARGETS TAB ───────────────────────────────────────────────────────────────
function TargetsTab({ currentOwner, myGrade, players, newsMap, viewMode="dynasty" }) {
  const weak    = weakPositions(myGrade, players);
  const targets = tradeTargets(currentOwner, myGrade, players, newsMap, 12);
  return (
    <div>
      {weak.length > 0 && (
        <div style={{ background:"#0a1118", border:"1px solid #f59e0b44", borderRadius:10,
          padding:"12px 16px", marginBottom:14 }}>
          <div style={{ fontSize:9, color:"#f59e0b", letterSpacing:2, fontWeight:700, marginBottom:10 }}>
            ◈ YOUR WEAKEST POSITIONS
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {weak.map(w => (
              <div key={w.pos} style={{ background:"#080d14", border:"1px solid #1e2d3d",
                borderRadius:6, padding:"8px 12px", textAlign:"center" }}>
                <div style={{ fontSize:16, fontWeight:900,
                  color:w.gap < -150?"#ef4444":"#f59e0b" }}>{w.pos}</div>
                <div style={{ fontSize:8, color:"#4d6880", marginTop:2 }}>
                  {w.mine.toFixed(0)} vs {w.league.toFixed(0)} avg
                </div>
                <div style={{ fontSize:8, fontWeight:700,
                  color:w.gap < 0?"#ef4444":"#22c55e" }}>
                  {w.gap < 0 ? `↓${Math.abs(w.gap).toFixed(0)}` : `↑${w.gap.toFixed(0)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize:9, color:"#4d6880", marginBottom:10 }}>
        Players on other rosters sorted by fit with your positional needs + BUY signals
      </div>
      {targets.length === 0 ? (
        <div style={{ padding:32, textAlign:"center", color:"#4d6880", fontSize:11 }}>
          No trade targets identified — run Intel Scan for signal data
        </div>
      ) : (
        <div style={{ border:"1px solid #1e2d3d", borderRadius:10, overflow:"hidden" }}>
          {targets.map(p => {
            const n  = newsMap?.[p.name];
            const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
            const isBuy = n?.signal === "BUY";
            return (
              <div key={p.pid} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"10px 16px", borderBottom:"1px solid #0f1923",
                background:isBuy?"#0a1f0a":"#080d14" }}>
                <div style={{ width:42, textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:900, color:ts.text }}>{pv(p,viewMode)}</div>
                  <div style={{ fontSize:7, color:ts.text }}>{p.tier}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{p.name}</span>
                    {isBuy && <span style={{ fontSize:7, background:"#22c55e", color:"#080d14",
                      borderRadius:3, padding:"1px 6px", fontWeight:900 }}>BUY</span>}
                  </div>
                  <div style={{ fontSize:9, color:"#7a95ae", marginTop:2 }}>
                    {p.pos} · {p.team}{p.age ? ` · Age ${p.age}` : ""}
                    {p.ppg != null ? ` · ${p.ppg} ppg` : ""}
                    {p.owner ? ` · ${p.owner}` : ""}
                  </div>
                </div>
                <div style={{ fontSize:9, color:"#60a5fa", fontWeight:700 }}>{p.pos}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ROSTER TAB ────────────────────────────────────────────────────────────────
function RosterTab({ roster, newsMap, playerNotes, savePlayerNote, viewMode="dynasty" }) {
  const [posFilter, setPosFilter] = useState("ALL");
  const [sortKey,   setSortKey]   = useState("score");
  const filtered = roster
    .filter(p => posFilter === "ALL" || p.pos === posFilter)
    .sort((a,b) =>
      sortKey === "age" ? (a.age||99)-(b.age||99)
      : sortKey === "ppg" ? (b.ppg||0)-(a.ppg||0)
      : viewMode === "redraft" ? (b.startValue||0)-(a.startValue||0)
      : b.dynastyValue - a.dynastyValue
    );
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:0, border:"1px solid #1e2d3d", borderRadius:6, overflow:"hidden" }}>
          {["ALL",...POS_ORDER].map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              style={{ background:posFilter===pos?"#0c1e35":"transparent",
                color:posFilter===pos?"#60a5fa":"#4d6880",
                border:"none", padding:"5px 9px", fontFamily:"inherit",
                fontSize:9, cursor:"pointer", fontWeight:posFilter===pos?700:400,
                borderRight:"1px solid #1e2d3d" }}>
              {pos}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:0, border:"1px solid #1e2d3d", borderRadius:6, overflow:"hidden" }}>
          {[["score","SCORE"],["age","AGE"],["ppg","PPG"]].map(([k,l]) => (
            <button key={k} onClick={() => setSortKey(k)}
              style={{ background:sortKey===k?"#0c1e35":"transparent",
                color:sortKey===k?"#60a5fa":"#4d6880",
                border:"none", padding:"5px 10px", fontFamily:"inherit",
                fontSize:9, cursor:"pointer", fontWeight:sortKey===k?700:400,
                borderRight:"1px solid #1e2d3d" }}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ fontSize:9, color:"#4d6880" }}>{filtered.length} players</span>
        {viewMode === "redraft" && (
          <span style={{ fontSize:8, color:"#f59e0b", background:"rgba(245,158,11,0.12)",
            border:"1px solid rgba(245,158,11,0.3)", borderRadius:4, padding:"2px 6px",
            fontWeight:700, letterSpacing:0.5 }}>
            SV {filtered.some(p => p.ppg != null) ? "" : "· OFFSEASON PROJ"}
          </span>
        )}
      </div>
      <div style={{ border:"1px solid #1e2d3d", borderRadius:10, overflow:"hidden" }}>
        {filtered.map(p => <PlayerRow key={p.pid} p={p} newsMap={newsMap} playerNotes={playerNotes} savePlayerNote={savePlayerNote} viewMode={viewMode} />)}
      </div>
    </div>
  );
}

// ── COMPARE TAB ───────────────────────────────────────────────────────────────
function CompareTab({ myGrade, owners, players, newsMap, currentOwner, viewMode="dynasty" }) {
  const [oppOwner, setOppOwner] = useState("");
  const oppGrade = oppOwner ? gradeRoster(oppOwner, players) : null;

  const otherOwners = owners.filter(o => o !== currentOwner);

  // Positional gap analysis — positions where opp is strong and I'm weak
  const gaps = oppGrade ? POS_ORDER.filter(pos => {
    const mine = myGrade.posDep[pos]?.avg || 0;
    const theirs = oppGrade.posDep[pos]?.avg || 0;
    return theirs - mine > 150;
  }) : [];

  const advantages = oppGrade ? POS_ORDER.filter(pos => {
    const mine = myGrade.posDep[pos]?.avg || 0;
    const theirs = oppGrade.posDep[pos]?.avg || 0;
    return mine - theirs > 150;
  }) : [];

  return (
    <div>
      {/* Owner selector */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20,
        background:"#080d14", border:"1px solid #1e2d3d", borderRadius:10, padding:"14px 16px" }}>
        <div style={{ fontSize:9, color:"#7a95ae", letterSpacing:2, flexShrink:0 }}>COMPARE VS</div>
        <select value={oppOwner} onChange={e => setOppOwner(e.target.value)}
          style={{ flex:1, background:"#050a10", border:"1px solid #2a3f55",
            color: oppOwner ? "#e2e8f0" : "#4d6880",
            borderRadius:6, padding:"6px 10px", fontSize:11,
            fontFamily:"inherit", cursor:"pointer", outline:"none" }}>
          <option value="">— Select an owner —</option>
          {otherOwners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {oppOwner && (
          <button onClick={() => setOppOwner("")}
            style={{ background:"none", border:"none", color:"#4d6880",
              fontSize:14, cursor:"pointer", padding:"0 4px" }}>✕</button>
        )}
      </div>

      {!oppOwner && (
        <div style={{ textAlign:"center", padding:"48px 20px",
          border:"1px dashed #1e2d3d", borderRadius:12 }}>
          <div style={{ fontSize:11, color:"#4d6880" }}>Select an opponent above to see the head-to-head breakdown</div>
        </div>
      )}

      {oppGrade && (
        <div>
          {/* ── Grade header cards ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
            {[
              { g: myGrade,  label: "YOUR TEAM",    you: true },
              { g: oppGrade, label: oppOwner.toUpperCase(), you: false },
            ].map(({ g, label, you }) => (
              <div key={label} style={{ background:"#0a1118",
                border:`2px solid ${you ? g.gradeColor : g.gradeColor+"88"}`,
                borderRadius:12, padding:"16px 18px",
                boxShadow: you ? `0 0 20px ${g.gradeColor}22` : "none" }}>
                <div style={{ fontSize:8, color: you ? g.gradeColor : "#7a95ae",
                  letterSpacing:2, fontWeight:700, marginBottom:6 }}>{label}</div>
                <div style={{ display:"flex", alignItems:"baseline", gap:10, marginBottom:10 }}>
                  <span style={{ fontSize:48, fontWeight:900, color:g.gradeColor, lineHeight:1 }}>
                    {g.grade}
                  </span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:g.windowColor, letterSpacing:2 }}>
                      {g.window}
                    </div>
                    <div style={{ fontSize:9, color:"#4d6880" }}>
                      Contender: <span style={{ color:g.gradeColor, fontWeight:700 }}>{g.contenderScore}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                  {[
                    ["AVG DV",  Math.round(g.avgScore)],
                    ["ELITE",   g.eliteCount],
                    ["STRTRS",  g.starterCnt],
                    ["AVG AGE", g.avgAge.toFixed(1)],
                    ["CLIFF",   g.cliffCnt],
                    ["INJ",     g.injCnt],
                  ].map(([k, v]) => (
                    <div key={k} style={{ textAlign:"center" }}>
                      <div style={{ fontSize:14, fontWeight:900, color:g.gradeColor }}>{v}</div>
                      <div style={{ fontSize:7, color:"#7a95ae", letterSpacing:1 }}>{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Trade intel strip ── */}
          {(gaps.length > 0 || advantages.length > 0) && (
            <div style={{ background:"#0a1118", border:"1px solid #1e2d3d",
              borderRadius:10, padding:"12px 16px", marginBottom:18,
              display:"flex", gap:16, flexWrap:"wrap" }}>
              {advantages.length > 0 && (
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontSize:8, color:"#22c55e", letterSpacing:2,
                    fontWeight:700, marginBottom:6 }}>YOUR STRENGTHS (target their need)</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {advantages.map(pos => (
                      <span key={pos} style={{ fontSize:9, background:"#22c55e18",
                        border:"1px solid #22c55e44", color:"#22c55e",
                        borderRadius:4, padding:"2px 8px", fontWeight:700 }}>{pos}</span>
                    ))}
                  </div>
                </div>
              )}
              {gaps.length > 0 && (
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontSize:8, color:"#f59e0b", letterSpacing:2,
                    fontWeight:700, marginBottom:6 }}>YOUR NEEDS (they can fill)</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {gaps.map(pos => (
                      <span key={pos} style={{ fontSize:9, background:"#f59e0b18",
                        border:"1px solid #f59e0b44", color:"#f59e0b",
                        borderRadius:4, padding:"2px 8px", fontWeight:700 }}>{pos}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Positional depth bars ── */}
          <div style={{ background:"#080d14", border:"1px solid #1e2d3d",
            borderRadius:10, padding:"14px 16px", marginBottom:18 }}>
            <div style={{ fontSize:8, color:"#7a95ae", letterSpacing:2,
              fontWeight:700, marginBottom:12 }}>POSITIONAL DEPTH</div>
            {POS_ORDER.map(pos => {
              const mine   = myGrade.posDep[pos]?.avg || 0;
              const theirs = oppGrade.posDep[pos]?.avg || 0;
              const myCount = myGrade.posDep[pos]?.count || 0;
              const theirCount = oppGrade.posDep[pos]?.count || 0;
              const max = Math.max(mine, theirs, 1);
              const myCol   = mine >= theirs ? "#22c55e" : "#ef4444";
              const theirCol= theirs > mine  ? "#22c55e" : "#ef4444";
              return (
                <div key={pos} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    marginBottom:3, fontSize:9 }}>
                    <span style={{ color:myCol, fontWeight:700 }}>
                      {mine.toFixed(0)} <span style={{ color:"#4d6880", fontWeight:400 }}>({myCount})</span>
                    </span>
                    <span style={{ color:"#7a95ae", fontWeight:700, letterSpacing:2 }}>{pos}</span>
                    <span style={{ color:theirCol, fontWeight:700 }}>
                      <span style={{ color:"#4d6880", fontWeight:400 }}>({theirCount})</span> {theirs.toFixed(0)}
                    </span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:3 }}>
                    {/* My bar — right-aligned */}
                    <div style={{ display:"flex", justifyContent:"flex-end" }}>
                      <div style={{ height:6, borderRadius:"3px 0 0 3px",
                        width:`${(mine/max)*100}%`,
                        background: mine >= theirs ? "#22c55e" : "#334155",
                        transition:"width .3s" }} />
                    </div>
                    {/* Their bar — left-aligned */}
                    <div>
                      <div style={{ height:6, borderRadius:"0 3px 3px 0",
                        width:`${(theirs/max)*100}%`,
                        background: theirs > mine ? "#22c55e" : "#334155",
                        transition:"width .3s" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Side-by-side roster lists ── */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { g: myGrade,  label: "YOUR ROSTER" },
              { g: oppGrade, label: `${oppOwner.split(" ")[0].toUpperCase()}'S ROSTER` },
            ].map(({ g, label }) => (
              <div key={label}>
                <div style={{ fontSize:8, color:"#7a95ae", letterSpacing:2,
                  fontWeight:700, marginBottom:8 }}>{label}</div>
                <div style={{ border:"1px solid #1e2d3d", borderRadius:10, overflow:"hidden" }}>
                  {[...g.roster]
                    .sort((a, b) => b.dynastyValue - a.dynastyValue)
                    .slice(0, 20)
                    .map(p => {
                      const ts2 = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
                      const nr2 = newsMap?.[p.name];
                      return (
                        <div key={p.pid} style={{ display:"flex", alignItems:"center",
                          gap:8, padding:"5px 10px",
                          background:"#080d14", borderBottom:"1px solid #0f1923" }}>
                          <div style={{ width:32, textAlign:"center", flexShrink:0 }}>
                            <div style={{ fontSize:13, fontWeight:900, color:ts2.text,
                              textShadow:`0 0 6px ${ts2.glow}` }}>{pv(p,viewMode)}</div>
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                              <span style={{ fontSize:11, fontWeight:700, color:"#e2e8f0",
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                {p.name}
                              </span>
                              {nr2?.signal && (
                                <span style={{ fontSize:6, background:SIG_COLORS[nr2.signal],
                                  color:"#080d14", borderRadius:2, padding:"1px 4px",
                                  fontWeight:900, flexShrink:0 }}>{nr2.signal}</span>
                              )}
                            </div>
                            <div style={{ fontSize:8, color:"#7a95ae" }}>
                              {p.pos} · {p.team}{p.age ? ` · ${p.age}y` : ""}
                            </div>
                          </div>
                          <div style={{ fontSize:7, color:ts2.text, letterSpacing:1,
                            flexShrink:0 }}>{p.tier}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export function TeamHub({ viewMode="dynasty", phase, players, owners, currentOwner, newsMap = {}, setDetail, playerNotes = {}, savePlayerNote }) {
  const [tab, setTab] = useState("overview");

  if (phase !== "done" || !currentOwner) {
    return (
      <div style={{ textAlign:"center", padding:56, border:"1px dashed #1e2d3d", borderRadius:12 }}>
        <div style={{ fontSize:11, color:"#f59e0b", letterSpacing:2, marginBottom:8 }}>
          {!currentOwner ? "SET YOUR TEAM FIRST" : "SYNC DATA TO VIEW TEAM HUB"}
        </div>
        <div style={{ fontSize:10, color:"#4d6880" }}>
          {!currentOwner ? "Click ◎ in the top bar to identify your team"
            : "Use ⟳ SYNC DATA in the top-right corner"}
        </div>
      </div>
    );
  }

  const myGrade = gradeRoster(currentOwner, players);
  if (!myGrade) return (
    <div style={{ padding:40, textAlign:"center", color:"#4d6880", fontSize:11 }}>
      No roster data for {currentOwner}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid #1e2d3d", marginBottom:20 }}>
        {TABS.map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ background:"none", border:"none",
              borderBottom:tab===key?"2px solid #22c55e":"2px solid transparent",
              color:tab===key?"#22c55e":"#4b6580",
              padding:"6px 16px", fontFamily:"inherit",
              fontSize:10, letterSpacing:2, fontWeight:tab===key?700:400, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>
      {tab==="overview"  && <Overview myGrade={myGrade} owners={owners} players={players}
        newsMap={newsMap} currentOwner={currentOwner} setTab={setTab} viewMode={viewMode} />}
      {tab==="roster"    && <RosterTab roster={myGrade.roster} newsMap={newsMap} playerNotes={playerNotes} savePlayerNote={savePlayerNote} viewMode={viewMode} />}
      {tab==="sellhigh"  && <SellHighTab roster={myGrade.roster} newsMap={newsMap} viewMode={viewMode} />}
      {tab==="targets"   && <TargetsTab currentOwner={currentOwner} myGrade={myGrade}
        players={players} newsMap={newsMap} viewMode={viewMode} />}
      {tab==="compare"   && <CompareTab myGrade={myGrade} owners={owners} players={players}
        newsMap={newsMap} currentOwner={currentOwner} viewMode={viewMode} />}
    </div>
  );
}
