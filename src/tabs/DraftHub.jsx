// ─── DRAFT HUB ────────────────────────────────────────────────────────────────
import { useState } from "react";
import { MyPicks }   from "./drafthub/MyPicks";
import { BigBoard }  from "./drafthub/BigBoard";
import { DraftRoom } from "./drafthub/DraftRoom";

const SUB_TABS = [
  ["picks",  "◈ MY PICKS"],
  ["board",  "⬡ BIG BOARD"],
  ["room",   "▸ DRAFT ROOM"],
];

export function DraftHub({
  phase, players, nflDb,
  currentOwner, owners, rosterIdToOwner, draftPicksByOwner, seasonState,
  bigBoard, bigBoardMode, setBigBoardMode,
  bigBoardAdd, bigBoardRemove, bigBoardMove, bigBoardNote, bigBoardClear,
  draftRoomMode, setDraftRoomMode,
  mockState, setMockState,
  liveDraftId, setLiveDraftId,
}) {
  const [sub, setSub] = useState("picks");

  return (
    <div>
      {/* Sub-tab bar */}
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #1e2d3d",marginBottom:20}}>
        {SUB_TABS.map(([id, lbl]) => (
          <button key={id} onClick={() => setSub(id)} style={{
            background:"none", border:"none",
            borderBottom: sub===id ? "2px solid #22c55e" : "2px solid transparent",
            color:         sub===id ? "#22c55e" : "#4b6580",
            padding:"6px 18px", fontFamily:"inherit",
            fontSize:10, letterSpacing:2, fontWeight:700, cursor:"pointer",
          }}>{lbl}</button>
        ))}
        {/* Season context pill */}
        {seasonState && (
          <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:6,paddingRight:2}}>
            <span style={{fontSize:8,color:"#2a3d52",letterSpacing:1}}>
              {seasonState.season} · {seasonState.mode.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {sub === "picks" && (
        <MyPicks
          phase={phase}
          currentOwner={currentOwner}
          draftPicksByOwner={draftPicksByOwner}
          rosterIdToOwner={rosterIdToOwner}
          players={players}
          seasonState={seasonState}
        />
      )}

      {sub === "board" && (
        <BigBoard
          phase={phase}
          nflDb={nflDb}
          players={players}
          bigBoard={bigBoard}
          bigBoardMode={bigBoardMode}
          setBigBoardMode={setBigBoardMode}
          bigBoardAdd={bigBoardAdd}
          bigBoardRemove={bigBoardRemove}
          bigBoardMove={bigBoardMove}
          bigBoardNote={bigBoardNote}
          bigBoardClear={bigBoardClear}
        />
      )}

      {sub === "room" && (
        <DraftRoom
          phase={phase}
          players={players}
          nflDb={nflDb}
          owners={owners}
          currentOwner={currentOwner}
          bigBoard={bigBoard}
          bigBoardMode={bigBoardMode}
          draftRoomMode={draftRoomMode}
          setDraftRoomMode={setDraftRoomMode}
          mockState={mockState}
          setMockState={setMockState}
          liveDraftId={liveDraftId}
          setLiveDraftId={setLiveDraftId}
          rosterIdToOwner={rosterIdToOwner}
          seasonState={seasonState}
        />
      )}
    </div>
  );
}
