import { TIER_STYLE, POS_ORDER, PICK_YEARS, PICK_ROUNDS } from "../constants";

export function Trade({
  phase, owners,
  tradeOwnerA, setTradeOwnerA, tradeOwnerB, setTradeOwnerB,
  tradeSideA, tradeSideB,
  tradeSearchA, setTradeSearchA, tradeSearchB, setTradeSearchB,
  tradePickYrA, setTradePickYrA, tradePickRdA, setTradePickRdA,
  tradePickYrB, setTradePickYrB, tradePickRdB, setTradePickRdB,
  tradeSearchResults, addPlayer, addPick, removeItem, setPickCustomVal,
  itemScore, tradeTotal, tradeVerdict, tradeReset,
}) {
  if (phase !== "done") {
    return (
      <div style={{textAlign:"center",padding:56,border:"1px dashed #1e2d3d",borderRadius:12}}>
        <div style={{fontSize:11,color:"#7a95ae",letterSpacing:2}}>SYNC DATA FIRST TO USE TRADE ANALYZER</div>
      </div>
    );
  }

  const verdict = tradeVerdict();
  const totA    = tradeTotal("A");
  const totB    = tradeTotal("B");
  const hasItems = tradeSideA.length > 0 || tradeSideB.length > 0;

  const panels = [
    { side:"A", label:"YOU GIVE", owner:tradeOwnerA, setOwner:setTradeOwnerA,
      items:tradeSideA, search:tradeSearchA, setSearch:setTradeSearchA,
      pickYr:tradePickYrA, setPickYr:setTradePickYrA,
      pickRd:tradePickRdA, setPickRd:setTradePickRdA, color:"#ef4444" },
    { side:"B", label:"YOU GET",  owner:tradeOwnerB, setOwner:setTradeOwnerB,
      items:tradeSideB, search:tradeSearchB, setSearch:setTradeSearchB,
      pickYr:tradePickYrB, setPickYr:setTradePickYrB,
      pickRd:tradePickRdB, setPickRd:setTradePickRdB, color:"#22c55e" },
  ];

  const selectStyle = {
    background:"#080d14", border:"1px solid #1e2d3d", color:"#e2e8f0",
    padding:"5px 5px", borderRadius:4, fontFamily:"inherit", fontSize:9, flex:1,
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:11,color:"#22c55e",letterSpacing:2,fontWeight:700}}>⇄ TRADE ANALYZER</div>
          <div style={{fontSize:9,color:"#4d6880",marginTop:2}}>Values are directional estimates · calibration in progress · picks use round averages</div>
        </div>
        <button onClick={tradeReset}
          style={{background:"#1e2d3d",color:"#7a95ae",border:"1px solid #374151",borderRadius:6,
            padding:"6px 12px",fontFamily:"inherit",fontSize:9,cursor:"pointer",letterSpacing:1}}>
          ↺ RESET
        </button>
      </div>

      {/* Verdict bar */}
      {hasItems && (
        <div style={{background:"#0a1118",border:`2px solid ${verdict.color}`,borderRadius:10,
          padding:"14px 20px",marginBottom:18,display:"flex",alignItems:"center",
          justifyContent:"space-between",flexWrap:"wrap",gap:12,
          boxShadow:`0 0 20px ${verdict.color}33`}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:900,color:"#e2e8f0"}}>{totA.toFixed(0)}</div>
              <div style={{fontSize:8,color:"#7a95ae",letterSpacing:1}}>YOU GIVE</div>
            </div>
            <div style={{fontSize:18,color:"#7a95ae"}}>⇄</div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:22,fontWeight:900,color:"#e2e8f0"}}>{totB.toFixed(0)}</div>
              <div style={{fontSize:8,color:"#7a95ae",letterSpacing:1}}>YOU GET</div>
            </div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:900,color:verdict.color,letterSpacing:2}}>{verdict.label}</div>
            <div style={{fontSize:9,color:"#7a95ae",marginTop:2}}>
              {verdict.diff > 0 ? `+${verdict.diff.toFixed(0)} in your favor`
               : verdict.diff < 0 ? `${verdict.diff.toFixed(0)} against you`
               : "Even value"}
            </div>
          </div>
          <div style={{fontSize:9,color:"#7a95ae",textAlign:"right"}}>
            {tradeSideA.filter(x => x.type==="player").length > 0 && (
              <div>GIVING avg age:{" "}
                <span style={{color:"#e2e8f0",fontWeight:700}}>
                  {(tradeSideA.filter(x=>x.type==="player").reduce((s,x)=>s+(x.age||0),0) /
                    tradeSideA.filter(x=>x.type==="player").length).toFixed(1)}
                </span>
              </div>
            )}
            {tradeSideB.filter(x => x.type==="player").length > 0 && (
              <div>GETTING avg age:{" "}
                <span style={{color:"#e2e8f0",fontWeight:700}}>
                  {(tradeSideB.filter(x=>x.type==="player").reduce((s,x)=>s+(x.age||0),0) /
                    tradeSideB.filter(x=>x.type==="player").length).toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two trade panels */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {panels.map(({ side, label, owner, setOwner, items, search, setSearch,
                       pickYr, setPickYr, pickRd, setPickRd, color }) => (
          <div key={side} style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:10,padding:14}}>

            {/* Panel header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:10,fontWeight:900,color,letterSpacing:2}}>{label}</span>
              <span style={{fontSize:14,fontWeight:900,color:"#e2e8f0"}}>
                {items.reduce((s,x) => s + itemScore(x), 0).toFixed(0)}
              </span>
            </div>

            {/* Owner picker */}
            <select value={owner} onChange={e => setOwner(e.target.value)}
              style={{width:"100%",background:"#080d14",border:"1px solid #1e2d3d",color:"#e2e8f0",
                padding:"6px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10,marginBottom:8}}>
              <option value="">— Select owner —</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
            </select>

            {/* Player search (only once owner selected) */}
            {owner && (
              <div style={{position:"relative",marginBottom:8}}>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search player..."
                  style={{width:"100%",boxSizing:"border-box",background:"#080d14",
                    border:"1px solid #1e2d3d",color:"#e2e8f0",padding:"6px 10px",
                    borderRadius:5,fontFamily:"inherit",fontSize:10}}/>
                {tradeSearchResults(owner, search).length > 0 && (
                  <div style={{position:"absolute",top:"100%",left:0,right:0,
                    background:"#0f1923",border:"1px solid #1e2d3d",borderRadius:5,
                    zIndex:100,maxHeight:180,overflowY:"auto"}}>
                    {tradeSearchResults(owner, search).map(p => {
                      const ts = TIER_STYLE[p.tier];
                      return (
                        <div key={p.pid} onClick={() => addPlayer(side, p)}
                          style={{padding:"7px 10px",cursor:"pointer",borderBottom:"1px solid #0f1923",
                            display:"flex",justifyContent:"space-between",alignItems:"center"}}
                          onMouseOver={e => e.currentTarget.style.background="#1e2d3d"}
                          onMouseOut={e  => e.currentTarget.style.background="transparent"}>
                          <div>
                            <span style={{fontSize:11,color:ts.text,fontWeight:700}}>{p.name}</span>
                            <span style={{fontSize:9,color:"#7a95ae",marginLeft:6}}>{p.pos} · {p.team} · {p.age}y</span>
                          </div>
                          <span style={{fontSize:11,fontWeight:900,color:ts.text}}>{p.score}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Pick adder */}
            <div style={{display:"flex",gap:5,marginBottom:10,alignItems:"center"}}>
              <select value={pickYr} onChange={e => setPickYr(Number(e.target.value))} style={selectStyle}>
                {PICK_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={pickRd} onChange={e => setPickRd(e.target.value)} style={selectStyle}>
                {PICK_ROUNDS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => addPick(side)}
                style={{background:"#1e2d3d",color:"#a8bccf",border:"1px solid #374151",
                  borderRadius:4,padding:"5px 8px",fontFamily:"inherit",fontSize:9,
                  cursor:"pointer",whiteSpace:"nowrap"}}>
                + PICK
              </button>
            </div>

            {/* Items list */}
            <div style={{display:"flex",flexDirection:"column",gap:5,minHeight:60}}>
              {items.length === 0 && (
                <div style={{fontSize:10,color:"#4d6880",padding:"10px 0",textAlign:"center"}}>
                  Add players or picks above
                </div>
              )}
              {items.map(item => {
                const ts = item.type === "player" ? TIER_STYLE[item.tier] : TIER_STYLE.Stash;
                return (
                  <div key={item.pid || item.id}
                    style={{background:ts.bg,border:`1px solid ${ts.border}`,borderRadius:6,
                      padding:"7px 10px",display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1}}>
                      {item.type === "player" && (
                        <>
                          <div style={{fontSize:11,fontWeight:700,color:ts.text}}>{item.name}</div>
                          <div style={{fontSize:9,color:"#7a95ae"}}>{item.pos} · {item.team} · {item.age}y</div>
                        </>
                      )}
                      {item.type === "pick" && (
                        <div style={{fontSize:11,fontWeight:700,color:"#a8bccf"}}>📋 {item.label}</div>
                      )}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:5}}>
                      {item.type === "pick" && (
                        <input type="number" min="0" max="150"
                          value={item.customVal ?? ""} placeholder={item.score}
                          onChange={e => setPickCustomVal(side, item.id, e.target.value)}
                          style={{width:42,background:"#080d14",border:"1px solid #1e2d3d",
                            color:"#f59e0b",padding:"3px 5px",borderRadius:3,
                            fontFamily:"inherit",fontSize:10,textAlign:"center"}}/>
                      )}
                      <span style={{fontSize:13,fontWeight:900,color:ts.text,minWidth:28,textAlign:"right"}}>
                        {itemScore(item).toFixed(0)}
                      </span>
                      <button onClick={() => removeItem(side, item.pid || item.id)}
                        style={{background:"none",border:"none",color:"#7a95ae",
                          fontSize:14,cursor:"pointer",padding:"0 2px",lineHeight:1}}>
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Position impact summary */}
      {(tradeSideA.some(x => x.type==="player") || tradeSideB.some(x => x.type==="player")) && (
        <div style={{marginTop:14,background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:8,padding:"12px 16px"}}>
          <div style={{fontSize:9,color:"#7a95ae",letterSpacing:1.5,marginBottom:8,fontWeight:700}}>POSITION IMPACT</div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
            {POS_ORDER.filter(pos =>
              [...tradeSideA, ...tradeSideB].filter(x => x.type==="player").some(x => x.pos===pos)
            ).map(pos => {
              const giving  = tradeSideA.filter(x => x.type==="player" && x.pos===pos);
              const getting = tradeSideB.filter(x => x.type==="player" && x.pos===pos);
              const netVal  = getting.reduce((s,x)=>s+x.score,0) - giving.reduce((s,x)=>s+x.score,0);
              return (
                <div key={pos} style={{textAlign:"center",minWidth:48}}>
                  <div style={{fontSize:9,color:"#60a5fa",fontWeight:700,marginBottom:3}}>{pos}</div>
                  {giving.length  > 0 && <div style={{fontSize:9,color:"#ef4444"}}>-{giving.map(x=>x.score).join(", ")}</div>}
                  {getting.length > 0 && <div style={{fontSize:9,color:"#22c55e"}}>+{getting.map(x=>x.score).join(", ")}</div>}
                  <div style={{fontSize:10,fontWeight:700,color:netVal>=0?"#22c55e":"#ef4444",
                    marginTop:2,borderTop:"1px solid #1e2d3d",paddingTop:2}}>
                    {netVal >= 0 ? "+" : ""}{netVal}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
