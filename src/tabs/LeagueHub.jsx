import { useState } from "react";
import { PositionRankings } from "./leaguehub/PositionRankings";
import { RosterGrades }     from "./leaguehub/RosterGrades";

const SUB_TABS = [
  ["positions", "⬡ POSITION RANKINGS"],
  ["rosters",   "◈ ROSTER GRADES"],
  // ["transactions", "▸ TRANSACTIONS"],  // v1.0.0
];

export function LeagueHub({ phase, players, owners, currentOwner, newsMap, setDetail, setActiveTab }) {
  const [sub, setSub] = useState("positions");

  const tabBtn = (id, lbl) => (
    <button key={id} onClick={() => setSub(id)} style={{
      background: "none", border: "none",
      borderBottom: sub===id ? "2px solid #0ea5e9" : "2px solid transparent",
      color:        sub===id ? "#0ea5e9" : "#4b6580",
      padding: "6px 16px", fontFamily: "inherit",
      fontSize: 10, letterSpacing: 2, fontWeight: 700, cursor: "pointer",
    }}>{lbl}</button>
  );

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #1e2d3d",marginBottom:20}}>
        {SUB_TABS.map(([id, lbl]) => tabBtn(id, lbl))}
        {/* Transactions — placeholder */}
        <button disabled style={{
          background:"none", border:"none",
          borderBottom:"2px solid transparent",
          color:"#2a3d52", padding:"6px 16px",
          fontFamily:"inherit", fontSize:10, letterSpacing:2, fontWeight:700, cursor:"not-allowed",
        }}>▸ TRANSACTIONS <span style={{fontSize:7,color:"#2a3d52"}}>v1.0</span></button>
      </div>

      {sub === "positions" && (
        <PositionRankings
          players={players}
          newsMap={newsMap}
          setDetail={setDetail}
          setActiveTab={setActiveTab}
        />
      )}
      {sub === "rosters" && (
        <RosterGrades
          phase={phase}
          players={players}
          owners={owners}
          currentOwner={currentOwner}
        />
      )}
    </div>
  );
}
