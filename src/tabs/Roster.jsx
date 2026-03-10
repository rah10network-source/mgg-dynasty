import { POS_ORDER } from "../constants";

// ── Roster grade logic ────────────────────────────────────────────────────────
// Pure function — takes a list of players for one owner, returns a grade object.
export function gradeRoster(owner, players) {
  const roster     = players.filter(p => p.owner === owner);
  if (!roster.length) return null;

  const scores     = roster.map(p => p.dynastyValue);
  const avgScore   = scores.reduce((a,b) => a+b, 0) / scores.length;
  const topScore   = Math.max(...scores);
  const eliteCount = roster.filter(p => p.tier === "Elite").length;
  const starterCnt = roster.filter(p => p.tier === "Starter").length;
  const ages       = roster.map(p => p.age).filter(Boolean);
  const avgAge     = ages.length ? ages.reduce((a,b) => a+b, 0) / ages.length : 0;
  const cliffCnt   = roster.filter(p => p.situationFlag === "AGE_CLIFF").length;
  const injCnt     = roster.filter(p => ["Out","IR","PUP"].includes(p.injStatus)).length;

  const posDep = {};
  POS_ORDER.forEach(pos => {
    const pp = roster.filter(p => p.pos === pos).sort((a,b) => b.dynastyValue - a.dynastyValue);
    posDep[pos] = {
      count: pp.length,
      top:   pp[0]?.dynastyValue || 0,
      avg:   pp.length ? pp.reduce((s,p) => s+p.dynastyValue, 0) / pp.length : 0,
    };
  });

  const contenderScore = Math.round(
    topScore  * 0.25 +
    avgScore  * 0.30 +
    eliteCount * 6  +
    starterCnt * 2  +
    Math.max(0, 35 - avgAge) * 1.2
  );

  const window = avgAge < 25   ? "REBUILD"
               : avgAge < 27.5 ? "RISING"
               : avgAge < 29.5 ? "CONTEND"
               : avgAge < 31   ? "WIN NOW"
               :                 "DECLINING";

  const windowColor = {
    REBUILD:"#60a5fa", RISING:"#22c55e",
    CONTEND:"#f59e0b", "WIN NOW":"#ef4444", DECLINING:"#6b7280",
  }[window];

  const grade = contenderScore >= 110 ? "A+"
              : contenderScore >= 95  ? "A"
              : contenderScore >= 80  ? "B+"
              : contenderScore >= 65  ? "B"
              : contenderScore >= 50  ? "C+"
              : contenderScore >= 35  ? "C"
              : "D";

  const gradeColor = grade.startsWith("A") ? "#22c55e"
                   : grade.startsWith("B") ? "#60a5fa"
                   : grade.startsWith("C") ? "#f59e0b"
                   : "#ef4444";

  return { owner, roster, avgScore, topScore, eliteCount, starterCnt,
           avgAge, cliffCnt, injCnt, posDep, contenderScore,
           window, windowColor, grade, gradeColor };
}

// ── Roster tab component ──────────────────────────────────────────────────────
export function Roster({ phase, players, owners, currentOwner }) {
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

  const myGrade = ownerGrades.find(g => g.owner === currentOwner);

  return (
    <div>
      {/* ── My Roster callout ──────────────────────────────────────────────── */}
      {myGrade && (
        <div style={{background:"#0a1118",border:"2px solid #22c55e",borderRadius:12,
          padding:"16px 20px",marginBottom:20,
          boxShadow:"0 0 20px rgba(34,197,94,0.15)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:8,color:"#22c55e",letterSpacing:2,marginBottom:4,fontWeight:700}}>
                YOUR ROSTER — {currentOwner.toUpperCase()}
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                <span style={{fontSize:48,fontWeight:900,color:myGrade.gradeColor,lineHeight:1}}>{myGrade.grade}</span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:myGrade.windowColor,letterSpacing:2}}>{myGrade.window}</div>
                  <div style={{fontSize:10,color:"#7a95ae"}}>
                    #{ownerGrades.findIndex(g => g.owner === currentOwner) + 1} of {ownerGrades.length} teams
                  </div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              {[
                ["AVG SCORE", myGrade.avgScore.toFixed(1), "#e2e8f0"],
                ["ELITE",     myGrade.eliteCount,          "#22c55e"],
                ["STARTERS",  myGrade.starterCnt,          "#60a5fa"],
                ["AVG AGE",   myGrade.avgAge.toFixed(1),   "#f59e0b"],
                ["ON CLIFF",  myGrade.cliffCnt,            "#f97316"],
                ["INJURED",   myGrade.injCnt,              "#ef4444"],
              ].map(([k,v,c]) => (
                <div key={k} style={{textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:900,color:c}}>{v}</div>
                  <div style={{fontSize:7,color:"#7a95ae",letterSpacing:1}}>{k}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Position depth bars */}
          <div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
            {POS_ORDER.map(pos => {
              const dep = myGrade.posDep[pos];
              if (!dep.count) return null;
              const fill = Math.min(100, dep.avg);
              const col  = dep.avg>=70?"#22c55e":dep.avg>=45?"#60a5fa":dep.avg>=25?"#f59e0b":"#ef4444";
              return (
                <div key={pos} style={{flex:"1 1 60px",minWidth:50}}>
                  <div style={{fontSize:8,color:"#7a95ae",marginBottom:3,letterSpacing:1,
                    display:"flex",justifyContent:"space-between"}}>
                    <span>{pos}</span>
                    <span style={{color:col}}>{dep.avg.toFixed(0)}</span>
                  </div>
                  <div style={{height:4,background:"#1e2d3d",borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${fill}%`,background:col,borderRadius:2}}/>
                  </div>
                  <div style={{fontSize:7,color:"#4d6880",marginTop:2}}>{dep.count} players</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── League leaderboard ─────────────────────────────────────────────── */}
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

      {/* ── Window legend ──────────────────────────────────────────────────── */}
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
