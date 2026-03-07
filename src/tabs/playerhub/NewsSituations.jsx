import { TIER_STYLE, SIG_COLORS, SIT_ICONS, SITUATION_FLAGS } from "../../constants";

export function NewsSituations({ newsPhase, newsMap, players, onRunIntel }) {
  return (
    <div>
      {newsPhase === "idle" && players.length > 0 && (
        <div style={{textAlign:"center",padding:56,border:"1px dashed #1e2d3d",borderRadius:12}}>
          <div style={{fontSize:12,color:"#7a95ae",letterSpacing:2,marginBottom:10}}>INTEL SCAN NOT RUN</div>
          <div style={{fontSize:11,color:"#4d6880",marginBottom:22,lineHeight:1.8}}>
            Pulls ESPN news feed + Sleeper injury/depth data · all rostered skill players<br/>
            Injury status · depth chart · age curve · BUY/SELL/HOLD signals · no API key needed
          </div>
          <button onClick={onRunIntel}
            style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"#080d14",
              border:"none",borderRadius:8,padding:"10px 26px",fontFamily:"inherit",
              fontWeight:900,fontSize:11,letterSpacing:2,cursor:"pointer"}}>
            ◈ RUN INTEL SCAN
          </button>
        </div>
      )}

      {newsPhase === "loading" && (
        <div style={{padding:40,textAlign:"center",color:"#f59e0b",letterSpacing:2,fontSize:11}}>
          ◌ SCANNING NFL NEWS...
        </div>
      )}

      {newsPhase === "error" && (
        <div style={{padding:20,color:"#ef4444",fontSize:11}}>Intel scan failed. Try again.</div>
      )}

      {Object.keys(newsMap).length > 0 && (
        <div style={{display:"grid",gap:10}}>
          {Object.entries(newsMap).map(([name, nr]) => {
            const p  = players.find(pl => pl.name === name);
            const ts = p ? TIER_STYLE[p.tier] : TIER_STYLE.Stash;
            const sf = nr.situationFlag && SITUATION_FLAGS[nr.situationFlag];
            return (
              <div key={name}
                style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:8,
                  padding:"13px 17px",display:"flex",gap:14,alignItems:"flex-start"}}>
                {/* Score badge */}
                <div style={{background:ts.bg,border:`1px solid ${ts.border}`,borderRadius:6,
                  padding:"7px 11px",textAlign:"center",minWidth:50,flexShrink:0}}>
                  <div style={{fontSize:18,fontWeight:900,color:ts.text}}>{p?.score ?? '—'}</div>
                  <div style={{fontSize:8,color:ts.text,letterSpacing:1}}>{p?.tier||'—'}</div>
                </div>
                {/* Intel body */}
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:4,flexWrap:"wrap"}}>
                    <span style={{fontWeight:900,color:"#e2e8f0",fontSize:14}}>{name}</span>
                    {p && <span style={{fontSize:10,color:"#7a95ae"}}>{p.pos} · {p.team} · {p.owner}</span>}
                    <span style={{background:SIG_COLORS[nr.signal]||"#4b6580",color:"#080d14",
                      fontSize:9,fontWeight:900,borderRadius:4,padding:"2px 7px",letterSpacing:1}}>
                      {nr.signal}
                    </span>
                    <span style={{fontSize:10,color:nr.status==="Starter"?"#22c55e":nr.status==="Injured"?"#ef4444":"#f59e0b"}}>
                      {nr.status} {SIT_ICONS[nr.situation]||""}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:"#a8bccf",lineHeight:1.6}}>{nr.note}</div>
                  {sf && (
                    <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:9,background:sf.color+"22",color:sf.color,
                        border:`1px solid ${sf.color}66`,borderRadius:3,
                        padding:"2px 6px",fontWeight:700,letterSpacing:1}}>
                        {sf.label}
                      </span>
                      <span style={{fontSize:10,color:"#7a95ae"}}>{nr.situationNote}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
