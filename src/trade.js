// ─── TRADE LOGIC ──────────────────────────────────────────────────────────────
// Single source of truth for all trade evaluation logic.
// Pure functions — no React, no fetch (AI call via anthropic.js).
//
// Consumers:
//   App.jsx        — state wiring + requestClaudeTradeNarrative
//   Trade.jsx      — UI rendering
//   TeamHub.jsx    — Sell-High suggestion engine (pickRoundCeiling, pickEquivLabel)
//   ktc.js         — re-exports pickEquivLabel for market value badge

import { PICK_VALUES, PICK_ROUNDS } from "./constants";
import { callAnthropic } from "./anthropic";

// ─── PICK VALUE ───────────────────────────────────────────────────────────────
// yearOffset = target year minus current year (0 = this year's picks, 1 = next, 2 = year after)
// Clamps to index 2 for picks >2 years out.

export const pickValue = (round, yearOffset = 0) =>
  (PICK_VALUES[round] || [10, 8, 6])[Math.min(Math.max(yearOffset, 0), 2)];

// ─── ITEM SCORE ───────────────────────────────────────────────────────────────
// Unified scorer for a trade item — player or pick.
// customVal allows user overrides (editable in Trade UI).

export const itemScore = (item) => item.customVal ?? item.dynastyValue ?? item.score ?? 0;

// ─── TRADE TOTALS ─────────────────────────────────────────────────────────────

export const tradeTotal = (items) => items.reduce((sum, x) => sum + itemScore(x), 0);

// ─── TRADE VERDICT ────────────────────────────────────────────────────────────
// Evaluates from Side B's perspective (returning team's point of view).
// diff > 0 = Side B wins the trade.

export const tradeVerdict = (sideA, sideB) => {
  const diff = tradeTotal(sideB) - tradeTotal(sideA);
  const abs  = Math.abs(diff);
  if (abs <= 5)  return { label: "FAIR TRADE",    color: "#3b82f6", diff };
  if (abs <= 15) return { label: diff > 0 ? "SLIGHT WIN"  : "SLIGHT LOSS",  color: diff > 0 ? "#22c55e" : "#f59e0b", diff };
  if (abs <= 30) return { label: diff > 0 ? "CLEAR WIN"   : "CLEAR LOSS",   color: diff > 0 ? "#22c55e" : "#ef4444", diff };
  return           { label: diff > 0 ? "STRONG WIN"  : "LOPSIDED LOSS", color: diff > 0 ? "#22c55e" : "#ef4444", diff };
};

// ─── PICK ROUND CEILING ───────────────────────────────────────────────────────
// Hard-gates pick suggestions by real market value.
// Used in TeamHub Sell-High to suggest realistic return for a player.

export const pickRoundCeiling = (marketValue) => {
  if (!marketValue || marketValue <= 0) return "10th";
  if (marketValue >= 4500) return "1st";
  if (marketValue >= 1500) return "2nd";
  if (marketValue >= 700)  return "3rd";
  if (marketValue >= 300)  return "4th";
  if (marketValue >= 150)  return "5th";
  if (marketValue >= 100)  return "6th";
  if (marketValue >= 60)   return "7th";
  if (marketValue >= 30)   return "8th";
  if (marketValue >= 15)   return "9th";
  return "10th";
};

// ─── PICK EQUIVALENT LABEL ────────────────────────────────────────────────────
// Returns human-readable pick tier + colour for market-value badge display.

export const pickEquivLabel = (value) => {
  if (!value || value <= 0) return { label: "Low-end conditional", color: "#6b7280", note: "Minimal dynasty value" };
  if (value >= 7000) return { label: "Franchise piece",  color: "#f59e0b", note: "Untradeable in most leagues" };
  if (value >= 4500) return { label: "1st — Top 3",      color: "#22c55e", note: "Premium 1st" };
  if (value >= 2800) return { label: "1st — Mid/Late",   color: "#22c55e", note: "Solid 1st" };
  if (value >= 1500) return { label: "2nd round",        color: "#60a5fa", note: "Good value" };
  if (value >= 700)  return { label: "3rd round",        color: "#a855f7", note: "Mid-value" };
  if (value >= 300)  return { label: "4th–5th round",    color: "#f59e0b", note: "Depth value" };
  if (value >= 100)  return { label: "6th–8th round",    color: "#f97316", note: "Stash/depth only" };
  if (value >= 30)   return { label: "9th–10th round",   color: "#6b7280", note: "Low value" };
  return                    { label: "Low-end conditional", color: "#6b7280", note: "Minimal dynasty value" };
};

// ─── AI TRADE NARRATIVE ───────────────────────────────────────────────────────
// Calls Claude Haiku to generate a dynasty-context trade narrative.
// Falls back gracefully — UI should never hard-fail if AI is unavailable.
// Returns a narrative string or null.

export const claudeTradeAnalysis = async (sideA, sideB, ownerA, ownerB, apiKey) => {
  const formatSide = (items) =>
    items.map(i =>
      i.type === "pick"
        ? `${i.label} pick (value ~${i.dynastyValue ?? i.score})`
        : `${i.name} (${i.pos}, age ${i.age ?? "?"}, dv ${i.dynastyValue ?? i.score}, tier ${i.tier})`
    ).join(", ") || "nothing";

  const prompt = `You are a dynasty fantasy football analyst. Evaluate this trade briefly.

${ownerA} receives: ${formatSide(sideB)}
${ownerB} receives: ${formatSide(sideA)}

Respond in 3-4 sentences max. Focus on: who wins dynasty value, age/window fit, and any risk. Be direct and specific. Do not use bullet points.`;

  try {
    const data = await callAnthropic({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 220,
      messages:   [{ role: "user", content: prompt }],
    }, apiKey);

    return data?.content?.[0]?.text?.trim() || null;
  } catch (e) {
    console.warn("claudeTradeAnalysis failed:", e.message);
    return null;
  }
};
