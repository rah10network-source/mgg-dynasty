// ─── FA DATABASE ─────────────────────────────────────────────────────────────
// Browse unrostered NFL players with pagination + player detail sidebar.
// Watch Cart: stage players, review full profile, then submit to Watchlist.
import { useState, useMemo } from "react";
import { INJ_COLOR, POS_ORDER, PRIME, SCARCITY } from "../../constants";
import { calcAge, ageScore } from "../../scoring";

const PAGE_SIZE = 50;

// ── Quick dynasty score estimate for an FA (no PPG data) ─────────────────────
const estimateFaScore = (p) => {
  const pos  = p.pos;
  if (!SCARCITY[pos]) return null;
  const age  = p.age;
  const dep  = p.depth || null;
  const role = dep===1?1.0:dep===2?0.55:dep>=3?0.25:0.50;
  const aRaw = ageScore(age, pos);
  const prod = SCARCITY[pos] * role;
  // simplified normalised score — 0-100 range approximate
  return Math.round(Math.min(100, Math.max(0, prod * 20 + aRaw * 0.5)));
};

const WINDOW_FROM_AGE = (age, pos) => {
  if (!age) return null;
  const [rise, peak, cliff] = PRIME[pos] || [23, 29, 33];
  if (age < rise)  return { label:"DEVELOPING", color:"#60a5fa" };
  if (age <= peak) return { label:"PRIME",       color:"#22c55e" };
  if (age <= cliff)return { label:"DECLINING",   color:"#f59e0b" };
  return               { label:"PAST CLIFF",  color:"#ef4444" };
};

// ── Player Detail Sidebar ─────────────────────────────────────────────────────
function PlayerDetailSidebar({ player, inCart, onAddToCart, onRemoveCart, onAddDirect, onClose }) {
  if (!player) return null;

  const score  = estimateFaScore(player);
  const window = WINDOW_FROM_AGE(player.age, player.pos);
  const [,,cliff] = PRIME[player.pos] || [23, 29, 33];
  const pastCliff  = player.age && player.age > cliff;
  const yearsLeft  = player.age ? Math.max(0, cliff - player.age) : null;

  return (
    <div style={{
      position:"fixed", top:0, right:0, height:"100vh", width:320, zIndex:1000,
      background:"#080d14", borderLeft:"2px solid #22c55e",
      display:"flex", flexDirection:"column",
      boxShadow:"-8px 0 40px rgba(34,197,94,0.15)",
      overflowY:"auto",
    }}>
      {/* Header */}
      <div style={{padding:"18px 18px 14px", borderBottom:"1px solid #1e2d3d",
        display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        position:"sticky", top:0, background:"#080d14", zIndex:1}}>
        <div>
          <div style={{fontSize:9,color:"#22c55e",letterSpacing:2,fontWeight:700,marginBottom:4}}>
            FA PLAYER PROFILE
          </div>
          <div style={{fontSize:16,fontWeight:900,color:"#e2e8f0",lineHeight:1.2}}>
            {player.name}
          </div>
          <div style={{fontSize:10,color:"#7a95ae",marginTop:3}}>
            {player.pos} · {player.team}
            {player.age ? ` · ${player.age}y` : ""}
          </div>
        </div>
        <button onClick={onClose}
          style={{background:"none",border:"none",color:"#4d6880",
            fontSize:18,cursor:"pointer",padding:"2px 6px",marginTop:-2}}>✕</button>
      </div>

      {/* Score estimate */}
      <div style={{padding:"14px 18px",borderBottom:"1px solid #1e2d3d",
        display:"flex",gap:16,alignItems:"center"}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:40,fontWeight:900,
            color:score>=70?"#22c55e":score>=45?"#60a5fa":score>=25?"#f59e0b":"#ef4444",
            lineHeight:1,textShadow:"0 0 20px rgba(34,197,94,0.3)"}}>
            {score ?? "—"}
          </div>
          <div style={{fontSize:7,color:"#4d6880",letterSpacing:1,marginTop:2}}>EST. SCORE</div>
        </div>
        {window && (
          <div style={{flex:1}}>
            <div style={{fontSize:14,fontWeight:900,color:window.color,letterSpacing:1}}>
              {window.label}
            </div>
            {yearsLeft !== null && (
              <div style={{fontSize:9,color:"#7a95ae",marginTop:2}}>
                {pastCliff
                  ? `${(player.age - cliff).toFixed(0)}y past ${player.pos} cliff`
                  : `~${yearsLeft.toFixed(0)} years to ${player.pos} cliff (${cliff})`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile grid */}
      <div style={{padding:"14px 18px",borderBottom:"1px solid #1e2d3d"}}>
        <div style={{fontSize:9,color:"#22c55e",letterSpacing:2,fontWeight:700,marginBottom:10}}>
          PROFILE
        </div>
        {[
          ["Position",  player.pos],
          ["NFL Team",  player.team],
          ["Age",       player.age ? `${player.age}` : "—"],
          ["Experience",player.yrsExp === 0 ? "Rookie" : player.yrsExp ? `${player.yrsExp} yr${player.yrsExp!==1?"s":""}` : "—"],
          ["College",   player.college || "—"],
          ["Height",    player.height  || "—"],
          ["Weight",    player.weight  ? `${player.weight} lbs` : "—"],
          ["Status",    player.status  || "Active"],
        ].map(([k, v]) => (
          <div key={k} style={{display:"flex",justifyContent:"space-between",
            borderBottom:"1px solid #0f1923",padding:"5px 0",fontSize:11}}>
            <span style={{color:"#4d6880"}}>{k}</span>
            <span style={{color:"#e2e8f0",fontWeight:600,textAlign:"right",maxWidth:160,
              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</span>
          </div>
        ))}
      </div>

      {/* Depth chart */}
      <div style={{padding:"14px 18px",borderBottom:"1px solid #1e2d3d"}}>
        <div style={{fontSize:9,color:"#60a5fa",letterSpacing:2,fontWeight:700,marginBottom:10}}>
          DEPTH CHART
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <div style={{
            fontSize:32,fontWeight:900,
            color:player.depth===1?"#22c55e":player.depth===2?"#f59e0b":player.depth?"#ef4444":"#4d6880",
            lineHeight:1,
          }}>
            {player.depth ? `#${player.depth}` : "—"}
          </div>
          <div>
            <div style={{fontSize:10,color:"#7a95ae"}}>
              {player.depth===1 ? "Starter — highest role confidence"
               : player.depth===2 ? "Backup — spot starter upside"
               : player.depth  ? "Depth — limited dynasty value"
               : "Not charted"}
            </div>
            <div style={{fontSize:9,color:"#4d6880",marginTop:3}}>
              Role confidence: {player.depth===1?"100%":player.depth===2?"55%":player.depth?"25%":"50%"}
            </div>
          </div>
        </div>
      </div>

      {/* Injury */}
      {player.inj && (
        <div style={{padding:"12px 18px",borderBottom:"1px solid #1e2d3d",
          background:INJ_COLOR[player.inj]+"11",
          borderLeft:`3px solid ${INJ_COLOR[player.inj]||"#ef4444"}`}}>
          <span style={{fontSize:10,fontWeight:700,color:INJ_COLOR[player.inj]||"#ef4444",
            letterSpacing:1}}>⚠ {player.inj.toUpperCase()}</span>
          <div style={{fontSize:9,color:"#7a95ae",marginTop:2}}>
            Injury status from Sleeper
          </div>
        </div>
      )}

      {/* Dynasty context */}
      <div style={{padding:"14px 18px",borderBottom:"1px solid #1e2d3d"}}>
        <div style={{fontSize:9,color:"#f59e0b",letterSpacing:2,fontWeight:700,marginBottom:10}}>
          DYNASTY CONTEXT
        </div>
        <div style={{fontSize:10,color:"#7a95ae",lineHeight:1.8}}>
          <div>Scarcity multiplier: <span style={{color:"#f59e0b",fontWeight:700}}>{SCARCITY[player.pos] ?? "—"}×</span></div>
          <div>Age score: <span style={{color:"#e2e8f0",fontWeight:600}}>{player.age ? Math.round(ageScore(player.age, player.pos)) : "—"}</span></div>
          <div>Est. dynasty score: <span style={{color:"#22c55e",fontWeight:700}}>{score ?? "—"}</span>
            <span style={{fontSize:8,color:"#4d6880",marginLeft:4}}>(no PPG data)</span>
          </div>
          {player.yrsExp === 0 && (
            <div style={{marginTop:6,fontSize:9,color:"#22c55e",fontWeight:700}}>
              ◈ ROOKIE — full upside not yet reflected in score
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{padding:"16px 18px",display:"flex",flexDirection:"column",gap:8,
        position:"sticky",bottom:0,background:"#080d14",borderTop:"1px solid #1e2d3d"}}>
        {inCart ? (
          <button onClick={onRemoveCart}
            style={{background:"#1a0505",color:"#ef4444",
              border:"1px solid #ef444455",borderRadius:7,padding:"10px",
              fontFamily:"inherit",fontWeight:700,fontSize:10,cursor:"pointer",letterSpacing:1}}>
            ✕ REMOVE FROM CART
          </button>
        ) : (
          <button onClick={onAddToCart}
            style={{background:"#0f2b1a",color:"#22c55e",
              border:"1px solid #22c55e55",borderRadius:7,padding:"10px",
              fontFamily:"inherit",fontWeight:700,fontSize:10,cursor:"pointer",letterSpacing:1}}>
            + STAGE TO CART
          </button>
        )}
        <button onClick={onAddDirect}
          style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#080d14",
            border:"none",borderRadius:7,padding:"11px",fontFamily:"inherit",
            fontWeight:900,fontSize:11,letterSpacing:2,cursor:"pointer",
            boxShadow:"0 0 16px rgba(34,197,94,0.25)"}}>
          ✓ ADD TO WATCHLIST
        </button>
        <div style={{fontSize:8,color:"#2a3d52",textAlign:"center"}}>
          Watchlist → scored and tracked in Player Hub · Watchlist tab
        </div>
      </div>
    </div>
  );
}

// ── Cart summary drawer ────────────────────────────────────────────────────────
function CartDrawer({ cart, faResults, onRemove, onSubmit, onClear, onClose }) {
  return (
    <div style={{
      position:"fixed",top:0,right:0,height:"100vh",width:300,zIndex:1000,
      background:"#080d14",borderLeft:"2px solid #22c55e",
      display:"flex",flexDirection:"column",
      boxShadow:"-6px 0 30px rgba(34,197,94,0.15)",
    }}>
      <div style={{padding:"18px 18px 14px",borderBottom:"1px solid #1e2d3d",
        display:"flex",justifyContent:"space-between",alignItems:"center",
        position:"sticky",top:0,background:"#080d14"}}>
        <div>
          <div style={{fontSize:10,color:"#22c55e",letterSpacing:2,fontWeight:700}}>◈ WATCH CART</div>
          <div style={{fontSize:9,color:"#4d6880",marginTop:2}}>
            {cart.length} player{cart.length!==1?"s":""} staged
          </div>
        </div>
        <button onClick={onClose}
          style={{background:"none",border:"none",color:"#4d6880",fontSize:16,cursor:"pointer",padding:4}}>✕</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
        {cart.length === 0 ? (
          <div style={{textAlign:"center",padding:"32px 12px"}}>
            <div style={{fontSize:10,color:"#4d6880",marginBottom:6}}>Cart is empty</div>
            <div style={{fontSize:9,color:"#2a3d52",lineHeight:1.7}}>
              Click + WATCH on any player or use the detail sidebar to stage them here
            </div>
          </div>
        ) : cart.map(pid => {
          const p = faResults.find(r => r.pid === pid);
          if (!p) return null;
          return (
            <div key={pid} style={{display:"flex",alignItems:"center",gap:8,
              padding:"8px 10px",background:"#0a1118",border:"1px solid #22c55e22",
              borderRadius:7,marginBottom:6}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0",
                  whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                  {p.name}
                </div>
                <div style={{fontSize:9,color:"#7a95ae"}}>
                  {p.pos} · {p.team}{p.age ? ` · ${p.age}y` : ""}
                  {p.depth ? <span style={{color:p.depth===1?"#22c55e":"#f59e0b",marginLeft:4}}>D#{p.depth}</span> : ""}
                </div>
              </div>
              <button onClick={() => onRemove(pid)}
                style={{background:"none",border:"none",color:"#4d6880",
                  fontSize:13,cursor:"pointer",padding:"2px 4px",flexShrink:0}}>✕</button>
            </div>
          );
        })}
      </div>

      <div style={{padding:"14px 18px",borderTop:"1px solid #1e2d3d",
        display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={onSubmit} disabled={cart.length===0}
          style={{background:cart.length>0?"linear-gradient(135deg,#22c55e,#16a34a)":"#1e2d3d",
            color:cart.length>0?"#080d14":"#4d6880",
            border:"none",borderRadius:7,padding:"11px",fontFamily:"inherit",
            fontWeight:900,fontSize:11,letterSpacing:2,
            cursor:cart.length>0?"pointer":"not-allowed",
            boxShadow:cart.length>0?"0 0 16px rgba(34,197,94,0.25)":"none"}}>
          ✓ ADD {cart.length>0?cart.length+" ":""}{cart.length===1?"PLAYER":"PLAYERS"} TO WATCHLIST
        </button>
        {cart.length > 0 && (
          <button onClick={onClear}
            style={{background:"none",border:"1px solid #1e2d3d",color:"#4d6880",
              borderRadius:6,padding:"7px",fontFamily:"inherit",fontSize:9,cursor:"pointer",letterSpacing:1}}>
            CLEAR CART
          </button>
        )}
        <div style={{fontSize:8,color:"#2a3d52",textAlign:"center",lineHeight:1.6}}>
          Players will be scored and tracked in the Watchlist tab
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function FADatabase({
  nflDb, faSearch, setFaSearch,
  faPosFilter, setFaPosFilter,
  faTeamFilter, setFaTeamFilter,
  faAgeMin, setFaAgeMin,
  faAgeMax, setFaAgeMax,
  faHideInj, setFaHideInj,
  faResults, faTeams, faWatchlist,
  addToFaWatchlist, removeFromFaWatchlist,
}) {
  const [page,           setPage]          = useState(0);
  const [cart,           setCart]          = useState([]);
  const [sidebarMode,    setSidebarMode]   = useState(null);  // "detail" | "cart" | null
  const [selectedPlayer, setSelectedPlayer]= useState(null);

  if (Object.keys(nflDb).length === 0) {
    return (
      <div style={{textAlign:"center",padding:48,border:"1px dashed #1e2d3d",borderRadius:12}}>
        <div style={{fontSize:11,color:"#7a95ae",letterSpacing:2}}>SYNC DATA FIRST TO BROWSE FREE AGENTS</div>
      </div>
    );
  }

  const totalPages = Math.ceil(faResults.length / PAGE_SIZE);
  const pageSlice  = faResults.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const inCart      = (pid) => cart.includes(pid);
  const onWatchlist = (pid) => !!faWatchlist?.find(w => w.pid === pid);

  const addToCart   = (pid) => { if (!inCart(pid)) setCart(prev => [...prev, pid]); };
  const removeCart  = (pid) => setCart(prev => prev.filter(p => p !== pid));

  const submitCart  = () => {
    cart.forEach(pid => addToFaWatchlist(pid));
    setCart([]);
    setSidebarMode(null);
  };

  const openDetail = (player) => {
    setSelectedPlayer(player);
    setSidebarMode("detail");
  };

  const handleDirectAdd = (pid) => {
    addToFaWatchlist(pid);
    setSidebarMode(null);
    setSelectedPlayer(null);
  };

  const handleFilter = (fn) => (...args) => { fn(...args); setPage(0); };

  const sidebarOpen = sidebarMode !== null;

  return (
    <div style={{display:"flex",gap:0,position:"relative"}}>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div style={{flex:1,minWidth:0,paddingRight:sidebarOpen?16:0}}>

        {/* Filters */}
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14,alignItems:"center"}}>
          <input value={faSearch} onChange={e => handleFilter(setFaSearch)(e.target.value)}
            placeholder="Search name or team..."
            style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
              padding:"6px 10px",borderRadius:5,fontFamily:"inherit",fontSize:10,width:175}}/>
          <select value={faPosFilter} onChange={e => handleFilter(setFaPosFilter)(e.target.value)}
            style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
              padding:"6px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10}}>
            <option value="ALL">ALL POS</option>
            {POS_ORDER.map(p => <option key={p}>{p}</option>)}
          </select>
          <select value={faTeamFilter} onChange={e => handleFilter(setFaTeamFilter)(e.target.value)}
            style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
              padding:"6px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10,maxWidth:110}}>
            <option value="ALL">ALL TEAMS</option>
            {faTeams.map(t => <option key={t}>{t}</option>)}
          </select>
          <div style={{display:"flex",alignItems:"center",gap:5}}>
            <input type="number" placeholder="Age min" value={faAgeMin}
              onChange={e => handleFilter(setFaAgeMin)(e.target.value)}
              style={{width:68,background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
                padding:"6px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10}}/>
            <span style={{color:"#4d6880",fontSize:10}}>–</span>
            <input type="number" placeholder="max" value={faAgeMax}
              onChange={e => handleFilter(setFaAgeMax)(e.target.value)}
              style={{width:56,background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
                padding:"6px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10}}/>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:"#7a95ae",cursor:"pointer"}}>
            <input type="checkbox" checked={faHideInj} onChange={e => handleFilter(setFaHideInj)(e.target.checked)}/>
            Hide injured
          </label>

          {/* Cart button */}
          <button onClick={() => setSidebarMode(sidebarMode==="cart" ? null : "cart")}
            style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,
              background:cart.length>0?"#0f2b1a":"#0a1118",
              border:`1px solid ${cart.length>0?"#22c55e":"#1e2d3d"}`,
              color:cart.length>0?"#22c55e":"#4d6880",
              borderRadius:6,padding:"5px 12px",fontFamily:"inherit",
              fontSize:10,cursor:"pointer",fontWeight:700,letterSpacing:1}}>
            ◈ CART
            {cart.length > 0 && (
              <span style={{background:"#22c55e",color:"#080d14",borderRadius:10,
                padding:"1px 6px",fontSize:9,fontWeight:900,marginLeft:2}}>
                {cart.length}
              </span>
            )}
          </button>
        </div>

        {/* Result count + pagination top */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:9,color:"#4d6880",letterSpacing:1}}>
            {faResults.length} PLAYERS · SHOWING {page*PAGE_SIZE+1}–{Math.min((page+1)*PAGE_SIZE, faResults.length)} OF {faResults.length}
          </span>
          <Pagination page={page} totalPages={totalPages} setPage={setPage} compact />
        </div>

        {/* Table */}
        <div style={{borderRadius:8,border:"1px solid #1e2d3d",overflow:"hidden",marginBottom:10}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr>
                {[["PLAYER",165],["POS",42],["TEAM",52],["AGE",42],["EXP",46],["DEPTH",52],["INJ",80],["",100]].map(([h,w]) => (
                  <th key={h} style={{padding:"7px 8px",background:"#0c151e",color:"#7a95ae",
                    fontSize:9,letterSpacing:1.5,fontWeight:700,textAlign:"center",
                    borderRight:"1px solid #1e2d3d",width:w}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((p, i) => {
                const watching = onWatchlist(p.pid);
                const staged   = inCart(p.pid);
                const isSelected = selectedPlayer?.pid === p.pid && sidebarMode === "detail";
                return (
                  <tr key={p.pid}
                    style={{background:isSelected?"#0f2b1a":i%2===0?"#080d14":"#0a1118",
                      cursor:"pointer"}}
                    onClick={() => openDetail(p)}>
                    <td style={{padding:"7px 10px",fontWeight:700,
                      color:isSelected?"#22c55e":"#e2e8f0",fontSize:11,
                      borderBottom:"1px solid #0f1923"}}>{p.name}</td>
                    <td style={{padding:"7px 8px",textAlign:"center",color:"#60a5fa",fontWeight:700,
                      fontSize:10,borderBottom:"1px solid #0f1923"}}>{p.pos}</td>
                    <td style={{padding:"7px 8px",textAlign:"center",color:"#a8bccf",fontSize:10,
                      borderBottom:"1px solid #0f1923"}}>{p.team}</td>
                    <td style={{padding:"7px 8px",textAlign:"center",color:"#a8bccf",fontSize:10,
                      borderBottom:"1px solid #0f1923"}}>{p.age ?? "—"}</td>
                    <td style={{padding:"7px 8px",textAlign:"center",fontSize:9,
                      color:p.yrsExp===0?"#22c55e":"#7a95ae",fontWeight:p.yrsExp===0?700:400,
                      borderBottom:"1px solid #0f1923"}}>
                      {p.yrsExp === 0 ? "ROOKIE" : p.yrsExp ? `${p.yrsExp}yr` : "—"}
                    </td>
                    <td style={{padding:"7px 8px",textAlign:"center",fontSize:10,fontWeight:700,
                      color:p.depth===1?"#22c55e":p.depth===2?"#f59e0b":p.depth?"#ef4444":"#4d6880",
                      borderBottom:"1px solid #0f1923"}}>
                      {p.depth ? `#${p.depth}` : "—"}
                    </td>
                    <td style={{padding:"7px 8px",textAlign:"center",borderBottom:"1px solid #0f1923"}}>
                      {p.inj
                        ? <span style={{color:INJ_COLOR[p.inj]||"#ef4444",fontWeight:700,fontSize:9}}>{p.inj}</span>
                        : <span style={{color:"#1e2d3d",fontSize:8}}>OK</span>}
                    </td>
                    <td style={{padding:"7px 8px",textAlign:"center",borderBottom:"1px solid #0f1923"}}
                      onClick={e => e.stopPropagation()}>
                      {watching ? (
                        <span style={{fontSize:9,color:"#22c55e",fontWeight:700,letterSpacing:0.5}}>
                          ✓ WATCHING
                        </span>
                      ) : staged ? (
                        <button onClick={() => removeCart(p.pid)}
                          style={{background:"#0f2b1a",color:"#22c55e",
                            border:"1px solid #22c55e55",borderRadius:4,
                            padding:"4px 9px",fontFamily:"inherit",
                            fontSize:9,cursor:"pointer",fontWeight:700}}>
                          − STAGED
                        </button>
                      ) : (
                        <button
                          onClick={() => openDetail(p)}
                          style={{background:"#0f1923",color:"#7a95ae",
                            border:"1px solid #1e2d3d",borderRadius:4,
                            padding:"4px 9px",fontFamily:"inherit",
                            fontSize:9,cursor:"pointer",fontWeight:700,letterSpacing:0.5,
                            transition:"all .15s"}}
                          onMouseOver={e => { e.currentTarget.style.background="#0f2b1a"; e.currentTarget.style.color="#22c55e"; e.currentTarget.style.borderColor="#22c55e55"; }}
                          onMouseOut={e  => { e.currentTarget.style.background="#0f1923"; e.currentTarget.style.color="#7a95ae"; e.currentTarget.style.borderColor="#1e2d3d"; }}>
                          + WATCH
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {faResults.length === 0 && (
                <tr><td colSpan={8} style={{padding:28,textAlign:"center",color:"#4d6880",fontSize:10}}>
                  No players match current filters
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom pagination */}
        <Pagination page={page} totalPages={totalPages} setPage={setPage} />

        <div style={{fontSize:8,color:"#2a3d52",marginTop:8,textAlign:"center"}}>
          Click any row to view full player profile · {PAGE_SIZE} players per page
        </div>
      </div>

      {/* ── Sidebars ───────────────────────────────────────────────────────── */}
      {sidebarMode === "detail" && selectedPlayer && (
        <PlayerDetailSidebar
          player={selectedPlayer}
          inCart={inCart(selectedPlayer.pid)}
          onAddToCart={() => addToCart(selectedPlayer.pid)}
          onRemoveCart={() => removeCart(selectedPlayer.pid)}
          onAddDirect={() => handleDirectAdd(selectedPlayer.pid)}
          onClose={() => { setSidebarMode(null); setSelectedPlayer(null); }}
        />
      )}
      {sidebarMode === "cart" && (
        <CartDrawer
          cart={cart}
          faResults={faResults}
          onRemove={removeCart}
          onSubmit={submitCart}
          onClear={() => setCart([])}
          onClose={() => setSidebarMode(null)}
        />
      )}
    </div>
  );
}

// ── Reusable pagination ───────────────────────────────────────────────────────
function Pagination({ page, totalPages, setPage, compact = false }) {
  if (totalPages <= 1) return null;
  const windowSize = 7;
  let start = Math.max(0, Math.min(page - 3, totalPages - windowSize));
  const pageNums = Array.from({length: Math.min(windowSize, totalPages)}, (_, i) => start + i);

  if (compact) return (
    <div style={{display:"flex",gap:4,alignItems:"center"}}>
      <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0}
        style={{background:"#0a1118",border:"1px solid #1e2d3d",
          color:page===0?"#2a3d52":"#7a95ae",borderRadius:4,padding:"3px 9px",
          fontFamily:"inherit",fontSize:10,cursor:page===0?"default":"pointer"}}>‹</button>
      <span style={{fontSize:9,color:"#4d6880",minWidth:70,textAlign:"center"}}>
        {page+1} / {totalPages}
      </span>
      <button onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}
        style={{background:"#0a1118",border:"1px solid #1e2d3d",
          color:page===totalPages-1?"#2a3d52":"#7a95ae",borderRadius:4,padding:"3px 9px",
          fontFamily:"inherit",fontSize:10,cursor:page===totalPages-1?"default":"pointer"}}>›</button>
    </div>
  );

  return (
    <div style={{display:"flex",justifyContent:"center",gap:4,alignItems:"center",flexWrap:"wrap",padding:"4px 0 8px"}}>
      <button onClick={() => setPage(0)} disabled={page===0}
        style={pgBtn(page===0)}>«</button>
      <button onClick={() => setPage(p => Math.max(0,p-1))} disabled={page===0}
        style={pgBtn(page===0)}>‹ PREV</button>
      {pageNums.map(n => (
        <button key={n} onClick={() => setPage(n)}
          style={{...pgBtn(false), background:n===page?"#22c55e22":"#0a1118",
            color:n===page?"#22c55e":"#4d6880",
            border:`1px solid ${n===page?"#22c55e44":"#1e2d3d"}`,
            fontWeight:n===page?700:400,minWidth:30}}>
          {n+1}
        </button>
      ))}
      <button onClick={() => setPage(p => Math.min(totalPages-1,p+1))} disabled={page===totalPages-1}
        style={pgBtn(page===totalPages-1)}>NEXT ›</button>
      <button onClick={() => setPage(totalPages-1)} disabled={page===totalPages-1}
        style={pgBtn(page===totalPages-1)}>»</button>
    </div>
  );
}
const pgBtn = (disabled) => ({
  background:"#0a1118",border:"1px solid #1e2d3d",
  color:disabled?"#2a3d52":"#7a95ae",borderRadius:4,
  padding:"3px 9px",fontFamily:"'Courier New',monospace",
  fontSize:9,cursor:disabled?"default":"pointer",
});
