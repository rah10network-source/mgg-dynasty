// ─── DASHBOARD ────────────────────────────────────────────────────────────────
// Primary focus: your team health (grade, alerts, cliff risks)
// Offseason: dynasty value lens · In-season: adds record + matchup context
import { TIER_STYLE, INJ_COLOR, SIG_COLORS, POS_ORDER, PRIME } from "../constants";
import { gradeRoster, isSellHigh, weakPositions, sellHighCandidates, tradeTargets } from "../roster";

// ── helpers ───────────────────────────────────────────────────────────────────
const MODE_LABEL = {
  offseason: { label:"OFFSEASON",  color:"#4b6580",  bg:"#0a1118"   },
  preseason: { label:"PRESEASON",  color:"#60a5fa",  bg:"#0c1e35"   },
  inseason:  { label:"IN-SEASON",  color:"#22c55e",  bg:"#0f2b1a"   },
  playoffs:  { label:"PLAYOFFS",   color:"#f59e0b",  bg:"#2b1f05"   },
  complete:  { label:"COMPLETE",   color:"#6b7280",  bg:"#111827"   },
};

const WINDOW_COLOR = {
  REBUILD:"#60a5fa", RISING:"#22c55e",
  CONTEND:"#f59e0b", "WIN NOW":"#ef4444", DECLINING:"#6b7280",
};

// ── component ─────────────────────────────────────────────────────────────────
export function Dashboard({ phase, players, currentOwner, owners, newsMap, seasonState }) {

  if (phase === "idle") {
    return (
      <div style={{textAlign:"center",padding:"72px 20px",border:"1px dashed #1e2d3d",borderRadius:12}}>
        <div style={{fontSize:40,fontWeight:900,
          background:"linear-gradient(135deg,#22c55e,#0ea5e9)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:12}}>Ω</div>
        <div style={{fontSize:12,color:"#4b6580",letterSpacing:3,marginBottom:8}}>DYNASTY INTELLIGENCE SYSTEM</div>
        <div style={{fontSize:9,color:"#2a3d52"}}>Use ⟳ SYNC DATA in the top-right corner to begin</div>
      </div>
    );
  }

  if (phase === "loading") {
    return <div style={{textAlign:"center",padding:48,color:"#22c55e",fontSize:11,letterSpacing:2}}>◌ SYNCING DATA...</div>;
  }

  if (!currentOwner) {
    return (
      <div style={{textAlign:"center",padding:56,border:"1px dashed #1e2d3d",borderRadius:12}}>
        <div style={{fontSize:11,color:"#f59e0b",letterSpacing:2,marginBottom:8}}>SET YOUR TEAM FIRST</div>
        <div style={{fontSize:10,color:"#4d6880"}}>Click ◎ in the top bar to identify your team</div>
      </div>
    );
  }

  const myGrade = gradeRoster(currentOwner, players);
  if (!myGrade) return <div style={{padding:40,textAlign:"center",color:"#4d6880",fontSize:11}}>No roster data for {currentOwner}</div>;

  const myPlayers = players.filter(p => p.owner === currentOwner);
  const allGrades = owners
    .map(o => gradeRoster(o, players))
    .filter(Boolean)
    .sort((a,b) => b.contenderScore - a.contenderScore);
  const myRank    = allGrades.findIndex(g => g.owner === currentOwner) + 1;

  const sellHighs = sellHighCandidates(myPlayers, newsMap).slice(0, 5);
  const ageCliffs = myPlayers.filter(p => p.situationFlag === "AGE_CLIFF").slice(0, 5);
  const injured   = myPlayers.filter(p => ["Out","IR","PUP","Doubtful"].includes(p.injStatus)).slice(0, 5);

  const weak    = weakPositions(myGrade, players);
  const weakPos = new Set(weak.filter(w => w.gap < -5).map(w => w.pos));
  const targets = tradeTargets(currentOwner, myGrade, players, newsMap, 5);

  const modeInfo  = MODE_LABEL[seasonState?.mode] || MODE_LABEL.offseason;
  const isInSzn   = ["inseason","playoffs"].includes(seasonState?.mode);

  const AlertCard = ({ title, color, icon, items, emptyMsg, renderItem }) => (
    <div style={{background:"#0a1118",border:`1px solid ${color}33`,borderRadius:10,
      padding:"14px 16px",flex:"1 1 220px",minWidth:200}}>
      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
        <span style={{fontSize:14,color}}>{icon}</span>
        <span style={{fontSize:9,fontWeight:700,letterSpacing:1.5,color}}>{title}</span>
        <span style={{marginLeft:"auto",fontSize:10,fontWeight:900,color,
          background:color+"22",borderRadius:4,padding:"1px 7px"}}>{items.length}</span>
      </div>
      {items.length===0
        ? <div style={{fontSize:10,color:"#4d6880",padding:"6px 0"}}>{emptyMsg}</div>
        : <div style={{display:"flex",flexDirection:"column",gap:5}}>{items.map(renderItem)}</div>
      }
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>

      {/* Season badge */}
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:8,background:modeInfo.bg,color:modeInfo.color,
          border:`1px solid ${modeInfo.color}44`,borderRadius:4,
          padding:"2px 9px",fontWeight:700,letterSpacing:2}}>
          {modeInfo.label}
        </span>
        <span style={{fontSize:8,color:"#2a3d52",letterSpacing:1}}>
          {seasonState?.season} SEASON
          {seasonState?.currentWeek ? ` · WEEK ${seasonState.currentWeek}` : ""}
          {seasonState?._override && <span style={{color:"#f59e0b",marginLeft:6}}>· MANUAL OVERRIDE</span>}
        </span>
      </div>

      {/* ══ HERO: Roster Grade ═══════════════════════════════════════════════ */}
      <div style={{background:"linear-gradient(135deg,#0a1118,#0f1923)",
        border:"2px solid #22c55e",borderRadius:14,padding:"22px 26px",
        boxShadow:"0 0 30px rgba(34,197,94,0.12)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16}}>
          <div style={{display:"flex",alignItems:"center",gap:20}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:64,fontWeight:900,color:myGrade.gradeColor,lineHeight:1,
                textShadow:`0 0 30px ${myGrade.gradeColor}66`}}>{myGrade.grade}</div>
              <div style={{fontSize:8,color:"#4d6880",letterSpacing:2,marginTop:2}}>DYNASTY GRADE</div>
            </div>
            <div>
              <div style={{fontSize:8,color:"#22c55e",letterSpacing:2,marginBottom:4,fontWeight:700}}>
                {currentOwner.toUpperCase()}
              </div>
              <div style={{fontSize:20,fontWeight:900,
                color:WINDOW_COLOR[myGrade.window]||"#e2e8f0",letterSpacing:2,marginBottom:4}}>
                {myGrade.window}
              </div>
              <div style={{fontSize:10,color:"#7a95ae"}}>
                Ranked <strong style={{color:"#e2e8f0"}}>#{myRank}</strong> of {allGrades.length} teams
              </div>
              <div style={{fontSize:9,color:"#4d6880",marginTop:3}}>
                Contender score: <span style={{color:myGrade.gradeColor,fontWeight:700}}>{myGrade.contenderScore}</span>
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:18,flexWrap:"wrap"}}>
            {[
              ["AVG SCORE", myGrade.avgScore.toFixed(1), "#e2e8f0"],
              ["ELITE",     myGrade.eliteCount,           "#22c55e"],
              ["STARTERS",  myGrade.starterCnt,           "#60a5fa"],
              ["AVG AGE",   myGrade.avgAge.toFixed(1),    "#f59e0b"],
              ["ON CLIFF",  myGrade.cliffCnt,             "#f97316"],
              ["INJURED",   myGrade.injCnt,               "#ef4444"],
            ].map(([k,v,col]) => (
              <div key={k} style={{textAlign:"center",minWidth:46}}>
                <div style={{fontSize:22,fontWeight:900,color:col,lineHeight:1}}>{v}</div>
                <div style={{fontSize:7,color:"#4d6880",letterSpacing:1,marginTop:2}}>{k}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Position depth bars */}
        <div style={{display:"flex",gap:10,marginTop:18,flexWrap:"wrap"}}>
          {POS_ORDER.map(pos => {
            const dep  = myGrade.posDep[pos];
            if (!dep?.count) return null;
            const fill = Math.min(100,dep.avg);
            const col  = dep.avg>=70?"#22c55e":dep.avg>=45?"#60a5fa":dep.avg>=25?"#f59e0b":"#ef4444";
            const isWk = weakPos.has(pos);
            return (
              <div key={pos} style={{flex:"1 1 55px",minWidth:48}}>
                <div style={{fontSize:8,color:isWk?"#f97316":"#7a95ae",marginBottom:3,
                  letterSpacing:1,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span>{pos}{isWk?" ⚠":""}</span>
                  <span style={{color:col,fontWeight:700}}>{dep.avg.toFixed(0)}</span>
                </div>
                <div style={{height:5,background:"#1e2d3d",borderRadius:3,overflow:"hidden",
                  border:isWk?"1px solid #f9731633":undefined}}>
                  <div style={{height:"100%",width:`${fill}%`,background:col,borderRadius:3}}/>
                </div>
                <div style={{fontSize:7,color:"#4d6880",marginTop:2}}>{dep.count} rostered</div>
              </div>
            );
          })}
        </div>
        {isInSzn && (
          <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #1e2d3d",
            display:"flex",gap:12,alignItems:"center"}}>
            <div style={{fontSize:9,color:"#22c55e",fontWeight:700,letterSpacing:1.5}}>
              WEEK {seasonState.currentWeek}
            </div>
            <div style={{fontSize:9,color:"#4d6880"}}>
              W/L record and matchup preview — in-season build coming
            </div>
          </div>
        )}
      </div>

      {/* ══ ALERTS ROW ══════════════════════════════════════════════════════ */}
      <div>
        <div style={{fontSize:9,color:"#4d6880",letterSpacing:2,fontWeight:700,marginBottom:10}}>⚑ ROSTER ALERTS</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>

          <AlertCard title="SELL-HIGH CANDIDATES" color="#ef4444" icon="↑"
            items={sellHighs} emptyMsg="No obvious sell-high candidates"
            renderItem={p => {
              const ts=TIER_STYLE[p.tier]; const n=newsMap[p.name];
              return (
                <div key={p.pid} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"5px 0",borderBottom:"1px solid #0f1923"}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:ts.text}}>{p.name}</div>
                    <div style={{fontSize:9,color:"#7a95ae"}}>{p.pos} · {p.team} · {p.age}y</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:900,color:ts.text}}>{p.score}</div>
                    {n?.signal && <span style={{fontSize:8,background:SIG_COLORS[n.signal],color:"#080d14",
                      borderRadius:3,padding:"1px 4px",fontWeight:900}}>{n.signal}</span>}
                  </div>
                </div>
              );
            }}
          />

          <AlertCard title="AGE CLIFF RISKS" color="#f97316" icon="↓"
            items={ageCliffs} emptyMsg="No players past their position cliff"
            renderItem={p => {
              const ts=TIER_STYLE[p.tier]; const [,,cliff]=PRIME[p.pos]||[23,29,33];
              return (
                <div key={p.pid} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"5px 0",borderBottom:"1px solid #0f1923"}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:ts.text}}>{p.name}</div>
                    <div style={{fontSize:9,color:"#7a95ae"}}>{p.pos} · {p.age}y · cliff:{cliff}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:900,color:"#f97316"}}>{p.score}</div>
                    <div style={{fontSize:8,color:"#f97316"}}>+{(p.age-cliff).toFixed(1)}y past</div>
                  </div>
                </div>
              );
            }}
          />

          <AlertCard title="INJURY CONCERNS" color="#ef4444" icon="⚠"
            items={injured} emptyMsg="No significant injuries on your roster"
            renderItem={p => {
              const ts=TIER_STYLE[p.tier];
              return (
                <div key={p.pid} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"5px 0",borderBottom:"1px solid #0f1923"}}>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:ts.text}}>{p.name}</div>
                    <div style={{fontSize:9,color:"#7a95ae"}}>{p.pos} · {p.team}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:9,fontWeight:700,color:INJ_COLOR[p.injStatus]||"#ef4444"}}>{p.injStatus}</div>
                    <div style={{fontSize:11,color:ts.text,fontWeight:700}}>{p.score}</div>
                  </div>
                </div>
              );
            }}
          />
        </div>
      </div>

      {/* ══ TWO-COL: Position Gaps + Trade Targets ══════════════════════════ */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

        {/* Position gaps */}
        <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,color:"#0ea5e9",marginBottom:12}}>
            ⬡ POSITION GAPS VS LEAGUE AVG
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {weak.map(({ pos, mine, league, gap }) => {
              const mx   = Math.max(mine, league, 1);
              const gCol = gap>=0?"#22c55e":gap>-10?"#f59e0b":"#ef4444";
              return (
                <div key={pos}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <span style={{fontSize:10,fontWeight:700,color:"#60a5fa"}}>{pos}</span>
                    <span style={{fontSize:9,color:gCol,fontWeight:700}}>
                      {gap>=0?"+":""}{gap.toFixed(1)} vs avg
                    </span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                    <div style={{width:30,fontSize:8,color:"#7a95ae",textAlign:"right"}}>YOU</div>
                    <div style={{flex:1,height:5,background:"#1e2d3d",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(mine/mx)*100}%`,
                        background:gap>=0?"#22c55e":"#ef4444",borderRadius:3}}/>
                    </div>
                    <div style={{width:24,fontSize:9,color:gCol,fontWeight:700,textAlign:"right"}}>{mine.toFixed(0)}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <div style={{width:30,fontSize:8,color:"#4d6880",textAlign:"right"}}>LG</div>
                    <div style={{flex:1,height:5,background:"#1e2d3d",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(league/mx)*100}%`,background:"#4b6580",borderRadius:3}}/>
                    </div>
                    <div style={{width:24,fontSize:9,color:"#7a95ae",textAlign:"right"}}>{league.toFixed(0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trade targets */}
        <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:10,padding:"14px 16px"}}>
          <div style={{fontSize:9,fontWeight:700,letterSpacing:1.5,color:"#22c55e",marginBottom:12}}>
            ⇄ TRADE TARGETS
            <span style={{fontSize:8,color:"#4d6880",fontWeight:400,marginLeft:8}}>weighted to your gaps</span>
          </div>
          {targets.length===0
            ? <div style={{fontSize:10,color:"#4d6880",padding:"12px 0"}}>Run ◈ Intel Scan to surface targets</div>
            : <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {targets.map((p,i) => {
                  const ts=TIER_STYLE[p.tier]; const n=newsMap[p.name]; const isWk=weakPos.has(p.pos);
                  return (
                    <div key={p.pid} style={{display:"flex",alignItems:"center",gap:10,
                      padding:"6px 8px",background:isWk?"#0f2b1a":"transparent",
                      border:`1px solid ${isWk?"#22c55e22":"#1e2d3d"}`,borderRadius:6}}>
                      <div style={{fontSize:9,color:"#2a3d52",width:14,textAlign:"center"}}>{i+1}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:11,fontWeight:700,color:ts.text}}>{p.name}</div>
                        <div style={{fontSize:9,color:"#7a95ae"}}>{p.pos} · {p.team} · {p.age}y · {p.owner}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                        <span style={{fontSize:14,fontWeight:900,color:ts.text}}>{p.score}</span>
                        {isWk && <span style={{fontSize:7,color:"#22c55e",fontWeight:700,letterSpacing:0.5}}>FILLS GAP</span>}
                        {n?.signal==="BUY" && <span style={{fontSize:7,background:"#22c55e",color:"#080d14",
                          borderRadius:2,padding:"1px 4px",fontWeight:900}}>BUY</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>

      {/* ══ COMPACT LEAGUE SNAPSHOT ══════════════════════════════════════════ */}
      <div>
        <div style={{fontSize:9,color:"#4d6880",letterSpacing:2,fontWeight:700,marginBottom:10}}>⬡ LEAGUE SNAPSHOT</div>
        <div style={{borderRadius:8,border:"1px solid #1e2d3d",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {[["#",30],["TEAM",170],["GRD",46],["WINDOW",85],["AVG",50],["ELITE",50],["AGE",50]].map(([h,w])=>(
                  <th key={h} style={{padding:"6px 8px",background:"#0c151e",color:"#7a95ae",
                    fontSize:9,letterSpacing:1.5,fontWeight:700,textAlign:"center",
                    borderRight:"1px solid #1e2d3d",width:w}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allGrades.map((g,i) => {
                const isMe=g.owner===currentOwner;
                const wc=WINDOW_COLOR[g.window]||"#6b7280";
                return (
                  <tr key={g.owner} style={{background:isMe?"#0f2b1a":i%2===0?"#080d14":"#0a1118"}}>
                    <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923",
                      fontSize:9,color:isMe?"#22c55e":"#4d6880",fontWeight:isMe?900:400}}>{i+1}</td>
                    <td style={{padding:"6px 10px",borderBottom:"1px solid #0f1923",
                      fontWeight:isMe?900:500,color:isMe?"#22c55e":"#e2e8f0",fontSize:11}}>
                      {g.owner}{isMe&&<span style={{fontSize:7,color:"#22c55e",marginLeft:5}}>YOU</span>}
                    </td>
                    <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923"}}>
                      <span style={{fontSize:13,fontWeight:900,color:g.gradeColor}}>{g.grade}</span>
                    </td>
                    <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923"}}>
                      <span style={{fontSize:8,background:wc+"22",color:wc,
                        border:`1px solid ${wc}44`,borderRadius:3,
                        padding:"2px 5px",fontWeight:700,letterSpacing:0.5}}>{g.window}</span>
                    </td>
                    <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923",
                      fontSize:10,color:"#e2e8f0",fontWeight:700}}>{g.avgScore.toFixed(1)}</td>
                    <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923",
                      fontSize:10,color:"#22c55e",fontWeight:700}}>{g.eliteCount}</td>
                    <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923",
                      fontSize:10,color:"#f59e0b"}}>{g.avgAge.toFixed(1)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isInSzn && (
          <div style={{marginTop:8,padding:"8px 12px",background:"#0a1118",
            border:"1px solid #22c55e22",borderRadius:6,fontSize:9,color:"#4d6880"}}>
            ▸ In-season: W/L standings, PF/PA, streak overlay — coming with in-season build
          </div>
        )}
      </div>

    </div>
  );
}
