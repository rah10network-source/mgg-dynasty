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

  // ── Team select — shown when Sleeper userId can't be auto-matched ─────────
  // Separate from loginOpen so we don't force re-auth, just re-map.
  const [needsTeamSelect, setNeedsTeamSelect] = useState(false);

  const log=(msg,type="info")=>{const e={msg,type,ts:new Date().toLocaleTimeString()};logRef.current=[...logRef.current,e];setProgress([...logRef.current]);};

  const doLoad=useCallback(async()=>{
    setPhase("loading");logRef.current=[];setProgress([]);
    try{
      const{players:pl,nflDb:db,seasonState:ss,draftPicksByOwner:dpbo,rosterIdToOwner:rid2o,leagueUsers:lu}=await apiLoadData(log,manualSitsRef);
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
      // ── Auto-match identity to roster owner ─────────────────────────────
      // Priority 1: hard match on Sleeper user_id (100% reliable)
      // Priority 2: fuzzy match on display name / username
      // Priority 3: ask user to pick (needsTeamSelect) — NOT a full re-auth
      if(identity){
        const loaded=[...new Set(pl.map(p=>p.owner).filter(Boolean))];
        if(loaded.length>0){
          if(loaded.includes(identity.ownerName)){
            // Already matched — nothing to do
          } else {
            // Try userId match first using leagueUsers returned from loadData
            const leagueUsers = lu || [];
            const userRecord = leagueUsers.find(u => u.user_id === identity.userId);
            const userDisplayName = userRecord
              ? (userRecord.metadata?.team_name || userRecord.display_name || userRecord.username || "")
              : "";
            const idMatch = loaded.find(o =>
              o.toLowerCase() === userDisplayName.toLowerCase()
            );
            if(idMatch){
              // Silent auto-fix — no modal needed
              setOwnerMapping(idMatch);
              setTradeOwnerA(idMatch);
            } else {
              // Fuzzy fallback: check username / display name fragments
              const uname = (identity.username || "").toLowerCase();
              const dname = (identity.displayName || "").toLowerCase();
              const fuzzy = loaded.find(o => {
                const ol = o.toLowerCase();
                return ol === dname || ol.includes(uname) || uname.includes(ol.split(" ")[0]) ||
                       ol === uname || dname.includes(ol);
              });
              if(fuzzy){
                setOwnerMapping(fuzzy);
                setTradeOwnerA(fuzzy);
              } else {
                // Genuinely can't match — show team picker (not full login re-auth)
                setNeedsTeamSelect(true);
              }
            }
          }
        }
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

    if(owners.length===0){
      // Data not loaded yet — save the Sleeper user, close modal, auto-trigger sync.
      // The doLoad handler will do userId-based matching once owners are known.
      finaliseLogin(user, displayName); // temporary ownerName — will be corrected post-sync
      setTradeOwnerA(displayName);
      doLoad(); // auto-kick off sync so matching can happen
      return;
    }

    // Owners are loaded — try to match
    const matchedOwner=owners.find(o=>
      o.toLowerCase()===displayName.toLowerCase()||
      o.toLowerCase().includes(uname)||
      uname.includes(o.toLowerCase().split(" ")[0])
    );

    if(!matchedOwner){
      // Verified Sleeper member but couldn't auto-match name — let them pick their team.
      // Don't hard-deny: name mismatches happen (team name ≠ display name).
      finaliseLogin(user, displayName);
      setNeedsTeamSelect(true); // show team picker as next step
      return;
    }

    finaliseLogin(user, matchedOwner);
    setTradeOwnerA(matchedOwner);
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


  // ── Nav config with SVG icons ─────────────────────────────────────────────
  const NAV_ITEMS = [
    { id:"dashboard",  label:"DASHBOARD",       icon:(a)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#9580FF":"#4a5568"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    )},
    { id:"leaguehub", label:"LEAGUE HUB",       icon:(a)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#9580FF":"#4a5568"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M6 20v-2a6 6 0 0 1 12 0v2"/>
        <circle cx="4" cy="10" r="2.5"/><path d="M1 20v-1a4 4 0 0 1 6-3.5"/>
        <circle cx="20" cy="10" r="2.5"/><path d="M23 20v-1a4 4 0 0 0-6-3.5"/>
      </svg>
    )},
    { id:"teamhub",   label:"TEAM HUB",         icon:(a)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#9580FF":"#4a5568"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>
      </svg>
    )},
    { id:"playerhub", label:"PLAYER HUB",       icon:(a)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#9580FF":"#4a5568"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    )},
    { id:"tools",     label:"ANALYSIS TOOLS",   icon:(a)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#9580FF":"#4a5568"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    )},
    { id:"drafthub",  label:"DRAFT HUB",        icon:(a)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#9580FF":"#4a5568"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
      </svg>
    )},
    { id:"log",       label:"SYNC LOG",         icon:(a)=>(
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a?"#9580FF":"#4a5568"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="16" y2="17"/><line x1="8" y1="9" x2="10" y2="9"/>
      </svg>
    )},
  ];

  const SEASON_MODE_COLORS = {
    offseason:"#8892a4", preseason:"#00D4FF", inseason:"#9580FF",
    playoffs:"#FFD700",  complete:"#4a5568",
  };

  // ── Sidebar component (desktop) ───────────────────────────────────────────
  const Sidebar = () => (
    <div style={{
      position:"fixed", top:0, left:0, height:"100vh", width:210,
      background:"#161b26", borderRight:"1px solid #242d40",
      display:"flex", flexDirection:"column", zIndex:100, overflowY:"auto",
    }}>
      {/* Logo */}
      <div style={{padding:"18px 16px 14px", borderBottom:"1px solid #242d40"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{
            width:32, height:32, background:"#9580FF",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:18, fontWeight:900, color:"#0d1117", flexShrink:0,
          }}>Ω</div>
          <div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:"0.12em",color:"#9580FF",lineHeight:1}}>MGG DYNASTY</div>
            <div style={{fontSize:8,color:"#2a3548",letterSpacing:"0.15em",marginTop:2}}>INTELLIGENCE BOARD</div>
          </div>
        </div>
        {/* Identity button */}
        <button onClick={()=>setLoginOpen(true)} style={{
          width:"100%", marginTop:12, background:"none",
          border:`1px solid ${isCommissioner?"#FFD70033":"#242d40"}`,
          color:isCommissioner?"#FFD700":"#4a5568",
          padding:"6px 10px", fontFamily:"'Inter',sans-serif",
          fontSize:10, cursor:"pointer", textAlign:"left",
          display:"flex", alignItems:"center", gap:6, borderRadius:0,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          {isCommissioner && <span>★ </span>}
          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {identity ? (currentOwner || identity.displayName) : "LOG IN"}
          </span>
        </button>
      </div>

      {/* Nav items */}
      <nav style={{padding:"8px 0", flex:1}}>
        <div style={{fontSize:9,color:"#2a3548",letterSpacing:"0.18em",fontFamily:"'Bebas Neue',sans-serif",padding:"8px 16px 4px"}}>NAVIGATE</div>
        {NAV_ITEMS.map(({id,label,icon}) => {
          const active = tab === id;
          return (
            <button key={id} onClick={()=>setTab(id)} style={{
              width:"100%", display:"flex", alignItems:"center", gap:12,
              background: active ? "#9580FF14" : "transparent",
              border:"none",
              borderLeft: active ? "3px solid #9580FF" : "3px solid transparent",
              padding:"10px 16px",
              color: active ? "#9580FF" : "#4a5568",
              fontFamily:"'Bebas Neue',sans-serif",
              fontSize:13, letterSpacing:"0.1em",
              cursor:"pointer", textAlign:"left",
              transition:"all .12s",
            }}
            onMouseEnter={e=>{ if(!active){ e.currentTarget.style.background="#9580FF0a"; e.currentTarget.style.color="#8892a4"; }}}
            onMouseLeave={e=>{ if(!active){ e.currentTarget.style.background="transparent"; e.currentTarget.style.color="#4a5568"; }}}
            >
              {icon(active)}
              {label}
            </button>
          );
        })}
      </nav>

      {/* DV / SV toggle */}
      <div style={{padding:"10px 14px", borderTop:"1px solid #242d40"}}>
        <div style={{fontSize:9,color:"#2a3548",letterSpacing:"0.18em",fontFamily:"'Bebas Neue',sans-serif",marginBottom:6}}>VIEW MODE</div>
        <div style={{display:"flex", border:"1px solid #242d40", overflow:"hidden"}}>
          {[["dynasty","DV","#9580FF"],["redraft","SV","#00D4FF"]].map(([m,lbl,col])=>{
            const active = viewMode===m;
            return (
              <button key={m} onClick={()=>{setViewMode(m);try{localStorage.setItem("mgg_view_mode",m);}catch{}}} style={{
                flex:1, background:active?col+"22":"transparent",
                color:active?col:"#2a3548", border:"none",
                padding:"7px 0", fontFamily:"'Bebas Neue',sans-serif",
                fontSize:13, letterSpacing:"0.1em",
                cursor:"pointer", transition:"all .15s",
              }}>{lbl}</button>
            );
          })}
        </div>
      </div>

      {/* Season mode */}
      <div style={{padding:"8px 14px", borderTop:"1px solid #242d40"}}>
        <div style={{fontSize:9,color:"#2a3548",letterSpacing:"0.18em",fontFamily:"'Bebas Neue',sans-serif",marginBottom:6}}>SEASON</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
          {SEASON_MODES.map(m=>{
            const active=seasonState.mode===m;
            const col=SEASON_MODE_COLORS[m];
            return (
              <button key={m} onClick={()=>overrideSeasonMode(m)} style={{
                background:active?col+"22":"transparent",
                color:active?col:"#2a3548",
                border:`1px solid ${active?col+"44":"#242d40"}`,
                padding:"3px 7px", fontFamily:"'Bebas Neue',sans-serif",
                fontSize:10, letterSpacing:"0.08em", cursor:"pointer",
              }}>{m.slice(0,3).toUpperCase()}</button>
            );
          })}
          {seasonState._override && (
            <button onClick={clearSeasonOverride} style={{background:"#FFD70022",color:"#FFD700",border:"1px solid #FFD70044",padding:"3px 7px",fontFamily:"'Bebas Neue',sans-serif",fontSize:10,cursor:"pointer"}}>AUTO</button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{padding:"10px 14px 20px", borderTop:"1px solid #242d40", display:"flex", flexDirection:"column", gap:6}}>
        <button onClick={doLoad} disabled={phase==="loading"} style={{
          background: phase==="loading" ? "#1d2535" : "#9580FF22",
          color: phase==="loading" ? "#4a5568" : "#9580FF",
          border:`1px solid ${phase==="loading"?"#242d40":"#9580FF66"}`,
          padding:"8px 0", width:"100%", fontFamily:"'Bebas Neue',sans-serif",
          fontSize:13, letterSpacing:"0.12em", cursor:phase==="loading"?"not-allowed":"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          {phase==="loading" ? "SYNCING..." : "SYNC DATA"}
        </button>
        <button onClick={doIntel} disabled={newsPhase==="loading"||!players.length} style={{
          background: (newsPhase==="loading"||!players.length) ? "#1d2535" : "#FFD70022",
          color: (newsPhase==="loading"||!players.length) ? "#4a5568" : "#FFD700",
          border:`1px solid ${(newsPhase==="loading"||!players.length)?"#242d40":"#FFD70066"}`,
          padding:"8px 0", width:"100%", fontFamily:"'Bebas Neue',sans-serif",
          fontSize:13, letterSpacing:"0.12em",
          cursor:(newsPhase==="loading"||!players.length)?"not-allowed":"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          {newsPhase==="loading" ? "SCANNING..." : "INTEL SCAN"}
        </button>
        <button onClick={()=>doExport(players,newsMap)} disabled={!players.length} style={{
          background:!players.length?"#1d2535":"#00D4FF22",
          color:!players.length?"#4a5568":"#00D4FF",
          border:`1px solid ${!players.length?"#242d40":"#00D4FF66"}`,
          padding:"8px 0", width:"100%", fontFamily:"'Bebas Neue',sans-serif",
          fontSize:13, letterSpacing:"0.12em",
          cursor:!players.length?"not-allowed":"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:8,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          EXPORT XLSX
        </button>
        {syncedAt && <div style={{fontSize:8,color:"#2a3548",letterSpacing:"0.12em",textAlign:"center",fontFamily:"'Bebas Neue',sans-serif"}}>SYNCED {syncedAt}</div>}
      </div>
    </div>
  );

  // ── Mobile bottom nav ─────────────────────────────────────────────────────
  const MobileNav = () => (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, height:56,
      background:"#161b26", borderTop:"1px solid #242d40",
      display:"flex", alignItems:"stretch", zIndex:100,
    }}>
      {NAV_ITEMS.slice(0,5).map(({id,icon,label})=>{
        const active = tab===id;
        return (
          <button key={id} onClick={()=>setTab(id)} style={{
            flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center", gap:3,
            background: active ? "#9580FF14" : "transparent",
            border:"none",
            borderTop: active ? "2px solid #9580FF" : "2px solid transparent",
            color: active ? "#9580FF" : "#4a5568",
            cursor:"pointer", padding:0,
          }}>
            {icon(active)}
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:8,letterSpacing:"0.1em"}}>{label.split(" ")[0]}</span>
          </button>
        );
      })}
      {/* More button for tools/draft/log */}
      <button onClick={()=>setMobileMoreOpen(x=>!x)} style={{
        flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", gap:3,
        background:"transparent", border:"none", borderTop:"2px solid transparent",
        color:"#4a5568", cursor:"pointer", padding:0,
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:8,letterSpacing:"0.1em"}}>MORE</span>
      </button>
    </div>
  );

  // ── Mobile "more" sheet ───────────────────────────────────────────────────
  const MobileMoreSheet = () => mobileMoreOpen ? (
    <>
      <div onClick={()=>setMobileMoreOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:199}}/>
      <div style={{
        position:"fixed", bottom:56, left:0, right:0,
        background:"#161b26", borderTop:"1px solid #242d40",
        zIndex:200, padding:"12px 0",
      }}>
        {NAV_ITEMS.slice(5).map(({id,icon,label})=>(
          <button key={id} onClick={()=>{setTab(id);setMobileMoreOpen(false);}} style={{
            width:"100%", display:"flex", alignItems:"center", gap:14,
            background:tab===id?"#9580FF14":"transparent", border:"none",
            borderLeft:tab===id?"3px solid #9580FF":"3px solid transparent",
            padding:"12px 20px", color:tab===id?"#9580FF":"#8892a4",
            fontFamily:"'Bebas Neue',sans-serif", fontSize:14,
            letterSpacing:"0.1em", cursor:"pointer",
          }}>
            {icon(tab===id)}
            {label}
          </button>
        ))}
        <div style={{borderTop:"1px solid #242d40",margin:"10px 0"}}/>
        <div style={{display:"flex",gap:8,padding:"4px 16px"}}>
          <button onClick={()=>{doLoad();setMobileMoreOpen(false);}} disabled={phase==="loading"} style={{flex:1,background:"#9580FF22",color:"#9580FF",border:"1px solid #9580FF44",padding:"9px 0",fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:"0.1em",cursor:"pointer"}}>⟳ SYNC</button>
          <button onClick={()=>{doIntel();setMobileMoreOpen(false);}} disabled={newsPhase==="loading"||!players.length} style={{flex:1,background:"#FFD70022",color:"#FFD700",border:"1px solid #FFD70044",padding:"9px 0",fontFamily:"'Bebas Neue',sans-serif",fontSize:12,letterSpacing:"0.1em",cursor:"pointer"}}>◈ INTEL</button>
        </div>
        <button onClick={()=>setLoginOpen(true)} style={{display:"flex",alignItems:"center",gap:10,width:"100%",background:"none",border:"none",padding:"10px 20px",color:"#4a5568",fontFamily:"'Inter',sans-serif",fontSize:11,cursor:"pointer"}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          {identity ? (currentOwner || identity.displayName) : "LOG IN"}
        </button>
      </div>
    </>
  ) : null;

  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  // ── Main content area ─────────────────────────────────────────────────────
  const CONTENT_PADDING = isMobile ? "12px 12px 72px" : "20px 24px";
  const CONTENT_MARGIN_LEFT = isMobile ? 0 : 210;

  return (
    <div style={{background:"#0d1117",color:"#e2e8f0",minHeight:"100vh",fontFamily:"'Inter',sans-serif"}}>

      {/* Sidebar — desktop only */}
      {!isMobile && <Sidebar />}

      {/* Mobile nav */}
      {isMobile && <MobileNav />}
      {isMobile && <MobileMoreSheet />}

      {/* View mode banner */}
      {isViewMode && (
        <div style={{
          position:"fixed", top:0, left:isMobile?0:210, right:0,
          background:"#0d1f14", borderBottom:"1px solid #9580FF33",
          padding:"6px 20px", display:"flex", alignItems:"center",
          justifyContent:"space-between", zIndex:90,
        }}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <span style={{fontSize:9,color:"#9580FF",fontWeight:700,letterSpacing:2,fontFamily:"'Bebas Neue',sans-serif"}}>👁 VIEWING</span>
            <span style={{fontSize:12,color:"#e2e8f0",fontWeight:700}}>{viewingOwner}</span>
            <span style={{fontSize:9,color:"#4a5568"}}>· read-only</span>
          </div>
          <button onClick={exitViewMode} style={{background:"none",border:"1px solid #9580FF44",color:"#9580FF",padding:"3px 10px",fontFamily:"'Bebas Neue',sans-serif",fontSize:11,cursor:"pointer",letterSpacing:"0.1em"}}>✕ EXIT VIEW</button>
        </div>
      )}

      {/* Main content */}
      <div style={{marginLeft:CONTENT_MARGIN_LEFT, padding:CONTENT_PADDING, marginTop:isViewMode?36:0}}>

        {/* Page header — tab title + season badge */}
        {!isMobile && (
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,paddingBottom:14,borderBottom:"1px solid #242d40"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,letterSpacing:"0.12em",color:"#e2e8f0"}}>
              {NAV_ITEMS.find(n=>n.id===tab)?.label || "DASHBOARD"}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {syncedAt && <span style={{fontSize:9,color:"#2a3548",letterSpacing:"0.12em",fontFamily:"'Bebas Neue',sans-serif"}}>SYNCED {syncedAt}</span>}
              <span style={{
                fontSize:9, fontFamily:"'Bebas Neue',sans-serif", letterSpacing:"0.12em",
                background:SEASON_MODE_COLORS[seasonState.mode]+"22",
                color:SEASON_MODE_COLORS[seasonState.mode],
                border:`1px solid ${SEASON_MODE_COLORS[seasonState.mode]}44`,
                padding:"3px 10px",
              }}>
                {seasonState.season} · {seasonState.mode.toUpperCase()}
                {seasonState.currentWeek ? ` · WK ${seasonState.currentWeek}` : ""}
              </span>
              {seasonState._override && (
                <button onClick={clearSeasonOverride} style={{background:"#FFD70022",color:"#FFD700",border:"1px solid #FFD70044",padding:"3px 8px",fontFamily:"'Bebas Neue',sans-serif",fontSize:9,cursor:"pointer",letterSpacing:"0.1em"}}>OVERRIDE ON</button>
              )}
            </div>
          </div>
        )}

        {/* Idle state */}
        {phase==="idle" && (
          <div style={{textAlign:"center",padding:"80px 20px",border:"1px dashed #242d40"}}>
            <div style={{fontSize:56,fontWeight:900,color:"#9580FF",marginBottom:16,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.1em"}}>Ω</div>
            <div style={{fontSize:20,color:"#8892a4",letterSpacing:"0.15em",marginBottom:10,fontFamily:"'Bebas Neue',sans-serif"}}>DYNASTY INTELLIGENCE SYSTEM</div>
            <div style={{fontSize:11,color:"#2a3548",maxWidth:380,margin:"0 auto 8px",lineHeight:2}}>
              <span style={{color:"#9580FF"}}>Sleeper API</span> — live rosters, depth charts, transactions<br/>
              <span style={{color:"#00D4FF"}}>Sleeper Stats</span> — season PPG + stat lines per player<br/>
              <span style={{color:"#FFD700"}}>Intel Scan</span> — ESPN headlines + BUY/SELL/HOLD signals
            </div>
            <div style={{fontSize:10,color:"#2a3548",marginBottom:28}}>⬇ EXPORT XLSX generates a snapshot anytime</div>
            <button onClick={doLoad} style={{
              background:"#9580FF", color:"#0d1117", border:"none",
              padding:"12px 40px", fontFamily:"'Bebas Neue',sans-serif",
              fontWeight:400, fontSize:16, letterSpacing:"0.15em", cursor:"pointer",
            }}>⟳ INITIALIZE</button>
          </div>
        )}

        {/* Loading state */}
        {phase==="loading" && (
          <div style={{background:"#161b26",border:"1px solid #242d40",padding:22,marginBottom:18}}>
            <div style={{fontSize:11,color:"#9580FF",letterSpacing:"0.15em",marginBottom:10,fontWeight:700,fontFamily:"'Bebas Neue',sans-serif"}}>▸ LIVE SYNC</div>
            {progress.map((e,i)=>(
              <div key={i} style={{fontSize:11,padding:"3px 0",color:e.type==="success"?"#9580FF":e.type==="error"?"#FF4757":e.type==="done"?"#00D4FF":"#4a5568",fontFamily:"'JetBrains Mono','Courier New',monospace"}}>
                <span style={{color:"#2a3548",marginRight:8,fontSize:9}}>{e.ts}</span>{e.msg}
              </div>
            ))}
            <div style={{marginTop:14,height:2,background:"#242d40",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.min(100,progress.length/10*100)}%`,background:"#9580FF",transition:"width .4s"}}/>
            </div>
          </div>
        )}

        {/* Error state */}
        {phase==="error" && (
          <div style={{background:"#1d0a0d",border:"1px solid #FF4757",padding:"16px 20px",marginBottom:16}}>
            <div style={{color:"#FF4757",fontWeight:700,marginBottom:8,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.1em"}}>⚠ SYNC FAILED</div>
            {progress.filter(e=>e.type==="error").map((e,i)=>(<div key={i} style={{fontSize:11,color:"#FF4757",fontFamily:"'JetBrains Mono','Courier New',monospace"}}>{e.msg}</div>))}
            <div style={{fontSize:11,color:"#4a5568",marginTop:10,lineHeight:1.7}}>Common causes: Sleeper API CORS, network timeout, invalid league ID.<br/>League ID: <strong style={{color:"#e2e8f0"}}>{LEAGUE_ID}</strong></div>
            <button onClick={doLoad} style={{marginTop:12,background:"#1d2535",color:"#e2e8f0",border:"1px solid #2a3548",padding:"7px 16px",fontFamily:"'Bebas Neue',sans-serif",fontSize:12,cursor:"pointer",letterSpacing:"0.1em"}}>⟳ RETRY</button>
          </div>
        )}

        {/* Tab content */}
        {tab==="dashboard"  && <Dashboard phase={phase} players={players} currentOwner={activeOwner} owners={owners} newsMap={newsMap} seasonState={seasonState} viewMode={viewMode} onViewTeam={isCommissioner?enterViewMode:undefined}/>}
        {tab==="leaguehub" && <LeagueHub phase={phase} players={players} owners={owners} currentOwner={activeOwner} newsMap={newsMap} setDetail={setDetail} setActiveTab={setTab} seasonState={seasonState} viewMode={viewMode} onViewTeam={isCommissioner?enterViewMode:undefined}/>}
        {tab==="teamhub"   && <TeamHub phase={phase} players={players} owners={owners} currentOwner={activeOwner} newsMap={newsMap} setDetail={setDetail} isViewMode={isViewMode} viewingOwner={viewingOwner} isCommissioner={isCommissioner} onViewTeam={enterViewMode} onExitView={exitViewMode} playerNotes={playerNotes} savePlayerNote={savePlayerNote} viewMode={viewMode}/>}
        {tab==="playerhub" && <PlayerHub
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
        {tab==="tools"     && <AnalysisTools
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
        {tab==="drafthub"  && <DraftHub
          phase={phase} players={players} nflDb={nflDb} currentOwner={currentOwner} owners={owners}
          rosterIdToOwner={rosterIdToOwner} draftPicksByOwner={draftPicksByOwner} seasonState={seasonState}
          bigBoard={bigBoard} bigBoardMode={bigBoardMode} setBigBoardMode={setBigBoardMode}
          bigBoardAdd={bigBoardAdd} bigBoardRemove={bigBoardRemove} bigBoardMove={bigBoardMove} bigBoardNote={bigBoardNote} bigBoardClear={bigBoardClear}
          draftRoomMode={draftRoomMode} setDraftRoomMode={setDraftRoomMode} mockState={mockState} setMockState={setMockState}
          liveDraftId={liveDraftId} setLiveDraftId={setLiveDraftId}
          viewMode={viewMode}
        />}
        {tab==="log" && <Log progress={progress}/>}

      </div>

      {/* Team select modal */}
      {needsTeamSelect && identity && owners.length > 0 && (
        <div style={{position:"fixed",inset:0,background:"rgba(13,17,23,0.97)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1001}}>
          <div style={{background:"#161b26",border:"2px solid #9580FF",padding:"28px 30px",width:400,maxWidth:"92vw"}}>
            <div style={{fontSize:20,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.12em",color:"#9580FF",marginBottom:4}}>WHICH TEAM IS YOURS?</div>
            <div style={{fontSize:9,color:"#4a5568",letterSpacing:2,marginBottom:6}}>Sleeper verified: <span style={{color:"#e2e8f0",fontWeight:700}}>@{identity.username}</span></div>
            <div style={{fontSize:10,color:"#8892a4",lineHeight:1.7,marginBottom:18}}>We couldn't automatically match your Sleeper account to a roster. Tap your team name below.</div>
            <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:260,overflowY:"auto",marginBottom:18}}>
              {owners.map(o=>(
                <button key={o} onClick={()=>{setOwnerMapping(o);setTradeOwnerA(o);setNeedsTeamSelect(false);setLoginOpen(false);}}
                  style={{background:"#1d2535",border:"1px solid #242d40",color:"#e2e8f0",padding:"11px 14px",fontFamily:"'Inter',sans-serif",fontSize:12,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#9580FF";e.currentTarget.style.color="#9580FF";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#242d40";e.currentTarget.style.color="#e2e8f0";}}>
                  <span style={{fontWeight:700}}>{o}</span>
                  <span style={{fontSize:9,color:"#4a5568"}}>{players.filter(p=>p.owner===o).length} players</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QuickRank modal */}
      {showQuickRank && players.length > 0 && (
        <QuickRank
          players={players} eloScores={eloScores}
          onComplete={(newScores)=>{saveEloScores(newScores);lsSet(userKey,"last_quickrank",Date.now());setShowQuickRank(false);}}
          onSkip={()=>{lsSet(userKey,"last_quickrank",Date.now());setShowQuickRank(false);}}
        />
      )}

      {/* Login / account modal */}
      {loginOpen && (
        <div onClick={e=>e.target===e.currentTarget&&identity&&setLoginOpen(false)}
          style={{position:"fixed",inset:0,background:"rgba(13,17,23,0.95)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:"#161b26",border:"2px solid #9580FF",padding:"28px 32px",width:420,maxWidth:"92vw"}}>
            <div style={{fontSize:22,fontFamily:"'Bebas Neue',sans-serif",letterSpacing:"0.12em",color:"#9580FF",marginBottom:4}}>
              {identity ? "ACCOUNT" : "MGG DYNASTY"}
            </div>
            <div style={{fontSize:9,color:"#2a3548",letterSpacing:3,marginBottom:20,fontFamily:"'Bebas Neue',sans-serif"}}>
              {identity ? "MANAGE YOUR IDENTITY" : "LEAGUE ACCESS · SLEEPER VERIFICATION"}
            </div>

            {identity ? (
              <div>
                <div style={{background:"#1d2535",border:"1px solid #242d40",padding:"12px 16px",marginBottom:16}}>
                  <div style={{fontSize:9,color:"#4a5568",letterSpacing:1,marginBottom:4,fontFamily:"'Bebas Neue',sans-serif"}}>LOGGED IN AS</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0"}}>{identity.displayName}</div>
                  <div style={{fontSize:9,color:"#4a5568",marginTop:2}}>@{identity.username} · {identity.ownerName}{isCommissioner&&<span style={{color:"#FFD700",marginLeft:8,fontWeight:700}}>★ COMMISSIONER</span>}</div>
                </div>
                {owners.length>0 && (
                  <div style={{marginBottom:16}}>
                    <div style={{fontSize:9,color:"#4a5568",letterSpacing:1,marginBottom:6,fontFamily:"'Bebas Neue',sans-serif"}}>YOUR TEAM — tap to change</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4,maxHeight:200,overflowY:"auto"}}>
                      {owners.map(o=>(
                        <button key={o} onClick={()=>{setOwnerMapping(o);setTradeOwnerA(o);setLoginOpen(false);}}
                          style={{background:identity.ownerName===o?"#9580FF14":"#1d2535",border:`1px solid ${identity.ownerName===o?"#9580FF":"#242d40"}`,color:identity.ownerName===o?"#9580FF":"#e2e8f0",padding:"8px 12px",fontFamily:"'Inter',sans-serif",fontSize:11,fontWeight:identity.ownerName===o?700:400,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span>{o}</span>
                          <span style={{fontSize:9,color:"#4a5568"}}>{players.filter(p=>p.owner===o).length} players</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{marginBottom:16,padding:"12px 14px",background:"#1d2535",border:"1px solid #242d40"}}>
                  <div style={{fontSize:11,color:"#FFD700",letterSpacing:2,fontWeight:700,marginBottom:6,fontFamily:"'Bebas Neue',sans-serif"}}>★ COMMISSIONER MODE</div>
                  {isCommissioner ? (
                    <div>
                      <div style={{fontSize:9,color:"#FFD700",marginBottom:8}}>Active — view any team read-only</div>
                      {owners.filter(o=>o!==currentOwner).length>0 && (
                        <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:8}}>
                          {owners.filter(o=>o!==currentOwner).map(o=>(
                            <button key={o} onClick={()=>{enterViewMode(o);setLoginOpen(false);}} style={{background:"#1a1000",border:"1px solid #FFD70033",color:"#FFD700",padding:"3px 8px",fontFamily:"'Bebas Neue',sans-serif",fontSize:10,cursor:"pointer",letterSpacing:"0.08em"}}>👁 {o}</button>
                          ))}
                        </div>
                      )}
                      <button onClick={deactivateCommissioner} style={{background:"none",border:"1px solid #2a3548",color:"#4a5568",padding:"5px 10px",fontFamily:"'Bebas Neue',sans-serif",fontSize:11,cursor:"pointer",letterSpacing:"0.08em"}}>DEACTIVATE</button>
                    </div>
                  ) : (
                    <div style={{display:"flex",gap:6}}>
                      <input type="password" value={commPassInput} onChange={e=>setCommPassInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&activateCommissioner()} placeholder="Commissioner passphrase..."
                        style={{flex:1,background:"#0d1117",border:`1px solid ${commPassError?"#FF4757":"#242d40"}`,color:"#e2e8f0",padding:"7px 10px",fontFamily:"'JetBrains Mono','Courier New',monospace",fontSize:10}}/>
                      <button onClick={activateCommissioner} disabled={!commPassInput} style={{background:commPassInput?"#FFD70022":"#1d2535",color:commPassInput?"#FFD700":"#4a5568",border:`1px solid ${commPassInput?"#FFD70044":"#242d40"}`,padding:"7px 12px",fontFamily:"'Bebas Neue',sans-serif",fontWeight:400,fontSize:12,cursor:commPassInput?"pointer":"not-allowed",letterSpacing:"0.08em"}}>★ UNLOCK</button>
                    </div>
                  )}
                  {commPassError && <div style={{fontSize:9,color:"#FF4757",marginTop:4}}>⚠ {commPassError}</div>}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setLoginOpen(false)} style={{flex:1,background:"#9580FF14",border:"1px solid #9580FF44",color:"#9580FF",padding:"9px",fontFamily:"'Bebas Neue',sans-serif",fontSize:13,cursor:"pointer",letterSpacing:"0.1em"}}>✓ DONE</button>
                  <button onClick={doLogout} style={{background:"#1d0a0d",border:"1px solid #FF475733",color:"#FF4757",padding:"9px 14px",fontFamily:"'Bebas Neue',sans-serif",fontSize:13,cursor:"pointer",letterSpacing:"0.1em"}}>LOG OUT</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{fontSize:10,color:"#8892a4",lineHeight:1.8,marginBottom:20}}>
                  This tool is for <span style={{color:"#9580FF",fontWeight:700}}>MGG Dynasty league members only</span>.<br/>
                  Enter your Sleeper username to verify and get access.
                </div>
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:9,color:"#4a5568",letterSpacing:1,marginBottom:6,fontFamily:"'Bebas Neue',sans-serif"}}>SLEEPER USERNAME</div>
                  <input value={loginInput} onChange={e=>{setLoginInput(e.target.value);setLoginError("");}} onKeyDown={e=>e.key==="Enter"&&handleSleeperLogin()} placeholder="your_sleeper_username" autoFocus
                    style={{width:"100%",boxSizing:"border-box",background:"#0d1117",border:`1px solid ${loginError?"#FF4757":"#242d40"}`,color:"#e2e8f0",padding:"11px 14px",fontFamily:"'JetBrains Mono','Courier New',monospace",fontSize:13,outline:"none"}}/>
                  {loginError && <div style={{fontSize:10,color:"#FF4757",marginTop:6,padding:"6px 10px",background:"#1d0a0d",border:"1px solid #FF475722"}}>{loginError}</div>}
                </div>
                <button onClick={handleSleeperLogin} disabled={loginLoading||!loginInput.trim()}
                  style={{width:"100%",background:loginLoading||!loginInput.trim()?"#1d2535":"#9580FF22",color:loginLoading||!loginInput.trim()?"#4a5568":"#9580FF",border:`1px solid ${loginLoading||!loginInput.trim()?"#242d40":"#9580FF66"}`,padding:"12px",fontFamily:"'Bebas Neue',sans-serif",fontWeight:400,fontSize:14,letterSpacing:"0.12em",cursor:loginLoading||!loginInput.trim()?"not-allowed":"pointer",marginBottom:16}}>
                  {loginLoading ? "◌ VERIFYING WITH SLEEPER..." : "▸ VERIFY & ENTER"}
                </button>
                <div style={{fontSize:9,color:"#2a3548",textAlign:"center",lineHeight:1.7}}>Your Sleeper account must be a member of this league.<br/>Non-members will be denied access.</div>
                {phase==="done" && owners.length>0 && (
                  <details style={{marginTop:14}}>
                    <summary style={{fontSize:9,color:"#4a5568",cursor:"pointer",letterSpacing:1,fontFamily:"'Bebas Neue',sans-serif"}}>▸ SKIP VERIFICATION (pick manually)</summary>
                    <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:8,maxHeight:160,overflowY:"auto"}}>
                      {owners.map(o=>(
                        <button key={o} onClick={()=>doManualLogin(o)} style={{background:"#1d2535",border:"1px solid #242d40",color:"#8892a4",padding:"8px 12px",fontFamily:"'Inter',sans-serif",fontSize:10,cursor:"pointer",textAlign:"left",display:"flex",justifyContent:"space-between"}}>
                          <span>{o}</span><span style={{fontSize:9,color:"#2a3548"}}>{players.filter(p=>p.owner===o).length} players</span>
                        </button>
                      ))}
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
