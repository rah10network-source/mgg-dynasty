// ─── DRAFT ROOM ───────────────────────────────────────────────────────────────
// Mock mode: simulate a draft with AI suggestions at your pick slot
// Live mode: connect to Sleeper draft API and track in real-time
import { useState, useEffect, useCallback } from "react";
import { TIER_STYLE, POS_ORDER, INJ_COLOR } from "../../constants";
import { calcAge } from "../../scoring";

const LEAGUE_ID   = import.meta.env?.VITE_LEAGUE_ID || "1178580692040589312";
const SLEEPER_API = "https://api.sleeper.app/v1";

// ── HELPERS ───────────────────────────────────────────────────────────────────
// Snake draft order: given teams N and total rounds, return [{round, slot, teamSlot}]
const buildSnakeOrder = (teams, rounds) => {
  const picks = [];
  for (let r = 1; r <= rounds; r++) {
    const slots = r % 2 === 1
      ? Array.from({length:teams}, (_,i)=>i+1)
      : Array.from({length:teams}, (_,i)=>teams-i);
    slots.forEach((ts, i) => picks.push({
      pick:   (r-1)*teams + i + 1,
      round:  r,
      slot:   ts,
      isSnakeReverse: r%2===0,
    }));
  }
  return picks;
};

// Score a player for AI suggestion (uses dynasty score if rostered, otherwise basic estimate)
const scoreForDraft = (p, bigBoard, players) => {
  const bbRank = bigBoard.findIndex(b => b.pid === p.pid);
  if (bbRank >= 0) return 1000 - bbRank; // Big Board rank is authoritative
  const roster = players.find(pl => pl.pid === p.pid);
  if (roster) return roster.score || 0;
  // Fallback: prefer depth #1 young players
  const age = p.age || 25;
  const depthBonus = p.depth===1?20:p.depth===2?10:0;
  return Math.max(0, 80 - age*1.5 + depthBonus + (p.yrsExp===0?15:0));
};

// ── MOCK DRAFT ────────────────────────────────────────────────────────────────
function MockDraft({ owners, players, nflDb, bigBoard, bigBoardMode, currentOwner }) {
  const [cfg, setCfg] = useState({
    teams:  owners.length || 12,
    rounds: 5,
    yourSlot: 1,
    mode:   "rookies",
  });
  const [started, setStarted] = useState(false);
  const [picks,   setPicks]   = useState([]); // [{pick, round, slot, pid, name, pos, team, auto}]
  const [drafted, setDrafted] = useState(new Set());
  const [inputSearch, setInputSearch]  = useState("");
  const [confirming,  setConfirming]   = useState(false); // waiting for user to pick

  const order    = started ? buildSnakeOrder(cfg.teams, cfg.rounds) : [];
  const donePick = picks.length;
  const current  = order[donePick];
  const isMyPick = current?.slot === cfg.yourSlot;
  const isDone   = donePick >= order.length;

  // Build available pool
  const pool = Object.entries(nflDb)
    .filter(([pid, p]) => {
      if (drafted.has(pid)) return false;
      if (!p.position || !["QB","RB","WR","TE","DL","LB","DB","K"].includes(p.position)) return false;
      if (cfg.mode==="rookies" && (p.years_exp??99) !== 0) return false;
      return true;
    })
    .map(([pid, p]) => ({
      pid, pos:p.position,
      name: p.full_name||`${p.first_name||""} ${p.last_name||""}`.trim(),
      team: p.team||"FA",
      age:  calcAge(p.birth_date),
      depth:p.depth_chart_order||null,
      yrsExp:p.years_exp??null,
      get score(){ return scoreForDraft(this, bigBoard, players); },
    }))
    .sort((a,b) => b.score-a.score);

  const suggestions = pool.slice(0, 5);
  const filteredPool = inputSearch
    ? pool.filter(p => p.name.toLowerCase().includes(inputSearch.toLowerCase())
                    || p.pos.toLowerCase().includes(inputSearch.toLowerCase()))
         .slice(0, 20)
    : pool.slice(0, 20);

  const makePick = useCallback((player, auto=false) => {
    if (!current) return;
    setPicks(prev => [...prev, {
      ...current,
      pid: player.pid, name: player.name,
      pos: player.pos, team: player.team,
      auto,
    }]);
    setDrafted(prev => new Set([...prev, player.pid]));
    setConfirming(false);
    setInputSearch("");
  }, [current]);

  // Auto-advance non-user picks
  useEffect(() => {
    if (!started || isDone || isMyPick || confirming) return;
    const timer = setTimeout(() => {
      if (pool.length > 0) makePick(pool[0], true);
    }, 400);
    return () => clearTimeout(timer);
  }, [started, donePick, isMyPick, isDone, confirming]);

  if (!started) {
    return (
      <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:10,
        padding:"24px 28px",maxWidth:520}}>
        <div style={{fontSize:11,color:"#22c55e",letterSpacing:2,fontWeight:700,marginBottom:16}}>
          ⬡ MOCK DRAFT SETUP
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {[
            ["Teams", "teams", [8,10,12,14,16]],
            ["Rounds","rounds",[3,4,5,6,7,8]],
            ["Your Slot","yourSlot",Array.from({length:cfg.teams},(_,i)=>i+1)],
          ].map(([label,key,opts])=>(
            <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:"#e2e8f0"}}>{label}</span>
              <select value={cfg[key]}
                onChange={e=>setCfg(prev=>({...prev,[key]:Number(e.target.value)}))}
                style={{background:"#080d14",border:"1px solid #1e2d3d",color:"#e2e8f0",
                  padding:"6px 12px",borderRadius:5,fontFamily:"inherit",fontSize:11}}>
                {opts.map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,color:"#e2e8f0"}}>Player Pool</span>
            <div style={{display:"flex",gap:0,border:"1px solid #1e2d3d",borderRadius:5,overflow:"hidden"}}>
              {[["rookies","ROOKIES"],["all","ROOKIES + VETS"]].map(([m,l])=>(
                <button key={m} onClick={()=>setCfg(p=>({...p,mode:m}))}
                  style={{background:cfg.mode===m?"#0f2b1a":"transparent",
                    color:cfg.mode===m?"#22c55e":"#4b6580",
                    border:"none",padding:"6px 12px",fontFamily:"inherit",
                    fontSize:9,fontWeight:cfg.mode===m?700:400,cursor:"pointer",
                    borderRight:"1px solid #1e2d3d"}}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div style={{fontSize:9,color:"#4d6880",marginTop:4}}>
            Snake draft · AI auto-picks for other teams using dynasty scores + your Big Board ·
            your Big Board rankings take priority for suggestions
          </div>
          <button onClick={()=>{ setStarted(true); setPicks([]); setDrafted(new Set()); }}
            style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#080d14",
              border:"none",borderRadius:8,padding:"11px 24px",fontFamily:"inherit",
              fontWeight:900,fontSize:11,letterSpacing:2,cursor:"pointer",marginTop:6}}>
            ⬡ START MOCK DRAFT
          </button>
        </div>
      </div>
    );
  }

  // ── Draft in progress ───────────────────────────────────────────────────
  const roundPicks = (r) => picks.filter(p => p.round===r);
  const myPicks    = picks.filter(p => p.slot === cfg.yourSlot);

  return (
    <div>
      {/* Status bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <span style={{fontSize:11,color:isDone?"#22c55e":isMyPick?"#f59e0b":"#60a5fa",
            fontWeight:900,letterSpacing:2}}>
            {isDone ? "✓ DRAFT COMPLETE" : isMyPick ? `⬡ YOUR PICK — Round ${current?.round}, Pick ${current?.pick}` : `◌ AUTO-PICKING — Round ${current?.round}, Slot ${current?.slot}`}
          </span>
          <div style={{fontSize:9,color:"#4d6880",marginTop:2}}>
            {donePick}/{order.length} picks made · {cfg.teams} teams · {cfg.rounds} rounds · snake
          </div>
        </div>
        <button onClick={()=>{setStarted(false);setPicks([]);setDrafted(new Set());}}
          style={{background:"#1e2d3d",color:"#7a95ae",border:"1px solid #374151",
            borderRadius:6,padding:"6px 12px",fontFamily:"inherit",fontSize:9,cursor:"pointer",letterSpacing:1}}>
          ↺ RESET
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:14}}>

        {/* Left: pick panel */}
        <div>
          {/* AI suggestions for your pick */}
          {isMyPick && !isDone && (
            <div style={{background:"#0f2b1a",border:"2px solid #22c55e",
              borderRadius:10,padding:"14px 16px",marginBottom:14,
              boxShadow:"0 0 16px rgba(34,197,94,0.15)"}}>
              <div style={{fontSize:9,color:"#22c55e",letterSpacing:2,fontWeight:700,marginBottom:10}}>
                ◈ AI SUGGESTIONS FOR YOUR PICK
              </div>
              {suggestions.map((p,i)=>{
                const bbRank = bigBoard.findIndex(b=>b.pid===p.pid);
                return (
                  <div key={p.pid} onClick={()=>makePick(p)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",
                      background:"#080d14",border:"1px solid #22c55e33",borderRadius:7,
                      marginBottom:5,cursor:"pointer",transition:"border-color .1s"}}
                    onMouseOver={e=>e.currentTarget.style.borderColor="#22c55e"}
                    onMouseOut={e=>e.currentTarget.style.borderColor="#22c55e33"}>
                    <span style={{fontSize:12,fontWeight:900,color:"#22c55e",width:18,textAlign:"center"}}>
                      {i+1}
                    </span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{p.name}</div>
                      <div style={{fontSize:9,color:"#7a95ae"}}>
                        {p.pos} · {p.team}{p.age?` · ${p.age}y`:""}
                        {p.yrsExp===0&&<span style={{color:"#22c55e",marginLeft:4,fontWeight:700}}>ROOKIE</span>}
                      </div>
                    </div>
                    {bbRank>=0&&<span style={{fontSize:8,color:"#f59e0b",fontWeight:700}}>#{bbRank+1} BB</span>}
                    <span style={{fontSize:9,color:"#22c55e",fontWeight:900}}>PICK →</span>
                  </div>
                );
              })}
              {/* Manual override */}
              <div style={{marginTop:8}}>
                <input value={inputSearch} onChange={e=>setInputSearch(e.target.value)}
                  placeholder="Or search to pick someone else..."
                  style={{width:"100%",boxSizing:"border-box",background:"#080d14",
                    border:"1px solid #1e2d3d",color:"#e2e8f0",padding:"6px 10px",
                    borderRadius:5,fontFamily:"inherit",fontSize:10}}/>
                {inputSearch && filteredPool.slice(0,5).map(p=>(
                  <div key={p.pid} onClick={()=>makePick(p)}
                    style={{padding:"6px 10px",background:"#0a1118",borderBottom:"1px solid #0f1923",
                      cursor:"pointer",fontSize:11,color:"#e2e8f0"}}>
                    {p.name} <span style={{fontSize:9,color:"#7a95ae"}}>{p.pos} · {p.team}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* My picks so far */}
          <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:9,color:"#f59e0b",letterSpacing:2,fontWeight:700,marginBottom:10}}>
              YOUR PICKS ({myPicks.length})
            </div>
            {myPicks.length===0
              ? <div style={{fontSize:10,color:"#4d6880"}}>None yet</div>
              : myPicks.map(p=>(
                <div key={p.pick} style={{display:"flex",gap:8,alignItems:"center",
                  padding:"5px 0",borderBottom:"1px solid #0f1923"}}>
                  <span style={{fontSize:9,color:"#4d6880",minWidth:40}}>R{p.round}.{p.pick}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0"}}>{p.name}</div>
                    <div style={{fontSize:9,color:"#7a95ae"}}>{p.pos} · {p.team}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Right: Draft board grid */}
        <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:10,
          padding:"14px 16px",overflowX:"auto"}}>
          <div style={{fontSize:9,color:"#4d6880",letterSpacing:2,fontWeight:700,marginBottom:10}}>
            DRAFT BOARD
          </div>
          <table style={{borderCollapse:"collapse",width:"100%",minWidth:320}}>
            <thead>
              <tr>
                <th style={{padding:"4px 6px",fontSize:8,color:"#4d6880",letterSpacing:1,textAlign:"left",
                  borderBottom:"1px solid #1e2d3d"}}>RND</th>
                {Array.from({length:cfg.teams},(_,i)=>(
                  <th key={i} style={{padding:"4px 5px",fontSize:8,
                    color:i+1===cfg.yourSlot?"#22c55e":"#4d6880",
                    letterSpacing:1,textAlign:"center",borderBottom:"1px solid #1e2d3d",
                    fontWeight:i+1===cfg.yourSlot?900:400,minWidth:70}}>
                    {i+1===cfg.yourSlot?"YOU":owners[i]?.split(" ")[0]||`T${i+1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({length:cfg.rounds},(_,ri)=>{
                const r = ri+1;
                const rowPicks = order.filter(o=>o.round===r);
                return (
                  <tr key={r}>
                    <td style={{padding:"4px 6px",fontSize:9,color:"#4d6880",
                      borderBottom:"1px solid #0f1923",fontWeight:700}}>R{r}</td>
                    {rowPicks.map(o=>{
                      const made = picks.find(pk=>pk.pick===o.pick);
                      const isYou = o.slot===cfg.yourSlot;
                      const isCurr = current?.pick===o.pick;
                      return (
                        <td key={o.pick}
                          style={{padding:"4px 5px",borderBottom:"1px solid #0f1923",
                            background:isCurr?"#0f2b1a":isYou?"#0a1220":"transparent",
                            border:isCurr?"1px solid #22c55e44":undefined,
                            textAlign:"center",verticalAlign:"top"}}>
                          {made ? (
                            <div>
                              <div style={{fontSize:9,fontWeight:700,
                                color:isYou?"#22c55e":"#e2e8f0",lineHeight:1.2}}>
                                {made.name.split(" ").slice(-1)[0]}
                              </div>
                              <div style={{fontSize:7,color:"#4d6880"}}>{made.pos}</div>
                            </div>
                          ) : (
                            <span style={{fontSize:7,color:isCurr?"#22c55e":"#2a3d52"}}>
                              {isCurr?"●":"·"}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── LIVE DRAFT ────────────────────────────────────────────────────────────────
function LiveDraft({ liveDraftId, setLiveDraftId, players, bigBoard, owners, currentOwner }) {
  const [drafts,    setDrafts]    = useState([]);
  const [draft,     setDraft]     = useState(null);
  const [picks,     setPicks]     = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [polling,   setPolling]   = useState(false);
  const [manualId,  setManualId]  = useState(liveDraftId||"");
  const [error,     setError]     = useState(null);

  // Auto-fetch league drafts on mount
  useEffect(()=>{
    (async()=>{
      try {
        const r = await fetch(`${SLEEPER_API}/league/${LEAGUE_ID}/drafts`,
          {signal:AbortSignal.timeout(8000)});
        if (r.ok) {
          const d = await r.json();
          setDrafts(d||[]);
          // Auto-select the most recent/upcoming draft
          const active = d.find(dr=>dr.status==="in_progress") || d[d.length-1];
          if (active && !liveDraftId) setLiveDraftId(active.draft_id);
        }
      } catch {}
    })();
  },[]);

  const loadDraft = useCallback(async(id)=>{
    if (!id) return;
    setLoading(true); setError(null);
    try {
      const [draftRes, picksRes] = await Promise.all([
        fetch(`${SLEEPER_API}/draft/${id}`,{signal:AbortSignal.timeout(8000)}),
        fetch(`${SLEEPER_API}/draft/${id}/picks`,{signal:AbortSignal.timeout(8000)}),
      ]);
      if (!draftRes.ok || !picksRes.ok) throw new Error("Failed to load draft");
      const [draftData, picksData] = await Promise.all([draftRes.json(), picksRes.json()]);
      setDraft(draftData);
      setPicks(picksData||[]);
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  },[]);

  // Poll every 15s when in-progress
  useEffect(()=>{
    if (!liveDraftId || draft?.status !== "in_progress") return;
    setPolling(true);
    const interval = setInterval(()=>loadDraft(liveDraftId), 15000);
    return ()=>{ clearInterval(interval); setPolling(false); };
  },[liveDraftId, draft?.status]);

  useEffect(()=>{ if (liveDraftId) loadDraft(liveDraftId); },[liveDraftId]);

  const myRosterId = draft
    ? Object.entries(draft.draft_order||{}).find(([uid])=>
        owners.includes(currentOwner) // simplified — would need full userMap
      )?.[0]
    : null;

  return (
    <div>
      {/* Draft selector */}
      <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:10,
        padding:"14px 18px",marginBottom:16}}>
        <div style={{fontSize:9,color:"#7a95ae",letterSpacing:2,fontWeight:700,marginBottom:10}}>
          SELECT DRAFT
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",marginBottom:10}}>
          {drafts.map(d=>(
            <button key={d.draft_id} onClick={()=>{ setLiveDraftId(d.draft_id); setManualId(d.draft_id); }}
              style={{background:liveDraftId===d.draft_id?"#0c1e35":"#080d14",
                color:liveDraftId===d.draft_id?"#60a5fa":"#7a95ae",
                border:`1px solid ${liveDraftId===d.draft_id?"#3b82f6":"#1e2d3d"}`,
                borderRadius:6,padding:"6px 12px",fontFamily:"inherit",
                fontSize:10,cursor:"pointer",fontWeight:liveDraftId===d.draft_id?700:400}}>
              {d.season} {d.type?.toUpperCase()||"DRAFT"}
              <span style={{fontSize:8,marginLeft:6,
                color:d.status==="in_progress"?"#22c55e":d.status==="complete"?"#6b7280":"#f59e0b"}}>
                {d.status}
              </span>
            </button>
          ))}
        </div>
        <div style={{display:"flex",gap:8}}>
          <input value={manualId} onChange={e=>setManualId(e.target.value)}
            placeholder="Or paste a draft ID..."
            style={{flex:1,background:"#080d14",border:"1px solid #1e2d3d",color:"#e2e8f0",
              padding:"6px 10px",borderRadius:5,fontFamily:"monospace",fontSize:10}}/>
          <button onClick={()=>{ setLiveDraftId(manualId); loadDraft(manualId); }}
            style={{background:"#1e2d3d",color:"#e2e8f0",border:"1px solid #374151",
              borderRadius:5,padding:"6px 14px",fontFamily:"inherit",fontSize:10,cursor:"pointer"}}>
            LOAD
          </button>
        </div>
      </div>

      {/* Status */}
      {loading && <div style={{padding:32,textAlign:"center",color:"#60a5fa",fontSize:11,letterSpacing:2}}>◌ LOADING DRAFT...</div>}
      {error   && <div style={{padding:16,color:"#ef4444",fontSize:11}}>⚠ {error}</div>}

      {draft && !loading && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0"}}>
              {draft.season} Draft
            </div>
            <span style={{fontSize:9,background:draft.status==="in_progress"?"#0f2b1a":"#111827",
              color:draft.status==="in_progress"?"#22c55e":"#6b7280",
              border:`1px solid ${draft.status==="in_progress"?"#22c55e44":"#374151"}`,
              borderRadius:3,padding:"2px 8px",fontWeight:700,letterSpacing:1}}>
              {draft.status?.toUpperCase()}
            </span>
            <span style={{fontSize:9,color:"#4d6880"}}>
              {picks.length}/{(draft.settings?.teams||12)*(draft.settings?.rounds||5)} picks made
            </span>
            {polling && <span style={{fontSize:8,color:"#22c55e",letterSpacing:1}}>● LIVE (polling 15s)</span>}
          </div>

          {/* Picks list */}
          <div style={{borderRadius:8,border:"1px solid #1e2d3d",overflow:"hidden",maxHeight:500,overflowY:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr>
                  {[["PICK",50],["ROUND",55],["PLAYER",180],["POS",44],["TEAM",55],["OWNER",140]].map(([h,w])=>(
                    <th key={h} style={{padding:"6px 8px",background:"#0c151e",color:"#7a95ae",
                      fontSize:9,letterSpacing:1.5,fontWeight:700,textAlign:"center",
                      borderRight:"1px solid #1e2d3d",width:w,position:"sticky",top:0}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...picks].reverse().map((pk,i)=>{
                  const bbRank = bigBoard.findIndex(b=>b.name===pk.metadata?.first_name+" "+pk.metadata?.last_name||(b.name||"").toLowerCase().includes((pk.metadata?.last_name||"").toLowerCase()));
                  return (
                    <tr key={pk.pick_no} style={{background:i%2===0?"#080d14":"#0a1118"}}>
                      <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:10,color:"#4d6880"}}>{pk.pick_no}</td>
                      <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:10,color:"#7a95ae"}}>R{pk.round}</td>
                      <td style={{padding:"6px 10px",borderBottom:"1px solid #0f1923",fontWeight:600,color:"#e2e8f0",fontSize:11}}>
                        {pk.metadata?.first_name} {pk.metadata?.last_name}
                        {bbRank>=0&&<span style={{fontSize:8,color:"#f59e0b",marginLeft:5}}>#{bbRank+1} BB</span>}
                      </td>
                      <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:10,color:"#60a5fa"}}>{pk.metadata?.position}</td>
                      <td style={{padding:"6px 8px",textAlign:"center",borderBottom:"1px solid #0f1923",fontSize:10,color:"#7a95ae"}}>{pk.metadata?.team}</td>
                      <td style={{padding:"6px 10px",borderBottom:"1px solid #0f1923",fontSize:10,color:"#a8bccf"}}>{pk.picked_by||"—"}</td>
                    </tr>
                  );
                })}
                {picks.length===0&&(
                  <tr><td colSpan={6} style={{padding:24,textAlign:"center",color:"#4d6880",fontSize:10}}>
                    No picks made yet
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export function DraftRoom({
  phase, players, nflDb, owners, currentOwner,
  bigBoard, bigBoardMode,
  draftRoomMode, setDraftRoomMode,
  liveDraftId, setLiveDraftId,
}) {
  if (phase !== "done") {
    return (
      <div style={{textAlign:"center",padding:48,border:"1px dashed #1e2d3d",borderRadius:12}}>
        <div style={{fontSize:11,color:"#7a95ae",letterSpacing:2}}>SYNC DATA FIRST TO USE DRAFT ROOM</div>
      </div>
    );
  }

  return (
    <div>
      {/* Mode toggle */}
      <div style={{display:"flex",gap:0,marginBottom:20,background:"#080d14",
        border:"1px solid #1e2d3d",borderRadius:7,overflow:"hidden",width:"fit-content"}}>
        {[["mock","◈ MOCK DRAFT"],["live","▸ LIVE DRAFT"]].map(([m,l])=>(
          <button key={m} onClick={()=>setDraftRoomMode(m)}
            style={{background:draftRoomMode===m?"linear-gradient(135deg,#0c1e35,#0f2b1a)":"transparent",
              color:draftRoomMode===m?"#22c55e":"#4b6580",
              border:"none",padding:"9px 20px",fontFamily:"inherit",
              fontSize:10,fontWeight:draftRoomMode===m?900:400,
              letterSpacing:2,cursor:"pointer",
              borderRight:"1px solid #1e2d3d"}}>
            {l}
          </button>
        ))}
      </div>

      {draftRoomMode==="mock" && (
        <MockDraft
          owners={owners}
          players={players}
          nflDb={nflDb}
          bigBoard={bigBoard}
          bigBoardMode={bigBoardMode}
          currentOwner={currentOwner}
        />
      )}
      {draftRoomMode==="live" && (
        <LiveDraft
          liveDraftId={liveDraftId}
          setLiveDraftId={setLiveDraftId}
          players={players}
          bigBoard={bigBoard}
          owners={owners}
          currentOwner={currentOwner}
        />
      )}
    </div>
  );
}
