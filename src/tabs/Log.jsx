export function Log({ progress }) {
  return (
    <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:8,padding:18}}>
      <div style={{fontSize:9,color:"#22c55e",letterSpacing:2,marginBottom:10,fontWeight:700}}>▸ SYNC LOG</div>
      {progress.length === 0
        ? <div style={{color:"#4d6880",fontSize:11}}>No sync run yet.</div>
        : progress.map((e, i) => (
            <div key={i} style={{fontSize:11,padding:"3px 0",borderBottom:"1px solid #0f1923",
              color: e.type==="success" ? "#22c55e"
                   : e.type==="error"   ? "#ef4444"
                   : e.type==="done"    ? "#0ea5e9"
                   : "#7a95ae"}}>
              <span style={{color:"#4d6880",marginRight:8,fontSize:9}}>{e.ts}</span>
              {e.msg}
            </div>
          ))
      }
    </div>
  );
}
