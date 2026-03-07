import { useState } from "react";
import { Rankings }       from "./playerhub/Rankings";
import { NewsSituations } from "./playerhub/NewsSituations";
import { Situations }     from "./playerhub/Situations";
import { Watchlist }      from "./playerhub/Watchlist";
import { FADatabase }     from "./playerhub/FADatabase";

const SUB_TABS = [
  ["rankings",    "◈ RANKINGS"],
  ["news",        "▸ NEWS & SITUATIONS"],
  ["situations",  "⚑ MANUAL FLAGS"],
  ["watchlist",   "◎ WATCHLIST"],
  ["fa",          "⬡ FA DATABASE"],
];

export function PlayerHub({
  // shared
  phase, players, newsMap, nflDb,
  // rankings (Board props)
  view, detail, setDetail,
  tierFilter, setTierFilter,
  search, setSearch,
  posFilter, setPosFilter,
  sortKey, sortAsc, onSort,
  // intel / news
  newsPhase, onRunIntel,
  // situations
  manualSits,
  sitEditName, setSitEditName,
  sitEditFlag, setSitEditFlag,
  sitEditNote, setSitEditNote,
  sitEditGames, setSitEditGames,
  sitEditing, setSitEditing,
  sitAdd, sitRemove, sitStartEdit, sitResetDefaults,
  // watchlist
  watchlist, watchInput, setWatchInput,
  watchAdd, watchRemove,
  researchResults, researchRunning,
  runWatchlistResearch, approveResult, rejectResult,
  // FA
  faSearch, setFaSearch,
  faPosFilter, setFaPosFilter,
  faTeamFilter, setFaTeamFilter,
  faAgeMin, setFaAgeMin,
  faAgeMax, setFaAgeMax,
  faHideInj, setFaHideInj,
  faResults, faTeams, faWatchlist,
  addToFaWatchlist, removeFromFaWatchlist,
}) {
  const [sub, setSub] = useState("rankings");

  const tabBtn = (id, lbl) => (
    <button key={id} onClick={() => setSub(id)} style={{
      background: "none", border: "none",
      borderBottom: sub===id ? "2px solid #f59e0b" : "2px solid transparent",
      color:        sub===id ? "#f59e0b" : "#4b6580",
      padding: "6px 16px", fontFamily: "inherit",
      fontSize: 10, letterSpacing: 2, fontWeight: 700, cursor: "pointer",
    }}>{lbl}</button>
  );

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #1e2d3d",marginBottom:20,flexWrap:"wrap"}}>
        {SUB_TABS.map(([id, lbl]) => tabBtn(id, lbl))}
      </div>

      {sub === "rankings" && (
        <Rankings
          players={players} view={view} newsMap={newsMap}
          detail={detail} setDetail={setDetail}
          tierFilter={tierFilter} setTierFilter={setTierFilter}
          search={search} setSearch={setSearch}
          posFilter={posFilter} setPosFilter={setPosFilter}
          sortKey={sortKey} sortAsc={sortAsc} onSort={onSort}
        />
      )}

      {sub === "news" && (
        <NewsSituations
          newsPhase={newsPhase}
          newsMap={newsMap}
          players={players}
          onRunIntel={onRunIntel}
        />
      )}

      {sub === "situations" && (
        <Situations
          manualSits={manualSits}
          sitEditName={sitEditName} setSitEditName={setSitEditName}
          sitEditFlag={sitEditFlag} setSitEditFlag={setSitEditFlag}
          sitEditNote={sitEditNote} setSitEditNote={setSitEditNote}
          sitEditGames={sitEditGames} setSitEditGames={setSitEditGames}
          sitEditing={sitEditing} setSitEditing={setSitEditing}
          sitAdd={sitAdd} sitRemove={sitRemove}
          sitStartEdit={sitStartEdit} sitResetDefaults={sitResetDefaults}
        />
      )}

      {sub === "watchlist" && (
        <Watchlist
          watchlist={watchlist}
          watchInput={watchInput} setWatchInput={setWatchInput}
          watchAdd={watchAdd} watchRemove={watchRemove}
          researchResults={researchResults}
          researchRunning={researchRunning}
          runWatchlistResearch={runWatchlistResearch}
          approveResult={approveResult} rejectResult={rejectResult}
          players={players}
        />
      )}

      {sub === "fa" && (
        <FADatabase
          nflDb={nflDb}
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
    </div>
  );
}
