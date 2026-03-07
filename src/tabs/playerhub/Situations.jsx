// ─── SITUATIONS (Player Hub sub-tab) ─────────────────────────────────────────
// Manage manual player situation flags that modify dynasty scores on every sync.
import { SITUATION_FLAGS, MANUAL_SITUATIONS } from "../../constants";

export function Situations({
  manualSits,
  sitEditName, setSitEditName,
  sitEditFlag, setSitEditFlag,
  sitEditNote, setSitEditNote,
  sitEditGames, setSitEditGames,
  sitEditing, setSitEditing,
  sitAdd, sitRemove, sitStartEdit, sitResetDefaults,
}) {
  const inputStyle = {
    background:"#080d14", border:"1px solid #1e2d3d", color:"#e2e8f0",
    padding:"6px 10px", borderRadius:4, fontSize:11, fontFamily:"monospace",
  };

  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontSize:11,color:"#22c55e",letterSpacing:2,fontWeight:700,marginBottom:2}}>
            ⚑ MANUAL SITUATIONS
          </div>
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
              onChange={e => setSitEditNote(e.target.value.slice(0,120))}
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
              ? "(17−N)/17 of current score"
              : Math.round(SITUATION_FLAGS[sitEditFlag].impact * 100) + "%"}
          </div>
        )}
      </div>

      {/* Situations table */}
      {Object.keys(manualSits).length === 0 ? (
        <div style={{color:"#4d6880",fontSize:11,padding:20,textAlign:"center"}}>
          No situations configured. Add one above or reset to defaults.
        </div>
      ) : (
        <div style={{borderRadius:8,border:"1px solid #1e2d3d",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {[["PLAYER",220],["FLAG",100],["NOTE","auto"],["GAMES",60],["IMPACT",90],["",80]].map(([h,w]) => (
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
                  ? `-${100 - Math.round((17-(sit.games||6))/17*100)}%`
                  : sf ? (sf.impact>0?"+":"") + Math.round(sf.impact*100) + "%" : "0%";
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
      )}
      <div style={{marginTop:10,fontSize:9,color:"#4d6880",lineHeight:1.7}}>
        Changes apply on next ⟳ SYNC · AGE_CLIFF auto-derived from age curves · use Watchlist tab for deep research
      </div>
    </div>
  );
}
