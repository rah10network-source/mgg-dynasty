// ─── WAIVER TOOL ──────────────────────────────────────────────────────────────
// Surfaces the best available waiver wire adds based on the owner's positional
// needs, player trending data, and dynasty value estimates.
// Logic layer: all deterministic — no LLM. Fast and works without API key.
import { useState, useMemo } from "react";
import { TIER_STYLE, INJ_COLOR, SIG_COLORS, POS_ORDER } from "../../constants";
import { gradeRoster, weakPositions, leagueAvgByPos } from "../../roster";
import { filterDraftPool } from "../../draft";

// ── Waiver priority score ─────────────────────────────────────────────────────
// Scores an unrostered player for waiver add priority given the owner's needs.
// Components:
//   Dynasty value   — estimateFaScore from player profile (age, depth, position)
//   Positional need — bonus if player fills a weak position
//   Trending        — bonus if player is being widely added across the league
//   Injury risk     — penalty for injured players

const estimateValue = (p) => {
  if (!p.pos) return 0;
  const depthBonus = p.depth === 1 ? 25 : p.depth === 2 ? 10 : 0;
  const age        = p.age || 26;
  const agePenalty = Math.max(0, (age - 28) * 2);
  return Math.max(0, Math.min(95, 60 - agePenalty + depthBonus));
};

const waiverScore = (p, weakPos, trending) => {
  let score = estimateValue(p);
  if (weakPos.has(p.pos)) score += 18;
  if (trending.includes(p.pid)) score += 12;
  if (p.inj) score -= 15;
  return Math.round(score);
};

// ── Player card ────────────────────────────────────────────────────────────────
function WaiverCard({ p, rank, onAddToWatchlist, inWatchlist }) {
  const val  = estimateValue(p);
  const col  = val >= 70 ? "#22c55e" : val >= 45 ? "#60a5fa" : val >= 25 ? "#f59e0b" : "#ef4444";
  const inj  = p.inj && INJ_COLOR[p.inj];

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px",
      background:"#080d14", borderBottom:"1px solid #0f1923" }}>
      <span style={{ fontSize:9, color:"#4d6880", minWidth:20, textAlign:"center" }}>
        {rank}
      </span>
      <div style={{ width:40, textAlign:"center", flexShrink:0 }}>
        <div style={{ fontSize:16, fontWeight:900, color:col }}>{val}</div>
        <div style={{ fontSize:7, color:"#4d6880", letterSpacing:1 }}>EST.</div>
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#e2e8f0" }}>{p.name}</span>
          {p.yrsExp === 0 && <span style={{ fontSize:7, background:"#22c55e22",
            color:"#22c55e", border:"1px solid #22c55e44",
            borderRadius:3, padding:"1px 5px", fontWeight:700 }}>ROOKIE</span>}
          {inj && <span style={{ fontSize:7, background:inj+"22", color:inj,
            border:`1px solid ${inj}44`, borderRadius:3, padding:"1px 5px" }}>{p.inj}</span>}
        </div>
        <div style={{ fontSize:9, color:"#7a95ae", marginTop:2 }}>
          {p.pos} · {p.team || "FA"}
          {p.age ? ` · ${p.age}y` : ""}
          {p.depth ? ` · Depth #${p.depth}` : ""}
          {p.college ? ` · ${p.college}` : ""}
        </div>
      </div>
      <button
        onClick={() => onAddToWatchlist(p)}
        disabled={inWatchlist}
        style={{ fontSize:8, padding:"5px 10px",
          background: inWatchlist ? "#1e2d3d" : "#0f2b1a",
          color: inWatchlist ? "#4d6880" : "#22c55e",
          border: `1px solid ${inWatchlist ? "#374151" : "#22c55e44"}`,
          borderRadius:5, fontFamily:"inherit", cursor: inWatchlist ? "default" : "pointer",
          letterSpacing:1, whiteSpace:"nowrap" }}>
        {inWatchlist ? "✓ WATCHING" : "+ WATCHLIST"}
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function WaiverTool({
  phase, players, nflDb, currentOwner, newsMap = {},
  faWatchlist = [], onAddToWatchlist,
}) {
  const [posFilter,   setPosFilter]   = useState("ALL");
  const [modeFilter,  setModeFilter]  = useState("need"); // "need" | "value" | "trending"
  const [searchQ,     setSearchQ]     = useState("");

  // Build weak positions for the current owner
  const myGrade   = useMemo(() =>
    phase === "done" && currentOwner ? gradeRoster(currentOwner, players) : null,
    [phase, currentOwner, players]
  );
  const weakPos   = useMemo(() => {
    if (!myGrade) return new Set();
    return new Set(weakPositions(myGrade, players, 4).filter(w => w.gap < -5).map(w => w.pos));
  }, [myGrade, players]);

  // Trending — players being widely added (proxied by adds count in transaction data)
  const trending  = useMemo(() =>
    players.filter(p => (p.adds || 0) >= 2).map(p => p.pid),
    [players]
  );

  // Build unrostered pool from nflDb
  const rosteredPids = useMemo(() => new Set(players.map(p => p.pid)), [players]);
  const pool = useMemo(() => {
    if (Object.keys(nflDb).length === 0) return [];
    const raw = filterDraftPool(nflDb, {
      mode:        "all",
      rosteredPids,
      posFilter,
      searchQ,
    });
    return raw
      .map(p => ({ ...p, wScore: waiverScore(p, weakPos, trending) }))
      .sort((a, b) =>
        modeFilter === "value"    ? (estimateValue(b) - estimateValue(a))
        : modeFilter === "trending" ? (
            (trending.includes(b.pid) ? 1 : 0) - (trending.includes(a.pid) ? 1 : 0)
              || b.wScore - a.wScore
          )
        : b.wScore - a.wScore  // "need" — default, positional fit first
      )
      .slice(0, 60);
  }, [nflDb, rosteredPids, posFilter, searchQ, weakPos, trending, modeFilter]);

  if (phase !== "done") {
    return (
      <div style={{ textAlign:"center", padding:48, border:"1px dashed #1e2d3d", borderRadius:12 }}>
        <div style={{ fontSize:11, color:"#7a95ae", letterSpacing:2 }}>
          SYNC DATA FIRST TO USE WAIVER TOOL
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:900, letterSpacing:3, color:"#22c55e",
          marginBottom:4 }}>◎ WAIVER WIRE</div>
        <div style={{ fontSize:9, color:"#4d6880" }}>
          Unrostered players ranked by fit with your roster needs.
          {currentOwner && weakPos.size > 0 && (
            <span style={{ color:"#f59e0b" }}>
              {" "}Prioritising: {[...weakPos].join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
        {/* Search */}
        <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
          placeholder="Search players..."
          style={{ background:"#080d14", border:"1px solid #1e2d3d", color:"#e2e8f0",
            padding:"6px 10px", borderRadius:5, fontFamily:"inherit",
            fontSize:10, width:160 }} />

        {/* Position filter */}
        <div style={{ display:"flex", gap:0, border:"1px solid #1e2d3d",
          borderRadius:6, overflow:"hidden" }}>
          {["ALL",...POS_ORDER.filter(p => ["QB","RB","WR","TE"].includes(p))].map(pos => (
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

        {/* Sort mode */}
        <div style={{ display:"flex", gap:0, border:"1px solid #1e2d3d",
          borderRadius:6, overflow:"hidden" }}>
          {[["need","BY NEED"],["value","BY VALUE"],["trending","TRENDING"]].map(([m,l]) => (
            <button key={m} onClick={() => setModeFilter(m)}
              style={{ background:modeFilter===m?"#0c1e35":"transparent",
                color:modeFilter===m?"#f59e0b":"#4d6880",
                border:"none", padding:"5px 10px", fontFamily:"inherit",
                fontSize:9, cursor:"pointer", fontWeight:modeFilter===m?700:400,
                borderRight:"1px solid #1e2d3d" }}>
              {l}
            </button>
          ))}
        </div>

        <span style={{ fontSize:9, color:"#4d6880" }}>{pool.length} available</span>
      </div>

      {/* Weak position badges */}
      {weakPos.size > 0 && modeFilter === "need" && (
        <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:9, color:"#4d6880" }}>Needs:</span>
          {[...weakPos].map(pos => (
            <span key={pos} style={{ fontSize:9, background:"#f59e0b22",
              color:"#f59e0b", border:"1px solid #f59e0b44",
              borderRadius:4, padding:"2px 8px", fontWeight:700 }}>
              {pos}
            </span>
          ))}
        </div>
      )}

      {/* Player list */}
      {pool.length === 0 ? (
        <div style={{ padding:32, textAlign:"center", color:"#4d6880", fontSize:10 }}>
          No available players found
          {searchQ && " — try a different search"}
        </div>
      ) : (
        <div style={{ border:"1px solid #1e2d3d", borderRadius:10, overflow:"hidden" }}>
          {pool.map((p, i) => (
            <WaiverCard
              key={p.pid}
              p={p}
              rank={i + 1}
              onAddToWatchlist={onAddToWatchlist}
              inWatchlist={faWatchlist.some(w => w.pid === p.pid)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
