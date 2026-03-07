// ─── NAMESPACED STORAGE ───────────────────────────────────────────────────────
// All personal user data is scoped by Sleeper userId so multiple users can
// share a device without data bleeding between accounts.
//
// Key format: mgg_{dataType}_{userId}
// e.g. mgg_watchlist_123456789, mgg_bigboard_123456789
//
// Guest (not logged in) uses the key "guest" — data persists but gets migrated
// into the user's namespace on first login.

export const lsKey = (userKey, k) => `mgg_${k}_${userKey}`;

export const lsGet = (userKey, k, def = null) => {
  try {
    const v = localStorage.getItem(lsKey(userKey, k));
    return v !== null ? JSON.parse(v) : def;
  } catch { return def; }
};

export const lsSet = (userKey, k, v) => {
  try { localStorage.setItem(lsKey(userKey, k), JSON.stringify(v)); } catch {}
};

export const lsDel = (userKey, k) => {
  try { localStorage.removeItem(lsKey(userKey, k)); } catch {}
};

// ─── ONE-TIME MIGRATION ───────────────────────────────────────────────────────
// Copies legacy non-namespaced keys (pre-0.8.0) into the new userId namespace
// on first login so existing users don't lose their data on upgrade.
export const runMigration = (userId) => {
  ["watchlist", "situations", "bigboard", "fa_watchlist"].forEach(k => {
    const old = localStorage.getItem(`mgg_${k}`);
    const nk  = `mgg_${k}_${userId}`;
    if (old && !localStorage.getItem(nk)) {
      localStorage.setItem(nk, old);
    }
  });
};
