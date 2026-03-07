// ─── LEAGUE CONFIG ────────────────────────────────────────────────────────────
export const LEAGUE_ID = "1178580692040589312";
export const SLEEPER   = "https://api.sleeper.app/v1";

// ─── DYNASTY SCORING WEIGHTS ─────────────────────────────────────────────────
export const SCARCITY = { QB:2.0, RB:1.7, WR:1.3, TE:1.5, DL:1.0, LB:1.0, DB:0.95, K:0.6 };

// [rise, peak, cliff] ages by position
export const PRIME = {
  QB:[25,34,38], RB:[23,27,30], WR:[23,29,33], TE:[24,31,35],
  DL:[23,29,33], LB:[23,28,32], DB:[23,28,32], K:[24,35,42],
};

export const POS_ORDER = ["QB","RB","WR","TE","DL","LB","DB","K"];

// ─── FANTASY SCORING (your league settings) ───────────────────────────────────
export const SCORING = {
  pass_yd:0.04, pass_td:4,   pass_int:-2,
  rush_yd:0.1,  rush_td:6,
  rec:0.5,      rec_yd:0.1,  rec_td:4,
  def_sack:4,   def_tackle_solo:1, def_tackle_for_loss:2,
  def_pass_def:2, def_int:6, def_forced_fumble:3,
  def_fumble_rec:4, def_safe:8,
};

// ─── PICK VALUES (placeholder — calibrate with simulation data) ───────────────
// Index = years from now (0 = current, 1 = next, 2 = two years out)
export const PICK_VALUES  = { "1st":[72,60,48], "2nd":[38,30,24], "3rd":[18,14,10] };
export const PICK_ROUNDS  = ["1st","2nd","3rd"];
export const PICK_YEARS   = [2026,2027,2028];
export const pickValue    = (round, yearOffset) =>
  (PICK_VALUES[round]||[10,8,6])[Math.min(yearOffset,2)];

// ─── VISUAL STYLES ────────────────────────────────────────────────────────────
export const TIER_STYLE = {
  Elite:   { bg:"#0f2b1a", border:"#22c55e", text:"#4ade80", glow:"rgba(34,197,94,0.3)"   },
  Starter: { bg:"#0c1e35", border:"#3b82f6", text:"#60a5fa", glow:"rgba(59,130,246,0.3)"  },
  Flex:    { bg:"#2b1f05", border:"#f59e0b", text:"#fbbf24", glow:"rgba(245,158,11,0.3)"  },
  Depth:   { bg:"#2b0f05", border:"#f97316", text:"#fb923c", glow:"rgba(249,115,22,0.25)" },
  Stash:   { bg:"#111827", border:"#4b5563", text:"#9ca3af", glow:"rgba(75,85,99,0.2)"    },
};

export const INJ_COLOR = {
  Out:"#ef4444", Doubtful:"#f97316", Questionable:"#eab308", IR:"#a855f7", PUP:"#a855f7",
};

export const SIG_COLORS = { BUY:"#22c55e", HOLD:"#3b82f6", SELL:"#ef4444", WATCH:"#f59e0b" };
export const SIT_ICONS  = { Stable:"▲", Improving:"↑", Declining:"↓", Unknown:"?" };

// ─── SITUATION FLAGS ──────────────────────────────────────────────────────────
// Each flag: label shown in badge, color, dynasty score impact, description
export const SITUATION_FLAGS = {
  // Opportunity
  BREAKOUT_YOUNG:  { label:"BREAKOUT★", color:"#22c55e", impact: 0.15, desc:"Age ≤23 + expanded role — buy-and-hold dynasty asset" },
  BREAKOUT_ROLE:   { label:"BREAKOUT↑", color:"#4ade80", impact: 0.08, desc:"Role expansion, 24+ — sell-high window in 12 months" },
  DEPTH_PROMOTED:  { label:"PROMOTED",  color:"#0ea5e9", impact: 0.12, desc:"Moved to starter due to injury ahead of them" },
  CONTRACT_YEAR:   { label:"CONTRACT",  color:"#f59e0b", impact: 0.05, desc:"Playing for next deal — historically outperform" },
  // Risk
  NEW_OC:          { label:"NEW OC",    color:"#a855f7", impact: 0.00, desc:"Coordinator/scheme change — direction unknown" },
  CAMP_BATTLE:     { label:"CAMP ⚔",   color:"#f59e0b", impact:-0.08, desc:"Depth chart competition ongoing" },
  IR_RETURN:       { label:"IR RETURN", color:"#0ea5e9", impact:-0.05, desc:"Returning from injured reserve — durability risk" },
  FREE_AGENT:      { label:"FREE AGENT",color:"#ef4444", impact:-0.20, desc:"Released — team, scheme, and role all unknown" },
  TRADE_DEMAND:    { label:"TRADE REQ", color:"#ef4444", impact:-0.15, desc:"Requested trade — usage and motivation risk" },
  // Auto-derived (set by scoring engine, not manual)
  AGE_CLIFF:       { label:"AGE CLIFF", color:"#f97316", impact:-0.12, desc:"Past positional prime — value declining, consider selling" },
  // Special: SUSPENSION — games field drives impact instead of flat value
  SUSPENSION:      { label:"SUSPEND",   color:"#dc2626", impact: 0.00, desc:"Suspended — discount based on games missed" },
};

// ─── MANUAL SITUATIONS ────────────────────────────────────────────────────────
// Edit each offseason with known team/player situations.
// Format: "Player Full Name": { flag:"FLAG_KEY", note:"Brief note", games?:N }
// SUSPENSION only: add games:N (e.g. games:6) — discount = (17-N)/17
export const MANUAL_SITUATIONS = {
  "Kyler Murray":       { flag:"FREE_AGENT",    note:"Released by ARI 3/11 — linked to Vikings, landing spot TBD. $36.8M guaranteed." },
  "Jacoby Brissett":    { flag:"BREAKOUT_ROLE", note:"3,366yds 23TD in 2025 as ARI starter — now QB1 candidate in free market" },
  "Bryce Young":        { flag:"CAMP_BATTLE",   note:"Starting job not guaranteed heading into camp" },
  "Anthony Richardson": { flag:"IR_RETURN",     note:"Returning from shoulder surgery — workload uncertain" },
  "Christian Kirk":     { flag:"IR_RETURN",     note:"Returning from IR — target share competition expected" },
};

// ─── AUTO-DETECTION PATTERNS ─────────────────────────────────────────────────
// Used by detectSituation() to match against ESPN headlines
export const SITUATION_PATTERNS = [
  { flag:"NEW_OC",         patterns:["offensive coordinator","new oc","hired as oc","scheme change","new offensive coordinator"] },
  { flag:"CAMP_BATTLE",    patterns:["competition","camp battle","depth chart battle","competing for starting","position battle","fight for"] },
  { flag:"BREAKOUT_ROLE",  patterns:["lead back","featured back","every down back","target share","expanded role","wr1","breakout","bell cow"] },
  { flag:"IR_RETURN",      patterns:["return from ir","activated from ir","cleared to return","return from injury","comeback","off injured reserve"] },
  { flag:"TRADE_DEMAND",   patterns:["trade request","requested trade","wants out","unhappy","demands trade","trade demand"] },
  { flag:"DEPTH_PROMOTED", patterns:["named starter","takes over","steps in","promoted to starter","filling in","starting in place"] },
];
