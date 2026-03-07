// ─── MY PICKS ─────────────────────────────────────────────────────────────────
// Shows all future draft picks owned by currentOwner with estimated values.
// Data comes from Sleeper rosters[n].draft_picks — extracted during sync.
import { PICK_VALUES, PICK_ROUNDS } from "../../constants";

const ROUND_COLOR = { "1st":"#22c55e", "2nd":"#60a5fa", "3rd":"#f59e0b", "4th":"#f97316", "5th":"#6b7280" };
const ROUND_LABEL = { 1:"1st", 2:"2nd", 3:"3rd", 4:"4th", 5:"5th" };

// Estimate pick value: round 1 = highest, later years = discounted
const estimateValue = (round, season) => {
  const label     = ROUND_LABEL[round] || `${round}th`;
  const yearOffset = Math.max(0, Number(season) - new Date().getFullYear());
  const vals       = PICK_VALUES[label] || PICK_VALUES["3rd"] || [6, 4, 2];
  return vals[Math.min(yearOffset, vals.length - 1)];
};

export function MyPicks({ currentOwner, draftPicksByOwner, rosterIdToOwner, players, phase }) {

  if (phase !== "done") {
    return (
      <div style={{textAlign:"center",padding:48,border:"1px dashed #1e2d3d",borderRadius:12}}>
        <div style={{fontSize:11,color:"#7a95ae",letterSpacing:2}}>SYNC DATA FIRST TO VIEW YOUR PICKS</div>
      </div>
    );
  }

  const myPicks = (currentOwner ? draftPicksByOwner[currentOwner] || [] : [])
    .map(pk => ({
      ...pk,
      roundLabel:  ROUND_LABEL[pk.round] || `${pk.round}th`,
      value:       estimateValue(pk.round, pk.season),
      originalTeam: rosterIdToOwner[pk.rosterId] || `Roster ${pk.rosterId}`,
      isOwn:       rosterIdToOwner[pk.rosterId] === currentOwner,
    }))
    .sort((a,b) => a.season - b.season || a.round - b.round);

  // All picks in the league grouped by owner — for context
  const allOwnerPicks = Object.entries(draftPicksByOwner)
    .map(([owner, picks]) => ({
      owner,
      isMe: owner === currentOwner,
      picks,
      totalValue: picks.reduce((s,pk) => s + estimateValue(pk.round, pk.season), 0),
      byRound: [1,2,3,4,5].map(r => picks.filter(pk => pk.round === r).length),
    }))
    .sort((a,b) => b.totalValue - a.totalValue);

  const totalValue = myPicks.reduce((s,pk) => s + pk.value, 0);

  // Group my picks by season
  const bySeason = {};
  myPicks.forEach(pk => {
    if (!bySeason[pk.season]) bySeason[pk.season] = [];
    bySeason[pk.season].push(pk);
  });

  return (
    <div>
      {/* ── Header summary ──────────────────────────────────────────────────── */}
      <div style={{display:"flex",gap:14,flexWrap:"wrap",marginBottom:22}}>

        {/* My portfolio */}
        <div style={{background:"linear-gradient(135deg,#0a1118,#0f1923)",
          border:"2px solid #22c55e",borderRadius:12,padding:"16px 22px",
          flex:"1 1 300px",boxShadow:"0 0 20px rgba(34,197,94,0.1)"}}>
          <div style={{fontSize:9,color:"#22c55e",letterSpacing:2,fontWeight:700,marginBottom:12}}>
            ◈ MY PICK PORTFOLIO — {currentOwner?.toUpperCase() || "—"}
          </div>
          <div style={{display:"flex",gap:24,flexWrap:"wrap",marginBottom:14}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:36,fontWeight:900,color:"#22c55e",lineHeight:1}}>{myPicks.length}</div>
              <div style={{fontSize:8,color:"#4d6880",letterSpacing:1,marginTop:2}}>TOTAL PICKS</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:36,fontWeight:900,color:"#60a5fa",lineHeight:1}}>{totalValue.toFixed(0)}</div>
              <div style={{fontSize:8,color:"#4d6880",letterSpacing:1,marginTop:2}}>PORTFOLIO VALUE</div>
            </div>
            {[1,2,3].map(r => {
              const cnt = myPicks.filter(pk => pk.round === r).length;
              const col = ROUND_COLOR[ROUND_LABEL[r]];
              return (
                <div key={r} style={{textAlign:"center"}}>
                  <div style={{fontSize:28,fontWeight:900,color:col,lineHeight:1}}>{cnt}</div>
                  <div style={{fontSize:8,color:"#4d6880",letterSpacing:1,marginTop:2}}>{ROUND_LABEL[r].toUpperCase()}</div>
                </div>
              );
            })}
          </div>

          {myPicks.length === 0 ? (
            <div style={{fontSize:10,color:"#4d6880",fontStyle:"italic"}}>
              No future picks found. Picks appear here when traded via Sleeper.
            </div>
          ) : (
            // Picks grouped by season
            Object.entries(bySeason).map(([season, picks]) => (
              <div key={season} style={{marginBottom:12}}>
                <div style={{fontSize:9,color:"#4d6880",letterSpacing:2,fontWeight:700,
                  marginBottom:6,display:"flex",alignItems:"center",gap:8}}>
                  <span>{season}</span>
                  <div style={{flex:1,height:1,background:"#1e2d3d"}}/>
                  <span style={{color:"#7a95ae"}}>{picks.reduce((s,pk)=>s+pk.value,0).toFixed(0)} val</span>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {picks.map((pk,i) => {
                    const col = ROUND_COLOR[pk.roundLabel] || "#6b7280";
                    return (
                      <div key={i} style={{background:col+"15",border:`1px solid ${col}44`,
                        borderRadius:8,padding:"8px 12px",minWidth:90,textAlign:"center"}}>
                        <div style={{fontSize:14,fontWeight:900,color:col,marginBottom:2}}>
                          {pk.roundLabel}
                        </div>
                        <div style={{fontSize:8,color:"#7a95ae",marginBottom:4}}>
                          {pk.isOwn ? "OWN" : pk.originalTeam.split(" ").slice(-1)[0].toUpperCase()}
                        </div>
                        <div style={{fontSize:9,color:col,fontWeight:700}}>
                          ~{pk.value} val
                        </div>
                        {!pk.isOwn && (
                          <div style={{fontSize:7,color:"#22c55e",marginTop:3,fontWeight:700}}>
                            ACQUIRED
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* League pick comparison */}
        <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:12,
          padding:"16px 18px",flex:"1 1 280px"}}>
          <div style={{fontSize:9,color:"#7a95ae",letterSpacing:2,fontWeight:700,marginBottom:10}}>
            LEAGUE PICK ASSETS
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:5}}>
            {allOwnerPicks.map((o, i) => {
              const isMe  = o.owner === currentOwner;
              const maxV  = allOwnerPicks[0]?.totalValue || 1;
              const pct   = (o.totalValue / maxV) * 100;
              return (
                <div key={o.owner} style={{
                  padding:"6px 8px",borderRadius:6,
                  background:isMe?"#0f2b1a":"transparent",
                  border:isMe?"1px solid #22c55e33":"1px solid transparent",
                }}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:4}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:9,color:isMe?"#22c55e":"#4d6880",
                        minWidth:14,textAlign:"center"}}>{i+1}</span>
                      <span style={{fontSize:11,fontWeight:isMe?700:500,
                        color:isMe?"#22c55e":"#e2e8f0"}}>{o.owner}</span>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:8,color:"#7a95ae"}}>{o.picks.length}pk</span>
                      <span style={{fontSize:10,fontWeight:700,
                        color:isMe?"#22c55e":"#e2e8f0"}}>{o.totalValue.toFixed(0)}</span>
                    </div>
                  </div>
                  {/* Round breakdown dots */}
                  <div style={{display:"flex",gap:3,paddingLeft:20}}>
                    {[1,2,3,4,5].map(r => {
                      const cnt = o.byRound[r-1];
                      const col = ROUND_COLOR[ROUND_LABEL[r]] || "#6b7280";
                      return cnt > 0 ? (
                        <span key={r} style={{fontSize:8,background:col+"22",color:col,
                          border:`1px solid ${col}44`,borderRadius:3,
                          padding:"1px 5px",fontWeight:700}}>
                          {cnt}{ROUND_LABEL[r][0]}
                        </span>
                      ) : null;
                    })}
                  </div>
                  {/* Value bar */}
                  <div style={{height:2,background:"#1e2d3d",borderRadius:1,
                    marginTop:5,marginLeft:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,
                      background:isMe?"#22c55e":"#374151",
                      borderRadius:1,transition:"width .3s"}}/>
                  </div>
                </div>
              );
            })}
          </div>
          {allOwnerPicks.length === 0 && (
            <div style={{fontSize:10,color:"#4d6880",padding:"16px 0"}}>
              No traded picks found in league. Picks appear here once traded via Sleeper.
            </div>
          )}
        </div>
      </div>

      {/* ── Context note ────────────────────────────────────────────────────── */}
      <div style={{fontSize:9,color:"#2a3d52",lineHeight:1.8}}>
        Pick values are estimates based on round and year · 1st round picks carry highest dynasty value ·
        Values update on each ⟳ SYNC as your portfolio changes via trades
      </div>
    </div>
  );
}
