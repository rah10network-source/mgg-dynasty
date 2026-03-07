// ─── TEAM HUB ─────────────────────────────────────────────────────────────────
// v1.0.0 planned content:
//   • Your roster grade callout (moved from old Roster tab)
//   • Your players filtered from Rankings — your team only
//   • Your transaction history
//   • Trade & waiver targets (top 5 BUY signals you don't own)
//   • Sell-high alerts from your roster
import { gradeRoster } from "./Roster";
import { POS_ORDER } from "../constants";

export function TeamHub({ phase, players, owners, currentOwner }) {
  const planned = [
    { icon: "◎", title: "My Roster Grade",        desc: "Your letter grade, win window, and positional depth — moved from League Hub" },
    { icon: "◈", title: "My Players",              desc: "Your roster filtered from Rankings with full sort/filter/detail expand" },
    { icon: "⇄", title: "Trade & Waiver Targets",  desc: "Top 5 BUY-signal players you don't own, sorted by gap vs your weakest positions" },
    { icon: "⚑", title: "Sell-High Alerts",        desc: "Your players flagged SELL or WATCH who have peak value right now" },
    { icon: "▸", title: "My Transactions",          desc: "Your adds, drops, and trades from this season with value context" },
  ];

  // Show current roster grade preview if data is available
  const myGrade = phase === "done" && currentOwner
    ? gradeRoster(currentOwner, players)
    : null;

  return (
    <div>
      {/* Current data preview — show roster grade if we have it */}
      {myGrade && (
        <div style={{
          background:"#0a1118",border:"2px solid #22c55e",borderRadius:12,
          padding:"16px 20px",marginBottom:20,
          boxShadow:"0 0 20px rgba(34,197,94,0.15)",
        }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div>
              <div style={{fontSize:8,color:"#22c55e",letterSpacing:2,marginBottom:4,fontWeight:700}}>
                YOUR ROSTER — {currentOwner.toUpperCase()}
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:10}}>
                <span style={{fontSize:48,fontWeight:900,color:myGrade.gradeColor,lineHeight:1}}>
                  {myGrade.grade}
                </span>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:myGrade.windowColor,letterSpacing:2}}>
                    {myGrade.window}
                  </div>
                  <div style={{fontSize:10,color:"#7a95ae"}}>
                    #{owners.filter(o => {
                      const g = gradeRoster(o, players);
                      return g && g.contenderScore >= myGrade.contenderScore;
                    }).length} of {owners.length} teams
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
                    <span>{pos}</span><span style={{color:col}}>{dep.avg.toFixed(0)}</span>
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

      {/* Planned panels */}
      <div style={{
        background:"linear-gradient(135deg,#0c1e35,#0f1923)",
        border:"1px solid #1e2d3d",borderRadius:12,
        padding:"20px 24px",marginBottom:20,
        display:"flex",alignItems:"center",gap:16,
      }}>
        <div style={{
          width:44,height:44,borderRadius:10,flexShrink:0,
          background:"#0ea5e922",border:"1px solid #0ea5e944",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,
        }}>⬡</div>
        <div>
          <div style={{fontSize:13,fontWeight:900,letterSpacing:3,color:"#0ea5e9",marginBottom:4}}>TEAM HUB</div>
          <div style={{fontSize:9,color:"#4d6880",lineHeight:1.7}}>
            Full build coming in <span style={{color:"#f59e0b",fontWeight:700}}>v1.0.0</span> · 
            {phase === "done" && currentOwner
              ? <span style={{color:"#22c55e"}}> roster grade shown above — rest of the panels below are next</span>
              : <span style={{color:"#7a95ae"}}> sync data and set your owner identity to activate</span>}
          </div>
        </div>
      </div>

      <div style={{fontSize:9,color:"#4d6880",letterSpacing:2,fontWeight:700,marginBottom:12}}>
        PLANNED PANELS
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
        {planned.map(({ icon, title, desc }) => (
          <div key={title} style={{
            background:"#0a1118",border:"1px dashed #1e2d3d",
            borderRadius:10,padding:"14px 16px",opacity:0.7,
          }}>
            <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:7}}>
              <span style={{fontSize:15,color:"#0ea5e9"}}>{icon}</span>
              <span style={{fontSize:11,fontWeight:700,color:"#e2e8f0",letterSpacing:1}}>{title}</span>
            </div>
            <div style={{fontSize:10,color:"#4d6880",lineHeight:1.6}}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
