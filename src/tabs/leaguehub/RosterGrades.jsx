// ─── ROSTER GRADES (League Hub sub-tab) ──────────────────────────────────────
// Shows the full league leaderboard only.
// The "Your Roster" personal callout lives in Team Hub.
import { POS_ORDER } from "../../constants";
import { gradeRoster } from "../Roster";

export function RosterGrades({ phase, players, owners, currentOwner }) {
  if (phase !== "done") {
    return (
      <div style={{textAlign:"center",padding:56,border:"1px dashed #1e2d3d",borderRadius:12}}>
        <div style={{fontSize:11,color:"#7a95ae",letterSpacing:2}}>SYNC DATA FIRST TO GRADE ROSTERS</div>
      </div>
    );
  }

  const ownerGrades = owners
    .map(owner => gradeRoster(owner, players))
    .filter(Boolean)
    .sort((a,b) => b.contenderScore - a.contenderScore);

  return (
    <div>
      {/* League leaderboard */}
      <div style={{fontSize:9,color:"#7a95ae",letterSpacing:2,fontWeight:700,marginBottom:10}}>
        LEAGUE ROSTER GRADES
      </div>
      <div style={{borderRadius:8,border:"1px solid #1e2d3d",overflow:"hidden",marginBottom:20}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {[["#",32],["TEAM",180],["GRD",50],["WINDOW",90],["AVG",55],["ELITE",55],["STR",50],["AVG AGE",65],["CLIFF",55],["INJ",45]].map(([h,w]) => (
                <th key={h} style={{padding:"7px 8px",background:"#0c151e",color:"#7a95ae",
                  fontSize:9,letterSpacing:1.5,fontWeight:700,textAlign:"center",
                  borderRight:"1px solid #1e2d3d",width:w}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ownerGrades.map((g, i) => {
              const isMe = g.owner === currentOwner;
              return (
                <tr key={g.owner} style={{background:isMe?"#0f2b1a":i%2===0?"#080d14":"#0a1118"}}>
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:9,color:"#4d6880"}}>{i+1}</td>
                  <td style={{padding:"8px 10px",borderBottom:"1px solid #0f1923",fontWeight:isMe?900:600,color:isMe?"#22c55e":"#e2e8f0",fontSize:11}}>
                    {g.owner}{isMe && <span style={{fontSize:7,color:"#22c55e",marginLeft:5}}>YOU</span>}
                  </td>
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #0f1923"}}>
                    <span style={{fontSize:14,fontWeight:900,color:g.gradeColor}}>{g.grade}</span>
                  </td>
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #0f1923"}}>
                    <span style={{fontSize:8,background:g.windowColor+"22",color:g.windowColor,
                      border:`1px solid ${g.windowColor}44`,borderRadius:3,
                      padding:"2px 6px",fontWeight:700,letterSpacing:1}}>
                      {g.window}
                    </span>
                  </td>
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:11,color:"#e2e8f0",fontWeight:700}}>{g.avgScore.toFixed(1)}</td>
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:11,color:"#22c55e",fontWeight:700}}>{g.eliteCount}</td>
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:11,color:"#60a5fa"}}>{g.starterCnt}</td>
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:11,color:"#f59e0b"}}>{g.avgAge.toFixed(1)}</td>
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:11,color:g.cliffCnt>2?"#f97316":"#4b6580"}}>{g.cliffCnt}</td>
                  <td style={{padding:"8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:11,color:g.injCnt>0?"#ef4444":"#4b6580"}}>{g.injCnt}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Window legend */}
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {[
          ["REBUILD",   "#60a5fa", "Avg age <25 · building through youth"],
          ["RISING",    "#22c55e", "Avg age 25-27 · ascending window"],
          ["CONTEND",   "#f59e0b", "Avg age 27-29 · competitive now"],
          ["WIN NOW",   "#ef4444", "Avg age 29-31 · peak window closing"],
          ["DECLINING", "#6b7280", "Avg age 31+ · transition needed"],
        ].map(([w, c, desc]) => (
          <div key={w} style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:8,background:c+"22",color:c,border:`1px solid ${c}44`,
              borderRadius:3,padding:"2px 6px",fontWeight:700,letterSpacing:1}}>{w}</span>
            <span style={{fontSize:9,color:"#4d6880"}}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
