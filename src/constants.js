// ─── LEAGUE CONFIG ────────────────────────────────────────────────────────────
export const LEAGUE_ID = "1315875703715016704";
export const SLEEPER   = "https://api.sleeper.app/v1";
export const LEAGUE_API_KEY = import.meta.env.VITE_LEAGUE_API_KEY || "";

// ─── DYNASTY SCORING WEIGHTS ─────────────────────────────────────────────────
export const SCARCITY = { QB:2.0, RB:1.7, WR:1.3, TE:1.5, DL:1.9, LB:2.2, DB:1.5, K:0.6 };

// [rise, peak, cliff] ages by position
export const PRIME = {
  QB:[25,34,38], RB:[23,27,30], WR:[23,29,33], TE:[24,31,35],
  DL:[22,27,31], LB:[22,27,31], DB:[22,29,34], K:[24,35,42],
};

export const POS_ORDER = ["QB","RB","WR","TE","DL","LB","DB","K"];

export const LINEUP_SLOTS = { QB:2, RB:3, WR:4, TE:2, DL:1, LB:1, DB:1, K:1 };

export const POS_DV_MAX = { QB:999, RB:950, WR:980, TE:820, DL:720, LB:750, DB:700, K:200 };

// ─── FANTASY SCORING ──────────────────────────────────────────────────────────
export const SCORING = {
  pass_yd:0.04, pass_td:4,  pass_int:-1,
  rush_yd:0.1,  rush_td:6,
  rec:0.5,      rec_yd:0.1, rec_td:4,
  pr_yd:0.1, kr_yd:0.0333, pr_td:6, kr_td:6, st_td:6,
  int_ret_yd:0.1, fum_ret_yd:0.1,
  idp_sack:4, idp_tkl_solo:1, idp_tkl_ast:0.5, idp_tkl_loss:2,
  idp_qb_hit:1, idp_pass_def:2, idp_int:2, idp_ff:1, idp_fum_rec:1,
  idp_safe:2, idp_def_td:6, idp_blk_kick:2,
  idp_int_ret_yd:0.1, idp_fum_ret_yd:0.1,
};

// ─── PICK VALUES ──────────────────────────────────────────────────────────────
export const PICK_VALUES  = { "1st":[72,60,48], "2nd":[38,30,24], "3rd":[18,14,10] };
export const PICK_ROUNDS  = ["1st","2nd","3rd"];
export const PICK_YEARS   = [2026,2027,2028];
export const pickValue    = (round, yearOffset) =>
  (PICK_VALUES[round]||[10,8,6])[Math.min(yearOffset,2)];

// ─── TIER STYLES ─────────────────────────────────────────────────────────────
export const TIER_STYLE = {
  Elite:   { bg:"#0d1f14", border:"#00FF87", text:"#00FF87", glow:"rgba(0,255,135,0.15)"   },
  Starter: { bg:"#130f2e", border:"#9580FF", text:"#9580FF", glow:"rgba(149,128,255,0.15)" },
  Flex:    { bg:"#1a1800", border:"#FFD700", text:"#FFD700", glow:"rgba(255,215,0,0.12)"   },
  Depth:   { bg:"#1a1000", border:"#FF9040", text:"#FF9040", glow:"rgba(255,144,64,0.12)"  },
  Stash:   { bg:"#161b26", border:"#2e3a50", text:"#4a5568", glow:"rgba(74,85,104,0.08)"   },
};

export const INJ_COLOR = {
  Out:"#FF4757", Doubtful:"#FF9040", Questionable:"#FFD700", IR:"#9580FF", PUP:"#9580FF",
};

export const SIG_COLORS = {
  BUY:"#00FF87", HOLD:"#00D4FF", SELL:"#FF4757", WATCH:"#FFD700",
};
export const SIT_ICONS  = { Stable:"▲", Improving:"↑", Declining:"↓", Unknown:"?" };

// ─── SITUATION FLAGS ──────────────────────────────────────────────────────────
export const SITUATION_FLAGS = {
  BREAKOUT_YOUNG:  { label:"BREAKOUT★", color:"#00FF87", impact: 0.15, desc:"Age ≤23 + expanded role — buy-and-hold dynasty asset" },
  BREAKOUT_ROLE:   { label:"BREAKOUT↑", color:"#00FF87", impact: 0.08, desc:"Role expansion, 24+ — sell-high window in 12 months" },
  DEPTH_PROMOTED:  { label:"PROMOTED",  color:"#00D4FF", impact: 0.12, desc:"Moved to starter due to injury ahead of them" },
  CONTRACT_YEAR:   { label:"CONTRACT",  color:"#FFD700", impact: 0.05, desc:"Playing for next deal — historically outperform" },
  DUAL_POS:        { label:"TWO-WAY",   color:"#9580FF", impact: 0.10, desc:"Eligible at both offense and defense" },
  RETURN_THREAT:   { label:"RETURNER",  color:"#00D4FF", impact: 0.06, desc:"Significant return yards add meaningful PPG floor" },
  NEW_OC:          { label:"NEW OC",    color:"#9580FF", impact: 0.00, desc:"Coordinator/scheme change — direction unknown" },
  CAMP_BATTLE:     { label:"CAMP ⚔",   color:"#FFD700", impact:-0.08, desc:"Depth chart competition ongoing" },
  IR_RETURN:       { label:"IR RETURN", color:"#00D4FF", impact:-0.05, desc:"Returning from injured reserve — durability risk" },
  FREE_AGENT:      { label:"FREE AGENT",color:"#FF4757", impact:-0.20, desc:"Released — team, scheme, and role all unknown" },
  TRADE_DEMAND:    { label:"TRADE REQ", color:"#FF4757", impact:-0.15, desc:"Requested trade — usage and motivation risk" },
  AGE_CLIFF:       { label:"AGE CLIFF", color:"#FF9040", impact:-0.12, desc:"Past positional prime — value declining, consider selling" },
  SUSPENSION:      { label:"SUSPEND",   color:"#FF4757", impact: 0.00, desc:"Suspended — discount based on games missed" },
};

// ─── MANUAL SITUATIONS ────────────────────────────────────────────────────────
export const MANUAL_SITUATIONS = {};

// ─── AUTO-DETECTION PATTERNS ─────────────────────────────────────────────────
export const SITUATION_PATTERNS = [
  { flag:"NEW_OC",         patterns:["offensive coordinator","new oc","hired as oc","scheme change","new offensive coordinator"] },
  { flag:"CAMP_BATTLE",    patterns:["competition","camp battle","depth chart battle","competing for starting","position battle","fight for"] },
  { flag:"BREAKOUT_ROLE",  patterns:["lead back","featured back","every down back","target share","expanded role","wr1","breakout","bell cow"] },
  { flag:"IR_RETURN",      patterns:["return from ir","activated from ir","cleared to return","return from injury","comeback","off injured reserve"] },
  { flag:"TRADE_DEMAND",   patterns:["trade request","requested trade","wants out","unhappy","demands trade","trade demand"] },
  { flag:"DEPTH_PROMOTED", patterns:["named starter","takes over","steps in","promoted to starter","filling in","starting in place"] },
];

// ─── VIEW MODE HELPERS ────────────────────────────────────────────────────────
export const pv      = (p, mode) => mode === "redraft" ? (p.startValue ?? 0) : (p.dynastyValue ?? 0);
export const pvLabel = (mode)    => mode === "redraft" ? "SV" : "DV";
export const pvColor = (val, mode) => {
  if (mode === "redraft") {
    return val >= 75 ? "#00FF87" : val >= 50 ? "#9580FF" : val >= 30 ? "#FFD700" : "#FF4757";
  }
  return val >= 700 ? "#00FF87" : val >= 400 ? "#9580FF" : val >= 200 ? "#FFD700" : "#FF4757";
};
