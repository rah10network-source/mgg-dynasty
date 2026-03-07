// ─── NEWS & SITUATIONS ────────────────────────────────────────────────────────
// ESPN public news API — free, no key, CORS-friendly, real dates.
// Fetches NFL news feed, matches articles to rostered players via
// the categories[].type==="athlete" field, keyword-categorises, date-sorts.
import { useState, useCallback, useMemo } from "react";
import { TIER_STYLE } from "../../constants";

// ── Category detection via keyword scan ──────────────────────────────────────
const CAT_META = {
  injury:      { color:"#ef4444", label:"INJURY",      icon:"⚕" },
  contract:    { color:"#a855f7", label:"CONTRACT",     icon:"✍" },
  trade:       { color:"#f59e0b", label:"TRADE",        icon:"⇄" },
  depth:       { color:"#60a5fa", label:"DEPTH CHART",  icon:"⬡" },
  performance: { color:"#22c55e", label:"PERFORMANCE",  icon:"▲" },
  offseason:   { color:"#7a95ae", label:"OFFSEASON",    icon:"○" },
  other:       { color:"#4d6880", label:"OTHER",        icon:"·" },
};

const CAT_KEYWORDS = {
  injury:      ["injur","questionable","doubtful","ruled out"," ir ","placed on ir","surgery","sidelined","missed","misses","hurting","concussion","hamstring","knee","ankle","shoulder","pup"],
  contract:    ["contract","extension","signed","deal","salary","restructure","franchise tag","released","cut ","cut by","waived","waiver"],
  trade:       ["trade","traded","acquire","acquired","claim","claimed","swap"],
  depth:       ["depth chart","named starter","benched","backup","starting role","compete","demoted","promoted","starter"],
  performance: ["yards","touchdown","td","record","stats","season","fantasy","points","career"],
  offseason:   ["draft","free agent","ota","minicamp","camp","combine","offseason","signing period"],
};

const detectCat = (text) => {
  const t = text.toLowerCase();
  for (const [cat, kws] of Object.entries(CAT_KEYWORDS)) {
    if (kws.some(k => t.includes(k))) return cat;
  }
  return "other";
};

const detectImpact = (text, cat) => {
  const t = text.toLowerCase();
  const neg = ["injur","ir ","surgery","sidelined","benched","released","cut ","waived","trade demand","holdout","suspended","doubtful","ruled out","misses"];
  const pos = ["healthy","cleared","returned","named starter","extension","signed","promoted","breakout","first-round","no.1","starting","lead back"];
  if (neg.some(k=>t.includes(k))) return "negative";
  if (pos.some(k=>t.includes(k))) return "positive";
  return "neutral";
};

// Parse ESPN published date → recency label
const parseRecency = (iso) => {
  if (!iso) return "older";
  const pub = new Date(iso);
  const now = new Date();
  const days = (now - pub) / 86400000;
  if (days <= 30)  return "recent";
  if (days <= 90)  return "moderate";
  if (days <= 180) return "older";
  return null; // too old — skip
};

const RECENCY_COLOR = { recent:"#22c55e", moderate:"#f59e0b", older:"#4d6880" };
const RECENCY_LABEL = { recent:"LAST 30 DAYS", moderate:"1–3 MONTHS", older:"3–6 MONTHS" };

const fmt = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
};

// ── Name matching helpers ─────────────────────────────────────────────────────
// Normalize: lowercase, strip suffixes, strip periods in initials, trim.
// "Brian Thomas Jr." → "brian thomas"
// "J.K. Dobbins"     → "jk dobbins"
const SUFFIXES = /\s+(jr\.?|sr\.?|ii|iii|iv|v)$/i;
const normalizeName = (name) =>
  (name || "")
    .toLowerCase()
    .replace(SUFFIXES, "")       // strip Jr. Sr. II III IV
    .replace(/\./g, "")          // strip periods (J.K. → JK)
    .replace(/\s+/g, " ")
    .trim();

// Build lookup: normalizedFullName → player. NO last-name index — too error-prone.
const buildNameMap = (players) => {
  const m = {};
  players.forEach(p => {
    const norm = normalizeName(p.name);
    m[norm] = p;
    // Also store with suffix stripped differently: "brian thomas jr" → "brian thomas"
    // (already handled by normalizeName, but store original too for safety)
    const orig = p.name.toLowerCase().trim();
    if (orig !== norm) m[orig] = p;
  });
  return m;
};

// Match via ESPN categories array — exact full-name only, no fallback.
const matchPlayerFromCategories = (categories, nameMap) => {
  if (!Array.isArray(categories)) return null;
  for (const cat of categories) {
    if (cat.type === "athlete" && cat.description) {
      const norm = normalizeName(cat.description);
      if (nameMap[norm]) return nameMap[norm];
    }
  }
  return null;
};

// Match via text scan — require full normalized name as a word-boundary phrase.
// "Drake Thomas" will NOT match "Brian Thomas" because full names must match.
const matchPlayerFromText = (headline, description, nameMap) => {
  const haystack = normalizeName(`${headline} ${description}`);
  for (const [key, p] of Object.entries(nameMap)) {
    // Must be at least first + last (no single-word keys)
    if (!key.includes(" ")) continue;
    if (key.length < 7) continue;
    // Word-boundary check: name must appear as a complete phrase
    // Use a simple boundary: preceded/followed by space, start, end, or punctuation
    const idx = haystack.indexOf(key);
    if (idx === -1) continue;
    const before = idx === 0 ? " " : haystack[idx - 1];
    const after  = idx + key.length >= haystack.length ? " " : haystack[idx + key.length];
    const boundaryChars = /[\s,.'"\-\(]/;
    if (boundaryChars.test(before) && boundaryChars.test(after)) return p;
  }
  return null;
};

// ── Main component ────────────────────────────────────────────────────────────
export function NewsSituations({ players, currentOwner, owners }) {
  const [newsItems,    setNewsItems]    = useState(null);   // processed & matched
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [fetchedAt,    setFetchedAt]    = useState(null);
  const [articleCount, setArticleCount] = useState(0);

  // Filters
  const [ownerFilter,   setOwnerFilter]   = useState("MY_TEAM");
  const [posFilter,     setPosFilter]     = useState("ALL");
  const [catFilter,     setCatFilter]     = useState("ALL");
  const [recencyFilter, setRecencyFilter] = useState("ALL");
  const [expandedPid,   setExpandedPid]   = useState(null);

  // ── Fetch ESPN news ─────────────────────────────────────────────────────────
  const fetchNews = useCallback(async () => {
    if (players.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch up to 3 pages = 300 articles, covering ~3 months of NFL news
      const pages = [1, 2, 3];
      const allArticles = [];

      for (const page of pages) {
        try {
          const r = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=100&page=${page}`,
            { signal: AbortSignal.timeout(8000) }
          );
          if (!r.ok) break;
          const d = await r.json();
          const arts = d.articles || d.feed || [];
          if (arts.length === 0) break;
          allArticles.push(...arts);
        } catch { break; }
      }

      if (allArticles.length === 0) {
        throw new Error("ESPN returned no articles. Try again in a moment.");
      }

      setArticleCount(allArticles.length);

      // Build name lookup map from ALL rostered players
      const nameMap = buildNameMap(players);

      // Process articles → match to players
      const playerArticles = {}; // pid → [{...article data}]

      allArticles.forEach(art => {
        const recency = parseRecency(art.published || art.lastModified);
        if (!recency) return; // older than 6 months — skip

        const text = `${art.headline || ""} ${art.description || ""}`;
        const cat  = detectCat(text);
        const impact = detectImpact(text, cat);

        // Try categories first (most reliable), then text scan
        let matched = matchPlayerFromCategories(art.categories, nameMap);
        if (!matched) matched = matchPlayerFromText(art.headline, art.description, nameMap);
        if (!matched) return;

        const p = matched;
        if (!playerArticles[p.pid]) playerArticles[p.pid] = { player: p, articles: [] };
        playerArticles[p.pid].articles.push({
          headline:  art.headline || "(no headline)",
          summary:   art.description || "",
          published: art.published || art.lastModified,
          date:      fmt(art.published || art.lastModified),
          recency,
          category:  cat,
          impact,
          url:       art.links?.web?.href || art.links?.app?.href || null,
        });
      });

      // Sort articles within each player by date desc, deduplicate by headline
      const items = Object.values(playerArticles).map(({ player, articles }) => {
        const seen = new Set();
        const deduped = articles
          .filter(a => { if (seen.has(a.headline)) return false; seen.add(a.headline); return true; })
          .sort((a, b) => new Date(b.published) - new Date(a.published));
        return { player, articles: deduped };
      });

      // Sort players: most recent article first, then by score
      items.sort((a, b) => {
        const aDate = new Date(a.articles[0]?.published || 0);
        const bDate = new Date(b.articles[0]?.published || 0);
        return bDate - aDate || b.player.score - a.player.score;
      });

      setNewsItems(items);
      setFetchedAt(new Date().toLocaleTimeString());
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [players]);

  // ── Filtered view ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!newsItems) return [];
    return newsItems.filter(item => {
      const p = item.player;
      // Owner filter
      if (ownerFilter === "MY_TEAM") {
        if (!currentOwner || p.owner !== currentOwner) return false;
      } else if (ownerFilter !== "ALL") {
        if (p.owner !== ownerFilter) return false;
      }
      // Position
      if (posFilter !== "ALL" && p.pos !== posFilter) return false;
      // Category — only show if at least one article matches
      if (catFilter !== "ALL" && !item.articles.some(a => a.category === catFilter)) return false;
      // Recency — only show if at least one article matches
      if (recencyFilter !== "ALL" && !item.articles.some(a => a.recency === recencyFilter)) return false;
      return true;
    });
  }, [newsItems, ownerFilter, currentOwner, posFilter, catFilter, recencyFilter]);

  // Category counts across filtered players
  const catCounts = useMemo(() => {
    const c = {};
    (newsItems || []).forEach(item => {
      // Count against the owner/pos filter but not cat filter
      const p = item.player;
      if (ownerFilter === "MY_TEAM" && currentOwner && p.owner !== currentOwner) return;
      if (ownerFilter !== "ALL" && ownerFilter !== "MY_TEAM" && p.owner !== ownerFilter) return;
      if (posFilter !== "ALL" && p.pos !== posFilter) return;
      item.articles.forEach(a => { c[a.category] = (c[a.category]||0)+1; });
    });
    return c;
  }, [newsItems, ownerFilter, currentOwner, posFilter]);

  // ── Unique owners list ──────────────────────────────────────────────────────
  const ownerList = useMemo(() => {
    const set = new Set(players.map(p => p.owner).filter(Boolean));
    return [...set].sort();
  }, [players]);

  // ── Pre-fetch state ─────────────────────────────────────────────────────────
  if (!newsItems && !loading) {
    return (
      <div>
        <div style={{textAlign:"center",padding:"44px 20px",
          border:"1px dashed #1e2d3d",borderRadius:12}}>
          <div style={{fontSize:13,color:"#60a5fa",fontWeight:900,letterSpacing:3,marginBottom:10}}>
            ▸ NFL NEWS FEED
          </div>
          <div style={{fontSize:10,color:"#4d6880",maxWidth:480,margin:"0 auto 6px",lineHeight:1.9}}>
            Pulls live ESPN NFL news and matches articles to your rostered players.<br/>
            <span style={{color:"#7a95ae"}}>Real headlines · Real dates · No API key · No cost</span><br/>
            Covers up to 6 months of news, categorised automatically
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",
            marginTop:20,marginBottom:20}}>
            {[
              ["⚕ Injuries","#ef4444"],["✍ Contracts","#a855f7"],["⇄ Trades","#f59e0b"],
              ["⬡ Depth","#60a5fa"],["▲ Performance","#22c55e"],["○ Offseason","#7a95ae"],
            ].map(([lbl,col])=>(
              <span key={lbl} style={{fontSize:9,background:col+"22",color:col,
                border:`1px solid ${col}33`,borderRadius:4,padding:"3px 9px",fontWeight:700}}>
                {lbl}
              </span>
            ))}
          </div>
          {error && (
            <div style={{color:"#ef4444",fontSize:10,marginBottom:14}}>⚠ {error}</div>
          )}
          <button onClick={fetchNews} disabled={players.length===0}
            style={{background:"linear-gradient(135deg,#3b82f6,#2563eb)",
              color:"#fff",border:"none",borderRadius:8,
              padding:"11px 36px",fontFamily:"inherit",fontWeight:900,
              fontSize:11,letterSpacing:2,cursor:players.length===0?"not-allowed":"pointer",
              boxShadow:"0 0 20px rgba(59,130,246,0.3)"}}>
            ▸ FETCH NEWS
          </button>
          {players.length === 0 && (
            <div style={{fontSize:9,color:"#4d6880",marginTop:8}}>Sync data first</div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{textAlign:"center",padding:56,color:"#60a5fa"}}>
        <div style={{fontSize:13,fontWeight:700,letterSpacing:2,marginBottom:8}}>
          ◌ FETCHING ESPN NEWS...
        </div>
        <div style={{fontSize:9,color:"#4d6880"}}>
          Scanning up to 300 recent NFL articles and matching to your roster
        </div>
      </div>
    );
  }

  // ── Results ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",
        alignItems:"flex-start",marginBottom:14,flexWrap:"wrap",gap:10}}>
        <div>
          <div style={{fontSize:11,color:"#60a5fa",letterSpacing:2,fontWeight:700}}>
            ▸ NFL NEWS FEED
          </div>
          <div style={{fontSize:9,color:"#4d6880",marginTop:2}}>
            {articleCount} ESPN articles scanned · {newsItems?.length} players with news ·
            {" "}{filtered.length} shown · fetched {fetchedAt}
          </div>
        </div>
        <button onClick={fetchNews}
          style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#7a95ae",
            borderRadius:5,padding:"5px 14px",fontFamily:"inherit",
            fontSize:9,cursor:"pointer",letterSpacing:1}}>
          ↺ REFRESH
        </button>
      </div>

      {/* Owner scope bar */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        <span style={{fontSize:9,color:"#4d6880",letterSpacing:1,fontWeight:700,marginRight:2}}>
          SCOPE
        </span>
        {[
          ["MY_TEAM", currentOwner ? "◎ MY TEAM" : "MY TEAM"],
          ["ALL", "⬡ ALL TEAMS"],
        ].concat(ownerList.filter(o => o !== currentOwner).map(o => [o, o.split(" ")[0].toUpperCase()]))
        .map(([val, lbl]) => (
          <button key={val} onClick={() => setOwnerFilter(val)}
            style={{background:ownerFilter===val?"#0f2b1a":"transparent",
              color:ownerFilter===val?"#22c55e":"#4d6580",
              border:`1px solid ${ownerFilter===val?"#22c55e44":"#1e2d3d"}`,
              borderRadius:5,padding:"4px 10px",fontFamily:"inherit",
              fontSize:9,cursor:"pointer",fontWeight:ownerFilter===val?700:400,
              letterSpacing:0.5}}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Filter row */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12,alignItems:"center"}}>
        <select value={posFilter} onChange={e=>setPosFilter(e.target.value)}
          style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#e2e8f0",
            padding:"5px 8px",borderRadius:5,fontFamily:"inherit",fontSize:10}}>
          <option value="ALL">ALL POS</option>
          {["QB","RB","WR","TE","DL","LB","DB"].map(p=><option key={p}>{p}</option>)}
        </select>
        {["ALL","recent","moderate","older"].map(r=>(
          <button key={r} onClick={()=>setRecencyFilter(r)}
            style={{background:recencyFilter===r?"#1e2d3d":"transparent",
              color:recencyFilter===r?"#e2e8f0":RECENCY_COLOR[r]||"#4d6880",
              border:`1px solid ${recencyFilter===r?"#374151":"#1e2d3d"}`,
              borderRadius:5,padding:"4px 9px",fontFamily:"inherit",
              fontSize:9,cursor:"pointer",fontWeight:recencyFilter===r?700:400}}>
            {r==="ALL"?"ALL TIME":RECENCY_LABEL[r]}
          </button>
        ))}
        <span style={{marginLeft:"auto",fontSize:9,color:"#4d6880",letterSpacing:1}}>
          {filtered.length} PLAYERS
        </span>
      </div>

      {/* Category pills */}
      <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
        <button onClick={()=>setCatFilter("ALL")}
          style={{background:catFilter==="ALL"?"#1e2d3d":"transparent",
            color:catFilter==="ALL"?"#e2e8f0":"#4d6880",
            border:"1px solid #1e2d3d",borderRadius:5,
            padding:"4px 10px",fontFamily:"inherit",fontSize:9,cursor:"pointer",
            fontWeight:catFilter==="ALL"?700:400}}>
          ALL
        </button>
        {Object.entries(CAT_META).map(([key,meta])=>{
          const cnt = catCounts[key]||0;
          if (!cnt) return null;
          return (
            <button key={key} onClick={()=>setCatFilter(catFilter===key?"ALL":key)}
              style={{background:catFilter===key?meta.color+"22":"transparent",
                color:catFilter===key?meta.color:"#4d6680",
                border:`1px solid ${catFilter===key?meta.color+"55":"#1e2d3d"}`,
                borderRadius:5,padding:"4px 10px",fontFamily:"inherit",
                fontSize:9,cursor:"pointer",fontWeight:catFilter===key?700:400}}>
              {meta.icon} {meta.label}
              <span style={{fontSize:8,marginLeft:4,opacity:0.7}}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Player news cards */}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.length === 0 && (
          <div style={{textAlign:"center",padding:40,border:"1px dashed #1e2d3d",
            borderRadius:8,color:"#4d6880",fontSize:10}}>
            No news found for current filters.
            {ownerFilter==="MY_TEAM"&&<div style={{marginTop:6,fontSize:9,color:"#2a3d52"}}>
              Try switching scope to ALL TEAMS or changing filters.
            </div>}
          </div>
        )}
        {filtered.map(item=>{
          const p     = item.player;
          const ts    = TIER_STYLE[p.tier] || TIER_STYLE.Stash;
          const isOpen= expandedPid === p.pid;
          const hasNeg= item.articles.some(a=>a.impact==="negative");
          const hasPos= item.articles.some(a=>a.impact==="positive");
          const newest= item.articles[0];

          // Which articles to show collapsed
          const visibleArts = isOpen
            ? item.articles
            : item.articles.slice(0, 2);

          return (
            <div key={p.pid}
              style={{background:"#0a1118",
                border:`1px solid ${hasNeg?"#ef444444":hasPos?"#22c55e44":"#1e2d3d"}`,
                borderRadius:10,overflow:"hidden"}}>

              {/* Player row — click to expand */}
              <div style={{display:"flex",alignItems:"center",gap:12,
                padding:"10px 14px",cursor:"pointer",
                borderBottom:visibleArts.length>0?"1px solid #1e2d3d":"none"}}
                onClick={()=>setExpandedPid(isOpen?null:p.pid)}>

                {/* Score badge */}
                <div style={{background:ts.bg,border:`1px solid ${ts.border}`,
                  borderRadius:6,padding:"4px 8px",textAlign:"center",
                  minWidth:44,flexShrink:0}}>
                  <div style={{fontSize:15,fontWeight:900,color:ts.text,lineHeight:1}}>{p.score}</div>
                  <div style={{fontSize:7,color:ts.text,letterSpacing:0.5}}>{p.tier.toUpperCase()}</div>
                </div>

                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontSize:13,fontWeight:900,color:"#e2e8f0"}}>{p.name}</span>
                    <span style={{fontSize:10,color:"#7a95ae"}}>{p.pos} · {p.team}</span>
                    <span style={{fontSize:9,color:"#4d6880"}}>{p.owner}</span>
                    {hasNeg&&<span style={{fontSize:8,background:"#ef444422",color:"#ef4444",
                      border:"1px solid #ef444433",borderRadius:3,padding:"1px 5px",fontWeight:700}}>
                      ↓ CONCERN</span>}
                    {hasPos&&!hasNeg&&<span style={{fontSize:8,background:"#22c55e22",color:"#22c55e",
                      border:"1px solid #22c55e33",borderRadius:3,padding:"1px 5px",fontWeight:700}}>
                      ↑ POSITIVE</span>}
                  </div>

                  {/* Category + date summary */}
                  <div style={{display:"flex",gap:4,marginTop:4,flexWrap:"wrap",alignItems:"center"}}>
                    {[...new Set(item.articles.map(a=>a.category))].map(cat=>{
                      const m=CAT_META[cat]||CAT_META.other;
                      return (
                        <span key={cat} style={{fontSize:7,background:m.color+"22",
                          color:m.color,border:`1px solid ${m.color}33`,
                          borderRadius:3,padding:"1px 5px",fontWeight:700,letterSpacing:0.5}}>
                          {m.icon} {m.label}
                        </span>
                      );
                    })}
                    <span style={{fontSize:9,color:"#2a3d52"}}>
                      {item.articles.length} article{item.articles.length!==1?"s":""}
                    </span>
                    {newest && (
                      <span style={{fontSize:9,color:RECENCY_COLOR[newest.recency]||"#4d6880",
                        marginLeft:4}}>
                        · Latest: {newest.date}
                      </span>
                    )}
                  </div>
                </div>

                <span style={{fontSize:10,color:"#2a3d52",flexShrink:0}}>{isOpen?"▲":"▼"}</span>
              </div>

              {/* Article rows */}
              {visibleArts.map((a,ai)=>{
                const cm = CAT_META[a.category]||CAT_META.other;
                const rc = RECENCY_COLOR[a.recency]||"#4d6880";
                const impCol = a.impact==="positive"?"#22c55e":a.impact==="negative"?"#ef4444":"transparent";
                return (
                  <div key={ai}
                    style={{padding:"10px 14px 10px 56px",
                      borderBottom:ai<visibleArts.length-1?"1px solid #0f1923":"none",
                      background:a.impact==="negative"?"#0d0505":a.impact==="positive"?"#040d04":"transparent",
                      borderLeft:a.impact!=="neutral"?`3px solid ${impCol}44`:"3px solid transparent"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                      <span style={{fontSize:12,color:cm.color,marginTop:1,flexShrink:0}}>{cm.icon}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                          <span style={{fontSize:8,background:cm.color+"22",color:cm.color,
                            border:`1px solid ${cm.color}33`,borderRadius:3,
                            padding:"1px 5px",fontWeight:700,letterSpacing:0.5}}>
                            {cm.label}
                          </span>
                          <span style={{fontSize:8,color:rc,fontWeight:700}}>
                            {a.date}
                          </span>
                          <span style={{fontSize:8,color:rc,opacity:0.7}}>
                            ({RECENCY_LABEL[a.recency]||a.recency})
                          </span>
                          {a.impact!=="neutral"&&<span style={{fontSize:8,
                            color:a.impact==="positive"?"#22c55e":"#ef4444",fontWeight:700}}>
                            {a.impact==="positive"?"↑":"↓"}
                          </span>}
                        </div>
                        <div style={{fontSize:11,fontWeight:700,color:"#e2e8f0",
                          marginBottom:a.summary?4:0,lineHeight:1.4}}>
                          {a.url
                            ? <a href={a.url} target="_blank" rel="noopener noreferrer"
                                style={{color:"#e2e8f0",textDecoration:"none"}}
                                onMouseOver={e=>e.currentTarget.style.color="#60a5fa"}
                                onMouseOut={e=>e.currentTarget.style.color="#e2e8f0"}>
                                {a.headline} ↗
                              </a>
                            : a.headline}
                        </div>
                        {a.summary && (
                          <div style={{fontSize:10,color:"#94a3b8",lineHeight:1.6}}>
                            {a.summary.slice(0, 200)}{a.summary.length>200?"…":""}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Expand / collapse */}
              {!isOpen && item.articles.length > 2 && (
                <div onClick={()=>setExpandedPid(p.pid)}
                  style={{padding:"6px 14px 8px 56px",fontSize:9,
                    color:"#4d6880",cursor:"pointer",borderTop:"1px solid #0f1923"}}>
                  + {item.articles.length - 2} more article{item.articles.length-2!==1?"s":""}
                </div>
              )}
              {isOpen && item.articles.length > 2 && (
                <div onClick={()=>setExpandedPid(null)}
                  style={{padding:"6px 14px 8px 14px",fontSize:9,textAlign:"center",
                    color:"#4d6880",cursor:"pointer",borderTop:"1px solid #0f1923"}}>
                  ▲ show less
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
