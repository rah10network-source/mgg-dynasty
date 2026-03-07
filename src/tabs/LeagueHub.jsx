import { useState } from "react";
import { PositionRankings } from "./leaguehub/PositionRankings";
import { RosterGrades }     from "./leaguehub/RosterGrades";

const SUB_TABS = [
  ["positions", "⬡ POSITION RANKINGS"],
  ["rosters",   "◈ ROSTER GRADES"],
  ["standings", "▸ STANDINGS"],
];

export function LeagueHub({ phase, players, owners, currentOwner, newsMap, setDetail, setActiveTab, seasonState }) {
  const [sub, setSub] = useState("positions");

  const isInSzn = ["inseason","playoffs"].includes(seasonState?.mode);

  const tabBtn = (id, lbl) => (
    <button key={id} onClick={() => setSub(id)} style={{
      background: "none", border: "none",
      borderBottom: sub===id ? "2px solid #0ea5e9" : "2px solid transparent",
      color:        sub===id ? "#0ea5e9" : "#4b6580",
      padding: "6px 16px", fontFamily: "inherit",
      fontSize: 10, letterSpacing: 2, fontWeight: 700, cursor: "pointer",
    }}>{lbl}</button>
  );

  return (
    <div>
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #1e2d3d",marginBottom:20}}>
        {SUB_TABS.map(([id, lbl]) => tabBtn(id, lbl))}
      </div>

      {sub === "positions" && (
        <PositionRankings
          players={players}
          newsMap={newsMap}
          setDetail={setDetail}
          setActiveTab={setActiveTab}
        />
      )}

      {sub === "rosters" && (
        <RosterGrades
          phase={phase}
          players={players}
          owners={owners}
          currentOwner={currentOwner}
        />
      )}

      {sub === "standings" && (
        <div>
          {isInSzn ? (
            // ── In-season: standings stub ──────────────────────────────────
            <div style={{textAlign:"center",padding:56,
              border:"1px solid #22c55e33",borderRadius:12,background:"#0a1118"}}>
              <div style={{fontSize:11,color:"#22c55e",letterSpacing:2,fontWeight:700,marginBottom:8}}>
                IN-SEASON STANDINGS
              </div>
              <div style={{fontSize:10,color:"#4d6880",maxWidth:400,margin:"0 auto",lineHeight:1.8}}>
                Week {seasonState?.currentWeek || "?"} · {seasonState?.season} Season<br/>
                <span style={{color:"#7a95ae"}}>Official W/L + PF/PA from Sleeper</span> and{" "}
                <span style={{color:"#f59e0b"}}>Dynasty Power Rankings</span> overlay<br/>
                — coming in the in-season build
              </div>
              <div style={{marginTop:20,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                {["Official Standings · W/L · PF · PA · Streak",
                  "Dynasty Power Rankings · who should be winning",
                  "Luck Index · actual vs expected W/L by points",
                ].map(s => (
                  <div key={s} style={{fontSize:9,color:"#4d6880",background:"#0f1923",
                    border:"1px dashed #1e2d3d",borderRadius:6,padding:"6px 12px"}}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // ── Offseason: dynasty power rankings as standings proxy ──────
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                <div style={{fontSize:11,color:"#4b6580",letterSpacing:2,fontWeight:700}}>
                  DYNASTY POWER RANKINGS
                </div>
                <div style={{fontSize:9,color:"#2a3d52",flex:1}}>
                  Offseason — official W/L standings available during the season
                </div>
                <span style={{fontSize:8,background:"#4b658022",color:"#4b6580",
                  border:"1px solid #4b658044",borderRadius:3,
                  padding:"2px 8px",fontWeight:700,letterSpacing:1}}>OFFSEASON</span>
              </div>

              {/* Two-panel: official standings placeholder + power rankings */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>

                {/* Official standings — offseason placeholder */}
                <div style={{background:"#0a1118",border:"1px dashed #1e2d3d",borderRadius:10,
                  padding:"16px 18px",opacity:0.6}}>
                  <div style={{fontSize:9,color:"#4b6580",letterSpacing:1.5,fontWeight:700,marginBottom:8}}>
                    OFFICIAL STANDINGS
                  </div>
                  <div style={{fontSize:10,color:"#2a3d52",lineHeight:1.8}}>
                    W/L records, points for/against, and playoff seeding<br/>
                    populate automatically when the season is in progress.<br/><br/>
                    Season mode auto-detects on ⟳ SYNC, or use the mode<br/>
                    selector in the header to override.
                  </div>
                </div>

                {/* Power rankings — always live */}
                <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:10,padding:"16px 18px"}}>
                  <div style={{fontSize:9,color:"#f59e0b",letterSpacing:1.5,fontWeight:700,marginBottom:10}}>
                    DYNASTY POWER RANKINGS
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {[...owners]
                      .map(o => {
                        // Quick inline grade for ranking — doesn't need full gradeRoster
                        const rp = players.filter(p => p.owner===o);
                        if (!rp.length) return null;
                        const avg = rp.reduce((s,p)=>s+p.score,0)/rp.length;
                        const elites = rp.filter(p=>p.tier==="Elite").length;
                        const rank   = Math.round(avg*0.7 + elites*5);
                        const avgAge = rp.map(p=>p.age).filter(Boolean).reduce((s,a)=>s+a,0)/rp.filter(p=>p.age).length;
                        return { owner:o, avg, elites, rank, avgAge };
                      })
                      .filter(Boolean)
                      .sort((a,b)=>b.rank-a.rank)
                      .map((g,i) => {
                        const isMe = g.owner===currentOwner;
                        return (
                          <div key={g.owner}
                            style={{display:"flex",alignItems:"center",gap:8,
                              padding:"5px 8px",borderRadius:5,
                              background:isMe?"#0f2b1a":"transparent",
                              border:isMe?"1px solid #22c55e33":"1px solid transparent"}}>
                            <span style={{fontSize:9,color:isMe?"#22c55e":"#4d6880",
                              fontWeight:isMe?900:400,minWidth:16,textAlign:"center"}}>{i+1}</span>
                            <span style={{fontSize:11,fontWeight:isMe?700:500,
                              color:isMe?"#22c55e":"#e2e8f0",flex:1}}>{g.owner}</span>
                            <span style={{fontSize:9,color:"#f59e0b"}}>{g.avg.toFixed(1)}</span>
                            <span style={{fontSize:9,color:"#22c55e",minWidth:20,textAlign:"right"}}>{g.elites}E</span>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              </div>

              {/* Season mode note */}
              <div style={{fontSize:9,color:"#2a3d52",lineHeight:1.7}}>
                When the season starts, Sleeper will report{" "}
                <code style={{color:"#60a5fa",background:"#0c1e35",padding:"1px 5px",borderRadius:3}}>
                  league.status = "in_season"
                </code>{" "}
                and the app will auto-detect the change on next ⟳ SYNC, replacing this view with official standings.
                You can also force it with the mode selector in the header.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
