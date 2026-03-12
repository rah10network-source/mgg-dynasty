import { useState } from "react";
import { PositionRankings } from "./leaguehub/PositionRankings";
import { RosterGrades }     from "./leaguehub/RosterGrades";

const SUB_TABS = [
  ["positions", "⬡ POSITION RANKINGS"],
  ["rosters",   "◈ ROSTER GRADES"],
  ["standings", "▸ STANDINGS"],
];

export function LeagueHub({ phase, players, owners, currentOwner, newsMap, setDetail, setActiveTab, seasonState, viewMode="dynasty" }) {
  const [sub, setSub] = useState("positions");

  const isInSzn = ["inseason","playoffs"].includes(seasonState?.mode);

  const tabBtn = (id, lbl) => (
    <button key={id} onClick={() => setSub(id)} style={{
      background: "none", border: "none",
      borderBottom: sub===id ? "2px solid #9580FF" : "2px solid transparent",
      color:        sub===id ? "#00D4FF" : "#8892a4",
      padding: "6px 16px", fontFamily: "inherit",
      fontSize: 10, letterSpacing: 2, fontWeight: 700, cursor: "pointer",
    }}>{lbl}</button>
  );

  return (
    <div>
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #242d40",marginBottom:20}}>
        {SUB_TABS.map(([id, lbl]) => tabBtn(id, lbl))}
      </div>

      {sub === "positions" && (
        <PositionRankings
          players={players}
          newsMap={newsMap}
          setDetail={setDetail}
          setActiveTab={setActiveTab}
          viewMode={viewMode}
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
              border:"1px solid #9580FF33",borderRadius:0,background:"#1d2535"}}>
              <div style={{fontSize:11,color:"#9580FF",letterSpacing:2,fontWeight:700,marginBottom:8}}>
                IN-SEASON STANDINGS
              </div>
              <div style={{fontSize:10,color:"#8892a4",maxWidth:400,margin:"0 auto",lineHeight:1.8}}>
                Week {seasonState?.currentWeek || "?"} · {seasonState?.season} Season<br/>
                <span style={{color:"#7a95ae"}}>Official W/L + PF/PA from Sleeper</span> and{" "}
                <span style={{color:"#FFD700"}}>Dynasty Power Rankings</span> overlay<br/>
                — coming in the in-season build
              </div>
              <div style={{marginTop:20,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
                {["Official Standings · W/L · PF · PA · Streak",
                  "Dynasty Power Rankings · who should be winning",
                  "Luck Index · actual vs expected W/L by points",
                ].map(s => (
                  <div key={s} style={{fontSize:9,color:"#8892a4",background:"#161b26",
                    border:"1px dashed #242d40",borderRadius:6,padding:"6px 12px"}}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // ── Offseason: dynasty power rankings as standings proxy ──────
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                <div style={{fontSize:11,color:"#8892a4",letterSpacing:2,fontWeight:700}}>
                  DYNASTY POWER RANKINGS
                </div>
                <div style={{fontSize:9,color:"#2a3548",flex:1}}>
                  Offseason — official W/L standings available during the season
                </div>
                <span style={{fontSize:8,background:"#4b658022",color:"#8892a4",
                  border:"1px solid #4b658044",borderRadius:3,
                  padding:"2px 8px",fontWeight:700,letterSpacing:1}}>OFFSEASON</span>
              </div>

              {/* Two-panel: official standings placeholder + power rankings */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>

                {/* Official standings — offseason placeholder */}
                <div style={{background:"#1d2535",border:"1px dashed #242d40",borderRadius:0,
                  padding:"16px 18px",opacity:0.6}}>
                  <div style={{fontSize:9,color:"#8892a4",letterSpacing:1.5,fontWeight:700,marginBottom:8}}>
                    OFFICIAL STANDINGS
                  </div>
                  <div style={{fontSize:10,color:"#2a3548",lineHeight:1.8}}>
                    W/L records, points for/against, and playoff seeding<br/>
                    populate automatically when the season is in progress.<br/><br/>
                    Season mode auto-detects on ⟳ SYNC, or use the mode<br/>
                    selector in the header to override.
                  </div>
                </div>

                {/* Power rankings — always live */}
                <div style={{background:"#1d2535",border:"1px solid #242d40",borderRadius:0,padding:"16px 18px"}}>
                  <div style={{fontSize:9,color:"#FFD700",letterSpacing:1.5,fontWeight:700,marginBottom:10}}>
                    DYNASTY POWER RANKINGS
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {[...owners]
                      .map(o => {
                        // Quick inline grade for ranking — doesn't need full gradeRoster
                        const rp = players.filter(p => p.owner===o);
                        if (!rp.length) return null;
                        const avg = rp.reduce((s,p)=>s+pv(p,viewMode),0)/rp.length;
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
                              background:isMe?"#0d1f14":"transparent",
                              border:isMe?"1px solid #9580FF33":"1px solid transparent"}}>
                            <span style={{fontSize:9,color:isMe?"#9580FF":"#8892a4",
                              fontWeight:isMe?900:400,minWidth:16,textAlign:"center"}}>{i+1}</span>
                            <span style={{fontSize:11,fontWeight:isMe?700:500,
                              color:isMe?"#9580FF":"#e2e8f0",flex:1}}>{g.owner}</span>
                            <span style={{fontSize:9,color:"#FFD700"}}>{g.avg.toFixed(1)}</span>
                            <span style={{fontSize:9,color:"#9580FF",minWidth:20,textAlign:"right"}}>{g.elites}E</span>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              </div>

              {/* Season mode note */}
              <div style={{fontSize:9,color:"#2a3548",lineHeight:1.7}}>
                When the season starts, Sleeper will report{" "}
                <code style={{color:"#00D4FF",background:"#1d2535",padding:"1px 5px",borderRadius:3}}>
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
