// ─── BIG BOARD ────────────────────────────────────────────────────────────────
// Personal pre-draft ranking board. Persists to localStorage.
// v1.1.4: Intel Scan per board player (deepAnalyse + claudeAnalyse)
//         Draft pool uses filterDraftPool from draft.js (active player gate)
//         Prospect score shown for each player (estimateBaseScore via scoreDraftPlayer)
import { useState, useMemo, useCallback } from "react";
import { TIER_STYLE, INJ_COLOR, SIG_COLORS, POS_ORDER, SITUATION_FLAGS } from "../../constants";
import { filterDraftPool, scoreDraftPlayer } from "../../draft";

const ROUND_COLORS = ["#22c55e","#60a5fa","#f59e0b","#f97316","#a855f7"];

// ─── Intel badge ──────────────────────────────────────────────────────────────
function IntelBadge({ result }) {
  if (!result) return null;
  const col = SIG_COLORS[result.signal] || "#4d6880";
  const flagInfo = result.flag ? SITUATION_FLAGS[result.flag] : null;
  return (
    <div style={{ marginTop:4, display:"flex", flexDirection:"column", gap:3 }}>
      <div style={{ display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
        <span style={{ fontSize:7, background:col, color:"#080d14",
          borderRadius:3, padding:"1px 6px", fontWeight:900, letterSpacing:1 }}>
          {result.signal}
        </span>
        {result.flag && (
          <span style={{ fontSize:7,
            color: flagInfo?.color || "#f59e0b",
            background: (flagInfo?.color || "#f59e0b") + "18",
            border: `1px solid ${(flagInfo?.color || "#f59e0b")}44`,
            borderRadius:3, padding:"1px 5px", fontWeight:700, letterSpacing:1 }}>
            {flagInfo?.label || result.flag.replace(/_/g," ")}
          </span>
        )}
        {result.status === "loading" && (
          <span style={{ fontSize:8, color:"#4d6880", fontStyle:"italic" }}>scanning...</span>
        )}
      </div>
      {result.note && result.status !== "loading" && (
        <div style={{ fontSize:8, color:"#7a95ae", fontStyle:"italic",
          maxWidth:320, lineHeight:1.4 }}>
          {result.note.slice(0, 100)}{result.note.length > 100 ? "…" : ""}
        </div>
      )}
      {result.approved === false && result.status === "done" && result.signal !== "HOLD" && (
        <div style={{ fontSize:7, color:"#4d6880" }}>
          ↑ auto-detected · not saved to situations
        </div>
      )}
    </div>
  );
}

// ─── Prospect score badge ─────────────────────────────────────────────────────
function ProspectScore({ score, pos }) {
  if (score == null) return null;
  const color = score >= 75 ? "#22c55e" : score >= 55 ? "#f59e0b" : "#4d6880";
  return (
    <div style={{ textAlign:"center", minWidth:36 }}>
      <div style={{ fontSize:16, fontWeight:900, color, lineHeight:1 }}>
        {Math.round(score)}
      </div>
      <div style={{ fontSize:7, color:"#4d6880", letterSpacing:1 }}>SCORE</div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function BigBoard({
  nflDb, players,
  bigBoard, bigBoardMode, setBigBoardMode,
  bigBoardAdd, bigBoardRemove, bigBoardMove, bigBoardNote, bigBoardClear,
  phase,
}) {
  const [searchQ,     setSearchQ]     = useState("");
  const [posF,        setPosF]        = useState("ALL");
  const [editingNote, setEditingNote] = useState(null);
  const [noteText,    setNoteText]    = useState("");
  const [roundSize,   setRoundSize]   = useState(12);

  // Intel Scan state — keyed by pid
  const [intelResults, setIntelResults] = useState({});
  const [intelRunning, setIntelRunning] = useState(false);
  const [intelSources, setIntelSources] = useState(null); // { headlines, trending }

  const rosteredPids = useMemo(() => new Set(players.map(p => p.pid)), [players]);

  // Draft pool via filterDraftPool (active player gate + mode filter)
  const boardPids = useMemo(() => new Set(bigBoard.map(b => b.pid)), [bigBoard]);

  const pool = useMemo(() => {
    if (Object.keys(nflDb).length === 0) return [];
    return filterDraftPool(nflDb, {
      mode: bigBoardMode,
      rosteredPids,
      excludePids: boardPids,
      posFilter: posF,
      searchQ,
    })
    .map(p => ({
      ...p,
      prospectScore: scoreDraftPlayer(p, bigBoard, players, "BPA"),
    }))
    .sort((a, b) => {
      // Rookies: depth chart starters first, then by prospect score
      if (a.depth === 1 && b.depth !== 1) return -1;
      if (b.depth === 1 && a.depth !== 1) return 1;
      return b.prospectScore - a.prospectScore;
    })
    .slice(0, 150);
  }, [nflDb, bigBoard, bigBoardMode, posF, searchQ, rosteredPids, boardPids, players]);

  // ── Intel Scan ────────────────────────────────────────────────────────────
  const runBoardIntel = useCallback(async () => {
    if (!bigBoard.length || intelRunning) return;
    setIntelRunning(true);

    // Fetch sources once
    let sources = intelSources;
    if (!sources) {
      try {
        const { fetchIntelSources } = await import("../../intel.js");
        sources = await fetchIntelSources();
        setIntelSources(sources);
      } catch {
        sources = { headlines: [], trending: [] };
        setIntelSources(sources);
      }
    }

    const { headlines } = sources;

    // Mark all as loading
    const loadingState = {};
    bigBoard.forEach(p => { loadingState[p.pid] = { status:"loading", signal:"HOLD", note:"" }; });
    setIntelResults(prev => ({ ...prev, ...loadingState }));

    // Run deepAnalyse for each board player
    const { deepAnalyse } = await import("../../intel.js");
    const results = {};

    for (const bp of bigBoard) {
      // Build a minimal player object for deepAnalyse
      const nflP = nflDb[bp.pid];
      const playerData = {
        name:       bp.name,
        pos:        bp.pos,
        team:       bp.team,
        age:        bp.age,
        yrsExp:     bp.yrsExp ?? nflP?.years_exp ?? null,
        depthOrder: bp.depth ?? nflP?.depth_chart_order ?? null,
        ppg:        null,
        gamesStarted: null,
        trades:     0,
        adds:       0,
        drops:      0,
        injStatus:  bp.inj ?? null,
        status:     nflP?.status ?? null,
      };

      const result = deepAnalyse(bp.name, headlines, playerData);
      results[bp.pid] = result
        ? { ...result, status:"done" }
        : { status:"done", signal:"HOLD", note:"No recent news found", flag:null };
    }

    setIntelResults(prev => ({ ...prev, ...results }));
    setIntelRunning(false);
  }, [bigBoard, intelRunning, intelSources, nflDb]);

  if (phase !== "done" && Object.keys(nflDb).length === 0) {
    return (
      <div style={{textAlign:"center",padding:48,border:"1px dashed #1e2d3d",borderRadius:12}}>
        <div style={{fontSize:11,color:"#7a95ae",letterSpacing:2}}>SYNC DATA FIRST TO BUILD YOUR BOARD</div>
      </div>
    );
  }

  const getRound = (idx) => Math.floor(idx / roundSize) + 1;
  const hasIntel = Object.keys(intelResults).length > 0;

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1.5fr",gap:14,alignItems:"start"}}>

      {/* ── LEFT: Available Pool ──────────────────────────────────────────── */}
      <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:10,
        padding:"14px 16px",position:"sticky",top:18}}>

        {/* Mode toggle */}
        <div style={{display:"flex",gap:0,marginBottom:12,background:"#080d14",
          borderRadius:6,border:"1px solid #1e2d3d",overflow:"hidden"}}>
          {[["rookies","◈ ROOKIES"],["all","◈ ROOKIES + VETS"]].map(([m,l]) => (
            <button key={m} onClick={() => setBigBoardMode(m)}
              style={{flex:1,background:bigBoardMode===m?"#0f2b1a":"transparent",
                color:bigBoardMode===m?"#22c55e":"#4b6580",
                border:"none",padding:"7px 8px",fontFamily:"inherit",
                fontSize:9,fontWeight:bigBoardMode===m?700:400,
                letterSpacing:1,cursor:"pointer",borderRight:"1px solid #1e2d3d"}}>
              {l}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
            placeholder="Search player..."
            style={{flex:1,minWidth:100,background:"#080d14",border:"1px solid #1e2d3d",
              color:"#e2e8f0",padding:"5px 8px",borderRadius:4,fontFamily:"inherit",fontSize:10}}/>
          <select value={posF} onChange={e=>setPosF(e.target.value)}
            style={{background:"#080d14",border:"1px solid #1e2d3d",color:"#e2e8f0",
              padding:"5px 6px",borderRadius:4,fontFamily:"inherit",fontSize:10}}>
            <option value="ALL">ALL</option>
            {POS_ORDER.map(p=><option key={p}>{p}</option>)}
          </select>
        </div>

        <div style={{fontSize:9,color:"#4d6880",letterSpacing:1,marginBottom:8}}>
          {pool.length} AVAILABLE · CLICK TO ADD · SCORE = DYNASTY ESTIMATE
        </div>

        {/* Pool list */}
        <div style={{maxHeight:480,overflowY:"auto",display:"flex",flexDirection:"column",gap:4}}>
          {pool.length === 0 && (
            <div style={{fontSize:10,color:"#4d6880",padding:"16px 0",textAlign:"center"}}>
              {bigBoardMode==="rookies"
                ? "No rookies found — Sleeper adds rookie data before the draft"
                : "No available players match filters"}
            </div>
          )}
          {pool.map(p => (
            <div key={p.pid} onClick={() => bigBoardAdd(p)}
              style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",
                background:"#080d14",border:"1px solid #1e2d3d",borderRadius:6,
                cursor:"pointer",transition:"border-color .15s"}}
              onMouseOver={e => e.currentTarget.style.borderColor="#22c55e55"}
              onMouseOut={e  => e.currentTarget.style.borderColor="#1e2d3d"}>

              {/* Prospect score */}
              <div style={{width:30,textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:13,fontWeight:900,
                  color: p.prospectScore>=75?"#22c55e":p.prospectScore>=55?"#f59e0b":"#4d6880",
                  lineHeight:1}}>
                  {Math.round(p.prospectScore)}
                </div>
              </div>

              <div style={{flex:1}}>
                <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0"}}>{p.name}</div>
                <div style={{fontSize:9,color:"#7a95ae",marginTop:1}}>
                  {p.pos} · {p.team}
                  {p.age  ? ` · ${p.age}y` : ""}
                  {p.yrsExp === 0 ? <span style={{color:"#22c55e",fontWeight:700,marginLeft:4}}>ROOKIE</span> : ""}
                  {p.college ? <span style={{color:"#4d6880",marginLeft:4}}>· {p.college}</span> : ""}
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
                {p.depth && (
                  <span style={{fontSize:8,color:p.depth===1?"#22c55e":"#f59e0b"}}>D#{p.depth}</span>
                )}
                {p.inj && (
                  <span style={{fontSize:8,color:INJ_COLOR[p.inj]||"#ef4444",fontWeight:700}}>{p.inj}</span>
                )}
                <span style={{fontSize:9,color:"#22c55e",fontWeight:700}}>+</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT: Big Board ──────────────────────────────────────────────── */}
      <div>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div>
            <div style={{fontSize:11,color:"#f59e0b",letterSpacing:2,fontWeight:700}}>
              ◈ YOUR BIG BOARD
            </div>
            <div style={{fontSize:9,color:"#4d6880",marginTop:2}}>
              {bigBoard.length} players ranked · ↑↓ to reorder · ✎ to add a note
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>

            {/* Intel Scan button */}
            {bigBoard.length > 0 && (
              <button
                onClick={runBoardIntel}
                disabled={intelRunning}
                style={{
                  background: intelRunning ? "#1e2d3d" : hasIntel ? "#0c2218" : "#0a1a2e",
                  color: intelRunning ? "#4d6880" : hasIntel ? "#22c55e" : "#60a5fa",
                  border: `1px solid ${intelRunning?"#1e2d3d":hasIntel?"#22c55e44":"#3b82f644"}`,
                  borderRadius:4, padding:"5px 12px", fontFamily:"inherit",
                  fontSize:9, cursor:intelRunning?"default":"pointer", letterSpacing:1, fontWeight:700,
                }}>
                {intelRunning ? "◌ SCANNING..." : hasIntel ? "↺ RE-SCAN INTEL" : "◈ INTEL SCAN"}
              </button>
            )}

            {/* Round size */}
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:9,color:"#4d6880"}}>Round</span>
              <select value={roundSize} onChange={e=>setRoundSize(Number(e.target.value))}
                style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
                  padding:"3px 6px",borderRadius:4,fontFamily:"inherit",fontSize:9}}>
                {[6,8,10,12,14].map(n=><option key={n}>{n}</option>)}
              </select>
            </div>

            {bigBoard.length > 0 && (
              <button onClick={bigBoardClear}
                style={{background:"#1a0505",color:"#ef4444",border:"1px solid #3d1515",
                  borderRadius:4,padding:"5px 10px",fontFamily:"inherit",
                  fontSize:9,cursor:"pointer",letterSpacing:1}}>
                ✕ CLEAR
              </button>
            )}
          </div>
        </div>

        {/* Intel summary bar */}
        {hasIntel && !intelRunning && (
          <div style={{marginBottom:12,padding:"8px 12px",background:"#0a1118",
            border:"1px solid #1e2d3d",borderRadius:8,
            display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
            <span style={{fontSize:8,color:"#4d6880",letterSpacing:1}}>BOARD INTEL</span>
            {["BUY","WATCH","SELL","HOLD"].map(sig => {
              const cnt = Object.values(intelResults).filter(r => r.signal === sig && r.status==="done").length;
              if (!cnt) return null;
              return (
                <span key={sig} style={{fontSize:8,fontWeight:700,
                  color:SIG_COLORS[sig],letterSpacing:1}}>
                  {sig} {cnt}
                </span>
              );
            })}
          </div>
        )}

        {bigBoard.length === 0 ? (
          <div style={{textAlign:"center",padding:"40px 20px",
            border:"1px dashed #1e2d3d",borderRadius:10}}>
            <div style={{fontSize:11,color:"#4d6880",marginBottom:6}}>Board is empty</div>
            <div style={{fontSize:10,color:"#2a3d52"}}>
              Click players on the left to add them to your board
            </div>
          </div>
        ) : (
          <div style={{display:"flex",flexDirection:"column",gap:0}}>
            {bigBoard.map((p, idx) => {
              const round        = getRound(idx);
              const isRoundStart = idx % roundSize === 0;
              const roundCol     = ROUND_COLORS[(round-1) % ROUND_COLORS.length];
              const isEditing    = editingNote === p.pid;
              const intel        = intelResults[p.pid];
              const prospectScore = scoreDraftPlayer(p, bigBoard, players, "BPA");

              return (
                <div key={p.pid}>
                  {/* Round header */}
                  {isRoundStart && (
                    <div style={{display:"flex",alignItems:"center",gap:8,
                      padding:"6px 0",marginTop:idx>0?8:0}}>
                      <span style={{fontSize:9,background:roundCol+"22",color:roundCol,
                        border:`1px solid ${roundCol}44`,borderRadius:4,
                        padding:"2px 10px",fontWeight:700,letterSpacing:1}}>
                        ROUND {round}
                      </span>
                      <div style={{flex:1,height:1,background:"#1e2d3d"}}/>
                    </div>
                  )}

                  {/* Player row */}
                  <div style={{
                    padding:"8px 10px",
                    background: intel?.signal==="BUY" ? "#0a1f10" :
                                intel?.signal==="SELL"? "#1a0808" :
                                intel?.signal==="WATCH"? "#1a1505" : "#0a1118",
                    border:`1px solid ${
                      isEditing ? "#f59e0b" :
                      intel?.signal==="BUY" ? "#22c55e44" :
                      intel?.signal==="SELL"? "#ef444444" :
                      intel?.signal==="WATCH"? "#f59e0b44" : "#1e2d3d"
                    }`,
                    borderRadius:7,marginBottom:3,transition:"border-color .15s"}}>

                    <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                      {/* Rank */}
                      <div style={{width:28,textAlign:"center",flexShrink:0,paddingTop:2}}>
                        <div style={{fontSize:13,fontWeight:900,color:roundCol,lineHeight:1}}>{idx+1}</div>
                      </div>

                      {/* Up/Down */}
                      <div style={{display:"flex",flexDirection:"column",gap:1,flexShrink:0,paddingTop:2}}>
                        <button onClick={()=>bigBoardMove(p.pid,"up")} disabled={idx===0}
                          style={{background:"none",border:"none",color:idx===0?"#1e2d3d":"#4b6580",
                            fontSize:9,cursor:idx===0?"default":"pointer",padding:"1px 3px",lineHeight:1}}>
                          ▲
                        </button>
                        <button onClick={()=>bigBoardMove(p.pid,"down")} disabled={idx===bigBoard.length-1}
                          style={{background:"none",border:"none",
                            color:idx===bigBoard.length-1?"#1e2d3d":"#4b6580",
                            fontSize:9,cursor:idx===bigBoard.length-1?"default":"pointer",
                            padding:"1px 3px",lineHeight:1}}>
                          ▼
                        </button>
                      </div>

                      {/* Player info */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontSize:12,fontWeight:700,color:"#e2e8f0"}}>{p.name}</span>
                          {(p.yrsExp===0||p.yrsExp===null) && (
                            <span style={{fontSize:7,background:"#22c55e22",color:"#22c55e",
                              border:"1px solid #22c55e44",borderRadius:3,
                              padding:"1px 4px",fontWeight:700}}>ROOKIE</span>
                          )}
                          {p.inj && (
                            <span style={{fontSize:7,color:INJ_COLOR[p.inj]||"#ef4444",
                              fontWeight:700,background:(INJ_COLOR[p.inj]||"#ef4444")+"18",
                              padding:"1px 4px",borderRadius:3}}>
                              {p.inj}
                            </span>
                          )}
                        </div>
                        <div style={{fontSize:9,color:"#7a95ae",marginTop:1}}>
                          {p.pos} · {p.team}{p.age?` · ${p.age}y`:""}
                          {p.college?<span style={{color:"#4d6880"}}> · {p.college}</span>:""}
                        </div>

                        {/* Intel result */}
                        {intel && <IntelBadge result={intel} />}

                        {/* Note */}
                        {isEditing ? (
                          <div style={{marginTop:5,display:"flex",gap:5}}>
                            <input
                              autoFocus
                              value={noteText}
                              onChange={e=>setNoteText(e.target.value)}
                              onKeyDown={e=>{
                                if(e.key==="Enter"){bigBoardNote(p.pid,noteText);setEditingNote(null);}
                                if(e.key==="Escape"){setEditingNote(null);}
                              }}
                              placeholder="Add a note..."
                              style={{flex:1,background:"#080d14",border:"1px solid #f59e0b44",
                                color:"#e2e8f0",padding:"4px 8px",borderRadius:4,
                                fontFamily:"monospace",fontSize:10}}
                            />
                            <button onClick={()=>{bigBoardNote(p.pid,noteText);setEditingNote(null);}}
                              style={{background:"#f59e0b22",color:"#f59e0b",border:"1px solid #f59e0b44",
                                borderRadius:4,padding:"4px 10px",fontFamily:"inherit",
                                fontSize:9,cursor:"pointer",fontWeight:700}}>
                              SAVE
                            </button>
                          </div>
                        ) : p.note ? (
                          <div onClick={()=>{setEditingNote(p.pid);setNoteText(p.note);}}
                            style={{fontSize:9,color:"#f59e0b",marginTop:3,cursor:"text",
                              fontStyle:"italic"}}>
                            "{p.note}"
                          </div>
                        ) : null}
                      </div>

                      {/* Right side: score + actions */}
                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",
                        gap:6,flexShrink:0}}>
                        <ProspectScore score={prospectScore} pos={p.pos} />
                        <div style={{display:"flex",gap:4}}>
                          <button
                            onClick={()=>{
                              if(isEditing){setEditingNote(null);}
                              else{setEditingNote(p.pid);setNoteText(p.note||"");}
                            }}
                            style={{background:"none",border:"1px solid #1e2d3d",color:"#4b6580",
                              borderRadius:4,padding:"3px 7px",fontFamily:"inherit",
                              fontSize:9,cursor:"pointer"}}>
                            ✎
                          </button>
                          <button onClick={()=>bigBoardRemove(p.pid)}
                            style={{background:"none",border:"1px solid #1e2d3d",color:"#4b6580",
                              borderRadius:4,padding:"3px 7px",fontFamily:"inherit",
                              fontSize:9,cursor:"pointer"}}>
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
