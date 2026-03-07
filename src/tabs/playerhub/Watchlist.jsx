// ─── WATCHLIST (Player Hub sub-tab) ──────────────────────────────────────────
// Manual player watchlist with deep analysis via ESPN headlines + Sleeper data.
// User adds player names, runs research, approves results into manual situations.
import { TIER_STYLE, SIG_COLORS, SITUATION_FLAGS } from "../../constants";

export function Watchlist({
  watchlist, watchInput, setWatchInput,
  watchAdd, watchRemove,
  researchResults, researchRunning,
  runWatchlistResearch, approveResult, rejectResult,
  players,
}) {
  return (
    <div>
      {/* Header */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,color:"#f59e0b",letterSpacing:2,fontWeight:700,marginBottom:4}}>
          ◈ DEEP RESEARCH WATCHLIST
        </div>
        <div style={{fontSize:9,color:"#4d6880",lineHeight:1.7}}>
          Add players by name · click ◈ RESEARCH ALL to scan ESPN headlines and Sleeper trends<br/>
          Approve results to save them as Manual Situations, which apply on every sync
        </div>
      </div>

      {/* Input row */}
      <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center"}}>
        <input
          value={watchInput}
          onChange={e => setWatchInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && watchAdd()}
          placeholder="Player name (exact, e.g. Ja'Marr Chase)..."
          style={{flex:1,background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
            padding:"7px 12px",borderRadius:6,fontSize:11,fontFamily:"monospace"}}
        />
        <button onClick={watchAdd}
          style={{background:"#1e2d3d",color:"#e2e8f0",border:"1px solid #374151",
            borderRadius:6,padding:"7px 14px",fontFamily:"inherit",
            fontSize:10,cursor:"pointer",letterSpacing:1,whiteSpace:"nowrap"}}>
          + ADD
        </button>
        {watchlist.length > 0 && (
          <button
            onClick={runWatchlistResearch}
            disabled={researchRunning}
            style={{
              background: researchRunning
                ? "#1e2d3d"
                : "linear-gradient(135deg,#f59e0b,#d97706)",
              color: researchRunning ? "#4b6580" : "#080d14",
              border: "none", borderRadius: 6,
              padding: "7px 16px", fontFamily: "inherit",
              fontWeight: 900, fontSize: 10,
              cursor: researchRunning ? "not-allowed" : "pointer",
              letterSpacing: 1.5, whiteSpace: "nowrap",
            }}>
            {researchRunning ? "◌ RESEARCHING..." : "◈ RESEARCH ALL"}
          </button>
        )}
      </div>

      {/* Empty state */}
      {watchlist.length === 0 && (
        <div style={{textAlign:"center",padding:"32px 0",color:"#4d6880",fontSize:10,
          border:"1px dashed #1e2d3d",borderRadius:8}}>
          No players on watchlist — add a name above to get started
        </div>
      )}

      {/* Watchlist cards */}
      {watchlist.length > 0 && (
        <div style={{display:"grid",gap:8}}>
          {watchlist.map(name => {
            const r  = researchResults[name];
            const sf = r?.flag ? SITUATION_FLAGS[r.flag] : null;
            const p  = players.find(pl => pl.name === name);
            const borderColor = r?.approved ? "#22c55e"
                              : r?.status === "done" ? "#f59e0b"
                              : "#1e2d3d";

            return (
              <div key={name}
                style={{background:"#0a1118",borderRadius:8,padding:"12px 16px",
                  border:`1px solid ${borderColor}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                  <div style={{flex:1}}>
                    {/* Name row */}
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{fontWeight:900,color:"#e2e8f0",fontSize:13}}>{name}</span>
                      {p && (
                        <span style={{fontSize:9,color:"#7a95ae"}}>
                          {p.pos} · {p.team} · {p.age}y · {p.owner}
                        </span>
                      )}
                      {!p && (
                        <span style={{fontSize:9,color:"#4d6880"}}>not on a roster</span>
                      )}
                      {r?.approved && (
                        <span style={{fontSize:8,background:"#0f2b1a",color:"#22c55e",
                          border:"1px solid #22c55e44",borderRadius:3,
                          padding:"1px 5px",fontWeight:700}}>
                          ✓ SAVED TO SITUATIONS
                        </span>
                      )}
                    </div>

                    {/* States */}
                    {!r && (
                      <div style={{fontSize:10,color:"#4d6880"}}>
                        Not yet researched — click ◈ RESEARCH ALL
                      </div>
                    )}
                    {r?.status === "loading" && (
                      <div style={{fontSize:10,color:"#f59e0b"}}>◌ Scanning headlines...</div>
                    )}
                    {r?.status === "error" && (
                      <div style={{fontSize:10,color:"#ef4444"}}>⚠ {r.error}</div>
                    )}
                    {r?.status === "done" && !r.approved && (
                      <div>
                        {/* Signal + flag row */}
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                          {sf && (
                            <span style={{fontSize:9,background:sf.color+"22",color:sf.color,
                              border:`1px solid ${sf.color}66`,borderRadius:3,
                              padding:"2px 6px",fontWeight:700,letterSpacing:0.5}}>
                              {sf.label}
                            </span>
                          )}
                          <span style={{fontSize:9,background:SIG_COLORS[r.signal]||"#4b6580",
                            color:"#080d14",borderRadius:3,padding:"2px 6px",fontWeight:900}}>
                            {r.signal}
                          </span>
                          {sf && (
                            <span style={{fontSize:9,color:"#7a95ae"}}>{sf.desc}</span>
                          )}
                        </div>
                        {/* Note + reasoning */}
                        <div style={{fontSize:11,color:"#e2e8f0",marginBottom:3,lineHeight:1.5}}>
                          {r.note}
                        </div>
                        <div style={{fontSize:10,color:"#7a95ae",fontStyle:"italic",marginBottom:8,lineHeight:1.4}}>
                          {r.reasoning}
                        </div>
                        {/* Actions */}
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={() => approveResult(name)}
                            style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#080d14",
                              border:"none",borderRadius:5,padding:"5px 14px",fontFamily:"inherit",
                              fontWeight:900,fontSize:10,cursor:"pointer",letterSpacing:1}}>
                            ✓ APPROVE & SAVE
                          </button>
                          <button onClick={() => rejectResult(name)}
                            style={{background:"#1a0505",color:"#ef4444",border:"1px solid #3d1515",
                              borderRadius:5,padding:"5px 10px",fontFamily:"inherit",
                              fontSize:10,cursor:"pointer"}}>
                            ✕ DISMISS
                          </button>
                        </div>
                      </div>
                    )}
                    {r?.status === "done" && r.approved && (
                      <div style={{fontSize:10,color:"#22c55e",lineHeight:1.5}}>
                        {sf && <span style={{fontWeight:700}}>{sf.label} · </span>}
                        {r.note}
                      </div>
                    )}
                  </div>

                  {/* Remove button */}
                  <button onClick={() => watchRemove(name)}
                    style={{background:"none",color:"#4d6880",border:"none",
                      fontSize:14,cursor:"pointer",padding:"0 4px",flexShrink:0}}>
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
