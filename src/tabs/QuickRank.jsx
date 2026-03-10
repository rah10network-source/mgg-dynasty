// ─── QUICK RANK ───────────────────────────────────────────────────────────────
// Post-sync modal — shows 3 players picked across positions and asks the user
// to rank them by dynasty value. Each ranking creates 3 pairwise comparisons
// stored in localStorage. Over time these build a peerScore (Elo-style win rate)
// that blends into final player scores once enough data exists.
//
// Design rules:
//  - Shown once per 24h after a successful sync, not on every load
//  - Always skippable — never blocks the app
//  - Player trio is always cross-position (at least one IDP vs one offensive player)
//  - Transparent — score breakdown shows "Peer: X%" when active
import { useState } from "react";
import { TIER_STYLE, SIG_COLORS, POS_ORDER, pv } from "../constants";

const K_FACTOR = 32; // Standard Elo K — controls how fast scores shift per comparison

// ─── ELO HELPERS ──────────────────────────────────────────────────────────────
export const eloExpected = (rA, rB) => 1 / (1 + Math.pow(10, (rB - rA) / 400));

export const applyElo = (scores, winner, loser) => {
  const rW = scores[winner] || 1200;
  const rL = scores[loser]  || 1200;
  const eW = eloExpected(rW, rL);
  const eL = eloExpected(rL, rW);
  return {
    ...scores,
    [winner]: Math.round(rW + K_FACTOR * (1 - eW)),
    [loser]:  Math.round(rL + K_FACTOR * (0 - eL)),
  };
};

// Apply a full 3-player ranking: 1st beats 2nd, 1st beats 3rd, 2nd beats 3rd
export const applyRanking = (scores, [first, second, third]) => {
  let s = applyElo(scores, first, second);
      s = applyElo(s, first, third);
      s = applyElo(s, second, third);
  return s;
};

// ─── PICK TRIO ────────────────────────────────────────────────────────────────
// Pick 3 players that create useful signal:
//  1. One elite/starter offensive player (QB/RB/WR/TE)
//  2. One elite/starter IDP (DL/LB/DB)
//  3. One contested player — either a depth offensive or any position near tier boundary
// Avoids players already seen recently (last 5 pids in seenPids)
export const pickTrio = (players, seenPids = []) => {
  const eligible = players.filter(p =>
    !seenPids.includes(p.pid) &&
    ["Elite","Starter","Flex"].includes(p.tier) &&
    p.startValue > 20
  );

  const off = eligible.filter(p => ["QB","RB","WR","TE"].includes(p.pos));
  const idp = eligible.filter(p => ["DL","LB","DB"].includes(p.pos));
  const any = eligible.filter(p => p.tier === "Flex" || p.tier === "Starter");

  const pick = (pool, fallback) => {
    const src = pool.length ? pool : fallback;
    return src[Math.floor(Math.random() * Math.min(src.length, 12))];
  };

  const p1 = pick(off.filter(p => ["Elite","Starter"].includes(p.tier)), off);
  const p2 = pick(idp.filter(p => ["Elite","Starter"].includes(p.tier)), idp);
  const usedPids = new Set([p1?.pid, p2?.pid]);
  const p3pool  = any.filter(p => !usedPids.has(p.pid));
  const p3 = pick(p3pool, eligible.filter(p => !usedPids.has(p.pid)));

  return [p1, p2, p3].filter(Boolean);
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export function QuickRank({ players, eloScores, onComplete, onSkip, viewMode="dynasty" }) {
  const [trio]   = useState(() => pickTrio(players, []));
  const [order,  setOrder]  = useState([]);  // pids in ranked order
  const [done,   setDone]   = useState(false);

  if (!trio.length) { onSkip?.(); return null; }

  const remaining = trio.filter(p => !order.includes(p.pid));
  const ranked    = order.map(pid => trio.find(p => p.pid === pid)).filter(Boolean);

  const addRank = (pid) => {
    if (order.includes(pid)) return;
    setOrder(prev => [...prev, pid]);
  };

  const removeRank = (pid) => {
    setOrder(prev => prev.filter(p => p !== pid));
  };

  const submit = () => {
    const newScores = applyRanking(eloScores, order);
    setDone(true);
    setTimeout(() => onComplete(newScores, order), 800);
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.85)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:9999, backdropFilter:"blur(4px)"
    }}>
      <div style={{
        background:"#080d14", border:"1px solid #1e2d3d",
        borderRadius:16, padding:"28px 28px 22px", width:"100%", maxWidth:480,
        boxShadow:"0 24px 80px rgba(0,0,0,0.8)"
      }}>

        {/* Header */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:8, color:"#22c55e", letterSpacing:3,
            fontWeight:700, marginBottom:6 }}>◈ QUICK TAKE · DYNASTY VALUE</div>
          <div style={{ fontSize:15, fontWeight:900, color:"#e2e8f0",
            lineHeight:1.3, marginBottom:6 }}>
            Rank these 3 players by dynasty value right now
          </div>
          <div style={{ fontSize:10, color:"#4d6880", lineHeight:1.6 }}>
            Tap players in order — most valuable first. Your rankings help calibrate
            the scoring over time.
          </div>
        </div>

        {/* Ranked so far */}
        {ranked.length > 0 && (
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:8, color:"#7a95ae", letterSpacing:2,
              fontWeight:700, marginBottom:8 }}>YOUR RANKING</div>
            {ranked.map((p, i) => {
              const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
              return (
                <div key={p.pid} onClick={() => removeRank(p.pid)}
                  style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"8px 12px", background:ts.bg,
                    border:`1px solid ${ts.border}`, borderRadius:8,
                    marginBottom:4, cursor:"pointer",
                    opacity: done ? 0.6 : 1 }}>
                  <div style={{ width:20, height:20, borderRadius:"50%",
                    background:ts.text, display:"flex", alignItems:"center",
                    justifyContent:"center", flexShrink:0 }}>
                    <span style={{ fontSize:11, fontWeight:900, color:"#080d14" }}>
                      {i + 1}
                    </span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize:9, color:"#7a95ae" }}>
                      {p.pos} · {p.team || "?"}{p.age ? ` · ${p.age}y` : ""}
                      {p.ppg != null ? ` · ${p.ppg} ppg` : ""}
                    </div>
                  </div>
                  <div style={{ fontSize:9, fontWeight:900, color:ts.text }}>
                    {pv(p,viewMode)}
                  </div>
                  <div style={{ fontSize:9, color:"#4d6880" }}>✕</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Remaining to rank */}
        {remaining.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:8, color:"#7a95ae", letterSpacing:2,
              fontWeight:700, marginBottom:8 }}>
              {ranked.length === 0 ? "TAP TO RANK · MOST VALUABLE FIRST" : "THEN..."}
            </div>
            {remaining.map(p => {
              const ts = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
              const isIdp = ["DL","LB","DB"].includes(p.pos);
              return (
                <div key={p.pid} onClick={() => addRank(p.pid)}
                  style={{ display:"flex", alignItems:"center", gap:10,
                    padding:"10px 12px", background:"#0a1118",
                    border:`1px solid #1e2d3d`, borderRadius:8,
                    marginBottom:6, cursor:"pointer",
                    transition:"border-color .15s, background .15s" }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = ts.border;
                    e.currentTarget.style.background = ts.bg;
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = "#1e2d3d";
                    e.currentTarget.style.background = "#0a1118";
                  }}>
                  <div style={{ width:20, height:20, borderRadius:"50%",
                    border:`2px solid #2a3f55`, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>
                        {p.name}
                      </span>
                      {isIdp && (
                        <span style={{ fontSize:7, background:"#a855f718",
                          border:"1px solid #a855f744", color:"#a855f7",
                          borderRadius:3, padding:"1px 5px", fontWeight:700 }}>
                          IDP
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize:9, color:"#7a95ae" }}>
                      {p.pos} · {p.team || "?"}{p.age ? ` · ${p.age}y` : ""}
                      {p.ppg != null ? ` · ${p.ppg} ppg` : ""}
                      {p.statLine ? ` · ${p.statLine}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontSize:15, fontWeight:900, color:ts.text,
                      textShadow:`0 0 8px ${ts.glow}` }}>{pv(p,viewMode)}</div>
                    <div style={{ fontSize:7, color:ts.text }}>{p.tier}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submit / skip */}
        <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
          <button onClick={onSkip}
            style={{ fontSize:9, background:"none", border:"1px solid #2a3f55",
              color:"#4d6880", borderRadius:6, padding:"6px 14px",
              cursor:"pointer", fontFamily:"inherit" }}>
            SKIP
          </button>
          {order.length === trio.length && (
            <button onClick={submit} disabled={done}
              style={{ fontSize:9, background: done ? "#22c55e33" : "#22c55e22",
                border:"1px solid #22c55e88", color:"#22c55e",
                borderRadius:6, padding:"6px 16px",
                cursor: done ? "default" : "pointer",
                fontFamily:"inherit", fontWeight:700,
                transition:"background .2s" }}>
              {done ? "✓ SAVED" : "CONFIRM RANKING"}
            </button>
          )}
        </div>

        {/* Footer context */}
        <div style={{ marginTop:14, paddingTop:12,
          borderTop:"1px solid #0f1923",
          fontSize:8, color:"#3a5068", lineHeight:1.6 }}>
          Rankings build your personal valuation model over time · 
          shown once per day · always skippable
        </div>
      </div>
    </div>
  );
}
