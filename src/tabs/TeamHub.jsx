// ─── TEAM HUB ─────────────────────────────────────────────────────────────────
// Your team's command centre — grade, sell-high alerts, trade targets,
// positional depth vs league, and your full roster breakdown.
import { useState, useMemo } from "react";
import { TIER_STYLE, INJ_COLOR, SIG_COLORS, POS_ORDER } from "../constants";
import { gradeRoster, isSellHigh, sellHighCandidates, tradeTargets, weakPositions } from "../roster";

const TABS = [
  ["overview",  "◎ OVERVIEW"],
  ["roster",    "⬡ MY ROSTER"],
  ["sellhigh",  "⚑ SELL-HIGH"],
  ["targets",   "⇄ TARGETS"],
];

function Stat({ label, value, color = "#e2e8f0", size = 18 }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: size, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 7, color: "#7a95ae", letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function PlayerRow({ p, newsMap, onClick }) {
  const n  = newsMap?.[p.name];
  const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
  const inj = p.injStatus && INJ_COLOR[p.injStatus];
  return (
    <div onClick={() => onClick?.(p)}
      style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 10px",
        background:"#080d14", borderBottom:"1px solid #0f1923",
        cursor: onClick ? "pointer" : "default" }}
      onMouseOver={e => e.currentTarget.style.background = "#0a1118"}
      onMouseOut={e  => e.currentTarget.style.background = "#080d14"}>
      <div style={{ width:38, textAlign:"center", flexShrink:0 }}>
        <div style={{ fontSize:15, fontWeight:900, color:ts.text,
          textShadow:`0 0 8px ${ts.glow}` }}>{p.score}</div>
        <div style={{ fontSize:7, color:ts.text, letterSpacing:1 }}>{p.tier}</div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{p.name}</span>
          {p.onTaxi && <span style={{ fontSize:7, background:"#0c1e35", color:"#60a5fa",
            border:"1px solid #3b82f644", borderRadius:3, padding:"1px 5px" }}>TAXI</span>}
          {inj && <span style={{ fontSize:7, background:inj+"22", color:inj,
            border:`1px solid ${inj}44`, borderRadius:3, padding:"1px 5px" }}>{p.injStatus}</span>}
          {n?.signal && <span style={{ fontSize:7, background:SIG_COLORS[n.signal],
            color:"#080d14", borderRadius:3, padding:"1px 5px", fontWeight:900 }}>{n.signal}</span>}
        </div>
        <div style={{ fontSize:9, color:"#7a95ae", marginTop:2 }}>
          {p.pos} · {p.team}{p.age ? ` · ${p.age}y` : ""}{p.ppg != null ? ` · ${p.ppg} ppg` : ""}
        </div>
      </div>
      {p.situationFlag && (
        <div style={{ fontSize:7, color:"#f59e0b", textAlign:"right",
          maxWidth:80, lineHeight:1.3 }}>{p.situationFlag.replace(/_/g," ")}</div>
      )}
    </div>
  );
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function Overview({ myGrade, owners, players, newsMap, currentOwner, setTab }) {
  const allGrades = useMemo(() =>
    owners.map(o => gradeRoster(o, players)).filter(Boolean)
      .sort((a,b) => b.contenderScore - a.contenderScore),
    [owners, players]
  );
  const myRank  = allGrades.findIndex(g => g.owner === currentOwner) + 1;
  const sells   = sellHighCandidates(myGrade.roster, newsMap).slice(0,3);
  const weak    = weakPositions(myGrade, players);
  const injured = myGrade.roster.filter(p =>
    ["Out","IR","PUP","Doubtful"].includes(p.injStatus)).slice(0,4);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

      {/* Grade card */}
      <div style={{ background:"#0a1118", border:`2px solid ${myGrade.gradeColor}`,
        borderRadius:12, padding:"18px 22px",
        boxShadow:`0 0 24px ${myGrade.gradeColor}22` }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", flexWrap:"wrap", gap:14 }}>
          <div>
            <div style={{ fontSize:8, color:myGrade.gradeColor, letterSpacing:2,
              fontWeight:700, marginBottom:6 }}>YOUR ROSTER — {currentOwner.toUpperCase()}</div>
            <div style={{ display:"flex", alignItems:"baseline", gap:12 }}>
              <span style={{ fontSize:56, fontWeight:900, color:myGrade.gradeColor, lineHeight:1 }}>
                {myGrade.grade}
              </span>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:myGrade.windowColor, letterSpacing:2 }}>
                  {myGrade.window}
                </div>
                <div style={{ fontSize:10, color:"#7a95ae" }}>#{myRank} of {owners.length} teams</div>
                <div style={{ fontSize:9, color:"#4d6880", marginTop:2 }}>
                  Contender score: <span style={{ color:myGrade.gradeColor, fontWeight:700 }}>
                    {myGrade.contenderScore}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:20, flexWrap:"wrap" }}>
            <Stat label="AVG SCORE" value={myGrade.avgScore.toFixed(1)} />
            <Stat label="ELITE"    value={myGrade.eliteCount} color="#22c55e" />
            <Stat label="STARTERS" value={myGrade.starterCnt} color="#60a5fa" />
            <Stat label="AVG AGE"  value={myGrade.avgAge.toFixed(1)} color="#f59e0b" />
            <Stat label="ON CLIFF" value={myGrade.cliffCnt}   color="#f97316" />
            <Stat label="INJURED"  value={myGrade.injCnt}     color="#ef4444" />
          </div>
        </div>
        <div style={{ display:"flex", gap:10, marginTop:16, flexWrap:"wrap" }}>
          {POS_ORDER.map(pos => {
            const dep = myGrade.posDep[pos];
            if (!dep?.count) return null;
            const fill = Math.min(100, dep.avg);
            const col  = dep.avg>=70?"#22c55e":dep.avg>=45?"#60a5fa":dep.avg>=25?"#f59e0b":"#ef4444";
            return (
              <div key={pos} style={{ flex:"1 1 55px", minWidth:48 }}>
                <div style={{ fontSize:8, color:"#7a95ae", marginBottom:3, letterSpacing:1,
                  display:"flex", justifyContent:"space-between" }}>
                  <span>{pos}</span><span style={{ color:col }}>{dep.avg.toFixed(0)}</span>
                </div>
                <div style={{ height:4, background:"#1e2d3d", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${fill}%`, background:col, borderRadius:2 }}/>
                </div>
                <div style={{ fontSize:7, color:"#4d6880", marginTop:2 }}>{dep.count}p</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alert strip */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:10 }}>
        <div style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:10, padding:"14px 16px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <div style={{ fontSize:9, color:"#ef4444", letterSpacing:2, fontWeight:700 }}>
              ⚑ SELL-HIGH ({sells.length})
            </div>
            {sells.length > 0 && (
              <button onClick={() => setTab("sellhigh")}
                style={{ fontSize:8, color:"#4d6880", background:"none", border:"none",
                  cursor:"pointer", letterSpacing:1 }}>SEE ALL →</button>
            )}
          </div>
          {sells.length === 0
            ? <div style={{ fontSize:9, color:"#4d6880" }}>No sell-high candidates right now</div>
            : sells.map(p => (
              <div key={p.pid} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"5px 0", borderBottom:"1px solid #0f1923" }}>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0" }}>{p.name}</div>
                  <div style={{ fontSize:9, color:"#7a95ae" }}>{p.pos} · Age {p.age}</div>
                </div>
                <span style={{ fontSize:9, color:"#ef4444", fontWeight:700 }}>{p.score}</span>
              </div>
            ))
          }
        </div>

        <div style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontSize:9, color:"#f59e0b", letterSpacing:2, fontWeight:700, marginBottom:10 }}>
            ◈ POSITIONAL GAPS
          </div>
          {weak.length === 0
            ? <div style={{ fontSize:9, color:"#4d6880" }}>No significant gaps detected</div>
            : weak.map(w => (
              <div key={w.pos} style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", padding:"5px 0", borderBottom:"1px solid #0f1923" }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#e2e8f0" }}>{w.pos}</span>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9 }}>
                    <span style={{ color:w.gap < -10?"#ef4444":"#f59e0b" }}>{w.mine.toFixed(0)}</span>
                    <span style={{ color:"#4d6880" }}> vs {w.league.toFixed(0)} avg</span>
                  </div>
                  <div style={{ fontSize:8, color:"#4d6880" }}>
                    {w.gap < 0 ? `${Math.abs(w.gap).toFixed(0)} below avg` : "Above avg"}
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {injured.length > 0 && (
          <div style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:9, color:"#ef4444", letterSpacing:2, fontWeight:700, marginBottom:10 }}>
              ⚠ INJURY ALERTS ({injured.length})
            </div>
            {injured.map(p => {
              const c = INJ_COLOR[p.injStatus] || "#ef4444";
              return (
                <div key={p.pid} style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", padding:"5px 0", borderBottom:"1px solid #0f1923" }}>
                  <div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#e2e8f0" }}>{p.name}</div>
                    <div style={{ fontSize:9, color:"#7a95ae" }}>{p.pos} · {p.team}</div>
                  </div>
                  <span style={{ fontSize:9, color:c, fontWeight:700 }}>{p.injStatus}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* League standings */}
      <div style={{ background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:10, padding:"14px 16px" }}>
        <div style={{ fontSize:9, color:"#60a5fa", letterSpacing:2, fontWeight:700, marginBottom:12 }}>
          LEAGUE STANDINGS
        </div>
        {allGrades.map((g, i) => {
          const isMe = g.owner === currentOwner;
          return (
            <div key={g.owner} style={{ display:"flex", alignItems:"center", gap:10,
              padding:"6px 10px", borderRadius:6,
              background:isMe?"#0c1e35":"transparent",
              border:isMe?"1px solid #60a5f644":"1px solid transparent" }}>
              <span style={{ fontSize:9, color:"#4d6880", minWidth:20 }}>#{i+1}</span>
              <span style={{ flex:1, fontSize:10, fontWeight:isMe?700:400,
                color:isMe?"#60a5fa":"#e2e8f0" }}>{g.owner}</span>
              <span style={{ fontSize:11, fontWeight:900, color:g.gradeColor }}>{g.grade}</span>
              <span style={{ fontSize:8, color:g.windowColor, minWidth:72, textAlign:"right" }}>
                {g.window}
              </span>
              <span style={{ fontSize:10, color:"#4d6880", minWidth:28, textAlign:"right" }}>
                {g.contenderScore}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── SELL-HIGH TAB ─────────────────────────────────────────────────────────────
function SellHighTab({ roster, newsMap }) {
  const candidates = sellHighCandidates(roster, newsMap);
  return (
    <div>
      <div style={{ fontSize:9, color:"#4d6880", lineHeight:1.8, marginBottom:16,
        background:"#0a1118", border:"1px solid #1e2d3d", borderRadius:8, padding:"10px 14px" }}>
        Players at or past their position's peak age who still carry high dynasty value.
        Best time to sell is while they're still producing — not after the decline starts.
        Intel Scan provides SELL signals when headlines confirm a situation.
      </div>
      {candidates.length === 0 ? (
        <div style={{ padding:32, textAlign:"center", color:"#4d6880", fontSize:11 }}>
          No sell-high candidates on your roster right now
        </div>
      ) : (
        <div style={{ border:"1px solid #1e2d3d", borderRadius:10, overflow:"hidden" }}>
          {candidates.map(p => {
            const n  = newsMap?.[p.name];
            const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
            const isSell = n?.signal === "SELL";
            return (
              <div key={p.pid} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"12px 16px", borderBottom:"1px solid #0f1923",
                background:isSell?"#1a0a0a":"#080d14" }}>
                <div style={{ width:42, textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:18, fontWeight:900, color:ts.text }}>{p.score}</div>
                  <div style={{ fontSize:7, color:ts.text }}>{p.tier}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#e2e8f0" }}>{p.name}</span>
                    {isSell && <span style={{ fontSize:8, background:"#ef4444", color:"#080d14",
                      borderRadius:3, padding:"2px 7px", fontWeight:900 }}>SELL SIGNAL</span>}
                  </div>
                  <div style={{ fontSize:9, color:"#7a95ae", marginTop:3 }}>
                    {p.pos} · {p.team} · Age {p.age}
                    {p.ppg != null ? ` · ${p.ppg} ppg` : ""}
                  </div>
                  {n?.note && <div style={{ fontSize:9, color:"#4d6880", marginTop:4,
                    fontStyle:"italic" }}>{n.note}</div>}
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:9, color:"#ef4444", fontWeight:700, marginBottom:2 }}>
                    SELL WHILE HOT
                  </div>
                  <div style={{ fontSize:8, color:"#4d6880" }}>Age {p.age}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── TARGETS TAB ───────────────────────────────────────────────────────────────
function TargetsTab({ currentOwner, myGrade, players, newsMap }) {
  const weak    = weakPositions(myGrade, players);
  const targets = tradeTargets(currentOwner, myGrade, players, newsMap, 12);
  return (
    <div>
      {weak.length > 0 && (
        <div style={{ background:"#0a1118", border:"1px solid #f59e0b44", borderRadius:10,
          padding:"12px 16px", marginBottom:14 }}>
          <div style={{ fontSize:9, color:"#f59e0b", letterSpacing:2, fontWeight:700, marginBottom:10 }}>
            ◈ YOUR WEAKEST POSITIONS
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {weak.map(w => (
              <div key={w.pos} style={{ background:"#080d14", border:"1px solid #1e2d3d",
                borderRadius:6, padding:"8px 12px", textAlign:"center" }}>
                <div style={{ fontSize:16, fontWeight:900,
                  color:w.gap < -15?"#ef4444":"#f59e0b" }}>{w.pos}</div>
                <div style={{ fontSize:8, color:"#4d6880", marginTop:2 }}>
                  {w.mine.toFixed(0)} vs {w.league.toFixed(0)} avg
                </div>
                <div style={{ fontSize:8, fontWeight:700,
                  color:w.gap < 0?"#ef4444":"#22c55e" }}>
                  {w.gap < 0 ? `↓${Math.abs(w.gap).toFixed(0)}` : `↑${w.gap.toFixed(0)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ fontSize:9, color:"#4d6880", marginBottom:10 }}>
        Players on other rosters sorted by fit with your positional needs + BUY signals
      </div>
      {targets.length === 0 ? (
        <div style={{ padding:32, textAlign:"center", color:"#4d6880", fontSize:11 }}>
          No trade targets identified — run Intel Scan for signal data
        </div>
      ) : (
        <div style={{ border:"1px solid #1e2d3d", borderRadius:10, overflow:"hidden" }}>
          {targets.map(p => {
            const n  = newsMap?.[p.name];
            const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
            const isBuy = n?.signal === "BUY";
            return (
              <div key={p.pid} style={{ display:"flex", alignItems:"center", gap:12,
                padding:"10px 16px", borderBottom:"1px solid #0f1923",
                background:isBuy?"#0a1f0a":"#080d14" }}>
                <div style={{ width:42, textAlign:"center", flexShrink:0 }}>
                  <div style={{ fontSize:16, fontWeight:900, color:ts.text }}>{p.score}</div>
                  <div style={{ fontSize:7, color:ts.text }}>{p.tier}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{p.name}</span>
                    {isBuy && <span style={{ fontSize:7, background:"#22c55e", color:"#080d14",
                      borderRadius:3, padding:"1px 6px", fontWeight:900 }}>BUY</span>}
                  </div>
                  <div style={{ fontSize:9, color:"#7a95ae", marginTop:2 }}>
                    {p.pos} · {p.team}{p.age ? ` · Age ${p.age}` : ""}
                    {p.ppg != null ? ` · ${p.ppg} ppg` : ""}
                    {p.owner ? ` · ${p.owner}` : ""}
                  </div>
                </div>
                <div style={{ fontSize:9, color:"#60a5fa", fontWeight:700 }}>{p.pos}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── ROSTER TAB ────────────────────────────────────────────────────────────────
function RosterTab({ roster, newsMap, setDetail }) {
  const [posFilter, setPosFilter] = useState("ALL");
  const [sortKey,   setSortKey]   = useState("score");
  const filtered = roster
    .filter(p => posFilter === "ALL" || p.pos === posFilter)
    .sort((a,b) =>
      sortKey === "age" ? (a.age||99)-(b.age||99)
      : sortKey === "ppg" ? (b.ppg||0)-(a.ppg||0)
      : b.score - a.score
    );
  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:12, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:0, border:"1px solid #1e2d3d", borderRadius:6, overflow:"hidden" }}>
          {["ALL",...POS_ORDER].map(pos => (
            <button key={pos} onClick={() => setPosFilter(pos)}
              style={{ background:posFilter===pos?"#0c1e35":"transparent",
                color:posFilter===pos?"#60a5fa":"#4d6880",
                border:"none", padding:"5px 9px", fontFamily:"inherit",
                fontSize:9, cursor:"pointer", fontWeight:posFilter===pos?700:400,
                borderRight:"1px solid #1e2d3d" }}>
              {pos}
            </button>
          ))}
        </div>
        <div style={{ display:"flex", gap:0, border:"1px solid #1e2d3d", borderRadius:6, overflow:"hidden" }}>
          {[["score","SCORE"],["age","AGE"],["ppg","PPG"]].map(([k,l]) => (
            <button key={k} onClick={() => setSortKey(k)}
              style={{ background:sortKey===k?"#0c1e35":"transparent",
                color:sortKey===k?"#60a5fa":"#4d6880",
                border:"none", padding:"5px 10px", fontFamily:"inherit",
                fontSize:9, cursor:"pointer", fontWeight:sortKey===k?700:400,
                borderRight:"1px solid #1e2d3d" }}>
              {l}
            </button>
          ))}
        </div>
        <span style={{ fontSize:9, color:"#4d6880" }}>{filtered.length} players</span>
      </div>
      <div style={{ border:"1px solid #1e2d3d", borderRadius:10, overflow:"hidden" }}>
        {filtered.map(p => <PlayerRow key={p.pid} p={p} newsMap={newsMap} onClick={setDetail} />)}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
export function TeamHub({ phase, players, owners, currentOwner, newsMap = {}, setDetail }) {
  const [tab, setTab] = useState("overview");

  if (phase !== "done" || !currentOwner) {
    return (
      <div style={{ textAlign:"center", padding:56, border:"1px dashed #1e2d3d", borderRadius:12 }}>
        <div style={{ fontSize:11, color:"#f59e0b", letterSpacing:2, marginBottom:8 }}>
          {!currentOwner ? "SET YOUR TEAM FIRST" : "SYNC DATA TO VIEW TEAM HUB"}
        </div>
        <div style={{ fontSize:10, color:"#4d6880" }}>
          {!currentOwner ? "Click ◎ in the top bar to identify your team"
            : "Use ⟳ SYNC DATA in the top-right corner"}
        </div>
      </div>
    );
  }

  const myGrade = gradeRoster(currentOwner, players);
  if (!myGrade) return (
    <div style={{ padding:40, textAlign:"center", color:"#4d6880", fontSize:11 }}>
      No roster data for {currentOwner}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", gap:0, borderBottom:"1px solid #1e2d3d", marginBottom:20 }}>
        {TABS.map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ background:"none", border:"none",
              borderBottom:tab===key?"2px solid #22c55e":"2px solid transparent",
              color:tab===key?"#22c55e":"#4b6580",
              padding:"6px 16px", fontFamily:"inherit",
              fontSize:10, letterSpacing:2, fontWeight:tab===key?700:400, cursor:"pointer" }}>
            {label}
          </button>
        ))}
      </div>
      {tab==="overview"  && <Overview myGrade={myGrade} owners={owners} players={players}
        newsMap={newsMap} currentOwner={currentOwner} setTab={setTab} />}
      {tab==="roster"    && <RosterTab roster={myGrade.roster} newsMap={newsMap} setDetail={setDetail} />}
      {tab==="sellhigh"  && <SellHighTab roster={myGrade.roster} newsMap={newsMap} />}
      {tab==="targets"   && <TargetsTab currentOwner={currentOwner} myGrade={myGrade}
        players={players} newsMap={newsMap} />}
    </div>
  );
}
