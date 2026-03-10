import { TIER_STYLE, INJ_COLOR, SIG_COLORS, POS_ORDER, SITUATION_FLAGS, MANUAL_SITUATIONS, pv } from "../constants";

export function Hub({
  // nested tab
  hubTab, setHubTab,
  // situations
  manualSits,
  sitEditName, setSitEditName, sitEditFlag, setSitEditFlag,
  sitEditNote, setSitEditNote, sitEditGames, setSitEditGames,
  sitEditing, setSitEditing,
  sitAdd, sitRemove, sitStartEdit, sitResetDefaults,
  // deep watchlist
  watchlist, watchInput, setWatchInput,
  watchAdd, watchRemove, researchResults, researchRunning, runWatchlistResearch,
  approveResult, rejectResult, players,
  // FA browser
  nflDb, faSearch, setFaSearch, faPosFilter, setFaPosFilter,
  faTeamFilter, setFaTeamFilter, faAgeMin, setFaAgeMin, faAgeMax, setFaAgeMax,
  faHideInj, setFaHideInj, faResults, faTeams, faWatchlist,
  addToFaWatchlist, removeFromFaWatchlist,
  viewMode="dynasty",
}) {
  const inputStyle = {
    background:"#080d14", border:"1px solid #1e2d3d", color:"#e2e8f0",
    padding:"6px 10px", borderRadius:4, fontSize:11, fontFamily:"monospace",
  };

  return (
    <div>
      {/* ── Nested tab bar ────────────────────────────────────────────────────── */}
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #1e2d3d",marginBottom:18}}>
        {[["situations","⚑ SITUATIONS"],["fawatch","◎ FA WATCHLIST"]].map(([id,lbl]) => (
          <button key={id} onClick={() => setHubTab(id)} style={{
            background:"none", border:"none",
            borderBottom: hubTab===id ? "2px solid #f59e0b" : "2px solid transparent",
            color: hubTab===id ? "#f59e0b" : "#4b6580",
            padding:"6px 18px", fontFamily:"inherit",
            fontSize:10, letterSpacing:2, fontWeight:700, cursor:"pointer",
          }}>{lbl}</button>
        ))}
      </div>

      {/* ══ SITUATIONS PANEL ═══════════════════════════════════════════════════ */}
      {hubTab === "situations" && (
        <div>
          {/* Header */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontSize:11,color:"#22c55e",letterSpacing:2,fontWeight:700,marginBottom:2}}>⚑ MANUAL SITUATIONS</div>
              <div style={{fontSize:9,color:"#4d6880"}}>
                Applied on every sync · Intel Scan adds auto-detection on top · changes persist in browser
              </div>
            </div>
            <button onClick={sitResetDefaults}
              style={{background:"#1e2d3d",color:"#7a95ae",border:"1px solid #374151",
                borderRadius:6,padding:"6px 12px",fontFamily:"inherit",fontSize:9,cursor:"pointer",letterSpacing:1}}>
              ↺ RESET DEFAULTS
            </button>
          </div>

          {/* Add / Edit form */}
          <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:8,padding:16,marginBottom:16}}>
            <div style={{fontSize:9,color:"#7a95ae",letterSpacing:1.5,marginBottom:10,fontWeight:700}}>
              {sitEditing ? "EDITING: " + sitEditing : "ADD SITUATION"}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
              <div style={{display:"flex",flexDirection:"column",gap:4,flex:"2 1 180px"}}>
                <span style={{fontSize:8,color:"#7a95ae",letterSpacing:1}}>PLAYER NAME (exact)</span>
                <input value={sitEditName} onChange={e => setSitEditName(e.target.value)}
                  placeholder="e.g. Kyler Murray" style={inputStyle}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:4,flex:"1 1 130px"}}>
                <span style={{fontSize:8,color:"#7a95ae",letterSpacing:1}}>FLAG</span>
                <select value={sitEditFlag} onChange={e => setSitEditFlag(e.target.value)}
                  style={{...inputStyle, color:SITUATION_FLAGS[sitEditFlag]?.color||"#e2e8f0"}}>
                  {Object.entries(SITUATION_FLAGS).map(([k, v]) => (
                    <option key={k} value={k} style={{color:v.color}}>{v.label} — {k}</option>
                  ))}
                </select>
              </div>
              {sitEditFlag === "SUSPENSION" && (
                <div style={{display:"flex",flexDirection:"column",gap:4,flex:"0 0 80px"}}>
                  <span style={{fontSize:8,color:"#7a95ae",letterSpacing:1}}>GAMES</span>
                  <input type="number" min="1" max="17" value={sitEditGames}
                    onChange={e => setSitEditGames(e.target.value)}
                    placeholder="e.g. 6" style={inputStyle}/>
                </div>
              )}
              <div style={{display:"flex",flexDirection:"column",gap:4,flex:"3 1 240px"}}>
                <span style={{fontSize:8,color:"#7a95ae",letterSpacing:1}}>NOTE (max 120 chars)</span>
                <input value={sitEditNote}
                  onChange={e => setSitEditNote(e.target.value.slice(0, 120))}
                  placeholder="Brief situation note..." style={inputStyle}/>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button onClick={sitAdd}
                  style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#080d14",
                    border:"none",borderRadius:6,padding:"8px 14px",fontFamily:"inherit",
                    fontWeight:900,fontSize:10,cursor:"pointer",letterSpacing:1,whiteSpace:"nowrap"}}>
                  {sitEditing ? "✓ SAVE" : "+ ADD"}
                </button>
                {sitEditing && (
                  <button onClick={() => { setSitEditing(null); setSitEditName(""); setSitEditNote(""); setSitEditGames(""); }}
                    style={{background:"#1e2d3d",color:"#7a95ae",border:"1px solid #374151",
                      borderRadius:6,padding:"8px 10px",fontFamily:"inherit",fontSize:10,cursor:"pointer"}}>
                    ✕
                  </button>
                )}
              </div>
            </div>
            {sitEditFlag && SITUATION_FLAGS[sitEditFlag] && (
              <div style={{marginTop:8,fontSize:9,color:SITUATION_FLAGS[sitEditFlag].color,opacity:0.8}}>
                {SITUATION_FLAGS[sitEditFlag].desc} · Score impact:{" "}
                {SITUATION_FLAGS[sitEditFlag].impact > 0 ? "+" : ""}
                {sitEditFlag === "SUSPENSION"
                  ? "(17-N)/17"
                  : Math.round(SITUATION_FLAGS[sitEditFlag].impact * 100) + "%"}
              </div>
            )}
          </div>

          {/* Situations table */}
          {Object.keys(manualSits).length === 0
            ? <div style={{color:"#4d6880",fontSize:11,padding:20,textAlign:"center"}}>
                No situations configured. Add one above or reset to defaults.
              </div>
            : (
              <div style={{borderRadius:8,border:"1px solid #1e2d3d",overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr>
                      {[["PLAYER",220],["FLAG",100],["NOTE","auto"],["GAMES",60],["SCORE IMPACT",90],["",80]].map(([h,w]) => (
                        <th key={h} style={{padding:"7px 10px",background:"#0c151e",color:"#7a95ae",
                          fontSize:9,letterSpacing:1.5,fontWeight:700,textAlign:"left",
                          borderRight:"1px solid #1e2d3d",width:w}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(manualSits).map(([name, sit], i) => {
                      const sf        = SITUATION_FLAGS[sit.flag];
                      const isDefault = !!MANUAL_SITUATIONS[name];
                      const impact    = sit.flag === "SUSPENSION"
                        ? `-${(100 - Math.round((17 - (sit.games||6)) / 17 * 100))}%`
                        : sf ? (sf.impact > 0 ? "+" : "") + Math.round(sf.impact * 100) + "%" : "0%";
                      return (
                        <tr key={name} style={{background: i%2===0 ? "#080d14" : "#0a1118"}}>
                          <td style={{padding:"8px 10px",fontSize:11,color:"#e2e8f0",fontWeight:700,borderBottom:"1px solid #0f1923"}}>
                            {name}
                            {isDefault && <span style={{fontSize:7,color:"#4d6880",marginLeft:6,letterSpacing:1}}>DEFAULT</span>}
                          </td>
                          <td style={{padding:"8px 10px",borderBottom:"1px solid #0f1923"}}>
                            {sf && (
                              <span style={{fontSize:9,background:sf.color+"22",color:sf.color,
                                border:`1px solid ${sf.color}66`,borderRadius:3,
                                padding:"2px 6px",fontWeight:700,letterSpacing:0.5}}>
                                {sf.label}
                              </span>
                            )}
                          </td>
                          <td style={{padding:"8px 10px",fontSize:10,color:"#a8bccf",borderBottom:"1px solid #0f1923"}}>{sit.note||"—"}</td>
                          <td style={{padding:"8px 10px",fontSize:10,color:"#7a95ae",textAlign:"center",borderBottom:"1px solid #0f1923"}}>{sit.games||"—"}</td>
                          <td style={{padding:"8px 10px",fontSize:11,fontWeight:700,textAlign:"center",borderBottom:"1px solid #0f1923",
                            color:sf?.impact>0?"#22c55e":sf?.impact<0?"#ef4444":"#4b6580"}}>{impact}</td>
                          <td style={{padding:"8px 10px",borderBottom:"1px solid #0f1923"}}>
                            <div style={{display:"flex",gap:6}}>
                              <button onClick={() => sitStartEdit(name)}
                                style={{background:"#1e2d3d",color:"#60a5fa",border:"1px solid #1e3a5e",
                                  borderRadius:4,padding:"3px 8px",fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>
                                EDIT
                              </button>
                              <button onClick={() => sitRemove(name)}
                                style={{background:"#1a0505",color:"#ef4444",border:"1px solid #3d1515",
                                  borderRadius:4,padding:"3px 8px",fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          }
          <div style={{marginTop:10,fontSize:9,color:"#4d6880",lineHeight:1.7}}>
            Changes apply on next ⟳ SYNC · AGE_CLIFF auto-derived from age curves · use watchlist below for deep research
          </div>

          {/* ── Deep Situation Watchlist ────────────────────────────────────── */}
          <div style={{marginTop:28,borderTop:"1px solid #1e2d3d",paddingTop:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:12}}>
              <div>
                <div style={{fontSize:11,color:"#f59e0b",letterSpacing:2,fontWeight:700,marginBottom:2}}>◈ DEEP SITUATION RESEARCH</div>
                <div style={{fontSize:9,color:"#4d6880",maxWidth:500,lineHeight:1.6}}>
                  Add players to monitor · searches ESPN + Sleeper for each one · suggests flag + signal · you approve before it saves to your situations list
                </div>
              </div>
            </div>

            <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center"}}>
              <input value={watchInput} onChange={e => setWatchInput(e.target.value)}
                onKeyDown={e => e.key==="Enter" && watchAdd()}
                placeholder="Player name (exact)..."
                style={{flex:1,background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
                  padding:"7px 12px",borderRadius:6,fontSize:11,fontFamily:"monospace"}}/>
              <button onClick={watchAdd}
                style={{background:"#1e2d3d",color:"#e2e8f0",border:"1px solid #374151",
                  borderRadius:6,padding:"7px 14px",fontFamily:"inherit",fontSize:10,
                  cursor:"pointer",letterSpacing:1,whiteSpace:"nowrap"}}>
                + WATCH
              </button>
              {watchlist.length > 0 && (
                <button onClick={runWatchlistResearch} disabled={researchRunning}
                  style={{
                    background: researchRunning ? "#1e2d3d" : "linear-gradient(135deg,#f59e0b,#d97706)",
                    color: researchRunning ? "#4b6580" : "#080d14",
                    border:"none",borderRadius:6,padding:"7px 16px",fontFamily:"inherit",
                    fontWeight:900,fontSize:10,cursor:researchRunning?"not-allowed":"pointer",
                    letterSpacing:1.5,whiteSpace:"nowrap",
                  }}>
                  {researchRunning ? "◌ RESEARCHING..." : "◈ RESEARCH ALL"}
                </button>
              )}
            </div>

            {watchlist.length === 0
              ? <div style={{fontSize:10,color:"#4d6880",padding:"20px 0",textAlign:"center"}}>
                  No players on watchlist. Add a name above to get started.
                </div>
              : (
                <div style={{display:"grid",gap:8}}>
                  {watchlist.map(name => {
                    const r  = researchResults[name];
                    const sf = r?.flag ? SITUATION_FLAGS[r.flag] : null;
                    const p  = players.find(pl => pl.name === name);
                    return (
                      <div key={name}
                        style={{background:"#0a1118",borderRadius:8,padding:"12px 16px",
                          border:`1px solid ${r?.approved?"#22c55e":r?.status==="done"?"#f59e0b":"#1e2d3d"}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                          <div style={{flex:1}}>
                            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                              <span style={{fontWeight:900,color:"#e2e8f0",fontSize:13}}>{name}</span>
                              {p && <span style={{fontSize:9,color:"#7a95ae"}}>{p.pos} · {p.team} · {p.age}y</span>}
                              {r?.approved && (
                                <span style={{fontSize:8,background:"#0f2b1a",color:"#22c55e",border:"1px solid #22c55e44",borderRadius:3,padding:"1px 5px",fontWeight:700}}>✓ SAVED</span>
                              )}
                            </div>
                            {!r && <div style={{fontSize:10,color:"#4d6880"}}>Not yet researched — click ◈ RESEARCH ALL</div>}
                            {r?.status==="loading" && <div style={{fontSize:10,color:"#f59e0b"}}>◌ Searching web...</div>}
                            {r?.status==="error"   && <div style={{fontSize:10,color:"#ef4444"}}>⚠ {r.error}</div>}
                            {r?.status==="done" && !r.approved && (
                              <div>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                                  {sf && (
                                    <span style={{fontSize:9,background:sf.color+"22",color:sf.color,
                                      border:`1px solid ${sf.color}66`,borderRadius:3,padding:"2px 6px",fontWeight:700,letterSpacing:0.5}}>
                                      {sf.label}
                                    </span>
                                  )}
                                  <span style={{fontSize:9,background:SIG_COLORS[r.signal]||"#4b6580",color:"#080d14",borderRadius:3,padding:"2px 6px",fontWeight:900}}>
                                    {r.signal}
                                  </span>
                                  <span style={{fontSize:9,color:"#7a95ae"}}>{sf?.desc}</span>
                                </div>
                                <div style={{fontSize:11,color:"#e2e8f0",marginBottom:4}}>{r.note}</div>
                                <div style={{fontSize:10,color:"#7a95ae",fontStyle:"italic",marginBottom:8}}>{r.reasoning}</div>
                                <div style={{display:"flex",gap:6}}>
                                  <button onClick={() => approveResult(name)}
                                    style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#080d14",
                                      border:"none",borderRadius:5,padding:"5px 14px",fontFamily:"inherit",
                                      fontWeight:900,fontSize:10,cursor:"pointer",letterSpacing:1}}>
                                    ✓ APPROVE
                                  </button>
                                  <button onClick={() => rejectResult(name)}
                                    style={{background:"#1a0505",color:"#ef4444",border:"1px solid #3d1515",
                                      borderRadius:5,padding:"5px 10px",fontFamily:"inherit",fontSize:10,cursor:"pointer"}}>
                                    ✕ REJECT
                                  </button>
                                </div>
                              </div>
                            )}
                            {r?.status==="done" && r.approved && (
                              <div style={{fontSize:10,color:"#22c55e"}}>
                                {sf && <span style={{fontWeight:700}}>{sf.label}</span>} — {r.note}
                              </div>
                            )}
                          </div>
                          <button onClick={() => watchRemove(name)}
                            style={{background:"none",color:"#4d6880",border:"none",fontSize:14,cursor:"pointer",padding:"0 4px",flexShrink:0}}>
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* ══ FA WATCHLIST PANEL ════════════════════════════════════════════════ */}
      {hubTab === "fawatch" && (
        <div>
          {Object.keys(nflDb).length === 0 && (
            <div style={{textAlign:"center",padding:48,border:"1px dashed #1e2d3d",borderRadius:12}}>
              <div style={{fontSize:11,color:"#7a95ae",letterSpacing:2}}>SYNC DATA FIRST TO BROWSE FREE AGENTS</div>
            </div>
          )}
          {Object.keys(nflDb).length > 0 && (
            <>
              {/* Filters */}
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
                <input value={faSearch} onChange={e => setFaSearch(e.target.value)}
                  placeholder="Search name or team..."
                  style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
                    padding:"6px 10px",borderRadius:5,fontFamily:"inherit",fontSize:10,width:180}}/>
                <select value={faPosFilter} onChange={e => setFaPosFilter(e.target.value)}
                  style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
                    padding:"6px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10}}>
                  <option value="ALL">ALL POS</option>
                  {POS_ORDER.map(p => <option key={p}>{p}</option>)}
                </select>
                <select value={faTeamFilter} onChange={e => setFaTeamFilter(e.target.value)}
                  style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
                    padding:"6px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10,maxWidth:100}}>
                  <option value="ALL">ALL TEAMS</option>
                  {faTeams.map(t => <option key={t}>{t}</option>)}
                </select>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <input type="number" placeholder="Age min" value={faAgeMin}
                    onChange={e => setFaAgeMin(e.target.value)}
                    style={{width:72,background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
                      padding:"6px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10}}/>
                  <span style={{color:"#4d6880",fontSize:10}}>–</span>
                  <input type="number" placeholder="max" value={faAgeMax}
                    onChange={e => setFaAgeMax(e.target.value)}
                    style={{width:60,background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
                      padding:"6px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10}}/>
                </div>
                <label style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#7a95ae",cursor:"pointer"}}>
                  <input type="checkbox" checked={faHideInj} onChange={e => setFaHideInj(e.target.checked)}/>
                  Hide injured
                </label>
                <span style={{fontSize:9,color:"#4d6880",marginLeft:"auto"}}>{faResults.length} players</span>
              </div>

              {/* FA table */}
              <div style={{borderRadius:8,border:"1px solid #1e2d3d",overflow:"hidden",marginBottom:22}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr>
                      {[["PLAYER",180],["POS",44],["TEAM",55],["AGE",44],["DEPTH",55],["INJ",80],["",70]].map(([h,w]) => (
                        <th key={h} style={{padding:"7px 8px",background:"#0c151e",color:"#7a95ae",
                          fontSize:9,letterSpacing:1.5,fontWeight:700,textAlign:"center",
                          borderRight:"1px solid #1e2d3d",width:w}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {faResults.map((p, i) => {
                      const onList = faWatchlist.find(w => w.pid === p.pid);
                      return (
                        <tr key={p.pid} style={{background: i%2===0 ? "#080d14" : "#0a1118"}}>
                          <td style={{padding:"7px 10px",fontWeight:700,color:"#e2e8f0",fontSize:11,borderBottom:"1px solid #0f1923"}}>{p.name}</td>
                          <td style={{padding:"7px 8px",textAlign:"center",color:"#60a5fa",fontWeight:700,fontSize:10,borderBottom:"1px solid #0f1923"}}>{p.pos}</td>
                          <td style={{padding:"7px 8px",textAlign:"center",color:"#a8bccf",fontSize:10,borderBottom:"1px solid #0f1923"}}>{p.team}</td>
                          <td style={{padding:"7px 8px",textAlign:"center",color:"#a8bccf",fontSize:10,borderBottom:"1px solid #0f1923"}}>{p.age||"—"}</td>
                          <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,borderBottom:"1px solid #0f1923",
                            color:p.depth===1?"#22c55e":p.depth===2?"#f59e0b":p.depth?"#ef4444":"#2a3d52"}}>
                            {p.depth ? `#${p.depth}` : "—"}
                          </td>
                          <td style={{padding:"7px 8px",textAlign:"center",fontSize:9,borderBottom:"1px solid #0f1923",
                            color:INJ_COLOR[p.inj]||"#1a2e1e"}}>
                            {p.inj || <span style={{color:"#2d5a35"}}>OK</span>}
                          </td>
                          <td style={{padding:"7px 8px",textAlign:"center",borderBottom:"1px solid #0f1923"}}>
                            {onList
                              ? <span style={{fontSize:8,color:"#22c55e",fontWeight:700,letterSpacing:1}}>✓ WATCHING</span>
                              : <button onClick={() => addToFaWatchlist(p.pid)}
                                  style={{background:"#0f2b1a",color:"#22c55e",border:"1px solid #22c55e44",
                                    borderRadius:4,padding:"3px 8px",fontFamily:"inherit",
                                    fontSize:9,cursor:"pointer",fontWeight:700,letterSpacing:1}}>
                                  + WATCH
                                </button>
                            }
                          </td>
                        </tr>
                      );
                    })}
                    {faResults.length === 0 && (
                      <tr><td colSpan={7} style={{padding:24,textAlign:"center",color:"#4d6880",fontSize:10}}>
                        No players match current filters
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* FA Watchlist scored cards */}
              {faWatchlist.length > 0 && (
                <div>
                  <div style={{fontSize:9,color:"#f59e0b",letterSpacing:2,fontWeight:700,marginBottom:10}}>◎ YOUR FA WATCHLIST — SCORED</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                    {[...faWatchlist].sort((a,b) => b.dynastyValue-a.dynastyValue).map(p => {
                      const ts = TIER_STYLE[p.tier];
                      const sf = p.situationFlag && SITUATION_FLAGS[p.situationFlag];
                      return (
                        <div key={p.pid}
                          style={{background:ts.bg,border:`1px solid ${ts.border}`,borderRadius:8,
                            padding:"10px 12px",position:"relative",boxShadow:`0 0 6px ${ts.glow}`}}>
                          <button onClick={() => removeFromFaWatchlist(p.pid)}
                            style={{position:"absolute",top:6,right:8,background:"none",
                              border:"none",color:"#4d6880",fontSize:12,cursor:"pointer",padding:0}}>✕</button>
                          <div style={{fontSize:8,color:ts.text,letterSpacing:1,marginBottom:2}}>{p.tier.toUpperCase()}</div>
                          <div style={{fontWeight:900,color:"#e2e8f0",fontSize:13,marginBottom:2,paddingRight:14}}>{p.name}</div>
                          <div style={{fontSize:10,color:"#7a95ae"}}>{p.pos} · {p.team} · {p.age||"?"}y</div>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                            <span style={{fontSize:20,fontWeight:900,color:ts.text,textShadow:`0 0 8px ${ts.glow}`}}>{pv(p,viewMode)}</span>
                            <div style={{textAlign:"right"}}>
                              {p.depth && <div style={{fontSize:9,color:p.depth===1?"#22c55e":"#f59e0b"}}>Depth #{p.depth}</div>}
                              {p.injStatus && <div style={{fontSize:9,color:INJ_COLOR[p.injStatus]||"#ef4444",fontWeight:700}}>{p.injStatus}</div>}
                              {sf && (
                                <span style={{fontSize:7,background:sf.color+"22",color:sf.color,
                                  border:`1px solid ${sf.color}44`,borderRadius:3,
                                  padding:"1px 4px",fontWeight:700,display:"inline-block",marginTop:2}}>
                                  {sf.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {faWatchlist.length === 0 && (
                <div style={{textAlign:"center",padding:"24px 0",color:"#4d6880",fontSize:10}}>
                  Your watchlist is empty — add players above with + WATCH
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
