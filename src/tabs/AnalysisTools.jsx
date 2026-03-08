import { useState } from "react";
import { Trade } from "./Trade";
import { WaiverTool } from "./tools/WaiverTool";
import { PlayerCompare } from "./tools/PlayerCompare";

const SUB_TABS = [
  ["trade",   "⇄ TRADE ANALYZER"],
  ["waiver",  "◎ WAIVER TOOL"],
  ["compare", "⬡ PLAYER COMPARE"],
];

export function AnalysisTools({
  phase, owners, players, nflDb, currentOwner, newsMap,
  faWatchlist, onAddToFaWatchlist,
  tradeOwnerA, setTradeOwnerA,
  tradeOwnerB, setTradeOwnerB,
  tradeSideA, tradeSideB,
  tradeSearchA, setTradeSearchA,
  tradeSearchB, setTradeSearchB,
  tradePickYrA, setTradePickYrA,
  tradePickRdA, setTradePickRdA,
  tradePickYrB, setTradePickYrB,
  tradePickRdB, setTradePickRdB,
  tradeSearchResults,
  addPlayer, addPick,
  removeItem, setPickCustomVal,
  itemScore, tradeTotal,
  tradeVerdict, tradeReset,
  // ── AI props (Batch 1) ──────────────────────────────────────────────────────
  claudeTradeNarrative, claudeTradeLoading, requestClaudeTradeNarrative, hasApiKey,
}) {
  const [sub, setSub] = useState("trade");

  const tabBtn = (id, lbl, disabled=false) => (
    <button key={id}
      onClick={() => !disabled && setSub(id)}
      disabled={disabled}
      style={{
        background: "none", border: "none",
        borderBottom: sub===id ? "2px solid #6366f1" : "2px solid transparent",
        color: disabled ? "#2a3d52" : sub===id ? "#6366f1" : "#4b6580",
        padding: "6px 16px", fontFamily: "inherit",
        fontSize: 10, letterSpacing: 2, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
      }}>{lbl}</button>
  );

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #1e2d3d",marginBottom:20}}>
        {tabBtn("trade", "⇄ TRADE ANALYZER")}
        {tabBtn("waiver",  "◎ WAIVER TOOL")}
        {tabBtn("compare", "⬡ PLAYER COMPARE")}
      </div>

      {sub === "waiver" && (
        <WaiverTool
          phase={phase} players={players} nflDb={nflDb}
          currentOwner={currentOwner} newsMap={newsMap}
          faWatchlist={faWatchlist} onAddToWatchlist={onAddToFaWatchlist}
        />
      )}
      {sub === "compare" && (
        <PlayerCompare
          phase={phase} players={players} nflDb={nflDb} newsMap={newsMap}
        />
      )}
      {sub === "trade" && (
        <Trade
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
          hasApiKey={hasApiKey}
        />
      )}
    </div>
  );
}
