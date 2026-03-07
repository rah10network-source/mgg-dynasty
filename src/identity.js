// ─── IDENTITY SYSTEM ─────────────────────────────────────────────────────────
// Manages Sleeper login, commissioner mode, and view mode.
//
// Identity shape: { userId, username, displayName, ownerName, avatar, isCommissioner }
//
// Key design decisions:
//   - loginOpen starts TRUE if no identity saved — modal shows immediately on load
//   - Owner matching happens in App.jsx after league data loads, not here
//   - Lockout check is done in App.jsx post-load so owners list is available
//   - Passphrase is commissioner-only convenience lock, not a security boundary

import { useState } from "react";
import { runMigration } from "./storage";

export const COMMISSIONER_PASS = "mggedynasty2025"; // ← change before deploying

export function useIdentity() {

  // ── State ──────────────────────────────────────────────────────────────────
  const [identity, setIdentityState] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mgg_identity")); } catch { return null; }
  });

  // Auto-open login modal if no identity saved yet
  const [loginOpen,     setLoginOpen]     = useState(() => !localStorage.getItem("mgg_identity"));
  const [loginInput,    setLoginInput]    = useState("");
  const [loginLoading,  setLoginLoading]  = useState(false);
  const [loginError,    setLoginError]    = useState("");
  const [commPassInput, setCommPassInput] = useState("");
  const [commPassError, setCommPassError] = useState("");
  const [viewingOwner,  setViewingOwner]  = useState(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentOwner   = identity?.ownerName || "";
  const isCommissioner = identity?.isCommissioner || false;
  const activeOwner    = viewingOwner || currentOwner;
  const isViewMode     = !!viewingOwner && viewingOwner !== currentOwner;

  // ── Persist helper ─────────────────────────────────────────────────────────
  const persistIdentity = (id) => {
    setIdentityState(id);
    try {
      if (id) localStorage.setItem("mgg_identity", JSON.stringify(id));
      else     localStorage.removeItem("mgg_identity");
    } catch {}
  };

  // ── Sleeper login ──────────────────────────────────────────────────────────
  // Returns { ok: true, userId, username, displayName } or throws.
  // Owner matching and lockout are handled in App.jsx after this resolves.
  const doSleeperLogin = async () => {
    const username = loginInput.trim().toLowerCase();
    if (!username) return;
    setLoginLoading(true);
    setLoginError("");
    try {
      const res = await fetch(
        `https://api.sleeper.app/v1/user/${username}`,
        { signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) throw new Error("Sleeper username not found. Check your spelling.");
      const user = await res.json();
      if (!user?.user_id) throw new Error("Invalid Sleeper response.");
      return user; // let App.jsx handle owner matching + lockout
    } catch(e) {
      setLoginError(e.message || "Login failed. Try again.");
      setLoginLoading(false);
      return null;
    }
  };

  // Called by App.jsx after owner matching + lockout check pass
  const finaliseLogin = (user, ownerName) => {
    const newIdentity = {
      userId:        user.user_id,
      username:      user.username || user.display_name || loginInput.trim().toLowerCase(),
      displayName:   user.metadata?.team_name || user.display_name || user.username,
      ownerName,
      avatar:        user.avatar || null,
      isCommissioner: false,
    };
    runMigration(user.user_id);
    // Clear legacy non-namespaced owner key from pre-0.8.0
    try { localStorage.removeItem("mgg_owner"); } catch {}
    persistIdentity(newIdentity);
    setLoginOpen(false);
    setLoginInput("");
    setLoginLoading(false);
  };

  // ── Manual login (no Sleeper verification — fallback only) ─────────────────
  const doManualLogin = (ownerName) => {
    const fallback = {
      userId:        `local_${ownerName.replace(/\s+/g, "_").toLowerCase()}`,
      username:      ownerName.toLowerCase().replace(/\s+/g, "_"),
      displayName:   ownerName,
      ownerName,
      avatar:        null,
      isCommissioner: false,
    };
    runMigration(fallback.userId);
    try { localStorage.removeItem("mgg_owner"); } catch {}
    persistIdentity(fallback);
    setLoginOpen(false);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const doLogout = () => {
    persistIdentity(null);
    setViewingOwner(null);
    setLoginOpen(true);
  };

  // ── Correct owner→roster mapping ───────────────────────────────────────────
  const setOwnerMapping = (ownerName) => {
    if (!identity) return;
    persistIdentity({ ...identity, ownerName });
  };

  // ── Commissioner ───────────────────────────────────────────────────────────
  const activateCommissioner = () => {
    if (commPassInput === COMMISSIONER_PASS) {
      persistIdentity({ ...identity, isCommissioner: true });
      setCommPassInput(""); setCommPassError("");
    } else {
      setCommPassError("Incorrect passphrase.");
      setTimeout(() => setCommPassError(""), 2000);
    }
  };
  const deactivateCommissioner = () => {
    persistIdentity({ ...identity, isCommissioner: false });
    setViewingOwner(null);
  };

  // ── View mode ──────────────────────────────────────────────────────────────
  const enterViewMode = (ownerName) => {
    if (!ownerName || ownerName === currentOwner) { setViewingOwner(null); return; }
    setViewingOwner(ownerName);
  };
  const exitViewMode = () => setViewingOwner(null);

  return {
    identity,
    currentOwner, isCommissioner, activeOwner, isViewMode, viewingOwner,
    loginOpen,    setLoginOpen,
    loginInput,   setLoginInput,   loginLoading, setLoginLoading,
    loginError,   setLoginError,
    commPassInput, setCommPassInput, commPassError,
    doSleeperLogin, finaliseLogin,
    doManualLogin, doLogout, setOwnerMapping,
    activateCommissioner, deactivateCommissioner,
    enterViewMode, exitViewMode,
  };
}
