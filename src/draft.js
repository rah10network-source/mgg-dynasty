// ─── DRAFT LOGIC ──────────────────────────────────────────────────────────────
// Single source of truth for all draft-related logic.
// Consumed by BigBoard.jsx, DraftRoom.jsx, and future draft tooling.
// No React imports — pure JS functions only.

import { PRIME } from "./constants";
import { calcAge } from "./scoring";

// ─── ACTIVE PLAYER GATE ───────────────────────────────────────────────────────
// Sleeper's /players/nfl returns every player ever tracked — retired, cut,
// practice squad, international, phantom entries. This gate keeps only players
// who are realistically draftable.

const INACTIVE_STATUSES = new Set([
  "Inactive", "Retired", "Suspended", "Cut", "Released",
  "PracticeSquad", "Practice Squad",
]);

export function isActivePlayer(p) {
  if (!p) return false;
  if (!p.position) return false;
  if (INACTIVE_STATUSES.has(p.status)) return false;
  // Rookies (years_exp === 0) are fine with no team — not assigned yet
  // Veterans with no team and >2 yrs exp are almost certainly cut/retired
  if ((p.years_exp ?? 0) > 2 && !p.team) return false;
  return true;
}

// ─── POOL BUILDER ─────────────────────────────────────────────────────────────
// mode: "rookies" | "all"
// rosteredPids: Set of player IDs already on rosters (exclude in "all" mode)
// excludePids: Set of player IDs to exclude (already on board, already drafted)

const VALID_POSITIONS = new Set(["QB", "RB", "WR", "TE", "DL", "LB", "DB", "K"]);

export function filterDraftPool(nflDb, { mode = "rookies", rosteredPids = new Set(), excludePids = new Set(), posFilter = "ALL", searchQ = "" } = {}) {
  return Object.entries(nflDb)
    .filter(([pid, p]) => {
      if (excludePids.has(pid)) return false;
      if (!VALID_POSITIONS.has(p.position)) return false;
      if (!isActivePlayer(p)) return false;
      if (mode === "rookies" && (p.years_exp ?? 99) !== 0) return false;
      if (mode === "all" && rosteredPids.has(pid)) return false;
      if (posFilter !== "ALL" && p.position !== posFilter) return false;
      if (searchQ) {
        const s  = searchQ.toLowerCase();
        const nm = (p.full_name || `${p.first_name || ""} ${p.last_name || ""}`).toLowerCase();
        if (!nm.includes(s) && !(p.team || "").toLowerCase().includes(s)) return false;
      }
      return true;
    })
    .map(([pid, p]) => ({
      pid,
      name:    p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim(),
      pos:     p.position,
      team:    p.team || "FA",
      age:     calcAge(p.birth_date),
      depth:   p.depth_chart_order || null,
      inj:     p.injury_status || null,
      yrsExp:  p.years_exp ?? null,
      college: p.college || null,
      status:  p.status || null,
    }));
}

// ─── SNAKE DRAFT ORDER ────────────────────────────────────────────────────────
// Returns array of { pick, round, slot, isSnakeReverse }
// pick = overall pick number (1-based)
// slot = which team picks (1-based, based on their draft position)

export function buildSnakeOrder(teams, rounds) {
  const picks = [];
  for (let r = 1; r <= rounds; r++) {
    const slots = r % 2 === 1
      ? Array.from({ length: teams }, (_, i) => i + 1)
      : Array.from({ length: teams }, (_, i) => teams - i);
    slots.forEach((slot, i) => picks.push({
      pick:           (r - 1) * teams + i + 1,
      round:          r,
      slot,
      isSnakeReverse: r % 2 === 0,
    }));
  }
  return picks;
}

// ─── PLAYER SCORING FOR DRAFT ─────────────────────────────────────────────────
// Priority: Big Board rank → rostered dynasty score → archetype-aware estimate
// This is used both for user suggestions and AI auto-picks.

export function scoreDraftPlayer(p, bigBoard = [], rosteredPlayers = [], archetype = "BPA") {
  // Big Board rank is always authoritative — user's own research takes priority
  const bbRank = bigBoard.findIndex(b => b.pid === p.pid);
  if (bbRank >= 0) return 1000 - bbRank;

  // If already scored by the dynasty model, use it
  const rostered = rosteredPlayers.find(pl => pl.pid === p.pid);
  if (rostered?.score) return applyArchetypeWeight(rostered.score, p, archetype);

  // Fallback estimate — unrostered players scored by age + depth + position
  return applyArchetypeWeight(estimateBaseScore(p), p, archetype);
}

// Base score estimate for players not in the dynasty model
function estimateBaseScore(p) {
  const age        = p.age || 25;
  const depthBonus = p.depth === 1 ? 20 : p.depth === 2 ? 10 : 0;
  const rookieBonus= p.yrsExp === 0 ? 15 : 0;
  return Math.max(0, Math.min(95, 80 - age * 1.2 + depthBonus + rookieBonus));
}

// Archetype modifiers — adjust base score based on opponent draft philosophy
function applyArchetypeWeight(baseScore, p, archetype) {
  switch (archetype) {
    case "WIN_NOW":
      // Prefers proven starters, discounts rookies and old players
      if (p.yrsExp === 0) return baseScore * 0.4;
      if ((p.age || 99) > 30) return baseScore * 0.7;
      if (p.depth === 1 && (p.age || 99) < 28) return baseScore * 1.3;
      return baseScore;

    case "REBUILDER":
      // Loves rookies and young unproven players
      if (p.yrsExp === 0) return baseScore * 1.8;
      if ((p.age || 99) < 23) return baseScore * 1.4;
      if ((p.age || 99) > 29) return baseScore * 0.5;
      return baseScore;

    case "RB_NEEDY":
      // Inflates RBs significantly — archetype state tracks how many RBs taken
      if (p.pos === "RB") return baseScore * 1.7;
      return baseScore * 0.85;

    case "ZERO_RB":
      // Avoids RBs early, stacks WR/TE/QB
      if (p.pos === "RB") return baseScore * 0.4;
      if (["WR", "TE", "QB"].includes(p.pos)) return baseScore * 1.2;
      return baseScore;

    case "TRADE_HEAVY":
      // Slightly randomised — simulates an owner who trades picks
      // Picks near the top of available but with ~20% chance of passing
      return baseScore * (0.8 + Math.random() * 0.4);

    case "BPA":
    default:
      return baseScore;
  }
}

// ─── AI AUTO-PICK ─────────────────────────────────────────────────────────────
// Given the available pool and archetype context, return the best pick.
// rbCount tracks how many RBs an RB_NEEDY team has already taken this mock.

export function aiAutoPick(pool, archetype, { round = 1, rbCount = 0 } = {}, bigBoard = [], rosteredPlayers = []) {
  if (!pool.length) return null;

  // RB_NEEDY reverts to BPA once they have 3 RBs
  const effectiveArchetype = (archetype === "RB_NEEDY" && rbCount >= 3) ? "BPA" : archetype;

  // Score all available players under this archetype
  const scored = pool.map(p => ({
    ...p,
    draftScore: scoreDraftPlayer(p, bigBoard, rosteredPlayers, effectiveArchetype),
  }));

  // TRADE_HEAVY: ~15% chance to skip the top pick (simulates pick traded away)
  if (archetype === "TRADE_HEAVY" && Math.random() < 0.15) {
    scored.sort((a, b) => b.draftScore - a.draftScore);
    // Skip the best available and take #2 or #3
    const skip = Math.floor(Math.random() * 2) + 1;
    return scored[Math.min(skip, scored.length - 1)];
  }

  scored.sort((a, b) => b.draftScore - a.draftScore);
  return scored[0];
}

// ─── OPPONENT ARCHETYPES ──────────────────────────────────────────────────────
// Used by MockDraft setup to let users configure opponent behaviour.

export const ARCHETYPES = [
  {
    id:    "BPA",
    label: "Best Player Available",
    desc:  "Takes the highest-value player at each pick. Balanced, unpredictable.",
    color: "#60a5fa",
  },
  {
    id:    "WIN_NOW",
    label: "Win Now",
    desc:  "Ignores rookies, targets proven starters aged 24–28. Aggressive.",
    color: "#22c55e",
  },
  {
    id:    "REBUILDER",
    label: "Rebuilder",
    desc:  "Loves rookies and upside. Will pass on proven vets for young talent.",
    color: "#a855f7",
  },
  {
    id:    "RB_NEEDY",
    label: "RB Needy",
    desc:  "Reaches for RBs early and often. Takes 3 before pivoting.",
    color: "#f59e0b",
  },
  {
    id:    "ZERO_RB",
    label: "Zero RB",
    desc:  "Avoids RBs early. Stacks WR/TE/QB then fills RB late.",
    color: "#06b6d4",
  },
  {
    id:    "TRADE_HEAVY",
    label: "Trade Happy",
    desc:  "Unpredictable — occasionally passes on top picks as if trading away.",
    color: "#f97316",
  },
];

// ─── ROUND LABEL HELPERS ──────────────────────────────────────────────────────
export const ROUND_LABEL = {
  1:"1st", 2:"2nd", 3:"3rd", 4:"4th", 5:"5th",
  6:"6th", 7:"7th", 8:"8th", 9:"9th", 10:"10th",
};

export const ROUND_COLORS = [
  "#22c55e", // 1
  "#60a5fa", // 2
  "#f59e0b", // 3
  "#f97316", // 4
  "#a855f7", // 5
  "#06b6d4", // 6
  "#ec4899", // 7
  "#84cc16", // 8
  "#94a3b8", // 9
  "#6b7280", // 10
];
