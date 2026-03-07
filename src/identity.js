// ─── IDENTITY SYSTEM ─────────────────────────────────────────────────────────
// Manages Sleeper login, owner-roster mapping, commissioner mode, and view mode.
//
// Identity shape:
//   { userId, username, displayName, ownerName, avatar, isCommissioner }
//
// Commissioner mode: unlocked via passphrase stored at module level.
// View mode: commissioner-only — browse any team read-only without affecting
//            personal data (watchlist, big board, situations stay as your own).

import { useState } from "react";
import { runMigration } from "./storage";

// ── Change this before deploying to production ────────────────────────────────
export const COMMISSIONER_PASS = "mggedynasty2025";

export function useIdentity({ owners, setTradeOwnerA }) {

  // ── State ──────────────────────────────────────────────────────────────────
  const [identity,      setIdentityState] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mgg_identity")); } catch { return null; }
  });
  const [viewingOwner,  setViewingOwner]  = useState(null);
  const [loginOpen,     setLoginOpen]     = useState(false);
  const [loginInput,    setLoginInput]    = useState("");
  const [loginLoading,  setLoginLoading]  = useState(false);
  const [loginError,    setLoginError]    = useState("");
  const [commPassInput, setCommPassInput] = useState("");
  const [commPassError, setCommPassError] = useState("");

  // ── Derived ────────────────────────────────────────────────────────────────
  const currentOwner   = identity?.ownerName || "";
  const isCommissioner = identity?.isCommissioner || false;
  const activeOwner    = viewingOwner || currentOwner;
  const isViewMode     = !!viewingOwner && viewingOwner !== currentOwner;

  // ── Internal helper ────────────────────────────────────────────────────────
  const persistIdentity = (id) => {
    setIdentityState(id);
    if (id) {
      try { localStorage.setItem("mgg_identity", JSON.stringify(id)); } catch {}
    } else {
      try { localStorage.removeItem("mgg_identity"); } catch {}
    }
  };

  // ── Fuzzy owner match ──────────────────────────────────────────────────────
  // Tries to match Sleeper display name → league owner name
  const matchOwner = (displayName, username) =>
    owners.find(o =>
      o.toLowerCase() === displayName.toLowerCase() ||
      o.toLowerCase().includes(username.toLowerCase()) ||
      username.toLowerCase().includes(o.toLowerCase().split(" ")[0])
    ) || displayName;

  // ── Sleeper login ──────────────────────────────────────────────────────────
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

      const displayName = user.metadata?.team_name || user.display_name || user.username || username;
      const ownerName   = matchOwner(displayName, username);

      const newIdentity = {
        userId:        user.user_id,
        username:      user.username || username,
        displayName,
        ownerName,
        avatar:        user.avatar || null,
        isCommissioner: false,
      };

      runMigration(user.user_id);
      persistIdentity(newIdentity);
      setTradeOwnerA(ownerName);
      setLoginOpen(false);
      setLoginInput("");
    } catch(e) {
      setLoginError(e.message || "Login failed. Check username and try again.");
    }
    setLoginLoading(false);
  };

  // ── Manual (no-Sleeper) login ──────────────────────────────────────────────
  // Used as fallback when league is loaded but user prefers to skip verification
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
    persistIdentity(fallback);
    setTradeOwnerA(ownerName);
    setLoginOpen(false);
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const doLogout = () => {
    persistIdentity(null);
    setViewingOwner(null);
    setLoginOpen(true);
  };

  // ── Correct owner→roster mapping ──────────────────────────────────────────
  const setOwnerMapping = (ownerName) => {
    const updated = { ...identity, ownerName };
    persistIdentity(updated);
    setTradeOwnerA(ownerName);
  };

  // ── Commissioner ───────────────────────────────────────────────────────────
  const activateCommissioner = () => {
    if (commPassInput === COMMISSIONER_PASS) {
      persistIdentity({ ...identity, isCommissioner: true });
      setCommPassInput("");
      setCommPassError("");
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

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    // Identity state
    identity,
    currentOwner,
    isCommissioner,
    activeOwner,
    isViewMode,
    viewingOwner,

    // Login modal state
    loginOpen,    setLoginOpen,
    loginInput,   setLoginInput,
    loginLoading,
    loginError,   setLoginError,

    // Commissioner modal state
    commPassInput, setCommPassInput,
    commPassError,

    // Actions
    doSleeperLogin,
    doManualLogin,
    doLogout,
    setOwnerMapping,
    activateCommissioner,
    deactivateCommissioner,
    enterViewMode,
    exitViewMode,
  };
}
