import { TIER_STYLE, INJ_COLOR, SIG_COLORS, POS_ORDER, pv } from "../constants";

export function Positions({ players, newsMap, setDetail, setTab, viewMode="dynasty" }) {
  return (
    <>
      {POS_ORDER.map(pos => {
        const pp = players.filter(p => p.pos === pos);
        if (!pp.length) return null;
        return (
          <div key={pos} style={{marginBottom:26}}>
            <div style={{display:"flex",alignItems:"center",gap:12,
              borderBottom:"1px solid #1e2d3d",paddingBottom:7,marginBottom:12}}>
              <span style={{background:"#0f2b1a",border:"1px solid #1e3a2a",borderRadius:6,
                padding:"3px 13px",fontSize:13,fontWeight:900,color:"#22c55e",letterSpacing:2}}>
                {pos}
              </span>
              <span style={{fontSize:9,color:"#4d6880",letterSpacing:1}}>
                {pp.length} ROSTERED · AVG {Math.round(pp.reduce((s,p) => s+pv(p,viewMode), 0) / pp.length)}
              </span>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {pp.map((p, i) => {
                const ts = TIER_STYLE[p.tier];
                const nr = newsMap[p.name];
                return (
                  <div key={p.pid}
                    onClick={() => { setDetail(p); setTab("board"); }}
                    style={{background:ts.bg,border:`1px solid ${ts.border}`,borderRadius:8,
                      padding:"10px 13px",minWidth:160,cursor:"pointer",boxShadow:`0 0 6px ${ts.glow}`}}>
                    <div style={{fontSize:8,color:ts.text,letterSpacing:1.5,marginBottom:2}}>
                      #{i+1} {p.tier.toUpperCase()}
                    </div>
                    <div style={{fontWeight:900,color:"#e2e8f0",fontSize:13}}>{p.name}</div>
                    <div style={{fontSize:10,color:"#7a95ae",marginTop:2}}>
                      {p.team} · {p.age} · <span style={{color:ts.text,fontWeight:700}}>{pv(p,viewMode)}</span>
                    </div>
                    {p.depthOrder && (
                      <div style={{fontSize:9,color:p.depthOrder===1?"#22c55e":"#f59e0b",marginTop:2}}>
                        Depth #{p.depthOrder}
                        {p.gamesStarted != null ? ` · ${p.gamesStarted}GS` : ""}
                        {p.ppg != null ? ` · ${p.ppg}PPG` : ""}
                      </div>
                    )}
                    {p.injStatus && (
                      <div style={{fontSize:9,color:INJ_COLOR[p.injStatus]||"#ef4444",marginTop:2,fontWeight:700}}>
                        ⚠ {p.injStatus}
                      </div>
                    )}
                    {nr && (
                      <span style={{fontSize:8,background:SIG_COLORS[nr.signal],color:"#080d14",
                        borderRadius:3,padding:"1px 5px",marginTop:4,display:"inline-block",fontWeight:900}}>
                        {nr.signal}
                      </span>
                    )}
                    <div style={{fontSize:9,color:"#4d6880",marginTop:3}}>{p.owner}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </>
  );
}
