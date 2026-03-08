// ─── TEAM HUB ─────────────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import { gradeRoster }       from "./Roster";
import { TIER_STYLE, INJ_COLOR, SIG_COLORS, POS_ORDER, PRIME } from "../constants";
import { pickEquivLabel }    from "../ktc";

const WIN_COLOR = {
  REBUILD:"#60a5fa", RISING:"#22c55e", CONTEND:"#f59e0b", "WIN NOW":"#ef4444", DECLINING:"#6b7280",
};
const SIT_LABEL = {
  BREAKOUT_YOUNG:"🔥 BREAKOUT", BREAKOUT_ROLE:"📈 ROLE UP", DEPTH_PROMOTED:"⬆ STARTER",
  IR_RETURN:"🏥 IR RTN",   CAMP_BATTLE:"⚔ BATTLE",    TRADE_DEMAND:"📦 TRADE REQ",
  SUSPENSION:"🚫 SUSP",    AGE_CLIFF:"⏳ CLIFF",       FREE_AGENT:"🏷 FA",  NEW_OC:"🔄 NEW SCHEME",
};

function Td({ children, style={} }) {
  return (
    <td style={{ padding:"6px 7px", textAlign:"center", borderBottom:"1px solid #0f1923",
      borderRight:"1px solid #0f1923", fontSize:11, verticalAlign:"middle", ...style }}>
      {children}
    </td>
  );
}

// ── GRADE CARD ────────────────────────────────────────────────────────────────
function GradeCard({ grade, owners, players }) {
  const rank = owners
    .map(o => gradeRoster(o, players)).filter(Boolean)
    .sort((a,b) => b.contenderScore - a.contenderScore)
    .findIndex(g => g.owner === grade.owner) + 1;
  const wc = WIN_COLOR[grade.window] || "#6b7280";
  return (
    <div style={{ background:"linear-gradient(135deg,#0a1118,#0f1923)", border:"2px solid #22c55e",
      borderRadius:14, padding:"20px 24px", boxShadow:"0 0 30px rgba(34,197,94,0.12)", marginBottom:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:60, fontWeight:900, color:grade.gradeColor, lineHeight:1,
              textShadow:`0 0 30px ${grade.gradeColor}66` }}>{grade.grade}</div>
            <div style={{ fontSize:8, color:"#4d6880", letterSpacing:2, marginTop:2 }}>DYNASTY GRADE</div>
          </div>
          <div>
            <div style={{ fontSize:8, color:"#22c55e", letterSpacing:2, marginBottom:3, fontWeight:700 }}>
              {grade.owner.toUpperCase()}
            </div>
            <div style={{ fontSize:18, fontWeight:900, color:wc, letterSpacing:2, marginBottom:4 }}>{grade.window}</div>
            <div style={{ fontSize:10, color:"#7a95ae" }}>
              Ranked <strong style={{ color:"#e2e8f0" }}>#{rank}</strong> of {owners.length} teams
            </div>
            <div style={{ fontSize:9, color:"#4d6880", marginTop:2 }}>
              Contender score: <span style={{ color:grade.gradeColor, fontWeight:700 }}>{grade.contenderScore}</span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
          {[["AVG",grade.avgScore.toFixed(1),"#e2e8f0"],["ELITE",grade.eliteCount,"#22c55e"],
            ["STRTRS",grade.starterCnt,"#60a5fa"],["AVG AGE",grade.avgAge.toFixed(1),"#f59e0b"],
            ["CLIFF",grade.cliffCnt,"#f97316"],["INJ",grade.injCnt,"#ef4444"]
          ].map(([k,v,c]) => (
            <div key={k} style={{ textAlign:"center", minWidth:42 }}>
              <div style={{ fontSize:20, fontWeight:900, color:c, lineHeight:1 }}>{v}</div>
              <div style={{ fontSize:7, color:"#4d6880", letterSpacing:1, marginTop:2 }}>{k}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:"flex", gap:8, marginTop:16, flexWrap:"wrap" }}>
        {POS_ORDER.map(pos => {
          const dep = grade.posDep[pos];
          if (!dep?.count) return null;
          const col = dep.avg>=70?"#22c55e":dep.avg>=45?"#60a5fa":dep.avg>=25?"#f59e0b":"#ef4444";
          return (
            <div key={pos} style={{ flex:"1 1 50px", minWidth:44 }}>
              <div style={{ fontSize:8, color:"#7a95ae", marginBottom:3, letterSpacing:1,
                display:"flex", justifyContent:"space-between" }}>
                <span>{pos}</span><span style={{ color:col, fontWeight:700 }}>{dep.avg.toFixed(0)}</span>
              </div>
              <div style={{ height:4, background:"#1e2d3d", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(100,dep.avg)}%`, background:col, borderRadius:2 }} />
              </div>
              <div style={{ fontSize:7, color:"#4d6880", marginTop:2 }}>{dep.count}p</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TOP 2 BY POSITION ─────────────────────────────────────────────────────────
function TopByPosition({ roster, newsMap }) {
  const byPos = useMemo(() => {
    const map = {};
    POS_ORDER.forEach(pos => {
      const pp = roster.filter(p => p.pos === pos).sort((a,b) => b.score - a.score).slice(0,2);
      if (pp.length) map[pos] = pp;
    });
    return map;
  }, [roster]);

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:9, color:"#4d6880", letterSpacing:2, fontWeight:700, marginBottom:10 }}>
        ◈ TOP 2 BY POSITION
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10 }}>
        {POS_ORDER.filter(pos => byPos[pos]).map(pos => (
          <div key={pos} style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:9, overflow:"hidden" }}>
            <div style={{ background:"#0c151e", padding:"5px 12px", fontSize:9, color:"#60a5fa", fontWeight:700, letterSpacing:2 }}>
              {pos}
            </div>
            {byPos[pos].map((p, i) => {
              const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
              const news = newsMap[p.name];
              return (
                <div key={p.pid} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
                  borderBottom: i < byPos[pos].length-1 ? "1px solid #0f1923" : "none" }}>
                  <div style={{ width:22, height:22, borderRadius:4, background:ts.bg,
                    border:`1px solid ${ts.border}`, display:"flex", alignItems:"center",
                    justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:11, fontWeight:900, color:ts.text }}>{i+1}</span>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0",
                      whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                    <div style={{ fontSize:9, color:"#7a95ae", marginTop:1 }}>
                      {p.team} · {p.age}y{p.depthOrder?` · D#${p.depthOrder}`:""}
                      {p.ppg!=null?` · ${p.ppg}PPG`:""}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:16, fontWeight:900, color:ts.text, lineHeight:1 }}>{p.score}</div>
                    {news && (
                      <span style={{ fontSize:7, background:SIG_COLORS[news.signal], color:"#080d14",
                        borderRadius:2, padding:"1px 4px", fontWeight:900, display:"block", marginTop:2 }}>
                        {news.signal}
                      </span>
                    )}
                    {p.injStatus && (
                      <span style={{ fontSize:7, color:INJ_COLOR[p.injStatus]||"#ef4444", fontWeight:700, display:"block", marginTop:2 }}>
                        ⚠ {p.injStatus}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MY ROSTER ─────────────────────────────────────────────────────────────────
function MyRoster({ roster, newsMap, notes, setNote }) {
  const [posFilter, setPosFilter] = useState("ALL");
  const [sort, setSort]   = useState({ key:"score", asc:false });
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [editingNote, setEditingNote] = useState(null);

  const filtered = useMemo(() => {
    let r = roster;
    if (posFilter !== "ALL") r = r.filter(p => p.pos === posFilter);
    if (search) r = r.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    return [...r].sort((a,b) => {
      const va = a[sort.key]??0, vb = b[sort.key]??0;
      const d = typeof va==="string" ? va.localeCompare(vb) : va - vb;
      return sort.asc ? d : -d;
    });
  }, [roster, posFilter, sort, search]);

  const TH = ({ label, k, w }) => (
    <th onClick={() => setSort(s => ({ key:k, asc:s.key===k?!s.asc:false }))}
      style={{ padding:"7px 8px", background:"#0c151e", color:"#7a95ae", fontSize:9,
        letterSpacing:1.5, fontWeight:700, cursor:"pointer", userSelect:"none",
        borderRight:"1px solid #1e2d3d", width:w, whiteSpace:"nowrap", textAlign:"center" }}>
      {label}{sort.key===k?(sort.asc?" ↑":" ↓"):""}
    </th>
  );

  const openEdit = (pid, current) => { setEditingNote(pid); setNoteInput(current||""); };
  const saveNote = (pid) => { setNote(pid, noteInput); setEditingNote(null); };

  return (
    <div>
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        {["ALL",...POS_ORDER].map(pos => (
          <button key={pos} onClick={() => setPosFilter(pos)}
            style={{ background:posFilter===pos?"#0f2b1a":"transparent",
              border:`1px solid ${posFilter===pos?"#22c55e44":"#1e2d3d"}`,
              color:posFilter===pos?"#22c55e":"#4b6580",
              borderRadius:5, padding:"4px 9px", fontFamily:"inherit", fontSize:9,
              cursor:"pointer", fontWeight:posFilter===pos?700:400, letterSpacing:1 }}>
            {pos}{pos!=="ALL"?` (${roster.filter(p=>p.pos===pos).length})`:""}
          </button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="SEARCH..." style={{ marginLeft:"auto", background:"#0f1923",
            border:"1px solid #1e2d3d", color:"#e2e8f0", padding:"5px 10px",
            borderRadius:5, fontFamily:"inherit", fontSize:10, width:140 }} />
        <span style={{ fontSize:9, color:"#4d6880" }}>{filtered.length} players</span>
      </div>

      <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #1e2d3d" }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr>
              <TH label="#"      k=""             w={30} />
              <TH label="PLAYER" k="name"         w={160}/>
              <TH label="POS"    k="pos"          w={40} />
              <TH label="TEAM"   k="team"         w={48} />
              <TH label="AGE"    k="age"          w={40} />
              <TH label="SCORE"  k="score"        w={56} />
              <TH label="TIER"   k="tier"         w={68} />
              <TH label="DEPTH"  k="depthOrder"   w={52} />
              <TH label="GS/GP"  k="gamesStarted" w={56} />
              <TH label="PPG"    k="ppg"          w={46} />
              <TH label="INJ"    k="injStatus"    w={80} />
              <TH label="SIG"    k=""             w={46} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => {
              const ts = TIER_STYLE[p.tier]||TIER_STYLE.Stash;
              const news = newsMap[p.name];
              const isOpen = expanded === p.pid;
              const myNote = notes[p.pid]||"";
              const sitMeta = p.situationFlag ? SIT_LABEL[p.situationFlag] : null;
              return (
                <>
                  <tr key={p.pid} onClick={() => { setExpanded(isOpen?null:p.pid); setEditingNote(null); }}
                    style={{ background:isOpen?ts.bg:i%2===0?"#080d14":"#0a1118", cursor:"pointer",
                      transition:"background 0.15s" }}>
                    <Td><span style={{ color:"#4d6880", fontSize:9 }}>{i+1}</span></Td>
                    <Td style={{ textAlign:"left", fontWeight:700, color:ts.text }}>
                      {p.name}
                      {p.onTaxi&&<span style={{ fontSize:7, color:"#f59e0b", marginLeft:4 }}>TAXI</span>}
                      {sitMeta&&<span style={{ fontSize:7, color:"#7a95ae", marginLeft:5 }}>{sitMeta}</span>}
                      {myNote&&<span style={{ fontSize:7, color:"#f59e0b", marginLeft:5 }}>📝</span>}
                    </Td>
                    <Td style={{ color:"#60a5fa", fontWeight:700 }}>{p.pos}</Td>
                    <Td style={{ color:"#a8bccf" }}>{p.team}</Td>
                    <Td style={{ color:"#a8bccf" }}>{p.age??"—"}</Td>
                    <Td style={{ fontWeight:900, fontSize:14, color:ts.text, textShadow:`0 0 8px ${ts.glow}` }}>{p.score}</Td>
                    <Td>
                      <span style={{ background:ts.bg, color:ts.text, border:`1px solid ${ts.border}`,
                        borderRadius:4, padding:"2px 5px", fontSize:8, fontWeight:700, letterSpacing:1 }}>
                        {p.tier.toUpperCase()}
                      </span>
                    </Td>
                    <Td style={{ fontWeight:700,
                      color:p.depthOrder===1?"#22c55e":p.depthOrder===2?"#f59e0b":"#ef4444" }}>
                      {p.depthOrder?`#${p.depthOrder}`:"—"}
                    </Td>
                    <Td>
                      {p.gamesStarted!=null
                        ? <><span style={{ color:"#e2e8f0", fontWeight:700 }}>{p.gamesStarted}</span>
                            <span style={{ color:"#4d6880", fontSize:9 }}>/{p.gamesPlayed}</span></>
                        : "—"}
                    </Td>
                    <Td style={{ fontWeight:700,
                      color:p.ppg!=null?p.ppg>20?"#22c55e":p.ppg>12?"#60a5fa":p.ppg>6?"#f59e0b":"#94a3b8":"#2a3d52" }}>
                      {p.ppg??"—"}
                    </Td>
                    <Td>
                      {p.injStatus
                        ? <span style={{ color:INJ_COLOR[p.injStatus]||"#ef4444", fontWeight:700, fontSize:9 }}>{p.injStatus.toUpperCase()}</span>
                        : <span style={{ color:"#2d5a35", fontSize:8 }}>OK</span>}
                    </Td>
                    <Td>
                      {news
                        ? <span style={{ background:SIG_COLORS[news.signal]||"#4b6580", color:"#080d14",
                            fontSize:8, fontWeight:900, borderRadius:3, padding:"2px 4px", letterSpacing:1 }}>
                            {news.signal}
                          </span>
                        : <span style={{ color:"#3a5068", fontSize:8 }}>—</span>}
                    </Td>
                  </tr>

                  {isOpen && (
                    <tr style={{ background:ts.bg }}>
                      <td colSpan={12} style={{ padding:"16px 20px", borderBottom:`2px solid ${ts.border}` }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20 }}>
                          {/* Profile */}
                          <div>
                            <div style={{ fontSize:9, color:ts.text, letterSpacing:2, marginBottom:8, fontWeight:700 }}>PROFILE</div>
                            {[["Team",p.team],["Age",p.age||"—"],["Yrs Exp",p.yrsExp??"—"],
                              ["Ht / Wt",`${p.height||"—"} / ${p.weight||"—"}`],
                              ["Status",p.status||"Active"],["Depth",p.depthOrder?`#${p.depthOrder} ${p.depthPos}`:"Unknown"],
                              ["Injury",p.injStatus||"None"],
                            ].map(([k,v])=>(
                              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                borderBottom:"1px solid rgba(255,255,255,0.04)", padding:"3px 0", fontSize:11 }}>
                                <span style={{ color:"#7a95ae" }}>{k}</span>
                                <span style={{ color:"#e2e8f0", fontWeight:600 }}>{v}</span>
                              </div>
                            ))}
                          </div>
                          {/* Dynasty metrics */}
                          <div>
                            <div style={{ fontSize:9, color:ts.text, letterSpacing:2, marginBottom:8, fontWeight:700 }}>DYNASTY METRICS</div>
                            {[["Score",p.score],["Tier",p.tier],
                              ["GS/GP",p.gamesStarted!=null?`${p.gamesStarted}/${p.gamesPlayed}`:"No data"],
                              ["PPG",p.ppg!=null?p.ppg:"No data"],["2025 Stats",p.statLine||"—"],
                              ["Market Val",p.marketValue!=null?`~${p.marketValue.toLocaleString()} (FC/KTC avg)`:"Not matched"],
                              ["FC Value",p.fcValue!=null?p.fcValue.toLocaleString():"—"],
                              ["KTC Value",p.ktcValue!=null?p.ktcValue.toLocaleString():"—"],
                              ["Situation",sitMeta||"None"],["Sit. Note",p.situationNote||"—"],
                              ["Trades",p.trades],["FA Adds",p.adds],
                            ].map(([k,v])=>(
                              <div key={k} style={{ display:"flex", justifyContent:"space-between",
                                borderBottom:"1px solid rgba(255,255,255,0.04)", padding:"3px 0", fontSize:11 }}>
                                <span style={{ color:"#7a95ae" }}>{k}</span>
                                <span style={{ color:ts.text, fontWeight:700 }}>{v}</span>
                              </div>
                            ))}
                          </div>
                          {/* Intel + Notes */}
                          <div>
                            <div style={{ fontSize:9, color:ts.text, letterSpacing:2, marginBottom:8, fontWeight:700 }}>INTEL</div>
                            {news ? (
                              <div style={{ background:`${SIG_COLORS[news.signal]}18`,
                                border:`1px solid ${SIG_COLORS[news.signal]}`, borderRadius:8,
                                padding:"10px", marginBottom:10 }}>
                                <div style={{ fontSize:13, fontWeight:900, color:SIG_COLORS[news.signal],
                                  letterSpacing:2, marginBottom:5 }}>{news.signal}</div>
                                <div style={{ fontSize:11, color:"#e2e8f0", lineHeight:1.6 }}>{news.note}</div>
                              </div>
                            ) : (
                              <div style={{ fontSize:10, color:"#4d6880", fontStyle:"italic", marginBottom:10 }}>
                                Run ◈ INTEL SCAN to load news.
                              </div>
                            )}
                            <div style={{ fontSize:9, color:ts.text, letterSpacing:1.5, marginBottom:6, fontWeight:700 }}>📝 MY NOTES</div>
                            {editingNote===p.pid ? (
                              <div>
                                <textarea value={noteInput} onChange={e=>setNoteInput(e.target.value)}
                                  rows={3} placeholder="Add a note about this player..."
                                  style={{ width:"100%", boxSizing:"border-box", background:"#080d14",
                                    border:"1px solid #1e2d3d", color:"#e2e8f0", padding:"7px 9px",
                                    borderRadius:5, fontFamily:"monospace", fontSize:10, resize:"vertical" }} />
                                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                                  <button onClick={()=>saveNote(p.pid)}
                                    style={{ background:"#0f2b1a", color:"#22c55e", border:"1px solid #22c55e44",
                                      borderRadius:4, padding:"5px 12px", fontFamily:"inherit",
                                      fontSize:9, cursor:"pointer", fontWeight:700 }}>SAVE</button>
                                  <button onClick={()=>setEditingNote(null)}
                                    style={{ background:"none", color:"#4d6580", border:"1px solid #1e2d3d",
                                      borderRadius:4, padding:"5px 8px", fontFamily:"inherit",
                                      fontSize:9, cursor:"pointer" }}>CANCEL</button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                {myNote
                                  ? <div style={{ fontSize:10, color:"#e2e8f0", lineHeight:1.6,
                                      background:"#080d14", border:"1px solid #1e2d3d", borderRadius:5,
                                      padding:"7px 9px", marginBottom:6, fontStyle:"italic" }}>"{myNote}"</div>
                                  : <div style={{ fontSize:10, color:"#4d6880", marginBottom:6 }}>No notes yet.</div>}
                                <button onClick={()=>openEdit(p.pid, myNote)}
                                  style={{ background:"#1e2d3d", color:"#7a95ae", border:"1px solid #374151",
                                    borderRadius:4, padding:"4px 10px", fontFamily:"inherit",
                                    fontSize:9, cursor:"pointer" }}>
                                  {myNote?"✎ EDIT NOTE":"+ ADD NOTE"}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
            {filtered.length===0&&(
              <tr><td colSpan={12} style={{ padding:24, textAlign:"center", color:"#4d6880", fontSize:10 }}>
                No players match filters
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ── PICK VALUE LABEL ──────────────────────────────────────────────────────────
function pickLabel(round, season) {
  const gap = Number(season) - new Date().getFullYear();
  if (round === 1 && gap === 0) return { label:"1st (this yr)", color:"#22c55e", bg:"#0f2b1a" };
  if (round === 1 && gap === 1) return { label:"1st (next yr)", color:"#60a5fa", bg:"#071a2e" };
  if (round === 1 && gap === 2) return { label:"1st (+2 yrs)",  color:"#0ea5e9", bg:"#071a2e" };
  if (round === 2 && gap === 0) return { label:"2nd (this yr)", color:"#f59e0b", bg:"#1a1000" };
  if (round === 2 && gap === 1) return { label:"2nd (next yr)", color:"#d97706", bg:"#1a1000" };
  if (round === 3 && gap <= 1)  return { label:`3rd (${season})`, color:"#94a3b8", bg:"#111a23" };
  return { label:`R${round} ${season}`, color:"#4d6880", bg:"#0a1118" };
}

// ── WINDOW BADGE ──────────────────────────────────────────────────────────────
const WINDOW_META = {
  "WIN NOW":  { color:"#ef4444", label:"WIN NOW"   },
  "CONTEND":  { color:"#f59e0b", label:"CONTEND"   },
  "RISING":   { color:"#22c55e", label:"RISING"    },
  "REBUILD":  { color:"#60a5fa", label:"REBUILD"   },
  "DECLINING":{ color:"#6b7280", label:"DECLINING" },
};

// ── SUGGESTION ENGINE ─────────────────────────────────────────────────────────
// Evaluates every opponent's team context (grade + window) and builds
// contextually appropriate return suggestions:
//   CONTENDING (B+, WIN NOW/CONTEND) → will trade picks for proven starters
//   REBUILDING (≤C+, REBUILD/RISING) → will trade young players for win-now vets
//   MIDDLE                           → opportunistic — check for positional need
//
// KEY: pick round ceiling is now derived from the player's real market value (KTC/FC).
// A player worth ~350 (Sutton territory) will never generate 1st round pick suggestions.
function pickRoundCeiling(marketValue) {
  if (marketValue == null) return 3;  // no market data — conservative
  if (marketValue >= 4500) return 1;  // 1st round talent
  if (marketValue >= 1500) return 2;  // 2nd round talent
  if (marketValue >= 700)  return 3;  // 3rd round talent
  if (marketValue >= 300)  return 5;  // 4th–5th round
  if (marketValue >= 100)  return 8;  // 6th–8th round
  return 10;                          // 9th–10th / conditional
}

function buildReturnSuggestions(p, allPlayers, draftPicksByOwner, ownerGrades) {
  const myOwner  = p.owner;
  const maxRound = pickRoundCeiling(p.marketValue ?? p.ktcValue ?? p.fcValue);
  const pickSuggestions   = [];
  const playerSuggestions = [];

  Object.entries(ownerGrades).forEach(([owner, og]) => {
    if (owner === myOwner) return;
    const cs  = og.contenderScore || 0;
    const win = og.window || "";
    const isContending = cs >= 80 || win === "WIN NOW" || win === "CONTEND";
    const isRebuilding = cs < 50  || win === "REBUILD";
    const isMiddle     = !isContending && !isRebuilding;

    // CONTENDING: will trade picks to win now; round ceiling anchored to market value
    if (isContending) {
      (draftPicksByOwner[owner] || [])
        .filter(pk => pk.round <= maxRound)
        .sort((a,b) => a.round - b.round || Number(a.season) - Number(b.season))
        .slice(0, 2)
        .forEach(pk => pickSuggestions.push({ pick:pk, fromOwner:owner, grade:og.grade, window:win, ctx:"contending" }));
      // Surplus youth on their roster at this position
      allPlayers
        .filter(q => q.owner===owner && q.pos===p.pos && (q.age||99)<(p.age||99)-2 && q.score>=35)
        .sort((a,b) => b.score - a.score).slice(0,1)
        .forEach(q => playerSuggestions.push({ player:q, fromOwner:owner, grade:og.grade, window:win,
          note:"surplus youth on contending roster" }));
    }

    // REBUILDING: prefer young players + picks as sweetener
    if (isRebuilding) {
      allPlayers
        .filter(q => q.owner===owner && q.pos===p.pos && (q.age||99)<(p.age||99)-1 && q.score>=30)
        .sort((a,b) => b.score - a.score).slice(0,2)
        .forEach(q => playerSuggestions.push({ player:q, fromOwner:owner, grade:og.grade, window:win,
          note:"rebuilding — will move young talent" }));
      // Only suggest picks from rebuilding teams if the player is actually worth it
      if (maxRound <= 3) {
        (draftPicksByOwner[owner] || [])
          .filter(pk => pk.round <= Math.min(maxRound + 1, 4))
          .sort((a,b) => a.round - b.round || Number(a.season) - Number(b.season))
          .slice(0,1)
          .forEach(pk => pickSuggestions.push({ pick:pk, fromOwner:owner, grade:og.grade, window:win, ctx:"rebuilding" }));
      }
    }

    // MIDDLE: only if clear positional need
    if (isMiddle) {
      const theirPP  = allPlayers.filter(q => q.owner===owner && q.pos===p.pos);
      const theirAvg = theirPP.length ? theirPP.reduce((s,q)=>s+q.score,0)/theirPP.length : 0;
      if (theirAvg < 45) {
        if (maxRound <= 3) {
          (draftPicksByOwner[owner] || [])
            .filter(pk => pk.round <= maxRound)
            .sort((a,b) => a.round - b.round).slice(0,1)
            .forEach(pk => pickSuggestions.push({ pick:pk, fromOwner:owner, grade:og.grade, window:win, ctx:"need" }));
        }
        allPlayers
          .filter(q => q.owner===owner && q.pos===p.pos && (q.age||99)<(p.age||99)-1 && q.score>=30)
          .sort((a,b) => b.score-a.score).slice(0,1)
          .forEach(q => playerSuggestions.push({ player:q, fromOwner:owner, grade:og.grade, window:win,
            note:`positional need (avg ${theirAvg.toFixed(0)}) — motivated` }));
      }
    }
  });

  // Deduplicate
  const seenPicks = new Set();
  const seenPids  = new Set();
  const picks = pickSuggestions.filter(s => {
    const key = `${s.fromOwner}-${s.pick.round}-${s.pick.season}`;
    if (seenPicks.has(key)) return false; seenPicks.add(key); return true;
  });
  const players = playerSuggestions.filter(s => {
    if (seenPids.has(s.player.pid)) return false; seenPids.add(s.player.pid); return true;
  });

  // Sort: contending picks first (most reliable), then by round, then year
  picks.sort((a,b) => {
    const pri = { contending:3, need:2, rebuilding:1 };
    const pa = (pri[a.ctx]||0)*10 + (4-a.pick.round)*3 - (Number(a.pick.season)-2025)*0.5;
    const pb = (pri[b.ctx]||0)*10 + (4-b.pick.round)*3 - (Number(b.pick.season)-2025)*0.5;
    return pb - pa;
  });
  players.sort((a,b) => b.player.score - a.player.score);

  return { picks: picks.slice(0,4), players: players.slice(0,3) };
}

// ── SELL HIGH ─────────────────────────────────────────────────────────────────
function SellHigh({ roster, newsMap, allPlayers, draftPicksByOwner, ownerGrades }) {
  const candidates = useMemo(() => roster.filter(p => {
    const news = newsMap[p.name];
    if (news?.signal === "SELL") return true;
    const [, peak, cliff] = PRIME[p.pos]||[23,29,33];
    return p.score >= 55 && p.age >= peak && p.age < cliff + 2;
  }).sort((a,b) => b.score - a.score).slice(0,8), [roster, newsMap]);

  if (!candidates.length) return (
    <div style={{ padding:"20px 0", textAlign:"center", color:"#4d6880", fontSize:10 }}>
      No obvious sell-high candidates right now
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {candidates.map(p => {
        const ts   = TIER_STYLE[p.tier]||TIER_STYLE.Stash;
        const news = newsMap[p.name];
        const [, peak] = PRIME[p.pos]||[23,29,33];
        const reason = news?.signal==="SELL"
          ? (news.note||"SELL signal from Intel")
          : `Age ${p.age} — at or past ${p.pos} peak (${peak})`;

        const { picks, players: playerSugs } = buildReturnSuggestions(
          p, allPlayers, draftPicksByOwner, ownerGrades
        );
        const hasSugs = picks.length > 0 || playerSugs.length > 0;

        return (
          <div key={p.pid} style={{ background:"#0a1118", border:`1px solid ${ts.border}44`,
            borderRadius:9, overflow:"hidden" }}>

            {/* Player header */}
            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px" }}>
              <div style={{ background:ts.bg, border:`1px solid ${ts.border}`, borderRadius:6,
                padding:"5px 9px", textAlign:"center", minWidth:46, flexShrink:0 }}>
                <div style={{ fontSize:16, fontWeight:900, color:ts.text, lineHeight:1 }}>{p.score}</div>
                <div style={{ fontSize:7, color:ts.text, letterSpacing:0.5, marginTop:1 }}>{p.tier.toUpperCase()}</div>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{p.name}</div>
                <div style={{ fontSize:10, color:"#7a95ae", marginTop:1 }}>
                  {p.pos} · {p.team} · {p.age}y
                  {p.marketValue != null && (
                    <span style={{ marginLeft:8 }}>
                      · <span style={{ color:"#60a5fa" }}>KTC~{p.marketValue.toLocaleString()}</span>
                    </span>
                  )}
                </div>
                <div style={{ fontSize:9, color:"#f97316", marginTop:3, fontStyle:"italic" }}>{reason}</div>
                {/* Market value tier — the honest pick equivalent */}
                {(() => {
                  const tier = pickEquivLabel(p.marketValue ?? p.ktcValue ?? p.fcValue);
                  return tier ? (
                    <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:8, color:"#4d6880" }}>Market value ≈</span>
                      <span style={{ fontSize:8, fontWeight:900, color:tier.color,
                        background:tier.color+"18", border:`1px solid ${tier.color}44`,
                        borderRadius:3, padding:"1px 6px" }}>{tier.label}</span>
                      <span style={{ fontSize:8, color:"#2a3d52", fontStyle:"italic" }}>{tier.note}</span>
                    </div>
                  ) : null;
                })()}
              </div>
              <span style={{ background:news?.signal?SIG_COLORS[news.signal]:"#f97316",
                color:"#080d14", fontSize:9, fontWeight:900,
                borderRadius:3, padding:"3px 7px", letterSpacing:1, flexShrink:0 }}>
                {news?.signal||"SELL"}
              </span>
            </div>

            {hasSugs && (
              <div style={{ borderTop:"1px solid #0f1923", background:"#080d14" }}>

                {/* Picks — labelled by team context */}
                {picks.length > 0 && (
                  <div style={{ padding:"10px 14px", borderBottom:playerSugs.length?"1px solid #0c1219":"none" }}>
                    <div style={{ fontSize:8, color:"#60a5fa", letterSpacing:1.5, fontWeight:700, marginBottom:7 }}>
                      📋 PICKS — teams likely to offer them
                    </div>
                    <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                      {picks.map((s, i) => {
                        const pl = pickLabel(s.pick.round, s.pick.season);
                        const wm = WINDOW_META[s.window] || { color:"#4d6880", label:s.window||"—" };
                        const ctxLabel = s.ctx==="contending" ? "will trade picks to win"
                                       : s.ctx==="rebuilding" ? "rebuilding — picks as add-on"
                                       : "positional need";
                        return (
                          <div key={i} style={{ background:pl.bg, border:`1px solid ${pl.color}44`,
                            borderRadius:7, padding:"7px 11px", minWidth:130 }}>
                            <div style={{ fontSize:11, fontWeight:900, color:pl.color }}>{pl.label}</div>
                            <div style={{ fontSize:9, fontWeight:700, color:wm.color, marginTop:3 }}>
                              {s.fromOwner}
                            </div>
                            <div style={{ fontSize:8, color:"#4d6580", marginTop:2 }}>
                              {s.grade} · {wm.label}
                            </div>
                            <div style={{ fontSize:7, color:"#2a3d52", marginTop:1, fontStyle:"italic" }}>
                              {ctxLabel}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Young players — from rebuilding / surplus */}
                {playerSugs.length > 0 && (
                  <div style={{ padding:"10px 14px" }}>
                    <div style={{ fontSize:8, color:"#22c55e", letterSpacing:1.5, fontWeight:700, marginBottom:7 }}>
                      🔄 YOUNG {p.pos}S — teams willing to move them
                    </div>
                    <div style={{ display:"flex", gap:7, flexWrap:"wrap" }}>
                      {playerSugs.map(s => {
                        const q   = s.player;
                        const tts = TIER_STYLE[q.tier]||TIER_STYLE.Stash;
                        const wm  = WINDOW_META[s.window] || { color:"#4d6880", label:s.window||"—" };
                        return (
                          <div key={q.pid} style={{ background:tts.bg, border:`1px solid ${tts.border}`,
                            borderRadius:7, padding:"7px 11px", minWidth:140 }}>
                            <div style={{ fontSize:11, fontWeight:700, color:tts.text }}>{q.name}</div>
                            <div style={{ fontSize:9, color:"#7a95ae", marginTop:2 }}>
                              {q.team} · {q.age}y · <span style={{ color:tts.text, fontWeight:700 }}>{q.score}</span>
                            </div>
                            <div style={{ fontSize:8, fontWeight:700, color:wm.color, marginTop:2 }}>
                              {s.fromOwner} · {s.grade} · {wm.label}
                            </div>
                            <div style={{ fontSize:7, color:"#2a3d52", marginTop:1, fontStyle:"italic" }}>
                              {s.note}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


// ── INJURY WATCH ──────────────────────────────────────────────────────────────
function InjuryWatch({ roster }) {
  const injured = roster.filter(p =>
    p.injStatus && ["Out","IR","PUP","Doubtful","Questionable"].includes(p.injStatus)
  ).sort((a,b) => {
    const sev = { IR:0, PUP:1, Out:2, Doubtful:3, Questionable:4 };
    return (sev[a.injStatus]??5) - (sev[b.injStatus]??5);
  });

  if (!injured.length) return (
    <div style={{ padding:"20px 0", textAlign:"center", color:"#22c55e", fontSize:10 }}>
      ✓ No significant injuries on your roster
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {injured.map(p => {
        const ts = TIER_STYLE[p.tier]||TIER_STYLE.Stash;
        const injCol = INJ_COLOR[p.injStatus]||"#ef4444";
        return (
          <div key={p.pid} style={{ display:"flex", alignItems:"center", gap:12,
            padding:"10px 14px", background:"#0a1118",
            border:`1px solid ${injCol}33`, borderRadius:8, borderLeft:`3px solid ${injCol}` }}>
            <div style={{ background:ts.bg, border:`1px solid ${ts.border}`, borderRadius:6,
              padding:"5px 9px", textAlign:"center", minWidth:46, flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:900, color:ts.text, lineHeight:1 }}>{p.score}</div>
              <div style={{ fontSize:7, color:ts.text, letterSpacing:0.5, marginTop:1 }}>{p.tier.toUpperCase()}</div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{p.name}</div>
              <div style={{ fontSize:10, color:"#7a95ae", marginTop:1 }}>{p.pos} · {p.team} · {p.age}y</div>
              {p.statLine&&<div style={{ fontSize:9, color:"#4d6880", marginTop:2 }}>{p.statLine}</div>}
            </div>
            <span style={{ fontSize:10, fontWeight:900, color:injCol, letterSpacing:1, flexShrink:0 }}>
              ⚠ {p.injStatus.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── AGE CLIFF ─────────────────────────────────────────────────────────────────
function AgeCliff({ roster }) {
  const atRisk = roster.filter(p => p.situationFlag==="AGE_CLIFF").sort((a,b) => b.score - a.score);

  if (!atRisk.length) return (
    <div style={{ padding:"20px 0", textAlign:"center", color:"#22c55e", fontSize:10 }}>
      ✓ No players past their position cliff
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
      {atRisk.map(p => {
        const ts = TIER_STYLE[p.tier]||TIER_STYLE.Stash;
        const [,,cliff] = PRIME[p.pos]||[23,29,33];
        return (
          <div key={p.pid} style={{ display:"flex", alignItems:"center", gap:12,
            padding:"10px 14px", background:"#0a1118",
            border:"1px solid #f9731633", borderRadius:8, borderLeft:"3px solid #f97316" }}>
            <div style={{ background:ts.bg, border:`1px solid ${ts.border}`, borderRadius:6,
              padding:"5px 9px", textAlign:"center", minWidth:46, flexShrink:0 }}>
              <div style={{ fontSize:16, fontWeight:900, color:ts.text, lineHeight:1 }}>{p.score}</div>
              <div style={{ fontSize:7, color:ts.text, letterSpacing:0.5, marginTop:1 }}>{p.tier.toUpperCase()}</div>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{p.name}</div>
              <div style={{ fontSize:10, color:"#7a95ae", marginTop:1 }}>{p.pos} · {p.team}</div>
              <div style={{ fontSize:9, color:"#f97316", marginTop:2 }}>
                Age {p.age} · cliff {cliff} · <strong>+{p.age?(p.age-cliff).toFixed(1):"?"}y past</strong>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── TARGETS ───────────────────────────────────────────────────────────────────
function Targets({ roster, allPlayers, newsMap, grade, customTargets, addCustomTarget, removeCustomTarget }) {
  const [input, setInput] = useState("");
  const myOwner = roster[0]?.owner;

  // League avg per position — ignoring my own players
  const leagueAvg = useMemo(() => {
    const out = {};
    POS_ORDER.forEach(pos => {
      const pp = allPlayers.filter(p => p.pos===pos);
      out[pos] = pp.length ? pp.reduce((s,p)=>s+p.score,0)/pp.length : 0;
    });
    return out;
  }, [allPlayers]);

  // My avg per position
  const myAvg = useMemo(() => {
    const out = {};
    POS_ORDER.forEach(pos => {
      const pp = roster.filter(p => p.pos===pos);
      out[pos] = pp.length ? pp.reduce((s,p)=>s+p.score,0)/pp.length : 0;
    });
    return out;
  }, [roster]);

  // Positions where I'm below league avg by at least 5
  const weakPos = useMemo(() => new Set(
    POS_ORDER.filter(pos => myAvg[pos] < leagueAvg[pos] - 5)
  ), [myAvg, leagueAvg]);

  // Top 3 available targets per position (not on my roster), BUY-signal bumped
  const byPos = useMemo(() => {
    const map = {};
    POS_ORDER.forEach(pos => {
      map[pos] = allPlayers
        .filter(p => p.owner !== myOwner && p.pos === pos && p.score >= 35)
        .sort((a,b) => {
          const buyA = newsMap[a.name]?.signal==="BUY" ? 8 : 0;
          const buyB = newsMap[b.name]?.signal==="BUY" ? 8 : 0;
          return (b.score + buyB) - (a.score + buyA);
        })
        .slice(0,3);
    });
    return map;
  }, [allPlayers, myOwner, newsMap]);

  const addTarget = () => {
    const name = input.trim();
    if (!name || customTargets.includes(name)) return;
    addCustomTarget(name);
    setInput("");
  };

  const activePOS = POS_ORDER.filter(pos => byPos[pos]?.length > 0);

  return (
    <div>
      {/* Gap banner */}
      {weakPos.size > 0 && (
        <div style={{ background:"#0f1923", border:"1px solid #f9731633", borderRadius:8,
          padding:"10px 14px", marginBottom:16, display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:9, color:"#f97316", fontWeight:700, letterSpacing:1 }}>⚠ YOUR POSITIONAL GAPS:</span>
          {[...weakPos].map(pos => (
            <span key={pos} style={{ fontSize:9, background:"#f9731622", color:"#f97316",
              border:"1px solid #f9731644", borderRadius:3, padding:"2px 8px", fontWeight:700 }}>
              {pos} (you {myAvg[pos].toFixed(0)} · avg {leagueAvg[pos].toFixed(0)})
            </span>
          ))}
        </div>
      )}

      {/* Custom targets */}
      <div style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:8,
        padding:"12px 14px", marginBottom:16 }}>
        <div style={{ fontSize:9, color:"#7a95ae", letterSpacing:1.5, fontWeight:700, marginBottom:8 }}>
          ◎ MY TARGET LIST
        </div>
        <div style={{ display:"flex", gap:7, marginBottom:8 }}>
          <input value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addTarget()}
            placeholder="Add a player target (exact name)..."
            style={{ flex:1, background:"#080d14", border:"1px solid #1e2d3d", color:"#e2e8f0",
              padding:"6px 10px", borderRadius:5, fontFamily:"monospace", fontSize:10 }} />
          <button onClick={addTarget}
            style={{ background:"#1e2d3d", color:"#e2e8f0", border:"1px solid #374151",
              borderRadius:5, padding:"6px 12px", fontFamily:"inherit", fontSize:9,
              cursor:"pointer", fontWeight:700, letterSpacing:1 }}>+ ADD</button>
        </div>
        {customTargets.length===0
          ? <div style={{ fontSize:9, color:"#2a3d52" }}>None added — type a player name above</div>
          : <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {customTargets.map(name => {
                const p = allPlayers.find(x => x.name===name);
                const ts = p ? TIER_STYLE[p.tier]||TIER_STYLE.Stash : TIER_STYLE.Stash;
                return (
                  <div key={name} style={{ display:"flex", alignItems:"center", gap:6,
                    background:ts.bg, border:`1px solid ${ts.border}`, borderRadius:6, padding:"5px 10px" }}>
                    <div>
                      <div style={{ fontSize:11, fontWeight:700, color:ts.text }}>{name}</div>
                      {p&&<div style={{ fontSize:8, color:"#7a95ae" }}>{p.pos} · {p.team} · {p.age}y · {p.owner} · {p.score}</div>}
                    </div>
                    <button onClick={()=>removeCustomTarget(name)}
                      style={{ background:"none", border:"none", color:"#4d6580",
                        fontSize:13, cursor:"pointer", padding:"0 2px", lineHeight:1 }}>✕</button>
                  </div>
                );
              })}
            </div>
        }
      </div>

      {/* Top 3 per position grid */}
      <div style={{ fontSize:9, color:"#4d6080", letterSpacing:1.5, fontWeight:700, marginBottom:10 }}>
        ⇄ TOP 3 AVAILABLE PER POSITION
        {weakPos.size>0&&<span style={{ color:"#f97316", marginLeft:8 }}>⚠ = fills your gap</span>}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12 }}>
        {activePOS.map(pos => {
          const isWeak = weakPos.has(pos);
          return (
            <div key={pos} style={{ background:"#0a1118",
              border:`1px solid ${isWeak?"#f9731633":"#1e2d3d"}`, borderRadius:9, overflow:"hidden" }}>
              <div style={{ background:isWeak?"#180d00":"#0c151e",
                padding:"6px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:9, color:isWeak?"#f97316":"#60a5fa", fontWeight:700, letterSpacing:2 }}>
                  {pos}{isWeak?" ⚠":""}
                </span>
                <span style={{ fontSize:8, color:"#4d6080" }}>
                  you {myAvg[pos].toFixed(0)} · avg {leagueAvg[pos].toFixed(0)}
                </span>
              </div>
              {byPos[pos].map((p,i) => {
                const ts = TIER_STYLE[p.tier]||TIER_STYLE.Stash;
                const news = newsMap[p.name];
                return (
                  <div key={p.pid} style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"8px 12px", borderBottom:i<byPos[pos].length-1?"1px solid #0f1923":"none" }}>
                    <span style={{ fontSize:9, color:"#2a3d52", width:14, textAlign:"center" }}>{i+1}</span>
                    <div style={{ background:ts.bg, border:`1px solid ${ts.border}`, borderRadius:5,
                      padding:"4px 7px", textAlign:"center", minWidth:38, flexShrink:0 }}>
                      <div style={{ fontSize:13, fontWeight:900, color:ts.text, lineHeight:1 }}>{p.score}</div>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0",
                        whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{p.name}</div>
                      <div style={{ fontSize:9, color:"#7a95ae" }}>{p.team} · {p.age}y · {p.owner}</div>
                    </div>
                    <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                      {news?.signal==="BUY"&&(
                        <span style={{ fontSize:7, background:"#22c55e", color:"#080d14",
                          borderRadius:2, padding:"1px 4px", fontWeight:900 }}>BUY</span>
                      )}
                      {p.injStatus&&(
                        <span style={{ fontSize:7, color:INJ_COLOR[p.injStatus]||"#ef4444", fontWeight:700 }}>
                          ⚠{p.injStatus}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ALERT SECTION ─────────────────────────────────────────────────────────────
function AlertSection({ title, color, icon, count, children }) {
  return (
    <div style={{ background:"#0a1118", border:`1px solid ${color}33`, borderRadius:10, padding:"14px 16px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:12 }}>
        <span style={{ fontSize:14, color }}>{icon}</span>
        <span style={{ fontSize:9, fontWeight:700, letterSpacing:1.5, color }}>{title}</span>
        <span style={{ marginLeft:"auto", fontSize:10, fontWeight:900, color,
          background:color+"22", borderRadius:4, padding:"1px 7px" }}>{count}</span>
      </div>
      {children}
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
const TABS = [
  ["overview","◎ OVERVIEW"],
  ["roster",  "⬡ MY ROSTER"],
  ["alerts",  "⚑ ALERTS"],
  ["targets", "⇄ TARGETS"],
];

export function TeamHub({ phase, players, owners, currentOwner, newsMap={}, draftPicksByOwner={} }) {
  const [tab, setTab]               = useState("overview");
  const [playerNotes, setPlayerNotes] = useState({});
  const [customTargets, setCustomTargets] = useState([]);

  const setNote            = (pid, note) => setPlayerNotes(prev => ({ ...prev, [pid]: note }));
  const addCustomTarget    = name => setCustomTargets(prev => [...prev, name]);
  const removeCustomTarget = name => setCustomTargets(prev => prev.filter(n => n !== name));

  if (phase==="idle"||phase==="loading") return (
    <div style={{ textAlign:"center", padding:"72px 20px", border:"1px dashed #1e2d3d", borderRadius:12 }}>
      <div style={{ fontSize:11, color:"#7a95ae", letterSpacing:2 }}>
        {phase==="loading"?"◌ SYNCING DATA...":"SYNC DATA FIRST TO VIEW YOUR TEAM"}
      </div>
    </div>
  );

  if (!currentOwner) return (
    <div style={{ textAlign:"center", padding:56, border:"1px dashed #1e2d3d", borderRadius:12 }}>
      <div style={{ fontSize:11, color:"#f59e0b", letterSpacing:2, marginBottom:8 }}>SET YOUR TEAM FIRST</div>
      <div style={{ fontSize:10, color:"#4d6880" }}>Click ◎ in the top bar to log in</div>
    </div>
  );

  const grade = gradeRoster(currentOwner, players);
  if (!grade) return (
    <div style={{ padding:40, textAlign:"center", color:"#4d6880", fontSize:11 }}>
      No roster data found for {currentOwner}
    </div>
  );

  const roster = players.filter(p => p.owner === currentOwner);

  // Pre-grade all owners once — used by SellHigh suggestion engine
  const ownerGrades = useMemo(() => {
    const map = {};
    owners.forEach(o => { const g = gradeRoster(o, players); if (g) map[o] = g; });
    return map;
  }, [owners, players]); // eslint-disable-line

  const sellCount  = roster.filter(p => {
    if (newsMap[p.name]?.signal==="SELL") return true;
    const [,peak,cliff] = PRIME[p.pos]||[23,29,33];
    return p.score>=55 && p.age>=peak && p.age<cliff+2;
  }).length;
  const injCount   = roster.filter(p => p.injStatus &&
    ["Out","IR","PUP","Doubtful","Questionable"].includes(p.injStatus)).length;
  const cliffCount = roster.filter(p => p.situationFlag==="AGE_CLIFF").length;
  const alertTotal = sellCount + injCount + cliffCount;

  return (
    <div>
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid #1e2d3d", marginBottom:20 }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ background:"none", border:"none",
              borderBottom:tab===key?"2px solid #0ea5e9":"2px solid transparent",
              color:tab===key?"#0ea5e9":"#4b6580",
              padding:"6px 18px", fontFamily:"inherit", fontSize:10,
              letterSpacing:2, fontWeight:700, cursor:"pointer" }}>
            {label}
            {key==="alerts" && alertTotal > 0 && (
              <span style={{ marginLeft:5, background:"#ef4444", color:"#fff",
                fontSize:8, borderRadius:8, padding:"1px 5px", fontWeight:900 }}>{alertTotal}</span>
            )}
          </button>
        ))}
      </div>

      {tab==="overview" && (
        <div>
          <GradeCard grade={grade} owners={owners} players={players} />
          <TopByPosition roster={roster} newsMap={newsMap} />
        </div>
      )}

      {tab==="roster" && (
        <MyRoster roster={roster} newsMap={newsMap} notes={playerNotes} setNote={setNote} />
      )}

      {tab==="alerts" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <AlertSection title="SELL-HIGH CANDIDATES" color="#ef4444" icon="↑" count={sellCount}>
            <SellHigh roster={roster} newsMap={newsMap} allPlayers={players}
              draftPicksByOwner={draftPicksByOwner} ownerGrades={ownerGrades} />
          </AlertSection>
          <AlertSection title="INJURY WATCH" color="#f97316" icon="⚠" count={injCount}>
            <InjuryWatch roster={roster} />
          </AlertSection>
          <AlertSection title="AGE CLIFF RISKS" color="#6b7280" icon="↓" count={cliffCount}>
            <AgeCliff roster={roster} />
          </AlertSection>
        </div>
      )}

      {tab==="targets" && (
        <Targets
          roster={roster} allPlayers={players} newsMap={newsMap} grade={grade}
          customTargets={customTargets}
          addCustomTarget={addCustomTarget}
          removeCustomTarget={removeCustomTarget}
        />
      )}
    </div>
  );
}
