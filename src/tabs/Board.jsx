import React from "react";
import { TH, TD } from "../components/TableCells";
import { TIER_STYLE, INJ_COLOR, SIG_COLORS, SIT_ICONS, SCARCITY, POS_ORDER, SITUATION_FLAGS } from "../constants";
import { sitMultiplier } from "../scoring";

export function Board({
  players, view, newsMap, detail, setDetail,
  tierFilter, setTierFilter, search, setSearch,
  posFilter, setPosFilter,
  sortKey, sortAsc, onSort,
}) {
  return (
    <>
      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        {["Elite","Starter","Flex","Depth","Stash"].map(tier => {
          const ts  = TIER_STYLE[tier];
          const cnt = players.filter(p => p.tier === tier).length;
          return (
            <div key={tier}
              onClick={() => setTierFilter(t => t === tier ? "ALL" : tier)}
              style={{
                background:  tierFilter === tier ? ts.bg : "transparent",
                border:      `1px solid ${tierFilter === tier ? ts.border : "#1e2d3d"}`,
                borderRadius: 6, padding: "5px 13px", cursor: "pointer",
                boxShadow:   tierFilter === tier ? `0 0 10px ${ts.glow}` : "none",
              }}>
              <span style={{color:ts.text,fontSize:10,fontWeight:700,letterSpacing:1}}>
                {tier.toUpperCase()} {cnt}
              </span>
            </div>
          );
        })}
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="SEARCH..."
          style={{marginLeft:"auto",background:"#0f1923",border:"1px solid #1e2d3d",
            color:"#e2e8f0",padding:"5px 12px",borderRadius:6,
            fontFamily:"inherit",fontSize:10,letterSpacing:1,width:170}}
        />
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)}
          style={{background:"#0f1923",border:"1px solid #1e2d3d",color:"#e2e8f0",
            padding:"5px 8px",borderRadius:6,fontFamily:"inherit",fontSize:10}}>
          <option value="ALL">ALL POS</option>
          {POS_ORDER.map(p => <option key={p}>{p}</option>)}
        </select>
        <span style={{fontSize:9,color:"#4d6880",letterSpacing:1}}>{view.length} PLAYERS</span>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <div style={{overflowX:"auto",borderRadius:8,border:"1px solid #1e2d3d"}}>
        <table>
          <thead>
            <tr>
              <TH label="#"      k=""             w={32}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="PLAYER" k="name"         w={170} sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="POS"    k="pos"          w={44}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="TEAM"   k="team"         w={50}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="AGE"    k="age"          w={44}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="SCORE"  k="score"        w={60}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="TIER"   k="tier"         w={72}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="DEPTH"  k="depthOrder"   w={56}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="ROLE"   k="roleConf"     w={64}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="G STR"  k="gamesStarted" w={58}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="PPG"    k="ppg"          w={50}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="TRD"    k="trades"       w={44}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="ADD"    k="adds"         w={44}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="INJ"    k="injStatus"    w={80}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="OWNER"  k="owner"        w={130} sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
              <TH label="SIG"    k=""             w={46}  sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}/>
            </tr>
          </thead>
          <tbody>
            {view.map((p, i) => {
              const ts  = TIER_STYLE[p.tier];
              const nr  = newsMap[p.name];
              const isd = detail?.pid === p.pid;
              const sf  = p.situationFlag && SITUATION_FLAGS[p.situationFlag];
              return (
                <React.Fragment key={p.pid}>
                  <tr
                    onClick={() => setDetail(isd ? null : p)}
                    style={{background: isd ? ts.bg : i%2===0 ? "#080d14" : "#0a1118", cursor:"pointer"}}
                  >
                    <TD><span style={{color:"#4d6880",fontSize:9}}>{i+1}</span></TD>

                    <TD align="left" style={{fontWeight:700,color:ts.text}}>
                      {p.name}
                      {p.onTaxi && <span style={{fontSize:8,color:"#f59e0b",marginLeft:4}}>TAXI</span>}
                      {sf && (
                        <span style={{
                          fontSize:7, background:sf.color+"22", color:sf.color,
                          border:`1px solid ${sf.color}66`, borderRadius:3,
                          padding:"1px 4px", marginLeft:5, letterSpacing:0.5, fontWeight:700,
                        }}>{sf.label}</span>
                      )}
                    </TD>

                    <TD style={{color:"#60a5fa",fontWeight:700}}>{p.pos}</TD>
                    <TD style={{color:"#a8bccf"}}>{p.team}</TD>
                    <TD style={{color:"#a8bccf"}}>{p.age ?? '—'}</TD>

                    <TD style={{fontWeight:900,fontSize:14,color:ts.text,textShadow:`0 0 8px ${ts.glow}`}}>
                      {p.score}
                    </TD>

                    <TD>
                      <span style={{background:ts.bg,color:ts.text,border:`1px solid ${ts.border}`,
                        borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700,letterSpacing:1}}>
                        {p.tier.toUpperCase()}
                      </span>
                    </TD>

                    <TD style={{fontWeight:700,color:p.depthOrder===1?"#22c55e":p.depthOrder===2?"#f59e0b":"#ef4444"}}>
                      {p.depthOrder ? `#${p.depthOrder}` : "—"}
                    </TD>

                    <TD>
                      <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"center"}}>
                        <div style={{width:30,height:4,background:"#1e2d3d",borderRadius:2,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${p.roleConf*100}%`,
                            background:p.roleConf>0.7?"#22c55e":p.roleConf>0.4?"#f59e0b":"#ef4444"}}/>
                        </div>
                        <span style={{fontSize:8,color:"#7a95ae"}}>{Math.round(p.roleConf*100)}%</span>
                      </div>
                    </TD>

                    <TD style={{fontSize:10}}>
                      {p.gamesStarted != null
                        ? <><span style={{color:"#e2e8f0",fontWeight:700}}>{p.gamesStarted}</span>
                            <span style={{color:"#4d6880",fontSize:9}}>/{p.gamesPlayed}</span></>
                        : "—"}
                    </TD>

                    <TD style={{fontWeight:700,color:p.ppg!=null?(p.ppg>20?"#22c55e":p.ppg>12?"#60a5fa":p.ppg>6?"#f59e0b":"#94a3b8"):"#2a3d52"}}>
                      {p.ppg != null ? p.ppg : "—"}
                    </TD>

                    <TD style={{color:p.trades>0?"#f59e0b":"#2a3d52"}}>{p.trades||"—"}</TD>
                    <TD style={{color:p.adds>0?"#60a5fa":"#2a3d52"}}>{p.adds||"—"}</TD>

                    <TD>
                      {p.injStatus
                        ? <span style={{color:INJ_COLOR[p.injStatus]||"#ef4444",fontWeight:700,fontSize:9}}>{p.injStatus.toUpperCase()}</span>
                        : <span style={{color:"#2d5a35",fontSize:8}}>OK</span>}
                    </TD>

                    <TD align="left" style={{color:"#7a95ae",fontSize:10}}>{p.owner}</TD>

                    <TD>
                      {nr
                        ? <span style={{background:SIG_COLORS[nr.signal]||"#4b6580",color:"#080d14",
                            fontSize:8,fontWeight:900,borderRadius:3,padding:"2px 5px",letterSpacing:1}}>
                            {nr.signal}
                          </span>
                        : <span style={{color:"#3a5068",fontSize:8}}>—</span>}
                    </TD>
                  </tr>

                  {/* ── Expanded detail row ──────────────────────────────────── */}
                  {isd && (
                    <tr style={{background:ts.bg}}>
                      <td colSpan={16} style={{padding:"16px 20px",borderBottom:`2px solid ${ts.border}`}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>

                          {/* Profile */}
                          <div>
                            <div style={{fontSize:9,color:ts.text,letterSpacing:2,marginBottom:8,fontWeight:700}}>PROFILE</div>
                            {[
                              ["Team",    p.team],
                              ["Age",     p.age||"—"],
                              ["Yrs Exp", p.yrsExp ?? '—'],
                              ["Ht/Wt",  `${p.height||"—"} / ${p.weight||"—"}`],
                              ["Status",  p.status||"Active"],
                              ["Depth",   p.depthOrder ? `#${p.depthOrder} ${p.depthPos}` : "Unknown"],
                              ["Injury",  p.injStatus||"None"],
                              ["Owner",   p.owner],
                            ].map(([k, v]) => (
                              <div key={k} style={{display:"flex",justifyContent:"space-between",
                                borderBottom:"1px solid rgba(255,255,255,0.04)",padding:"3px 0",fontSize:11}}>
                                <span style={{color:"#7a95ae"}}>{k}</span>
                                <span style={{color:"#e2e8f0",fontWeight:600}}>{v}</span>
                              </div>
                            ))}
                          </div>

                          {/* Dynasty metrics */}
                          <div>
                            <div style={{fontSize:9,color:ts.text,letterSpacing:2,marginBottom:8,fontWeight:700}}>DYNASTY METRICS</div>
                            {[
                              ["Score",          p.score],
                              ["Tier",           p.tier],
                              ["Scarcity Mult",  `${(p.scarcityUsed||SCARCITY[p.pos]||1).toFixed(2)}×`],
                              ["Age Score",      Math.round(p.ageRaw)],
                              ["Age Gated",      Math.round(p.ageGated)],
                              ["Role Conf",      `${Math.round(p.roleConf*100)}%`],
                              ["Starts (2025)",  p.gamesStarted != null ? `${p.gamesStarted}/${p.gamesPlayed}` : "No data"],
                              ["PPG (2025)",     p.ppg != null ? p.ppg : "No data"],
                              ["2025 Stats",     p.statLine||"—"],
                              ["Trades",         p.trades],
                              ["FA Adds",        p.adds],
                              ["Situation",      sf ? sf.label : "None"],
                              ["Sit. Note",      p.situationNote||"—"],
                              ...(p.situationFlag==="SUSPENSION"
                                ? [["Games Suspended", p.situationGames||"?"],
                                   ["Value Mult", `${(sitMultiplier(p)*100).toFixed(0)}%`]]
                                : []),
                            ].map(([k, v]) => (
                              <div key={k} style={{display:"flex",justifyContent:"space-between",
                                borderBottom:"1px solid rgba(255,255,255,0.04)",padding:"3px 0",fontSize:11}}>
                                <span style={{color:"#7a95ae"}}>{k}</span>
                                <span style={{color:ts.text,fontWeight:700}}>{v}</span>
                              </div>
                            ))}
                          </div>

                          {/* Intel */}
                          <div>
                            <div style={{fontSize:9,color:ts.text,letterSpacing:2,marginBottom:8,fontWeight:700}}>INTEL</div>
                            {nr ? (
                              <div style={{background:`${SIG_COLORS[nr.signal]}18`,border:`1px solid ${SIG_COLORS[nr.signal]}`,borderRadius:8,padding:"12px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                                  <span style={{fontSize:13,fontWeight:900,color:SIG_COLORS[nr.signal],letterSpacing:2}}>{nr.signal}</span>
                                  <span style={{fontSize:10,color:"#a8bccf"}}>{nr.situation} {SIT_ICONS[nr.situation]||""}</span>
                                </div>
                                <div style={{fontSize:11,color:"#e2e8f0",lineHeight:1.7,marginBottom:6}}>{nr.note}</div>
                                <div style={{fontSize:9,color:"#7a95ae"}}>STATUS:{" "}
                                  <span style={{color:nr.status==="Starter"?"#22c55e":nr.status==="Injured"?"#ef4444":"#f59e0b",fontWeight:700}}>
                                    {nr.status}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div style={{fontSize:11,color:"#4d6880",fontStyle:"italic",padding:"16px 0"}}>
                                Run ◈ INTEL SCAN to load news.
                              </div>
                            )}
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
