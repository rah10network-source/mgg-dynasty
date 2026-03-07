// ─── FA DATABASE (Player Hub sub-tab) ────────────────────────────────────────
// Browse unrostered NFL players, filter by position/team/age/injury,
// and add to your scored FA Watchlist.
import { TIER_STYLE, INJ_COLOR, SITUATION_FLAGS, POS_ORDER } from "../../constants";

export function FADatabase({
  nflDb,
  faSearch, setFaSearch,
  faPosFilter, setFaPosFilter,
  faTeamFilter, setFaTeamFilter,
  faAgeMin, setFaAgeMin,
  faAgeMax, setFaAgeMax,
  faHideInj, setFaHideInj,
  faResults, faTeams, faWatchlist,
  addToFaWatchlist, removeFromFaWatchlist,
}) {
  if (Object.keys(nflDb).length === 0) {
    return (
      <div style={{textAlign:"center",padding:48,border:"1px dashed #1e2d3d",borderRadius:12}}>
        <div style={{fontSize:11,color:"#7a95ae",letterSpacing:2}}>SYNC DATA FIRST TO BROWSE FREE AGENTS</div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Filters ───────────────────────────────────────────────────────── */}
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

      {/* ── FA Browser Table ───────────────────────────────────────────────── */}
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

      {/* ── Watchlist scored cards ─────────────────────────────────────────── */}
      <div style={{fontSize:9,color:"#f59e0b",letterSpacing:2,fontWeight:700,marginBottom:10}}>
        ◎ YOUR FA WATCHLIST — SCORED
      </div>
      {faWatchlist.length > 0 ? (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
          {[...faWatchlist].sort((a,b) => b.score-a.score).map(p => {
            const ts = TIER_STYLE[p.tier];
            const sf = p.situationFlag && SITUATION_FLAGS[p.situationFlag];
            return (
              <div key={p.pid} style={{background:ts.bg,border:`1px solid ${ts.border}`,borderRadius:8,
                padding:"10px 12px",position:"relative",boxShadow:`0 0 6px ${ts.glow}`}}>
                <button onClick={() => removeFromFaWatchlist(p.pid)}
                  style={{position:"absolute",top:6,right:8,background:"none",
                    border:"none",color:"#4d6880",fontSize:12,cursor:"pointer",padding:0}}>✕</button>
                <div style={{fontSize:8,color:ts.text,letterSpacing:1,marginBottom:2}}>{p.tier.toUpperCase()}</div>
                <div style={{fontWeight:900,color:"#e2e8f0",fontSize:13,marginBottom:2,paddingRight:14}}>{p.name}</div>
                <div style={{fontSize:10,color:"#7a95ae"}}>{p.pos} · {p.team} · {p.age||"?"}y</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:6}}>
                  <span style={{fontSize:20,fontWeight:900,color:ts.text,textShadow:`0 0 8px ${ts.glow}`}}>{p.score}</span>
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
      ) : (
        <div style={{textAlign:"center",padding:"24px 0",color:"#4d6880",fontSize:10}}>
          Your watchlist is empty — add players from the table above with + WATCH
        </div>
      )}
    </div>
  );
}
