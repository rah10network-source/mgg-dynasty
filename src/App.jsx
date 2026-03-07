import { useState, useCallback, useRef, useEffect } from "react";

import { LEAGUE_ID, POS_ORDER, PICK_VALUES, PICK_ROUNDS, PICK_YEARS, MANUAL_SITUATIONS } from "./constants";
import { calcAge, resolveBreakoutFlag, ageScore, sitMultiplier } from "./scoring";
import { loadData as apiLoadData, runIntel as apiRunIntel, sf, claudeAnalyse, claudeTradeAnalysis } from "./api";
import { doExport } from "./export";

import { Btn }            from "./components/Btn";
import { Dashboard }      from "./tabs/Dashboard";
import { LeagueHub }      from "./tabs/LeagueHub";
import { TeamHub }        from "./tabs/TeamHub";
import { PlayerHub }      from "./tabs/PlayerHub";
import { AnalysisTools }  from "./tabs/AnalysisTools";
import { DraftHub }       from "./tabs/DraftHub";
import { Log }            from "./tabs/Log";


// Detect if running inside claude.ai (API auto-proxied, no key needed)
const isProxied = () =>
  typeof window !== "undefined" &&
  (window.location.hostname.includes("claude.ai") ||
   window.location.hostname.includes("anthropic.com"));

// Shared Claude API caller — handles proxied vs key-based auth
const callClaude = async (body, apiKey) => {
  const headers = { "content-type": "application/json", "anthropic-version": "2023-06-01" };
  if (!isProxied()) {
    if (!apiKey) return null;
    headers["x-api-key"] = apiKey;
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  return res.json();
};


// ─── PICK HELPERS ─────────────────────────────────────────────────────────────
const pickValue   = (round, yearOffset) => (PICK_VALUES[round]||[10,8,6])[Math.min(yearOffset,2)];

const SEASON_MODES = ["offseason","preseason","inseason","playoffs","complete"];


// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {

  // ── Core data ───────────────────────────────────────────────────────────────
  const [phase,     setPhase]    = useState("idle");
  const [progress,  setProgress] = useState([]);
  const [players,   setPlayers]  = useState([]);
  const [nflDb,           setNflDb]           = useState({});
  const [draftPicksByOwner, setDraftPicksByOwner] = useState({});
  const [rosterIdToOwner,   setRosterIdToOwner]   = useState({});
  // Big Board — persisted to localStorage
  const [bigBoard,     setBigBoard]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("mgg_bigboard")||"[]"); } catch { return []; }
  });
  const [bigBoardMode, setBigBoardMode]= useState("rookies"); // "rookies" | "all"
  // Draft Room
  const [draftRoomMode,setDraftRoomMode]= useState("mock");
  const [mockState,    setMockState]   = useState(null);
  const [liveDraftId,  setLiveDraftId] = useState(null);
  const [newsMap,   setNewsMap]  = useState({});
  const [newsPhase, setNewsPhase]= useState("idle");
  const [syncedAt,  setSyncedAt] = useState(null);
  const [seasonState, setSeasonState] = useState(() => {
    try { const s=localStorage.getItem("mgg_season_override"); if(s) return JSON.parse(s); } catch {}
    return { mode:"offseason", currentWeek:null, lastScoredWeek:null,
             hasMatchups:false, leagueStatus:"pre_draft", season:"2025",
             leagueName:"", _override:false };
  });
  const logRef = useRef([]);
  const [apiKeyOpen,  setApiKeyOpen]  = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");

  // ── Owner identity (localStorage) ───────────────────────────────────────────
  const [currentOwner,    setCurrentOwner]    = useState(() => localStorage.getItem("mgg_owner") || "");
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(() => !localStorage.getItem("mgg_owner"));

  const selectOwner = (name) => {
    setCurrentOwner(name);
    setOwnerPickerOpen(false);
    setTradeOwnerA(name);
    try { localStorage.setItem("mgg_owner", name); } catch {}
  };

  // ── Tab / filter state ──────────────────────────────────────────────────────
  const [tab,        setTab]       = useState("dashboard");
  const [posFilter,  setPosFilter] = useState("ALL");
  const [tierFilter, setTierFilter]= useState("ALL");
  const [search,     setSearch]    = useState("");
  const [sortKey,    setSortKey]   = useState("score");
  const [sortAsc,    setSortAsc]   = useState(false);
  const [detail,     setDetail]    = useState(null);

  const hs = (k) => {
    if (k === sortKey) setSortAsc(x => !x);
    else { setSortKey(k); setSortAsc(false); }
  };

  // ── FA Watchlist ─────────────────────────────────────────────────────────────
  const [faSearch,    setFaSearch]    = useState("");
  const [faPosFilter, setFaPosFilter] = useState("ALL");
  const [faTeamFilter,setFaTeamFilter]= useState("ALL");
  const [faAgeMin,    setFaAgeMin]    = useState("");
  const [faAgeMax,    setFaAgeMax]    = useState("");
  const [faHideInj,   setFaHideInj]  = useState(false);
  const [faWatchlist, setFaWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mgg_fa_watchlist")||"[]"); } catch { return []; }
  });

  const saveFaWatchlist = (next) => {
    setFaWatchlist(next);
    try { localStorage.setItem("mgg_fa_watchlist", JSON.stringify(next)); } catch {}
  };

  // ── Reconcile faWatchlist → watchlist on first load ─────────────────────────
  // Backfills any players already in faWatchlist that got orphaned before the
  // add/remove sync was wired up. Runs once after both states have initialised.
  useEffect(() => {
    if (faWatchlist.length === 0) return;
    setWatchlist(prev => {
      const names = new Set(prev);
      const toAdd = faWatchlist.map(p => p.name).filter(n => n && !names.has(n));
      if (toAdd.length === 0) return prev;
      const next = [...prev, ...toAdd];
      try { localStorage.setItem("mgg_watchlist", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Big Board helpers ────────────────────────────────────────────────────────
  const saveBigBoard = (next) => {
    setBigBoard(next);
    try { localStorage.setItem("mgg_bigboard", JSON.stringify(next)); } catch {}
  };
  const bigBoardAdd = (player) => {
    if (bigBoard.find(p => p.pid === player.pid)) return;
    saveBigBoard([...bigBoard, { ...player, note:"", addedAt: Date.now() }]);
  };
  const bigBoardRemove = (pid) => saveBigBoard(bigBoard.filter(p => p.pid !== pid));
  const bigBoardMove   = (pid, dir) => {
    const idx = bigBoard.findIndex(p => p.pid === pid);
    if (idx < 0) return;
    const next = [...bigBoard];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    saveBigBoard(next);
  };
  const bigBoardNote = (pid, note) => {
    saveBigBoard(bigBoard.map(p => p.pid === pid ? {...p, note} : p));
  };
  const bigBoardClear = () => { if (window.confirm("Clear your entire Big Board?")) saveBigBoard([]); };

  const rosteredPids = new Set(players.map(p => p.pid));

  const faResults = Object.keys(nflDb).length > 0 ? (() => {
    const inj = new Set(["Out","IR","PUP","Doubtful"]);
    return Object.entries(nflDb)
      .filter(([pid, p]) => {
        if (rosteredPids.has(pid))               return false;
        if (!p.position || !["QB","RB","WR","TE","DL","LB","DB","K"].includes(p.position)) return false;
        if (!p.active && p.status !== "Active")  return false;
        if (faPosFilter !== "ALL" && p.position !== faPosFilter) return false;
        if (faTeamFilter !== "ALL" && (p.team||"FA") !== faTeamFilter) return false;
        if (faHideInj && inj.has(p.injury_status)) return false;
        const age = calcAge(p.birth_date);
        if (faAgeMin && age && age < Number(faAgeMin)) return false;
        if (faAgeMax && age && age > Number(faAgeMax)) return false;
        if (faSearch) {
          const s   = faSearch.toLowerCase();
          const name= (p.full_name||`${p.first_name||""} ${p.last_name||""}`).toLowerCase();
          if (!name.includes(s) && !(p.team||"").toLowerCase().includes(s)) return false;
        }
        return true;
      })
      .map(([pid, p]) => ({
        pid,
        name:    p.full_name || `${p.first_name||""} ${p.last_name||""}`.trim(),
        pos:     p.position,
        team:    p.team || "FA",
        age:     calcAge(p.birth_date),
        depth:   p.depth_chart_order || null,
        inj:     p.injury_status || null,
        yrsExp:  p.years_exp,
        college: p.college   || null,
        height:  p.height    || null,
        weight:  p.weight    || null,
        status:  p.status    || null,
      }))
      .sort((a,b) => (a.depth||99)-(b.depth||99) || (a.age||99)-(b.age||99));
  })() : [];

  const faTeams = [...new Set(Object.values(nflDb).map(p => p.team).filter(Boolean))].sort();

  // scoreFA — lightweight scorer for unrostered FA players (no PPG data)
  const manualSitsRef = useRef(MANUAL_SITUATIONS);
  const scoreFA = (pid, raw) => {
    const { SCARCITY, PRIME } = { SCARCITY:{QB:2.0,RB:1.7,WR:1.3,TE:1.5,DL:1.0,LB:1.0,DB:0.95,K:0.6}, PRIME:{QB:[25,34,38],RB:[23,27,30],WR:[23,29,33],TE:[24,31,35],DL:[23,29,33],LB:[23,28,32],DB:[23,28,32],K:[24,35,42]} };
    const pos        = raw.position;
    if (!SCARCITY[pos]) return null;
    const age        = calcAge(raw.birth_date);
    const depthOrder = raw.depth_chart_order || null;
    const roleConf   = depthOrder===1?1.0:depthOrder===2?0.55:depthOrder>=3?0.25:0.65;
    const injStatus  = raw.injury_status || null;
    const name       = raw.full_name || `${raw.first_name||""} ${raw.last_name||""}`.trim();
    const ageRaw     = ageScore(age, pos);
    const startPen   = depthOrder===1?0.85:depthOrder===2?0.55:0.35;
    const sc         = SCARCITY[pos]||1.0;
    const prodProxy  = sc*roleConf*startPen*10;
    const ageGated   = ageRaw*Math.min(roleConf,1.0)*startPen;
    const roleStab   = depthOrder?Math.max(0,100-(depthOrder-1)*30):40;
    let situationFlag=null, situationNote=null;
    const manualSit  = manualSitsRef.current[name];
    if (manualSit) {
      situationFlag = resolveBreakoutFlag(manualSit.flag, age);
      situationNote = manualSit.note;
    } else if (age) {
      const [,,cliff] = PRIME[pos]||[23,29,33];
      if (age>cliff) { situationFlag="AGE_CLIFF"; situationNote=`Age ${age} past ${pos} cliff`; }
    }
    const rawScore = Math.round(Math.min(100,Math.max(0, prodProxy*0.45+(ageGated/100)*30+roleStab*0.10)));
    const tier     = rawScore>=80?"Elite":rawScore>=60?"Starter":rawScore>=40?"Flex":rawScore>=20?"Depth":"Stash";
    return { pid, name, pos, team:raw.team||"FA", age, yrsExp:raw.years_exp, depthOrder,
             depthPos:raw.depth_chart_position||"", roleConf, injStatus, status:raw.status,
             height:raw.height, weight:raw.weight, score:rawScore, tier, situationFlag,
             situationNote, trades:0, adds:0, drops:0, ppg:null, gamesStarted:null,
             gamesPlayed:null, owner:"FA", onTaxi:false, isFA:true };
  };

  const addToFaWatchlist    = (pid) => {
    if (faWatchlist.find(p => p.pid === pid)) return;
    const raw    = nflDb[pid]; if (!raw) return;
    const scored = scoreFA(pid, raw); if (!scored) return;
    saveFaWatchlist([...faWatchlist, scored]);
    // Also push into the main name-based watchlist so the Watchlist tab picks them up
    const name = scored.name;
    setWatchlist(prev => {
      if (prev.includes(name)) return prev;
      const next = [...prev, name];
      try { localStorage.setItem("mgg_watchlist", JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const removeFromFaWatchlist = (pid) => {
    const player = faWatchlist.find(p => p.pid === pid);
    saveFaWatchlist(faWatchlist.filter(p => p.pid !== pid));
    // Mirror removal in the main watchlist so Watchlist tab stays in sync
    if (player?.name) {
      setWatchlist(prev => {
        const next = prev.filter(n => n !== player.name);
        try { localStorage.setItem("mgg_watchlist", JSON.stringify(next)); } catch {}
        return next;
      });
    }
  };

  // ── Trade Analyzer ───────────────────────────────────────────────────────────
  const [tradeOwnerA,  setTradeOwnerA]  = useState("");
  const [tradeOwnerB,  setTradeOwnerB]  = useState("");
  const [tradeSideA,   setTradeSideA]   = useState([]);
  const [tradeSideB,   setTradeSideB]   = useState([]);
  const [tradeSearchA, setTradeSearchA] = useState("");
  const [tradeSearchB, setTradeSearchB] = useState("");
  const [tradePickYrA, setTradePickYrA] = useState(2026);
  const [tradePickRdA, setTradePickRdA] = useState("1st");
  const [tradePickYrB, setTradePickYrB] = useState(2026);
  const [tradePickRdB, setTradePickRdB] = useState("1st");
  const [claudeTradeNarrative, setClaudeTradeNarrative] = useState(null);
  const [claudeTradeLoading,   setClaudeTradeLoading]   = useState(false);
  
  const owners    = [...new Set(players.map(p => p.owner).filter(Boolean))].sort();
  const rosterOf  = (owner) => players.filter(p => p.owner===owner).sort((a,b)=>b.score-a.score);

  const tradeSearchResults = (owner, search) => {
    if (!search.trim()) return [];
    const s = search.toLowerCase();
    return rosterOf(owner).filter(p =>
      p.name.toLowerCase().includes(s) &&
      !tradeSideA.find(x => x.pid===p.pid) &&
      !tradeSideB.find(x => x.pid===p.pid)
    ).slice(0, 6);
  };

  const addPlayer = (side, p) => {
    const setter = side==="A" ? setTradeSideA : setTradeSideB;
    setter(prev => [...prev, { type:"player", pid:p.pid, name:p.name,
      pos:p.pos, team:p.team, age:p.age, score:p.score, tier:p.tier, owner:p.owner }]);
    if (side==="A") setTradeSearchA(""); else setTradeSearchB("");
  };

  const addPick = (side) => {
    const yr  = side==="A" ? tradePickYrA : tradePickYrB;
    const rd  = side==="A" ? tradePickRdA : tradePickRdB;
    const val = pickValue(rd, yr - 2026);
    const setter = side==="A" ? setTradeSideA : setTradeSideB;
    setter(prev => [...prev, { type:"pick", id:`${yr}-${rd}-${Date.now()}`,
      label:`${yr} ${rd}`, year:yr, round:rd, score:val, customVal:null }]);
  };

  const removeItem = (side, id) => {
    const setter = side==="A" ? setTradeSideA : setTradeSideB;
    setter(prev => prev.filter(x => (x.pid||x.id) !== id));
  };

  const setPickCustomVal = (side, id, val) => {
    const setter = side==="A" ? setTradeSideA : setTradeSideB;
    setter(prev => prev.map(x => x.id===id ? {...x, customVal:val===''?null:Number(val)} : x));
  };

  const itemScore  = (item) => item.customVal ?? item.score ?? 0;
  const tradeTotal = (side) => (side==="A" ? tradeSideA : tradeSideB).reduce((s,x)=>s+itemScore(x),0);

// Simple heuristic verdict based on total score difference — just a starting point for users to interpret, not a final say
  const tradeVerdict = () => {
    const diff = tradeTotal("B") - tradeTotal("A");
    const abs  = Math.abs(diff);
    if (abs <= 5)  return { label:"FAIR TRADE",                                color:"#3b82f6", diff };
    if (abs <= 15) return { label:diff>0?"SLIGHT WIN":"SLIGHT LOSS",           color:diff>0?"#22c55e":"#f59e0b", diff };
    if (abs <= 30) return { label:diff>0?"CLEAR WIN":"CLEAR LOSS",             color:diff>0?"#22c55e":"#ef4444", diff };
    return               { label:diff>0?"STRONG WIN":"LOPSIDED LOSS",          color:diff>0?"#22c55e":"#ef4444", diff };
  };
// More detailed narrative from Claude — goes beyond just the score difference to analyze positional impacts, team contexts, and more
  const tradeReset = () => {
    setTradeSideA([]); setTradeSideB([]);
    setTradeSearchA(""); setTradeSearchB("");
    setTradeOwnerB("");
    setClaudeTradeNarrative(null);
  };

  // ── API key helpers ──────────────────────────────────────────────────────────
  const saveKey = () => {
    try { localStorage.setItem("mgg_anthropic_key", apiKeyInput.trim()); } catch {}
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2500);
  };
  const clearKey = () => {
    try { localStorage.removeItem("mgg_anthropic_key"); } catch {}
    setApiKeyInput("");
  };
  const getStoredKey = () => {
    try { return localStorage.getItem("mgg_anthropic_key") || ""; } catch { return ""; }
  };

  // ── Claude trade narrative ────────────────────────────────────────────────────
  const requestClaudeTradeNarrative = async () => {
    const key = isProxied() ? null : getStoredKey();
    if (!isProxied() && !key) return;
    setClaudeTradeLoading(true);
    setClaudeTradeNarrative(null);
    try {
      const text = await claudeTradeAnalysis(tradeSideA, tradeSideB, tradeOwnerA, tradeOwnerB, key);
      setClaudeTradeNarrative(text);
    } catch {}
    setClaudeTradeLoading(false);
  };

  // ── Manual Situations ────────────────────────────────────────────────────────
  const loadSituations = () => {
    try { const s=localStorage.getItem("mgg_situations"); if(s) return JSON.parse(s); } catch {}
    return { ...MANUAL_SITUATIONS };
  };
  const [manualSits,   setManualSits]   = useState(loadSituations);
  const [sitEditName,  setSitEditName]  = useState("");
  const [sitEditFlag,  setSitEditFlag]  = useState("NEW_OC");
  const [sitEditNote,  setSitEditNote]  = useState("");
  const [sitEditGames, setSitEditGames] = useState("");
  const [sitEditing,   setSitEditing]   = useState(null);

  // Keep ref in sync so loadData closure sees latest
  manualSitsRef.current = manualSits;

  const saveSituations = (next) => {
    setManualSits(next);
    try { localStorage.setItem("mgg_situations", JSON.stringify(next)); } catch {}
  };

  const sitAdd = () => {
    if (!sitEditName.trim()) return;
    const next = { ...manualSits, [sitEditName.trim()]: {
      flag: sitEditFlag, note: sitEditNote.trim(),
      ...(sitEditFlag==="SUSPENSION" && sitEditGames ? { games:parseInt(sitEditGames) } : {}),
    }};
    saveSituations(next);
    setSitEditName(""); setSitEditNote(""); setSitEditGames(""); setSitEditing(null);
  };
  const sitRemove = (name) => { const n={...manualSits}; delete n[name]; saveSituations(n); };
  const sitStartEdit = (name) => {
    const s = manualSits[name];
    setSitEditing(name); setSitEditName(name);
    setSitEditFlag(s.flag); setSitEditNote(s.note||"");
    setSitEditGames(s.games ? String(s.games) : "");
  };
  const sitResetDefaults = () => {
    if (window.confirm("Reset to hardcoded defaults? Your custom entries will be lost."))
      saveSituations({ ...MANUAL_SITUATIONS });
    setSitEditing(null);
  };

  // ── Deep Situation Watchlist ──────────────────────────────────────────────────
  const [watchlist,       setWatchlist]       = useState(() => {
    try { return JSON.parse(localStorage.getItem("mgg_watchlist")||"[]"); } catch { return []; }
  });
  const [watchInput,      setWatchInput]      = useState("");
  const [researchResults, setResearchResults] = useState({});
  const [researchRunning, setResearchRunning] = useState(false);

  const saveWatchlist = (next) => {
    setWatchlist(next);
    try { localStorage.setItem("mgg_watchlist", JSON.stringify(next)); } catch {}
  };
  const watchAdd    = () => {
    const name = watchInput.trim();
    if (!name || watchlist.includes(name)) return;
    saveWatchlist([...watchlist, name]); setWatchInput("");
  };
  const watchRemove = (name) => {
    saveWatchlist(watchlist.filter(n => n!==name));
    setResearchResults(r => { const n={...r}; delete n[name]; return n; });
  };
  const approveResult = (name) => {
    const r = researchResults[name]; if (!r) return;
    const next = { ...manualSits, [name]: { flag:r.flag, note:r.note,
      ...(r.flag==="SUSPENSION"&&r.games?{games:r.games}:{}) }};
    saveSituations(next);
    setResearchResults(prev => ({...prev,[name]:{...prev[name],approved:true}}));
  };
  const rejectResult = (name) => {
    setResearchResults(prev => { const n={...prev}; delete n[name]; return n; });
  };
  // Core research function — fetches news, runs analysis, updates results for each player in the watchlist
  const runWatchlistResearch = async () => {
    if (!watchlist.length) return;
    setResearchRunning(true);
    const rosterLookup = {}; players.forEach(p => { rosterLookup[p.name]=p; });
    const loading = {}; watchlist.forEach(n => { loading[n]={status:"loading"}; });
    setResearchResults(loading);

    const { deepAnalyse } = await import("./api.js");
    const key = isProxied() ? "__proxied__" : getStoredKey();
    const useAI = isProxied() || !!key;

    let allArticles = [];
    try {
      const r = await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=200",
        { signal:AbortSignal.timeout(10000) });
      if (r.ok) {
        const d = await r.json();
        allArticles = (d.articles||[]).map(a=>[a.headline,a.description].filter(Boolean).join(". "));
      }
    } catch(e) {
      const errs = {}; watchlist.forEach(n=>{errs[n]={status:"error",error:"ESPN fetch failed: "+e.message};});
      setResearchResults(errs); setResearchRunning(false); return;
    }

    let trending = [];
    try {
      const r = await fetch("https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=168&limit=100",
        {signal:AbortSignal.timeout(6000)});
      if (r.ok) { const d=await r.json(); trending=d.map(t=>t.player_id||t); }
    } catch {}

    const results = {};
    for (const name of watchlist) {
      const p           = rosterLookup[name];
      const isTrending  = p && trending.includes(p.pid);

      // Try AI analysis first if key available
      let result = null;
      if (useAI) {
        result = await claudeAnalyse(name, allArticles, p, isProxied() ? null : key);
        if (result) {
          if (isTrending && result.signal === "HOLD") result.signal = "WATCH";
          if (isTrending) result.reasoning += " Also trending on Sleeper adds.";
        }
      }

      // Fall back to rule-based deepAnalyse
      if (!result) {
        const ruleResult = deepAnalyse(name, allArticles, p);
        if (ruleResult) {
          if (isTrending && ruleResult.signal === "BUY") ruleResult.reasoning += " Also trending on Sleeper adds.";
          result = ruleResult;
        } else {
          result = {
            flag: null,
            note: `No notable situation found in ${allArticles.length} recent articles`,
            signal: isTrending ? "WATCH" : "HOLD",
            reasoning: isTrending
              ? "No news flags detected but player is trending on Sleeper adds this week."
              : "No situation keywords matched. Player appears stable.",
            status: "done", approved: false,
          };
        }
      }
      results[name] = result;
    }
    setResearchResults(results);
    setResearchRunning(false);
  };
 
  // ── Log helper ───────────────────────────────────────────────────────────────
  const log = (msg, type="info") => {
    const entry = { msg, type, ts:new Date().toLocaleTimeString() };
    logRef.current = [...logRef.current, entry];
    setProgress([...logRef.current]);
  };

  // ── SYNC DATA ────────────────────────────────────────────────────────────────
  const doLoad = useCallback(async () => {
    setPhase("loading"); logRef.current=[]; setProgress([]);
    try {
      const { players: pl, nflDb: db, seasonState: ss, draftPicksByOwner: dpbo, rosterIdToOwner: rid2o } = await apiLoadData(log, manualSitsRef);
      setPlayers(pl);
      setNflDb(db);
      setDraftPicksByOwner(dpbo);
      setRosterIdToOwner(rid2o);
      // Only apply detected state if user hasn't set a manual override
      setSeasonState(prev => prev._override ? prev : ss);
      setSyncedAt(new Date().toLocaleTimeString());
      setPhase("done");
      setOwnerPickerOpen(!localStorage.getItem("mgg_owner"));
    } catch(e) {
      log(`Error: ${e.message}`, "error");
      setPhase("error");
    }
  }, []);

  // ── INTEL SCAN ───────────────────────────────────────────────────────────────
  const doIntel = useCallback(async () => {
    setNewsPhase("loading");
    try {
      const { newsMap: nm, enrichedPlayers } = await apiRunIntel(players);
      setPlayers(enrichedPlayers);
      setNewsMap(nm);
      setNewsPhase("done");
    } catch(e) {
      console.error(e); setNewsPhase("error");
    }
  }, [players]);

  // ── Filtered view for Board ──────────────────────────────────────────────────
  const view = players
    .filter(p => posFilter==="ALL"  || p.pos===posFilter)
    .filter(p => tierFilter==="ALL" || p.tier===tierFilter)
    .filter(p => !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.owner||"").toLowerCase().includes(search.toLowerCase()) ||
      (p.team||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      const va=a[sortKey]??0, vb=b[sortKey]??0;
      const r = typeof va==="string" ? va.localeCompare(vb) : va-vb;
      return sortAsc ? r : -r;
    });

  // ── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <div style={{background:"#080d14",color:"#e2e8f0",minHeight:"100vh",fontFamily:"'Courier New',monospace"}}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{background:"linear-gradient(180deg,#0f1923,#080d14)",borderBottom:"1px solid #1e2d3d",padding:"16px 22px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:36,height:36,background:"linear-gradient(135deg,#22c55e,#0ea5e9)",borderRadius:8,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#080d14"}}>
              Ω
            </div>
            <div>
              <div style={{fontSize:19,fontWeight:900,letterSpacing:3,
                background:"linear-gradient(90deg,#22c55e,#0ea5e9)",
                WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>
                MGG DYNASTY
              </div>
              <div style={{fontSize:8,color:"#2a3d52",letterSpacing:4,marginTop:1}}>
                LIVE INTELLIGENCE BOARD · {LEAGUE_ID}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
            {syncedAt && <span style={{fontSize:9,color:"#2a3d52",letterSpacing:1}}>SYNCED {syncedAt}</span>}
            {currentOwner && (
              <button onClick={() => setOwnerPickerOpen(true)}
                style={{background:"none",border:"1px solid #1e2d3d",color:"#4b6580",borderRadius:5,
                  padding:"5px 10px",fontFamily:"inherit",fontSize:9,cursor:"pointer",letterSpacing:1}}>
                ◎ {currentOwner}
              </button>
            )}
            {/* Season mode pill */}
            <div style={{display:"flex",alignItems:"center",gap:0,background:"#0a1118",
              border:"1px solid #1e2d3d",borderRadius:5,overflow:"hidden"}}>
              {SEASON_MODES.map(m => {
                const active = seasonState.mode === m;
                const col    = {offseason:"#4b6580",preseason:"#60a5fa",inseason:"#22c55e",playoffs:"#f59e0b",complete:"#6b7280"}[m];
                return (
                  <button key={m} onClick={() => overrideSeasonMode(m)}
                    title={seasonState._override ? "Manual override active" : "Auto-detected"}
                    style={{background:active?col+"22":"transparent",color:active?col:"#2a3d52",
                      border:"none",padding:"4px 8px",fontFamily:"inherit",fontSize:8,
                      fontWeight:active?900:400,letterSpacing:1,cursor:"pointer",
                      borderRight:"1px solid #1e2d3d",transition:"all .15s"}}>
                    {m.slice(0,3).toUpperCase()}
                  </button>
                );
              })}
              {seasonState._override && (
                <button onClick={clearSeasonOverride}
                  title="Clear manual override — revert to auto-detect"
                  style={{background:"#f59e0b22",color:"#f59e0b",border:"none",
                    padding:"4px 6px",fontFamily:"inherit",fontSize:8,cursor:"pointer"}}>
                  AUTO
                </button>
              )}
            </div>
            {/* API Key button — only show warning dot when key missing and not proxied */}
            <button onClick={() => setApiKeyOpen(o => !o)}
              title="Settings"
              style={{background:"none",border:"1px solid #1e2d3d",
                color:"#4b6580",
                borderRadius:5,padding:"5px 10px",fontFamily:"inherit",
                fontSize:11,cursor:"pointer",position:"relative"}}>
              ⚙
            </button>
            <Btn onClick={doLoad}    disabled={phase==="loading"}                     grad="linear-gradient(135deg,#22c55e,#16a34a)">
              {phase==="loading" ? "◌ SYNCING..." : "⟳ SYNC DATA"}
            </Btn>
            <Btn onClick={doIntel}   disabled={newsPhase==="loading"||players.length===0} grad="linear-gradient(135deg,#f59e0b,#d97706)">
              {newsPhase==="loading" ? "◌ SCANNING..." : "◈ INTEL SCAN"}
            </Btn>
            <Btn onClick={() => doExport(players, newsMap)} disabled={players.length===0} grad="linear-gradient(135deg,#6366f1,#4f46e5)">
              ⬇ EXPORT XLSX
            </Btn>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{display:"flex",gap:0,marginTop:16,borderBottom:"1px solid #1e2d3d"}}>
          {[
            ["dashboard",  "Ω DASHBOARD"],
            ["leaguehub",  "⬡ LEAGUE HUB"],
            ["teamhub",    "◎ TEAM HUB"],
            ["playerhub",  "◈ PLAYER HUB"],
            ["tools",      "⇄ ANALYSIS TOOLS"],
            ["drafthub",   "◈ DRAFT HUB"],
            ["log",        "▸ LOG"],
          ].map(([id, lbl]) => (
            <button key={id} onClick={() => setTab(id)} style={{
              background:"none", border:"none",
              borderBottom: tab===id ? "2px solid #22c55e" : "2px solid transparent",
              color:        tab===id ? "#22c55e" : "#4b6580",
              padding:"7px 16px", fontFamily:"inherit",
              fontSize:10, letterSpacing:2, fontWeight:700, cursor:"pointer",
            }}>{lbl}</button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ────────────────────────────────────────────────────────── */}
      <div style={{padding:"18px 22px"}}>

        {/* Idle splash */}
        {phase === "idle" && (
          <div style={{textAlign:"center",padding:"72px 20px",border:"1px dashed #1e2d3d",borderRadius:12}}>
            <div style={{fontSize:48,fontWeight:900,
              background:"linear-gradient(135deg,#22c55e,#0ea5e9)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:14}}>Ω</div>
            <div style={{fontSize:13,color:"#4b6580",letterSpacing:3,marginBottom:8}}>DYNASTY INTELLIGENCE SYSTEM</div>
            <div style={{fontSize:11,color:"#2a3d52",maxWidth:420,margin:"0 auto 6px",lineHeight:1.9}}>
              <span style={{color:"#22c55e"}}>Sleeper API</span> — live rosters, depth charts, transactions<br/>
              <span style={{color:"#60a5fa"}}>Sleeper Stats</span> — season PPG + stat lines per player<br/>
              <span style={{color:"#f59e0b"}}>Intel Scan</span> — ESPN headlines + BUY/SELL/HOLD signals
            </div>
            <div style={{fontSize:10,color:"#1e2d3d",marginBottom:26}}>⬇ EXPORT XLSX generates a formatted workbook snapshot anytime</div>
            <button onClick={doLoad}
              style={{background:"linear-gradient(135deg,#22c55e,#0ea5e9)",color:"#080d14",border:"none",
                borderRadius:8,padding:"11px 34px",fontFamily:"inherit",fontWeight:900,fontSize:12,
                letterSpacing:3,cursor:"pointer"}}>
              ⟳ INITIALIZE
            </button>
          </div>
        )}

        {/* Loading log */}
        {phase === "loading" && (
          <div style={{background:"#0f1923",border:"1px solid #1e2d3d",borderRadius:10,padding:22,marginBottom:18}}>
            <div style={{fontSize:9,color:"#22c55e",letterSpacing:2,marginBottom:10,fontWeight:700}}>▸ LIVE SYNC</div>
            {progress.map((e,i) => (
              <div key={i} style={{fontSize:11,padding:"3px 0",
                color:e.type==="success"?"#22c55e":e.type==="error"?"#ef4444":e.type==="done"?"#0ea5e9":"#4b6580"}}>
                <span style={{color:"#2a3d52",marginRight:8,fontSize:9}}>{e.ts}</span>{e.msg}
              </div>
            ))}
            <div style={{marginTop:14,height:3,background:"#1e2d3d",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(100,progress.length/10*100)}%`,
                background:"linear-gradient(90deg,#22c55e,#0ea5e9)",transition:"width .4s"}}/>
            </div>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div style={{background:"#1a0505",border:"1px solid #ef4444",borderRadius:8,padding:"16px 20px",marginBottom:16}}>
            <div style={{color:"#ef4444",fontWeight:700,marginBottom:8}}>⚠ SYNC FAILED</div>
            {progress.filter(e => e.type==="error").map((e,i) => (
              <div key={i} style={{fontSize:11,color:"#ef4444"}}>{e.msg}</div>
            ))}
            <div style={{fontSize:11,color:"#6b7280",marginTop:10,lineHeight:1.7}}>
              Common causes: Sleeper API CORS, network timeout, or invalid league ID.<br/>
              League ID: <strong style={{color:"#e2e8f0"}}>{LEAGUE_ID}</strong>
            </div>
            <button onClick={doLoad}
              style={{marginTop:12,background:"#1e2d3d",color:"#e2e8f0",border:"1px solid #374151",
                borderRadius:6,padding:"7px 16px",fontFamily:"inherit",fontSize:10,cursor:"pointer",letterSpacing:1}}>
              ⟳ RETRY
            </button>
          </div>
        )}

        {/* ── TABS ─────────────────────────────────────────────────────────── */}
        {tab === "dashboard" && (
          <Dashboard
            phase={phase}
            players={players}
            currentOwner={currentOwner}
            owners={owners}
            newsMap={newsMap}
            seasonState={seasonState}
          />
        )}

        {tab === "leaguehub" && (
          <LeagueHub
            phase={phase}
            players={players}
            owners={owners}
            currentOwner={currentOwner}
            newsMap={newsMap}
            setDetail={setDetail}
            setActiveTab={setTab}
          seasonState={seasonState}
          />
        )}

        {tab === "teamhub" && (
          <TeamHub
            phase={phase}
            players={players}
            owners={owners}
            currentOwner={currentOwner}
          />
        )}

        {tab === "playerhub" && (
          <PlayerHub
            currentOwner={currentOwner}
            owners={owners}
            phase={phase}
            players={players}
            newsMap={newsMap}
            nflDb={nflDb}
            view={view}
            detail={detail} setDetail={setDetail}
            tierFilter={tierFilter} setTierFilter={setTierFilter}
            search={search} setSearch={setSearch}
            posFilter={posFilter} setPosFilter={setPosFilter}
            sortKey={sortKey} sortAsc={sortAsc} onSort={hs}
            newsPhase={newsPhase} onRunIntel={doIntel}
            manualSits={manualSits}
            sitEditName={sitEditName} setSitEditName={setSitEditName}
            sitEditFlag={sitEditFlag} setSitEditFlag={setSitEditFlag}
            sitEditNote={sitEditNote} setSitEditNote={setSitEditNote}
            sitEditGames={sitEditGames} setSitEditGames={setSitEditGames}
            sitEditing={sitEditing} setSitEditing={setSitEditing}
            sitAdd={sitAdd} sitRemove={sitRemove}
            sitStartEdit={sitStartEdit} sitResetDefaults={sitResetDefaults}
            watchlist={watchlist} watchInput={watchInput} setWatchInput={setWatchInput}
            watchAdd={watchAdd} watchRemove={watchRemove}
            researchResults={researchResults} researchRunning={researchRunning}
            runWatchlistResearch={runWatchlistResearch}
            approveResult={approveResult} rejectResult={rejectResult}
            faSearch={faSearch} setFaSearch={setFaSearch}
            faPosFilter={faPosFilter} setFaPosFilter={setFaPosFilter}
            faTeamFilter={faTeamFilter} setFaTeamFilter={setFaTeamFilter}
            faAgeMin={faAgeMin} setFaAgeMin={setFaAgeMin}
            faAgeMax={faAgeMax} setFaAgeMax={setFaAgeMax}
            faHideInj={faHideInj} setFaHideInj={setFaHideInj}
            faResults={faResults} faTeams={faTeams} faWatchlist={faWatchlist}
            addToFaWatchlist={addToFaWatchlist}
            removeFromFaWatchlist={removeFromFaWatchlist}
          />
        )}

        {tab === "tools" && (
          <AnalysisTools
            phase={phase} owners={owners}
            tradeOwnerA={tradeOwnerA} setTradeOwnerA={setTradeOwnerA}
            tradeOwnerB={tradeOwnerB} setTradeOwnerB={setTradeOwnerB}
            tradeSideA={tradeSideA}   tradeSideB={tradeSideB}
            tradeSearchA={tradeSearchA} setTradeSearchA={setTradeSearchA}
            tradeSearchB={tradeSearchB} setTradeSearchB={setTradeSearchB}
            tradePickYrA={tradePickYrA} setTradePickYrA={setTradePickYrA}
            tradePickRdA={tradePickRdA} setTradePickRdA={setTradePickRdA}
            tradePickYrB={tradePickYrB} setTradePickYrB={setTradePickYrB}
            tradePickRdB={tradePickRdB} setTradePickRdB={setTradePickRdB}
            tradeSearchResults={tradeSearchResults}
            addPlayer={addPlayer} addPick={addPick}
            removeItem={removeItem} setPickCustomVal={setPickCustomVal}
            itemScore={itemScore} tradeTotal={tradeTotal}
            tradeVerdict={tradeVerdict} tradeReset={tradeReset}
            claudeTradeNarrative={claudeTradeNarrative}
            claudeTradeLoading={claudeTradeLoading}
            requestClaudeTradeNarrative={requestClaudeTradeNarrative}
            hasApiKey={isProxied() || !!getStoredKey()}
          />
        )}

        {tab === "drafthub" && (
          <DraftHub
            phase={phase}
            players={players}
            nflDb={nflDb}
            currentOwner={currentOwner}
            owners={owners}
            rosterIdToOwner={rosterIdToOwner}
            draftPicksByOwner={draftPicksByOwner}
            seasonState={seasonState}
            bigBoard={bigBoard} bigBoardMode={bigBoardMode} setBigBoardMode={setBigBoardMode}
            bigBoardAdd={bigBoardAdd} bigBoardRemove={bigBoardRemove}
            bigBoardMove={bigBoardMove} bigBoardNote={bigBoardNote} bigBoardClear={bigBoardClear}
            draftRoomMode={draftRoomMode} setDraftRoomMode={setDraftRoomMode}
            mockState={mockState} setMockState={setMockState}
            liveDraftId={liveDraftId} setLiveDraftId={setLiveDraftId}
          />
        )}

        {tab === "log" && <Log progress={progress}/>}

      </div>

      {/* ── OWNER PICKER MODAL ──────────────────────────────────────────────── */}
      {phase === "done" && ownerPickerOpen && (
        <div style={{position:"fixed",inset:0,background:"rgba(8,13,20,0.92)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#0f1923",border:"2px solid #22c55e",borderRadius:14,
            padding:"28px 32px",width:380,boxShadow:"0 0 40px rgba(34,197,94,0.2)"}}>
            <div style={{fontSize:20,fontWeight:900,
              background:"linear-gradient(90deg,#22c55e,#0ea5e9)",
              WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:6}}>
              WHO ARE YOU?
            </div>
            <div style={{fontSize:10,color:"#7a95ae",marginBottom:20,lineHeight:1.6}}>
              Select your team to personalize the app.<br/>Saved to this browser — won't ask again.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:320,overflowY:"auto"}}>
              {owners.sort().map(o => (
                <button key={o} onClick={() => selectOwner(o)}
                  style={{background:currentOwner===o?"#0f2b1a":"#0a1118",
                    border:`1px solid ${currentOwner===o?"#22c55e":"#1e2d3d"}`,
                    color:currentOwner===o?"#22c55e":"#e2e8f0",
                    borderRadius:7,padding:"10px 16px",fontFamily:"inherit",
                    fontSize:12,fontWeight:700,cursor:"pointer",textAlign:"left",
                    display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseOver={e => { if(currentOwner!==o) e.currentTarget.style.borderColor="#374151"; }}
                  onMouseOut={e  => { if(currentOwner!==o) e.currentTarget.style.borderColor="#1e2d3d"; }}>
                  <span>{o}</span>
                  <span style={{fontSize:9,color:"#7a95ae",fontWeight:400}}>
                    {players.filter(p => p.owner===o).length} players
                  </span>
                </button>
              ))}
            </div>
            {currentOwner && (
              <button onClick={() => setOwnerPickerOpen(false)}
                style={{marginTop:14,width:"100%",background:"none",border:"1px solid #1e2d3d",
                  color:"#7a95ae",borderRadius:6,padding:"7px",fontFamily:"inherit",
                  fontSize:9,cursor:"pointer",letterSpacing:1}}>
                KEEP: {currentOwner}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── API Key Modal ─────────────────────────────────────────────────── */}
      {apiKeyOpen && (
        <div onClick={e=>e.target===e.currentTarget&&setApiKeyOpen(false)}
          style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.75)",
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#0f1923",border:"1px solid #1e2d3d",borderRadius:12,
            padding:"28px 32px",width:440,maxWidth:"92vw",
            boxShadow:"0 0 60px rgba(0,0,0,0.7)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <div style={{fontSize:12,fontWeight:900,color:"#e2e8f0",letterSpacing:2,marginBottom:4}}>⚙ API KEY SETTINGS</div>
                <div style={{fontSize:9,color:"#4d6880",letterSpacing:1}}>Powers AI Intel analysis + Trade Analyzer narratives · ESPN data always free</div>
              </div>
              <button onClick={()=>setApiKeyOpen(false)} style={{background:"none",border:"none",color:"#4d6680",fontSize:18,cursor:"pointer"}}>✕</button>
            </div>
            {isProxied() ? (
              <div style={{background:"#0f2b1a",border:"1px solid #22c55e44",borderRadius:8,padding:"14px 16px",fontSize:10,color:"#22c55e"}}>
                ✓ Running in claude.ai — Anthropic API is auto-proxied. No key needed.
              </div>
            ) : (
              <>
                <div style={{fontSize:10,color:"#7a95ae",lineHeight:1.8,marginBottom:14}}>
                  The <span style={{color:"#60a5fa",fontWeight:700}}>News + Situations</span> tab uses the Anthropic API with web search to pull real NFL news.<br/>
                  On GitHub Pages, you need your own key — stored in your browser only, never sent anywhere else.
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:9,color:"#4d6880",letterSpacing:1,marginBottom:5}}>ANTHROPIC API KEY</div>
                  <input type="password" value={apiKeyInput}
                    onChange={e=>setApiKeyInput(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&saveKey()}
                    placeholder="sk-ant-api03-..."
                    style={{width:"100%",boxSizing:"border-box",background:"#080d14",
                      border:"1px solid #1e2d3d",color:"#e2e8f0",padding:"9px 12px",
                      borderRadius:6,fontFamily:"monospace",fontSize:11}}/>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <button onClick={saveKey}
                    style={{flex:1,background:apiKeySaved?"#0f2b1a":"linear-gradient(135deg,#22c55e,#16a34a)",
                      color:apiKeySaved?"#22c55e":"#080d14",
                      border:apiKeySaved?"1px solid #22c55e":"none",
                      borderRadius:6,padding:"9px",fontFamily:"inherit",
                      fontWeight:900,fontSize:10,letterSpacing:1,cursor:"pointer"}}>
                    {apiKeySaved?"✓ SAVED":"SAVE KEY"}
                  </button>
                  {getStoredKey()&&<button onClick={clearKey}
                    style={{background:"#1a0505",color:"#ef4444",border:"1px solid #ef444433",
                      borderRadius:6,padding:"9px 14px",fontFamily:"inherit",fontSize:10,cursor:"pointer",letterSpacing:1}}>
                    CLEAR
                  </button>}
                </div>
                <div style={{fontSize:9,color:"#2a3d52",lineHeight:1.7}}>
                  Get a key at <span style={{color:"#60a5fa"}}>console.anthropic.com</span> · Stored in browser localStorage only · Never sent anywhere except Anthropic
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
