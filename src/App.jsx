import { useState, useCallback, useRef, useEffect } from "react";

import { LEAGUE_ID, PICK_VALUES, MANUAL_SITUATIONS, LEAGUE_API_KEY, pv } from "./constants";
import { calcAge, resolveBreakoutFlag, ageScore }     from "./scoring";
import { loadData as apiLoadData } from "./api";
import { runIntel as apiRunIntel, claudeAnalyse } from "./intel";
import { claudeTradeAnalysis, pickValue, itemScore, tradeTotal as tradeTotalFn, tradeVerdict as tradeVerdictFn } from "./trade";
import { runWatchlistResearch } from "./watchlist";
import { gradeRoster, isSellHigh, weakPositions } from "./roster";
import { doExport }           from "./export";
import { lsGet, lsSet }       from "./storage";
import { useIdentity }         from "./identity";

import { Btn }           from "./components/Btn";
import { Dashboard }     from "./tabs/Dashboard";
import { LeagueHub }     from "./tabs/LeagueHub";
import { TeamHub }       from "./tabs/TeamHub";
import { PlayerHub }     from "./tabs/PlayerHub";
import { AnalysisTools } from "./tabs/AnalysisTools";
import { DraftHub }      from "./tabs/DraftHub";
import { Log }           from "./tabs/Log";
import { QuickRank, applyRanking } from "./tabs/QuickRank";

const isProxied = () => typeof window !== "undefined" &&
  (window.location.hostname.includes("claude.ai") || window.location.hostname.includes("anthropic.com"));

const getApiKey = () => {
  if (isProxied()) return null;
  try { return localStorage.getItem("mgg_anthropic_key") || LEAGUE_API_KEY || ""; } catch { return LEAGUE_API_KEY || ""; }
};
const hasApiKey = () => isProxied() || !!getApiKey();

const SEASON_MODES = ["offseason","preseason","inseason","playoffs","complete"];

export default function App() {
  const [tradeOwnerA, setTradeOwnerA] = useState("");

  const {
    identity, currentOwner, isCommissioner, activeOwner, isViewMode, viewingOwner,
    loginOpen, setLoginOpen,
    loginInput, setLoginInput, loginLoading, setLoginLoading, loginError, setLoginError,
    commPassInput, setCommPassInput, commPassError,
    doSleeperLogin, finaliseLogin, doManualLogin, doLogout, setOwnerMapping,
    activateCommissioner, deactivateCommissioner, enterViewMode, exitViewMode,
  } = useIdentity();

  const userKey = identity?.userId || "guest";
  const ls = { get:(k,def)=>lsGet(userKey,k,def), set:(k,v)=>lsSet(userKey,k,v) };

  const [phase,    setPhase]   = useState("idle");
  const [progress, setProgress]= useState([]);
  const [players,  setPlayers] = useState([]);
  const [nflDb,             setNflDb]             = useState({});
  const [draftPicksByOwner, setDraftPicksByOwner] = useState({});
  const [rosterIdToOwner,   setRosterIdToOwner]   = useState({});
  const [newsMap,   setNewsMap]  = useState({});
  const [newsPhase, setNewsPhase]= useState("idle");
  const [syncedAt,  setSyncedAt] = useState(null);
  const logRef = useRef([]);

  const [seasonState, setSeasonState] = useState(()=>{
    try{const s=localStorage.getItem("mgg_season_override");if(s)return JSON.parse(s);}catch{}
    return{mode:"offseason",currentWeek:null,lastScoredWeek:null,hasMatchups:false,leagueStatus:"pre_draft",season:"2025",leagueName:"",_override:false};
  });

  const [bigBoard,    setBigBoard]   = useState(()=>lsGet(userKey,"bigboard",[]));
  const [bigBoardMode,setBigBoardMode]=useState("rookies");
  const [faWatchlist, setFaWatchlist]= useState(()=>lsGet(userKey,"fa_watchlist",[]));
  const [watchlist,   setWatchlist]  = useState(()=>lsGet(userKey,"watchlist",[]));
  const [manualSits,  setManualSits] = useState(()=>lsGet(userKey,"situations")??{...MANUAL_SITUATIONS});
  const [playerNotes, setPlayerNotes]= useState(()=>lsGet(userKey,"player_notes",{}));
  const [eloScores,   setEloScores]  = useState(()=>lsGet(userKey,"elo_scores",{}));
  const [showQuickRank, setShowQuickRank] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try { return localStorage.getItem("mgg_view_mode") || "dynasty"; } catch { return "dynasty"; }
  });
  const manualSitsRef = useRef(manualSits);

  useEffect(()=>{
    if(!identity)return;
    setBigBoard(ls.get("bigboard",[]));
    setFaWatchlist(ls.get("fa_watchlist",[]));
    setWatchlist(ls.get("watchlist",[]));
    setManualSits(ls.get("situations")??{...MANUAL_SITUATIONS});
    setPlayerNotes(ls.get("player_notes",{}));
    setEloScores(ls.get("elo_scores",{}));
    setTradeOwnerA(identity.ownerName||"");
  },[identity?.userId]); // eslint-disable-line

  useEffect(()=>{
    if(!faWatchlist.length)return;
    setWatchlist(prev=>{
      const names=new Set(prev);
      const toAdd=faWatchlist.map(p=>p.name).filter(n=>n&&!names.has(n));
      if(!toAdd.length)return prev;
      const next=[...prev,...toAdd];ls.set("watchlist",next);return next;
    });
  },[]); // eslint-disable-line

  const [tab,       setTab]      = useState("dashboard");
  const [posFilter, setPosFilter]= useState("ALL");
  const [tierFilter,setTierFilter]=useState("ALL");
  const [search,    setSearch]   = useState("");
  const [sortKey,   setSortKey]  = useState("score");
  const [sortAsc,   setSortAsc]  = useState(false);
  const [detail,    setDetail]   = useState(null);
  const hs=(k)=>{if(k===sortKey)setSortAsc(x=>!x);else{setSortKey(k);setSortAsc(false);}};

  const overrideSeasonMode=(m)=>{const n={...seasonState,mode:m,_override:true};setSeasonState(n);try{localStorage.setItem("mgg_season_override",JSON.stringify(n));}catch{}};
  const clearSeasonOverride=()=>{setSeasonState(p=>({...p,_override:false}));try{localStorage.removeItem("mgg_season_override");}catch{}};

  const saveBigBoard  =(next)=>{setBigBoard(next);ls.set("bigboard",next);};
  const savePlayerNote=(pid,note)=>{const next={...playerNotes,[pid]:note||undefined};if(!note)delete next[pid];setPlayerNotes(next);ls.set("player_notes",next);};
  const saveEloScores =(next)=>{setEloScores(next);ls.set("elo_scores",next);};
  const bigBoardAdd   =(p)=>{if(bigBoard.find(b=>b.pid===p.pid))return;saveBigBoard([...bigBoard,{...p,note:"",addedAt:Date.now()}]);};
  const bigBoardRemove=(pid)=>saveBigBoard(bigBoard.filter(p=>p.pid!==pid));
  const bigBoardMove  =(pid,dir)=>{const i=bigBoard.findIndex(p=>p.pid===pid);if(i<0)return;const n=[...bigBoard];const s=dir==="up"?i-1:i+1;if(s<0||s>=n.length)return;[n[i],n[s]]=[n[s],n[i]];saveBigBoard(n);};
  const bigBoardNote  =(pid,note)=>saveBigBoard(bigBoard.map(p=>p.pid===pid?{...p,note}:p));
  const bigBoardClear =()=>{if(window.confirm("Clear your entire Big Board?"))saveBigBoard([]);};

  const [faSearch,    setFaSearch]   = useState("");
  const [faPosFilter, setFaPosFilter]= useState("ALL");
  const [faTeamFilter,setFaTeamFilter]=useState("ALL");
  const [faAgeMin,    setFaAgeMin]   = useState("");
  const [faAgeMax,    setFaAgeMax]   = useState("");
  const [faHideInj,   setFaHideInj]  = useState(false);
  const saveFaWatchlist=(next)=>{setFaWatchlist(next);ls.set("fa_watchlist",next);};

  const owners=[...new Set(players.map(p=>p.owner).filter(Boolean))].sort();
  const rosteredPids=new Set(players.map(p=>p.pid));

  const faResults=Object.keys(nflDb).length>0?(()=>{
    const inj=new Set(["Out","IR","PUP","Doubtful"]);
    return Object.entries(nflDb).filter(([pid,p])=>{
      if(rosteredPids.has(pid))return false;
      if(!p.position||!["QB","RB","WR","TE","DL","LB","DB","K"].includes(p.position))return false;
      if(!p.active&&p.status!=="Active")return false;
      if(faPosFilter!=="ALL"&&p.position!==faPosFilter)return false;
      if(faTeamFilter!=="ALL"&&(p.team||"FA")!==faTeamFilter)return false;
      if(faHideInj&&inj.has(p.injury_status))return false;
      const age=calcAge(p.birth_date);
      if(faAgeMin&&age&&age<Number(faAgeMin))return false;
      if(faAgeMax&&age&&age>Number(faAgeMax))return false;
      if(faSearch){const s=faSearch.toLowerCase();const nm=(p.full_name||`${p.first_name||""} ${p.last_name||""}`).toLowerCase();if(!nm.includes(s)&&!(p.team||"").toLowerCase().includes(s))return false;}
      return true;
    }).map(([pid,p])=>({pid,name:p.full_name||`${p.first_name||""} ${p.last_name||""}`.trim(),pos:p.position,team:p.team||"FA",age:calcAge(p.birth_date),depth:p.depth_chart_order||null,inj:p.injury_status||null,yrsExp:p.years_exp,college:p.college||null,height:p.height||null,weight:p.weight||null,status:p.status||null}))
    .sort((a,b)=>(a.depth||99)-(b.depth||99)||(a.age||99)-(b.age||99));
  })():[];
  const faTeams=[...new Set(Object.values(nflDb).map(p=>p.team).filter(Boolean))].sort();

  const scoreFA=(pid,raw)=>{
    const SC={QB:2.0,RB:1.7,WR:1.3,TE:1.5,DL:1.0,LB:1.0,DB:0.95,K:0.6};
    const PR={QB:[25,34,38],RB:[23,27,30],WR:[23,29,33],TE:[24,31,35],DL:[23,29,33],LB:[23,28,32],DB:[23,28,32],K:[24,35,42]};
    const pos=raw.position;if(!SC[pos])return null;
    const age=calcAge(raw.birth_date),dep=raw.depth_chart_order||null;
    const roleConf=dep===1?1.0:dep===2?0.55:dep>=3?0.25:0.65;
    const name=raw.full_name||`${raw.first_name||""} ${raw.last_name||""}`.trim();
    const ageRaw=ageScore(age,pos),startPen=dep===1?0.85:dep===2?0.55:0.35;
    const prodProxy=SC[pos]*roleConf*startPen*10,ageGated=ageRaw*Math.min(roleConf,1.0)*startPen;
    const roleStab=dep?Math.max(0,100-(dep-1)*30):40;
    let situationFlag=null,situationNote=null;
    const ms=manualSitsRef.current[name];
    if(ms){situationFlag=resolveBreakoutFlag(ms.flag,age);situationNote=ms.note;}
    else if(age){const[,,cliff]=PR[pos]||[23,29,33];if(age>cliff){situationFlag="AGE_CLIFF";situationNote=`Age ${age} past ${pos} cliff`;}}
    const rawScore=Math.round(Math.min(100,Math.max(0,prodProxy*0.45+(ageGated/100)*30+roleStab*0.10)));
    const tier=rawScore>=80?"Elite":rawScore>=60?"Starter":rawScore>=40?"Flex":rawScore>=20?"Depth":"Stash";
    return{pid,name,pos,team:raw.team||"FA",age,yrsExp:raw.years_exp,depthOrder:dep,depthPos:raw.depth_chart_position||"",roleConf,injStatus:raw.injury_status||null,status:raw.status,height:raw.height,weight:raw.weight,score:rawScore,tier,situationFlag,situationNote,trades:0,adds:0,drops:0,ppg:null,gamesStarted:null,gamesPlayed:null,owner:"FA",onTaxi:false,isFA:true};
  };
  const addToFaWatchlist=(pid)=>{if(faWatchlist.find(p=>p.pid===pid))return;const raw=nflDb[pid];if(!raw)return;const s=scoreFA(pid,raw);if(!s)return;saveFaWatchlist([...faWatchlist,s]);setWatchlist(prev=>{if(prev.includes(s.name))return prev;const next=[...prev,s.name];ls.set("watchlist",next);return next;});};
  const removeFromFaWatchlist=(pid)=>{const pl=faWatchlist.find(p=>p.pid===pid);saveFaWatchlist(faWatchlist.filter(p=>p.pid!==pid));if(pl?.name)setWatchlist(prev=>{const next=prev.filter(n=>n!==pl.name);ls.set("watchlist",next);return next;});};

  const [tradeOwnerB,  setTradeOwnerB]  = useState("");
  const [tradeSideA,   setTradeSideA]   = useState([]);
  const [tradeSideB,   setTradeSideB]   = useState([]);
  const [tradeSearchA, setTradeSearchA] = useState("");
  const [tradeSearchB, setTradeSearchB] = useState("");
  const [tradePickYrA, setTradePickYrA] = useState(2026);
  const [tradePickRdA, setTradePickRdA] = useState("1st");
  const [tradePickYrB, setTradePickYrB] = useState(2026);
  const [tradePickRdB, setTradePickRdB] = useState("1st");
  const [claudeTradeNarrative,setClaudeTradeNarrative]=useState(null);
  const [claudeTradeLoading,  setClaudeTradeLoading  ]=useState(false);

  const rosterOf=(o)=>players.filter(p=>p.owner===o).sort((a,b)=>b.dynastyValue-a.dynastyValue);
  const tradeSearchResults=(o,s)=>{if(!s.trim())return[];const q=s.toLowerCase();return rosterOf(o).filter(p=>p.name.toLowerCase().includes(q)&&!tradeSideA.find(x=>x.pid===p.pid)&&!tradeSideB.find(x=>x.pid===p.pid)).slice(0,6);};
  const addPlayer=(side,p)=>{const set=side==="A"?setTradeSideA:setTradeSideB;set(prev=>[...prev,{type:"player",pid:p.pid,name:p.name,pos:p.pos,team:p.team,age:p.age,score:p.startValue,dynastyValue:p.dynastyValue,tier:p.tier,owner:p.owner}]);if(side==="A")setTradeSearchA("");else setTradeSearchB("");};
  const addPick=(side)=>{const yr=side==="A"?tradePickYrA:tradePickYrB,rd=side==="A"?tradePickRdA:tradePickRdB;const set=side==="A"?setTradeSideA:setTradeSideB;set(prev=>[...prev,{type:"pick",id:`${yr}-${rd}-${Date.now()}`,label:`${yr} ${rd}`,year:yr,round:rd,score:pickValue(rd,yr-2026),customVal:null}]);};
  const removeItem=(side,id)=>{const set=side==="A"?setTradeSideA:setTradeSideB;set(prev=>prev.filter(x=>(x.pid||x.id)!==id));};
  const setPickCustomVal=(side,id,val)=>{const set=side==="A"?setTradeSideA:setTradeSideB;set(prev=>prev.map(x=>x.id===id?{...x,customVal:val===''?null:Number(val)}:x));};
  const tradeTotal=(s)=>tradeTotalFn(s==="A"?tradeSideA:tradeSideB);
  const tradeVerdict=()=>tradeVerdictFn(tradeSideA,tradeSideB);
  const tradeReset=()=>{setTradeSideA([]);setTradeSideB([]);setTradeSearchA("");setTradeSearchB("");setTradeOwnerB("");setClaudeTradeNarrative(null);};
  const requestClaudeTradeNarrative=async()=>{const k=getApiKey();if(!k&&!isProxied())return;setClaudeTradeLoading(true);setClaudeTradeNarrative(null);try{setClaudeTradeNarrative(await claudeTradeAnalysis(tradeSideA,tradeSideB,tradeOwnerA,tradeOwnerB,k));}catch{}setClaudeTradeLoading(false);};

  const [sitEditName, setSitEditName] = useState("");
  const [sitEditFlag, setSitEditFlag] = useState("NEW_OC");
  const [sitEditNote, setSitEditNote] = useState("");
  const [sitEditGames,setSitEditGames]= useState("");
  const [sitEditing,  setSitEditing]  = useState(null);
  manualSitsRef.current=manualSits;
  const saveSituations=(n)=>{setManualSits(n);ls.set("situations",n);};
  const sitAdd=()=>{if(!sitEditName.trim())return;saveSituations({...manualSits,[sitEditName.trim()]:{flag:sitEditFlag,note:sitEditNote.trim(),...(sitEditFlag==="SUSPENSION"&&sitEditGames?{games:parseInt(sitEditGames)}:{})}});setSitEditName("");setSitEditNote("");setSitEditGames("");setSitEditing(null);};
  const sitRemove=(n)=>{const s={...manualSits};delete s[n];saveSituations(s);};
  const sitStartEdit=(n)=>{const s=manualSits[n];setSitEditing(n);setSitEditName(n);setSitEditFlag(s.flag);setSitEditNote(s.note||"");setSitEditGames(s.games?String(s.games):"");};
  const sitResetDefaults=()=>{if(window.confirm("Reset to hardcoded defaults?"))saveSituations({...MANUAL_SITUATIONS});setSitEditing(null);};

  const [watchInput,      setWatchInput]      = useState("");
  const [researchResults, setResearchResults] = useState({});
  const [researchRunning, setResearchRunning] = useState(false);
  const saveWatchlist=(next)=>{setWatchlist(next);ls.set("watchlist",next);};
  const watchAdd=()=>{const n=watchInput.trim();if(!n||watchlist.includes(n))return;saveWatchlist([...watchlist,n]);setWatchInput("");};
  const watchRemove=(name)=>{saveWatchlist(watchlist.filter(n=>n!==name));setResearchResults(r=>{const n={...r};delete n[name];return n;});};
  const approveResult=(name)=>{const r=researchResults[name];if(!r)return;saveSituations({...manualSits,[name]:{flag:r.flag,note:r.note,...(r.flag==="SUSPENSION"&&r.games?{games:r.games}:{})}});setResearchResults(prev=>({...prev,[name]:{...prev[name],approved:true}}));};
  const rejectResult=(name)=>setResearchResults(prev=>{const n={...prev};delete n[name];return n;});
  const runWatchlistResearch=async()=>{
    if(!watchlist.length)return;setResearchRunning(true);
    const rl={};players.forEach(p=>{rl[p.name]=p;});
    setResearchResults(Object.fromEntries(watchlist.map(n=>[n,{status:"loading"}])));
    const{deepAnalyse}=await import("./api.js");
    const key=getApiKey();const useAI=isProxied()||!!key;
    let arts=[];
    try{const r=await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=200",{signal:AbortSignal.timeout(10000)});if(r.ok){const d=await r.json();arts=(d.articles||[]).map(a=>[a.headline,a.description].filter(Boolean).join(". "));}}
    catch(e){setResearchResults(Object.fromEntries(watchlist.map(n=>[n,{status:"error",error:"ESPN: "+e.message}])));setResearchRunning(false);return;}
    let trending=[];try{const r=await fetch("https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=168&limit=100",{signal:AbortSignal.timeout(6000)});if(r.ok){const d=await r.json();trending=d.map(t=>t.player_id||t);}}catch{}
    const results={};
    for(const name of watchlist){
      const p=rl[name],isTrending=p&&trending.includes(p.pid);let result=null;
      if(useAI){result=await claudeAnalyse(name,arts,p,isProxied()?null:key);if(result){if(isTrending&&result.signal==="HOLD")result.signal="WATCH";if(isTrending)result.reasoning+=" Also trending on Sleeper adds.";}}
      if(!result){const rr=deepAnalyse(name,arts,p);if(rr){if(isTrending&&rr.signal==="BUY")rr.reasoning+=" Also trending on Sleeper adds.";result=rr;}else result={flag:null,note:`No notable situation found in ${arts.length} recent articles`,signal:isTrending?"WATCH":"HOLD",reasoning:isTrending?"No news flags but trending on Sleeper.":"Player appears stable.",status:"done",approved:false};}
      results[name]=result;
    }
    setResearchResults(results);setResearchRunning(false);
  };

  const [draftRoomMode,setDraftRoomMode]=useState("mock");
  const [mockState,    setMockState]    =useState(null);
  const [liveDraftId,  setLiveDraftId]  =useState(null);

  // ── Mobile nav ────────────────────────────────────────────────────────────
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const log=(msg,type="info")=>{const e={msg,type,ts:new Date().toLocaleTimeString()};logRef.current=[...logRef.current,e];setProgress([...logRef.current]);};

  const doLoad=useCallback(async()=>{
    setPhase("loading");logRef.current=[];setProgress([]);
    try{
      const{players:pl,nflDb:db,seasonState:ss,draftPicksByOwner:dpbo,rosterIdToOwner:rid2o}=await apiLoadData(log,manualSitsRef);
      // Blend Elo peer scores into final player scores (15% weight once enough data exists)
      const currentElo = lsGet(userKey,"elo_scores",{});
      const eloEntries = Object.keys(currentElo).length;
      const eloBlendsActive = eloEntries >= 6; // need at least 2 full rankings before it matters
      const eloMin = eloEntries ? Math.min(...Object.values(currentElo)) : 1200;
      const eloMax = eloEntries ? Math.max(...Object.values(currentElo)) : 1200;
      const eloRange = Math.max(eloMax - eloMin, 1);
      const enrichedPl = eloBlendsActive ? pl.map(p => {
        const elo = currentElo[p.pid];
        if (!elo) return p;
        const peerNorm = ((elo - eloMin) / eloRange) * 100;
        // Elo blends into dynastyValue (0-1000 scale)
        const dvBlended = Math.round(p.dynastyValue * 0.85 + (peerNorm / 100) * 1000 * 0.15);
        return { ...p, dynastyValue: Math.min(999, Math.max(1, dvBlended)),
                        score: p.startValue, peerScore: Math.round(peerNorm), eloRating: elo };
      }) : pl;

      setPlayers(enrichedPl);setNflDb(db);setDraftPicksByOwner(dpbo);setRosterIdToOwner(rid2o);
      setSeasonState(prev=>prev._override?prev:ss);setSyncedAt(new Date().toLocaleTimeString());setPhase("done");
      // Show QuickRank once per 24h after a successful sync
      const lastRank = lsGet(userKey,"last_quickrank",0);
      if(Date.now() - lastRank > 86400000) setShowQuickRank(true);
      // Re-open login if identity owner no longer matches loaded roster
      if(identity){
        const loaded=[...new Set(pl.map(p=>p.owner).filter(Boolean))];
        if(loaded.length>0&&!loaded.includes(identity.ownerName)) setLoginOpen(true);
      }
    }catch(e){log(`Error: ${e.message}`,"error");setPhase("error");}
  },[identity]); // eslint-disable-line

  const doIntel=useCallback(async()=>{
    setNewsPhase("loading");
    try{const{newsMap:nm,enrichedPlayers}=await apiRunIntel(players);setPlayers(enrichedPlayers);setNewsMap(nm);setNewsPhase("done");}
    catch(e){console.error(e);setNewsPhase("error");}
  },[players]);

  // ── Sleeper login handler — owner matching + lockout ─────────────────────
  const handleSleeperLogin=async()=>{
    const user=await doSleeperLogin();
    if(!user)return;
    const displayName=user.metadata?.team_name||user.display_name||user.username||loginInput.trim();
    const uname=(user.username||loginInput.trim()).toLowerCase();
    const matchedOwner=owners.find(o=>
      o.toLowerCase()===displayName.toLowerCase()||
      o.toLowerCase().includes(uname)||
      uname.includes(o.toLowerCase().split(" ")[0])
    );
    if(owners.length>0&&!matchedOwner){
      setLoginError(`"${displayName}" is not a member of this league. Access denied.`);
      setLoginLoading(false);
      return;
    }
    finaliseLogin(user, matchedOwner||displayName);
    setTradeOwnerA(matchedOwner||displayName);
  };

  const view=players
    .filter(p=>posFilter==="ALL"||p.pos===posFilter)
    .filter(p=>tierFilter==="ALL"||p.tier===tierFilter)
    .filter(p=>!search||p.name.toLowerCase().includes(search.toLowerCase())||(p.owner||"").toLowerCase().includes(search.toLowerCase())||(p.team||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>{
      // When sorting by "score", respect the active DV/SV toggle
      const resolvedKey = sortKey === "score"
        ? (viewMode === "redraft" ? "startValue" : "dynastyValue")
        : sortKey;
      const va=a[resolvedKey]??0,vb=b[resolvedKey]??0;
      const r=typeof va==="string"?va.localeCompare(vb):va-vb;
      return sortAsc?r:-r;
    });

  return(
    <div style={{background:"#080d14",color:"#e2e8f0",minHeight:"100vh",fontFamily:"'Courier New',monospace"}}>

      {isViewMode&&(
        <div style={{background:"linear-gradient(90deg,#0c1e0c,#0a1118)",borderBottom:"1px solid #22c55e33",padding:"6px 22px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:9,color:"#22c55e",fontWeight:700,letterSpacing:2}}>👁 VIEWING</span>
            <span style={{fontSize:12,color:"#e2e8f0",fontWeight:700}}>{viewingOwner}</span>
            <span style={{fontSize:9,color:"#4d6880"}}>· read-only · your personal data is unchanged</span>
          </div>
          <button onClick={exitViewMode} style={{background:"none",border:"1px solid #22c55e44",color:"#22c55e",borderRadius:4,padding:"3px 10px",fontFamily:"inherit",fontSize:9,cursor:"pointer",letterSpacing:1,fontWeight:700}}>✕ EXIT VIEW</button>
        </div>
      )}

      {/* ── MOBILE NAV DRAWER ──────────────────────────────────────────────── */}
      {isMobile && (
        <>
          {menuOpen && (
            <div onClick={()=>setMenuOpen(false)}
              style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:999,backdropFilter:"blur(2px)"}}/>
          )}
          <div style={{
            position:"fixed",top:0,left:0,height:"100%",width:272,
            background:"linear-gradient(180deg,#0f1923,#080d14)",
            borderRight:"1px solid #1e2d3d",
            transform:menuOpen?"translateX(0)":"translateX(-100%)",
            transition:"transform .25s cubic-bezier(.4,0,.2,1)",
            zIndex:1000,display:"flex",flexDirection:"column",overflowY:"auto",
          }}>
            <div style={{padding:"18px 16px 12px",borderBottom:"1px solid #1e2d3d",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:28,height:28,background:"linear-gradient(135deg,#22c55e,#0ea5e9)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#080d14"}}>Ω</div>
                <div style={{fontSize:12,fontWeight:900,letterSpacing:2,background:"linear-gradient(90deg,#22c55e,#0ea5e9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MGG DYNASTY</div>
              </div>
              <button onClick={()=>setMenuOpen(false)}
                style={{background:"none",border:"none",color:"#4b6580",fontSize:16,cursor:"pointer",padding:4,lineHeight:1}}>✕</button>
            </div>

            <div style={{padding:"8px 12px",borderBottom:"1px solid #1e2d3d"}}>
              <button onClick={()=>{setLoginOpen(true);setMenuOpen(false);}}
                style={{width:"100%",background:"none",border:`1px solid ${isCommissioner?"#f59e0b44":"#1e2d3d"}`,
                  color:isCommissioner?"#f59e0b":"#4b6580",borderRadius:5,padding:"7px 10px",
                  fontFamily:"inherit",fontSize:9,cursor:"pointer",letterSpacing:1,textAlign:"left",
                  display:"flex",alignItems:"center",gap:6}}>
                {isCommissioner&&<span>★</span>}
                {identity ? `◎ ${currentOwner||identity.displayName}` : "◎ LOG IN"}
              </button>
            </div>

            <div style={{padding:"6px 10px",flex:1}}>
              <div style={{fontSize:8,color:"#2a3d52",letterSpacing:2,fontWeight:700,padding:"6px 6px 4px"}}>NAVIGATE</div>
              {[
                ["dashboard","Ω","DASHBOARD"],
                ["leaguehub","⬡","LEAGUE HUB"],
                ["teamhub","◎","TEAM HUB"],
                ["playerhub","◈","PLAYER HUB"],
                ["tools","⇄","ANALYSIS TOOLS"],
                ["drafthub","◈","DRAFT HUB"],
                ["log","▸","LOG"],
              ].map(([id,icon,lbl])=>{
                const active = tab === id;
                return (
                  <button key={id} onClick={()=>{setTab(id);setMenuOpen(false);}}
                    style={{width:"100%",display:"flex",alignItems:"center",gap:10,
                      background:active?"rgba(34,197,94,0.1)":"transparent",
                      border:"none",borderRadius:6,padding:"10px 10px",
                      color:active?"#22c55e":"#4b6580",fontFamily:"inherit",
                      fontSize:11,fontWeight:active?900:400,letterSpacing:active?1.5:1,
                      cursor:"pointer",textAlign:"left",marginBottom:2,
                      borderLeft:active?"2px solid #22c55e":"2px solid transparent",
                      transition:"all .12s"}}>
                    <span style={{fontSize:12,width:16,textAlign:"center"}}>{icon}</span>
                    {lbl}
                  </button>
                );
              })}
            </div>

            <div style={{padding:"8px 12px",borderTop:"1px solid #1e2d3d"}}>
              <div style={{fontSize:8,color:"#2a3d52",letterSpacing:2,fontWeight:700,marginBottom:6}}>VIEW MODE</div>
              <div style={{display:"flex",background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:5,overflow:"hidden"}}>
                {[["dynasty","DV","#22c55e"],["redraft","SV","#60a5fa"]].map(([m,lbl,col])=>{
                  const active = viewMode === m;
                  return (
                    <button key={m} onClick={()=>{setViewMode(m);try{localStorage.setItem("mgg_view_mode",m);}catch{}}}
                      style={{flex:1,background:active?col+"22":"transparent",color:active?col:"#2a3d52",
                        border:"none",padding:"8px 0",fontFamily:"inherit",fontSize:9,
                        fontWeight:active?900:400,letterSpacing:1,cursor:"pointer",transition:"all .15s"}}>
                      {lbl}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{padding:"6px 12px",borderTop:"1px solid #1e2d3d"}}>
              <div style={{fontSize:8,color:"#2a3d52",letterSpacing:2,fontWeight:700,marginBottom:5}}>SEASON MODE</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {SEASON_MODES.map(m=>{
                  const active=seasonState.mode===m;
                  const col={offseason:"#4b6580",preseason:"#60a5fa",inseason:"#22c55e",playoffs:"#f59e0b",complete:"#6b7280"}[m];
                  return (
                    <button key={m} onClick={()=>overrideSeasonMode(m)}
                      style={{background:active?col+"22":"transparent",color:active?col:"#2a3d52",
                        border:`1px solid ${active?col+"55":"#1e2d3d"}`,borderRadius:4,
                        padding:"4px 7px",fontFamily:"inherit",fontSize:8,fontWeight:active?900:400,
                        letterSpacing:1,cursor:"pointer"}}>
                      {m.slice(0,3).toUpperCase()}
                    </button>
                  );
                })}
                {seasonState._override&&<button onClick={clearSeasonOverride} style={{background:"#f59e0b22",color:"#f59e0b",border:"1px solid #f59e0b44",borderRadius:4,padding:"4px 7px",fontFamily:"inherit",fontSize:8,cursor:"pointer"}}>AUTO</button>}
              </div>
            </div>

            <div style={{padding:"10px 12px 22px",borderTop:"1px solid #1e2d3d",display:"flex",flexDirection:"column",gap:6}}>
              <Btn onClick={()=>{doLoad();setMenuOpen(false);}} disabled={phase==="loading"} grad="linear-gradient(135deg,#22c55e,#16a34a)">{phase==="loading"?"◌ SYNCING...":"⟳ SYNC DATA"}</Btn>
              <Btn onClick={()=>{doIntel();setMenuOpen(false);}} disabled={newsPhase==="loading"||!players.length} grad="linear-gradient(135deg,#f59e0b,#d97706)">{newsPhase==="loading"?"◌ SCANNING...":"◈ INTEL SCAN"}</Btn>
              <Btn onClick={()=>doExport(players,newsMap)} disabled={!players.length} grad="linear-gradient(135deg,#6366f1,#4f46e5)">⬇ EXPORT XLSX</Btn>
              {syncedAt&&<div style={{fontSize:8,color:"#2a3d52",letterSpacing:1,textAlign:"center",marginTop:2}}>SYNCED {syncedAt}</div>}
            </div>
          </div>
        </>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{background:"linear-gradient(180deg,#0f1923,#080d14)",borderBottom:"1px solid #1e2d3d",padding:isMobile?"10px 14px":"16px 22px"}}>
        {isMobile ? (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:30,height:30,background:"linear-gradient(135deg,#22c55e,#0ea5e9)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900,color:"#080d14"}}>Ω</div>
              <div>
                <div style={{fontSize:13,fontWeight:900,letterSpacing:2,background:"linear-gradient(90deg,#22c55e,#0ea5e9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MGG DYNASTY</div>
                <div style={{fontSize:8,color:"#22c55e",letterSpacing:1,fontWeight:700,marginTop:1}}>
                  {[["dashboard","Ω DASHBOARD"],["leaguehub","⬡ LEAGUE HUB"],["teamhub","◎ TEAM HUB"],["playerhub","◈ PLAYER HUB"],["tools","⇄ ANALYSIS TOOLS"],["drafthub","◈ DRAFT HUB"],["log","▸ LOG"]].find(([id])=>id===tab)?.[1]||""}
                </div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <button onClick={doLoad} disabled={phase==="loading"}
                style={{background:"linear-gradient(135deg,#22c55e,#16a34a)",border:"none",borderRadius:6,
                  padding:"7px 11px",color:"#080d14",fontFamily:"inherit",fontSize:10,fontWeight:900,
                  cursor:"pointer",opacity:phase==="loading"?0.5:1,lineHeight:1}}>
                {phase==="loading"?"◌":"⟳"}
              </button>
              <button onClick={doIntel} disabled={newsPhase==="loading"||!players.length}
                style={{background:"linear-gradient(135deg,#f59e0b,#d97706)",border:"none",borderRadius:6,
                  padding:"7px 11px",color:"#080d14",fontFamily:"inherit",fontSize:10,fontWeight:900,
                  cursor:"pointer",opacity:(newsPhase==="loading"||!players.length)?0.5:1,lineHeight:1}}>
                {newsPhase==="loading"?"◌":"◈"}
              </button>
              <button onClick={()=>setMenuOpen(true)}
                style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:6,
                  width:34,height:34,cursor:"pointer",display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",gap:4,padding:0}}>
                <span style={{display:"block",width:14,height:2,background:"#e2e8f0",borderRadius:1}}/>
                <span style={{display:"block",width:14,height:2,background:"#e2e8f0",borderRadius:1}}/>
                <span style={{display:"block",width:14,height:2,background:"#e2e8f0",borderRadius:1}}/>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:36,height:36,background:"linear-gradient(135deg,#22c55e,#0ea5e9)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:900,color:"#080d14"}}>Ω</div>
                <div>
                  <div style={{fontSize:19,fontWeight:900,letterSpacing:3,background:"linear-gradient(90deg,#22c55e,#0ea5e9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>MGG DYNASTY</div>
                  <div style={{fontSize:8,color:"#2a3d52",letterSpacing:4,marginTop:1}}>LIVE INTELLIGENCE BOARD · {LEAGUE_ID}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                {syncedAt&&<span style={{fontSize:9,color:"#2a3d52",letterSpacing:1}}>SYNCED {syncedAt}</span>}
                <button onClick={()=>setLoginOpen(true)}
                  style={{background:"none",border:`1px solid ${isCommissioner?"#f59e0b44":"#1e2d3d"}`,
                    color:isCommissioner?"#f59e0b":"#4b6580",borderRadius:5,padding:"5px 12px",
                    fontFamily:"inherit",fontSize:9,cursor:"pointer",letterSpacing:1,
                    display:"flex",alignItems:"center",gap:5}}>
                  {isCommissioner&&<span>★</span>}
                  {identity ? `◎ ${currentOwner||identity.displayName}` : "◎ LOG IN"}
                </button>
                <div style={{display:"flex",alignItems:"center",background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:5,overflow:"hidden"}}>
                  {SEASON_MODES.map(m=>{const active=seasonState.mode===m;const col={offseason:"#4b6580",preseason:"#60a5fa",inseason:"#22c55e",playoffs:"#f59e0b",complete:"#6b7280"}[m];return(
                    <button key={m} onClick={()=>overrideSeasonMode(m)} title={seasonState._override?"Manual override":"Auto-detected"}
                      style={{background:active?col+"22":"transparent",color:active?col:"#2a3d52",border:"none",padding:"4px 8px",fontFamily:"inherit",fontSize:8,fontWeight:active?900:400,letterSpacing:1,cursor:"pointer",borderRight:"1px solid #1e2d3d",transition:"all .15s"}}>
                      {m.slice(0,3).toUpperCase()}
                    </button>
                  );})}
                  {seasonState._override&&<button onClick={clearSeasonOverride} style={{background:"#f59e0b22",color:"#f59e0b",border:"none",padding:"4px 6px",fontFamily:"inherit",fontSize:8,cursor:"pointer"}}>AUTO</button>}
                </div>
                <Btn onClick={doLoad}   disabled={phase==="loading"}                      grad="linear-gradient(135deg,#22c55e,#16a34a)">{phase==="loading"?"◌ SYNCING...":"⟳ SYNC DATA"}</Btn>
                <Btn onClick={doIntel}  disabled={newsPhase==="loading"||!players.length}  grad="linear-gradient(135deg,#f59e0b,#d97706)">{newsPhase==="loading"?"◌ SCANNING...":"◈ INTEL SCAN"}</Btn>
                <div style={{display:"flex",alignItems:"center",background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:5,overflow:"hidden"}}>
                  {[["dynasty","DV","#22c55e"],["redraft","SV","#60a5fa"]].map(([m,lbl,col])=>{
                    const active = viewMode === m;
                    return (
                      <button key={m} onClick={()=>{setViewMode(m);try{localStorage.setItem("mgg_view_mode",m);}catch{}}}
                        title={m==="dynasty"?"Dynasty Value (0-1000) — trade & asset view":"Start Value (0-100) — weekly redraft view"}
                        style={{background:active?col+"22":"transparent",color:active?col:"#2a3d52",
                          border:"none",padding:"5px 10px",fontFamily:"inherit",fontSize:8,
                          fontWeight:active?900:400,letterSpacing:1,cursor:"pointer",transition:"all .15s"}}>
                        {lbl}
                      </button>
                    );
                  })}
                </div>
                <Btn onClick={()=>doExport(players,newsMap)} disabled={!players.length} grad="linear-gradient(135deg,#6366f1,#4f46e5)">⬇ EXPORT XLSX</Btn>
              </div>
            </div>
            <div style={{display:"flex",gap:0,marginTop:16,borderBottom:"1px solid #1e2d3d"}}>
              {[["dashboard","Ω DASHBOARD"],["leaguehub","⬡ LEAGUE HUB"],["teamhub","◎ TEAM HUB"],["playerhub","◈ PLAYER HUB"],["tools","⇄ ANALYSIS TOOLS"],["drafthub","◈ DRAFT HUB"],["log","▸ LOG"]]
                .map(([id,lbl])=>(<button key={id} onClick={()=>setTab(id)} style={{background:"none",border:"none",borderBottom:tab===id?"2px solid #22c55e":"2px solid transparent",color:tab===id?"#22c55e":"#4b6580",padding:"7px 16px",fontFamily:"inherit",fontSize:10,letterSpacing:2,fontWeight:700,cursor:"pointer"}}>{lbl}</button>))}
            </div>
          </>
        )}
      </div>

      <div style={{padding:isMobile?"12px 10px":"18px 22px"}}>
        {phase==="idle"&&(
          <div style={{textAlign:"center",padding:"72px 20px",border:"1px dashed #1e2d3d",borderRadius:12}}>
            <div style={{fontSize:48,fontWeight:900,background:"linear-gradient(135deg,#22c55e,#0ea5e9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:14}}>Ω</div>
            <div style={{fontSize:13,color:"#4b6580",letterSpacing:3,marginBottom:8}}>DYNASTY INTELLIGENCE SYSTEM</div>
            <div style={{fontSize:11,color:"#2a3d52",maxWidth:420,margin:"0 auto 6px",lineHeight:1.9}}>
              <span style={{color:"#22c55e"}}>Sleeper API</span> — live rosters, depth charts, transactions<br/>
              <span style={{color:"#60a5fa"}}>Sleeper Stats</span> — season PPG + stat lines per player<br/>
              <span style={{color:"#f59e0b"}}>Intel Scan</span> — ESPN headlines + BUY/SELL/HOLD signals
            </div>
            <div style={{fontSize:10,color:"#1e2d3d",marginBottom:26}}>⬇ EXPORT XLSX generates a formatted workbook snapshot anytime</div>
            <button onClick={doLoad} style={{background:"linear-gradient(135deg,#22c55e,#0ea5e9)",color:"#080d14",border:"none",borderRadius:8,padding:"11px 34px",fontFamily:"inherit",fontWeight:900,fontSize:12,letterSpacing:3,cursor:"pointer"}}>⟳ INITIALIZE</button>
          </div>
        )}
        {phase==="loading"&&(
          <div style={{background:"#0f1923",border:"1px solid #1e2d3d",borderRadius:10,padding:22,marginBottom:18}}>
            <div style={{fontSize:9,color:"#22c55e",letterSpacing:2,marginBottom:10,fontWeight:700}}>▸ LIVE SYNC</div>
            {progress.map((e,i)=>(<div key={i} style={{fontSize:11,padding:"3px 0",color:e.type==="success"?"#22c55e":e.type==="error"?"#ef4444":e.type==="done"?"#0ea5e9":"#4b6580"}}><span style={{color:"#2a3d52",marginRight:8,fontSize:9}}>{e.ts}</span>{e.msg}</div>))}
            <div style={{marginTop:14,height:3,background:"#1e2d3d",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${Math.min(100,progress.length/10*100)}%`,background:"linear-gradient(90deg,#22c55e,#0ea5e9)",transition:"width .4s"}}/></div>
          </div>
        )}
        {phase==="error"&&(
          <div style={{background:"#1a0505",border:"1px solid #ef4444",borderRadius:8,padding:"16px 20px",marginBottom:16}}>
            <div style={{color:"#ef4444",fontWeight:700,marginBottom:8}}>⚠ SYNC FAILED</div>
            {progress.filter(e=>e.type==="error").map((e,i)=>(<div key={i} style={{fontSize:11,color:"#ef4444"}}>{e.msg}</div>))}
            <div style={{fontSize:11,color:"#6b7280",marginTop:10,lineHeight:1.7}}>Common causes: Sleeper API CORS, network timeout, invalid league ID.<br/>League ID: <strong style={{color:"#e2e8f0"}}>{LEAGUE_ID}</strong></div>
            <button onClick={doLoad} style={{marginTop:12,background:"#1e2d3d",color:"#e2e8f0",border:"1px solid #374151",borderRadius:6,padding:"7px 16px",fontFamily:"inherit",fontSize:10,cursor:"pointer",letterSpacing:1}}>⟳ RETRY</button>
          </div>
        )}

        {tab==="dashboard"&&<Dashboard phase={phase} players={players} currentOwner={activeOwner} owners={owners} newsMap={newsMap} seasonState={seasonState} viewMode={viewMode} onViewTeam={isCommissioner?enterViewMode:undefined}/>}
        {tab==="leaguehub"&&<LeagueHub phase={phase} players={players} owners={owners} currentOwner={activeOwner} newsMap={newsMap} setDetail={setDetail} setActiveTab={setTab} seasonState={seasonState} viewMode={viewMode} onViewTeam={isCommissioner?enterViewMode:undefined}/>}
        {tab==="teamhub"&&<TeamHub phase={phase} players={players} owners={owners} currentOwner={activeOwner} newsMap={newsMap} setDetail={setDetail} isViewMode={isViewMode} viewingOwner={viewingOwner} isCommissioner={isCommissioner} onViewTeam={enterViewMode} onExitView={exitViewMode} playerNotes={playerNotes} savePlayerNote={savePlayerNote} viewMode={viewMode}/>}
        {tab==="playerhub"&&<PlayerHub
          currentOwner={currentOwner} activeOwner={activeOwner} isViewMode={isViewMode}
          owners={owners} phase={phase} players={players} newsMap={newsMap} nflDb={nflDb} view={view}
          detail={detail} setDetail={setDetail} tierFilter={tierFilter} setTierFilter={setTierFilter}
          search={search} setSearch={setSearch} posFilter={posFilter} setPosFilter={setPosFilter}
          sortKey={sortKey} sortAsc={sortAsc} onSort={hs} newsPhase={newsPhase} onRunIntel={doIntel}
          manualSits={manualSits} sitEditName={sitEditName} setSitEditName={setSitEditName}
          sitEditFlag={sitEditFlag} setSitEditFlag={setSitEditFlag} sitEditNote={sitEditNote} setSitEditNote={setSitEditNote}
          sitEditGames={sitEditGames} setSitEditGames={setSitEditGames} sitEditing={sitEditing} setSitEditing={setSitEditing}
          sitAdd={sitAdd} sitRemove={sitRemove} sitStartEdit={sitStartEdit} sitResetDefaults={sitResetDefaults}
          watchlist={watchlist} watchInput={watchInput} setWatchInput={setWatchInput} watchAdd={watchAdd} watchRemove={watchRemove}
          researchResults={researchResults} researchRunning={researchRunning} runWatchlistResearch={runWatchlistResearch}
          approveResult={approveResult} rejectResult={rejectResult}
          faSearch={faSearch} setFaSearch={setFaSearch} faPosFilter={faPosFilter} setFaPosFilter={setFaPosFilter}
          faTeamFilter={faTeamFilter} setFaTeamFilter={setFaTeamFilter} faAgeMin={faAgeMin} setFaAgeMin={setFaAgeMin}
          faAgeMax={faAgeMax} setFaAgeMax={setFaAgeMax} faHideInj={faHideInj} setFaHideInj={setFaHideInj}
          faResults={faResults} faTeams={faTeams} faWatchlist={faWatchlist}
          addToFaWatchlist={addToFaWatchlist} removeFromFaWatchlist={removeFromFaWatchlist}
          viewMode={viewMode}
        />}
        {tab==="tools"&&<AnalysisTools
          phase={phase} owners={owners} players={players} nflDb={nflDb}
          currentOwner={currentOwner} newsMap={newsMap}
          faWatchlist={faWatchlist} onAddToFaWatchlist={addToFaWatchlist}
          tradeOwnerA={tradeOwnerA} setTradeOwnerA={setTradeOwnerA}
          tradeOwnerB={tradeOwnerB} setTradeOwnerB={setTradeOwnerB}
          tradeSideA={tradeSideA} tradeSideB={tradeSideB}
          tradeSearchA={tradeSearchA} setTradeSearchA={setTradeSearchA}
          tradeSearchB={tradeSearchB} setTradeSearchB={setTradeSearchB}
          tradePickYrA={tradePickYrA} setTradePickYrA={setTradePickYrA} tradePickRdA={tradePickRdA} setTradePickRdA={setTradePickRdA}
          tradePickYrB={tradePickYrB} setTradePickYrB={setTradePickYrB} tradePickRdB={tradePickRdB} setTradePickRdB={setTradePickRdB}
          tradeSearchResults={tradeSearchResults} addPlayer={addPlayer} addPick={addPick}
          removeItem={removeItem} setPickCustomVal={setPickCustomVal}
          itemScore={itemScore} tradeTotal={tradeTotal} tradeVerdict={tradeVerdict} tradeReset={tradeReset}
          claudeTradeNarrative={claudeTradeNarrative} claudeTradeLoading={claudeTradeLoading}
          requestClaudeTradeNarrative={requestClaudeTradeNarrative} hasApiKey={hasApiKey()}
          viewMode={viewMode}
        />}
        {tab==="drafthub"&&<DraftHub
          phase={phase} players={players} nflDb={nflDb} currentOwner={currentOwner} owners={owners}
          rosterIdToOwner={rosterIdToOwner} draftPicksByOwner={draftPicksByOwner} seasonState={seasonState}
          bigBoard={bigBoard} bigBoardMode={bigBoardMode} setBigBoardMode={setBigBoardMode}
          bigBoardAdd={bigBoardAdd} bigBoardRemove={bigBoardRemove} bigBoardMove={bigBoardMove} bigBoardNote={bigBoardNote} bigBoardClear={bigBoardClear}
          draftRoomMode={draftRoomMode} setDraftRoomMode={setDraftRoomMode} mockState={mockState} setMockState={setMockState}
          liveDraftId={liveDraftId} setLiveDraftId={setLiveDraftId}
          viewMode={viewMode}
        />}
        {tab==="log"&&<Log progress={progress}/>}
      </div>

      {/* ── QUICK RANK MODAL ──────────────────────────────────────────────── */}
      {showQuickRank && players.length > 0 && (
        <QuickRank
          players={players}
          eloScores={eloScores}
          onComplete={(newScores) => {
            saveEloScores(newScores);
            lsSet(userKey, "last_quickrank", Date.now());
            setShowQuickRank(false);
          }}
          onSkip={() => {
            lsSet(userKey, "last_quickrank", Date.now());
            setShowQuickRank(false);
          }}
        />
      )}

      {/* ── LOGIN / ACCOUNT MODAL ─────────────────────────────────────────── */}
      {loginOpen&&(
        <div onClick={e=>e.target===e.currentTarget&&identity&&setLoginOpen(false)}
          style={{position:"fixed",inset:0,background:"rgba(8,13,20,0.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#0f1923",border:"2px solid #22c55e",borderRadius:14,padding:"28px 32px",width:420,maxWidth:"92vw",boxShadow:"0 0 60px rgba(34,197,94,0.15)"}}>

            <div style={{fontSize:18,fontWeight:900,letterSpacing:2,background:"linear-gradient(90deg,#22c55e,#0ea5e9)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:4}}>
              {identity?"ACCOUNT":"MGG DYNASTY"}
            </div>
            <div style={{fontSize:9,color:"#2a3d52",letterSpacing:3,marginBottom:20}}>
              {identity?"MANAGE YOUR IDENTITY":"LEAGUE ACCESS · SLEEPER VERIFICATION"}
            </div>

            {identity ? (
              <div>
                {/* Identity card */}
                <div style={{background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:8,padding:"12px 16px",marginBottom:16}}>
                  <div style={{fontSize:9,color:"#4d6880",letterSpacing:1,marginBottom:4}}>LOGGED IN AS</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{identity.displayName}</div>
                  <div style={{fontSize:9,color:"#4b6580",marginTop:2}}>
                    @{identity.username} · {identity.ownerName}
                    {isCommissioner&&<span style={{color:"#f59e0b",marginLeft:8,fontWeight:700}}>★ COMMISSIONER</span>}
                  </div>
                </div>
                {/* Owner mapping correction */}
                {owners.length>0&&(
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:9,color:"#4d6880",letterSpacing:1,marginBottom:6}}>YOUR TEAM — tap to correct</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto"}}>
                      {owners.map(o=>(<button key={o} onClick={()=>setOwnerMapping(o)}
                        style={{background:identity.ownerName===o?"#0f2b1a":"#0a1118",
                          border:`1px solid ${identity.ownerName===o?"#22c55e":"#1e2d3d"}`,
                          color:identity.ownerName===o?"#22c55e":"#e2e8f0",borderRadius:6,
                          padding:"8px 12px",fontFamily:"inherit",fontSize:11,
                          fontWeight:identity.ownerName===o?700:400,cursor:"pointer",
                          textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span>{o}</span>
                        <span style={{fontSize:9,color:"#4d6880"}}>{players.filter(p=>p.owner===o).length} players</span>
                      </button>))}
                    </div>
                  </div>
                )}
                {/* Commissioner mode */}
                <div style={{marginBottom:16,padding:"12px 14px",background:"#0a1118",border:"1px solid #1e2d3d",borderRadius:8}}>
                  <div style={{fontSize:9,color:"#f59e0b",letterSpacing:2,fontWeight:700,marginBottom:6}}>★ COMMISSIONER MODE</div>
                  {isCommissioner?(
                    <div>
                      <div style={{fontSize:9,color:"#f59e0b",marginBottom:8}}>Active — view any team read-only</div>
                      {owners.filter(o=>o!==currentOwner).length>0&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                          {owners.filter(o=>o!==currentOwner).map(o=>(
                            <button key={o} onClick={()=>{enterViewMode(o);setLoginOpen(false);}}
                              style={{background:"#1a1000",border:"1px solid #f59e0b33",color:"#f59e0b",borderRadius:4,padding:"3px 8px",fontFamily:"inherit",fontSize:9,cursor:"pointer"}}>
                              👁 {o}
                            </button>
                          ))}
                        </div>
                      )}
                      <button onClick={deactivateCommissioner} style={{background:"none",border:"1px solid #374151",color:"#4b6580",borderRadius:4,padding:"5px 10px",fontFamily:"inherit",fontSize:9,cursor:"pointer"}}>DEACTIVATE</button>
                    </div>
                  ):(
                    <div style={{display:"flex",gap:6}}>
                      <input type="password" value={commPassInput} onChange={e=>setCommPassInput(e.target.value)}
                        onKeyDown={e=>e.key==="Enter"&&activateCommissioner()}
                        placeholder="Commissioner passphrase..."
                        style={{flex:1,background:"#080d14",border:`1px solid ${commPassError?"#ef4444":"#1e2d3d"}`,color:"#e2e8f0",padding:"7px 10px",borderRadius:5,fontFamily:"monospace",fontSize:10}}/>
                      <button onClick={activateCommissioner} disabled={!commPassInput}
                        style={{background:commPassInput?"linear-gradient(135deg,#f59e0b,#d97706)":"#1e2d3d",color:commPassInput?"#080d14":"#4b6580",border:"none",borderRadius:5,padding:"7px 12px",fontFamily:"inherit",fontWeight:900,fontSize:9,cursor:commPassInput?"pointer":"not-allowed"}}>
                        ★ UNLOCK
                      </button>
                    </div>
                  )}
                  {commPassError&&<div style={{fontSize:9,color:"#ef4444",marginTop:4}}>⚠ {commPassError}</div>}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setLoginOpen(false)} style={{flex:1,background:"#0f2b1a",border:"1px solid #22c55e44",color:"#22c55e",borderRadius:6,padding:"9px",fontFamily:"inherit",fontSize:10,cursor:"pointer",fontWeight:700,letterSpacing:1}}>✓ DONE</button>
                  <button onClick={doLogout} style={{background:"#1a0505",border:"1px solid #ef444433",color:"#ef4444",borderRadius:6,padding:"9px 14px",fontFamily:"inherit",fontSize:10,cursor:"pointer",letterSpacing:1}}>LOG OUT</button>
                </div>
              </div>
            ):(
              <div>
                <div style={{fontSize:10,color:"#7a95ae",lineHeight:1.8,marginBottom:20}}>
                  This tool is for <span style={{color:"#22c55e",fontWeight:700}}>MGG Dynasty league members only</span>.<br/>
                  Enter your Sleeper username to verify and get access.
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:9,color:"#4d6880",letterSpacing:1,marginBottom:6}}>SLEEPER USERNAME</div>
                  <input value={loginInput}
                    onChange={e=>{setLoginInput(e.target.value);setLoginError("");}}
                    onKeyDown={e=>e.key==="Enter"&&handleSleeperLogin()}
                    placeholder="your_sleeper_username" autoFocus
                    style={{width:"100%",boxSizing:"border-box",background:"#080d14",
                      border:`1px solid ${loginError?"#ef4444":"#1e2d3d"}`,
                      color:"#e2e8f0",padding:"11px 14px",borderRadius:6,
                      fontFamily:"monospace",fontSize:13,outline:"none"}}/>
                  {loginError&&(
                    <div style={{fontSize:10,color:"#ef4444",marginTop:6,padding:"6px 10px",background:"#1a0505",borderRadius:4,border:"1px solid #ef444422"}}>
                      ⚠ {loginError}
                    </div>
                  )}
                </div>
                <button onClick={handleSleeperLogin} disabled={loginLoading||!loginInput.trim()}
                  style={{width:"100%",background:loginLoading||!loginInput.trim()?"#1e2d3d":"linear-gradient(135deg,#22c55e,#16a34a)",
                    color:loginLoading||!loginInput.trim()?"#4b6580":"#080d14",border:"none",
                    borderRadius:6,padding:"12px",fontFamily:"inherit",fontWeight:900,
                    fontSize:11,letterSpacing:2,cursor:loginLoading||!loginInput.trim()?"not-allowed":"pointer",marginBottom:16}}>
                  {loginLoading?"◌ VERIFYING WITH SLEEPER...":"▸ VERIFY & ENTER"}
                </button>
                <div style={{fontSize:9,color:"#2a3d52",textAlign:"center",lineHeight:1.7}}>
                  Your Sleeper account must be a member of this league.<br/>Non-members will be denied access.
                </div>
                {phase==="done"&&owners.length>0&&(
                  <details style={{marginTop:14}}>
                    <summary style={{fontSize:9,color:"#4d6880",cursor:"pointer",letterSpacing:1}}>▸ SKIP VERIFICATION (pick manually)</summary>
                    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8,maxHeight:160,overflowY:"auto"}}>
                      {owners.map(o=>(<button key={o} onClick={()=>doManualLogin(o)}
                        style={{background:"#0a1118",border:"1px solid #1e2d3d",color:"#7a95ae",borderRadius:5,
                          padding:"8px 12px",fontFamily:"inherit",fontSize:10,cursor:"pointer",
                          textAlign:"left",display:"flex",justifyContent:"space-between"}}>
                        <span>{o}</span><span style={{fontSize:9,color:"#2a3d52"}}>{players.filter(p=>p.owner===o).length} players</span>
                      </button>))}
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
