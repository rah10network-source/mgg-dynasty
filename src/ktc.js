// ─── MARKET VALUE LOADER ──────────────────────────────────────────────────────
// Fetches dynasty trade values from FantasyCalc (primary) and KTC (secondary).
// Fuzzy-matches to your rostered players and attaches:
//   p.fcValue      — raw FantasyCalc value (0–10000 scale)
//   p.ktcValue     — raw KTC value (0–10000 scale), null if unavailable
//   p.marketValue  — floor aggregate: average of available sources
//   p.ktcTier      — human pick-equivalent label for that market value

const FC_URL  = "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=1&ppr=1&superflex=false";
const KTC_URL = "https://api.ktc.app/players/dynasty";

// ── Name normalisation ────────────────────────────────────────────────────────
// Strips suffixes (Jr/Sr/II/III/IV), punctuation, extra spaces.
const SUFFIXES = /\b(jr|sr|ii|iii|iv|v)\b\.?/gi;
export function normName(raw) {
  return (raw || "")
    .toLowerCase()
    .replace(SUFFIXES, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Build lookup map { normalisedName → value } ───────────────────────────────
function buildLookup(entries) {
  const map = new Map();
  entries.forEach(({ name, value }) => {
    if (!name || value == null) return;
    map.set(normName(name), value);
  });
  return map;
}

// ── Fuzzy match (roster name → external lookup) ───────────────────────────────
// Three passes: exact → lastName+firstInitial → lastName alone (if unique)
function fuzzyMatch(playerName, lookup) {
  const norm  = normName(playerName);
  if (lookup.has(norm)) return lookup.get(norm);

  const parts   = norm.split(" ").filter(Boolean);
  const last    = parts[parts.length - 1];
  const firstI  = parts[0]?.[0] || "";
  const liKey   = `${firstI} ${last}`; // "j jefferson"

  // Scan all keys for lastName+firstInitial
  for (const [key, val] of lookup) {
    const kp = key.split(" ").filter(Boolean);
    const kLast  = kp[kp.length - 1];
    const kFirst = kp[0]?.[0] || "";
    if (kLast === last && kFirst === firstI) return val;
  }

  // Last-name-only fallback — only use if exactly one match
  const lastMatches = [];
  for (const [key, val] of lookup) {
    const kp = key.split(" ").filter(Boolean);
    if (kp[kp.length - 1] === last) lastMatches.push(val);
  }
  if (lastMatches.length === 1) return lastMatches[0];

  return null;
}

// ── FantasyCalc fetch ─────────────────────────────────────────────────────────
async function fetchFC() {
  const r = await fetch(FC_URL, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`FC HTTP ${r.status}`);
  const data = await r.json();
  // Response: [{ player: { name }, value, ... }]
  return data.map(d => ({
    name:  d.player?.name || d.name || "",
    value: d.value ?? 0,
  }));
}

// ── KTC fetch ─────────────────────────────────────────────────────────────────
async function fetchKTC() {
  const r = await fetch(KTC_URL, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`KTC HTTP ${r.status}`);
  const data = await r.json();
  // Response varies by endpoint; try common shapes
  if (!Array.isArray(data)) throw new Error("KTC: unexpected format");
  return data.map(d => ({
    name:  d.playerName || d.name || d.player?.name || "",
    value: d.value ?? d.dynastyValue ?? 0,
  }));
}

// ── Pick equivalency label ────────────────────────────────────────────────────
// Used by TeamHub SellHigh to tell you what a player is realistically worth.
export function pickEquivLabel(marketValue) {
  if (marketValue == null) return null;
  if (marketValue >= 7000) return { label:"Franchise piece",        color:"#22c55e", note:"Don't sell without a king's ransom" };
  if (marketValue >= 4500) return { label:"1st (top 3)",            color:"#22c55e", note:"Top of class 1st round pick"        };
  if (marketValue >= 2800) return { label:"1st (mid/late)",         color:"#60a5fa", note:"Mid to late 1st round"              };
  if (marketValue >= 1500) return { label:"2nd round pick",         color:"#0ea5e9", note:"Early to mid 2nd"                   };
  if (marketValue >=  700) return { label:"3rd round pick",         color:"#f59e0b", note:"Solid 3rd, maybe 2nd late"          };
  if (marketValue >=  300) return { label:"4th–5th round pick",     color:"#f97316", note:"Late-round flier or depth"          };
  if (marketValue >=  100) return { label:"6th–8th round pick",     color:"#94a3b8", note:"Low-end filler pick"                };
  return                          { label:"9th–10th / conditional", color:"#4d6880", note:"Minimal standalone value"           };
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function loadMarketValues(players, log) {
  log("Fetching dynasty market values (FantasyCalc + KTC)...");

  let fcEntries = [], ktcEntries = [];
  let fcOk = false, ktcOk = false;

  // Fetch both in parallel — failures are non-fatal
  const [fcResult, ktcResult] = await Promise.allSettled([fetchFC(), fetchKTC()]);

  if (fcResult.status === "fulfilled") {
    fcEntries = fcResult.value;
    fcOk = true;
    log(`FantasyCalc: ${fcEntries.length} players loaded`, "success");
  } else {
    log(`FantasyCalc unavailable (${fcResult.reason?.message}) — skipping`, "info");
  }

  if (ktcResult.status === "fulfilled") {
    ktcEntries = ktcResult.value;
    ktcOk = true;
    log(`KTC: ${ktcEntries.length} players loaded`, "success");
  } else {
    log(`KTC unavailable (${ktcResult.reason?.message}) — skipping`, "info");
  }

  if (!fcOk && !ktcOk) {
    log("Market values unavailable — scoring uses internal model only", "info");
    return players; // unchanged
  }

  const fcLookup  = buildLookup(fcEntries);
  const ktcLookup = buildLookup(ktcEntries);

  let matched = 0;
  players.forEach(p => {
    const fc  = fcOk  ? fuzzyMatch(p.name, fcLookup)  : null;
    const ktc = ktcOk ? fuzzyMatch(p.name, ktcLookup) : null;

    if (fc != null || ktc != null) {
      p.fcValue  = fc  ?? null;
      p.ktcValue = ktc ?? null;
      // Aggregate: average of available sources. If only one, use it as-is.
      const vals = [fc, ktc].filter(v => v != null);
      p.marketValue = Math.round(vals.reduce((s,v) => s+v, 0) / vals.length);
      matched++;
    } else {
      p.fcValue  = null;
      p.ktcValue = null;
      p.marketValue = null;
    }
  });

  const pct = players.length ? Math.round(matched / players.length * 100) : 0;
  log(`Market values matched: ${matched}/${players.length} players (${pct}%)`, matched > 0 ? "success" : "info");

  return players;
}
