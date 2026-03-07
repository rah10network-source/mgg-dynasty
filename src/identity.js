// ─── IDENTITY SYSTEM ─────────────────────────────────────────────────────────
// Identity shape: { userId, username, displayName, ownerName, avatar, isCommissioner }
//
// Key fixes vs previous version:
//   - loginOpen starts TRUE when no identity in localStorage (auto-shows on first visit)
//   - doSleeperLogin returns raw Sleeper user — owner matching + lockout done in App.jsx
//     where the live owners array is available after data loads
//   - Legacy mgg_owner key cleared on login

import { useState } from "react";
import { runMigration } from "./storage";

export const COMMISSIONER_PASS = "mggedynasty2025"; // change before sharing

export function useIdentity() {

  const [identity, setIdentityState] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mgg_identity")); } catch { return null; }
  });

  // ── Auto-open on first visit if no identity saved ─────────────────────────
  const [loginOpen,     setLoginOpen]     = useState(() => !localStorage.getItem("mgg_identity"));
  const [loginInput,    setLoginInput]    = useState("");
  const [loginLoading,  setLoginLoading]  = useState(false);
  const [loginError,    setLoginError]    = useState("");
  const [commPassInput, setCommPassInput] = useState("");
  const [commPassError, setCommPassError] = useState("");
  const [viewingOwner,  setViewingOwner]  = useState(null);

  const currentOwner   = identity?.ownerName || "";
  const isCommissioner = identity?.isCommissioner || false;
  const activeOwner    = viewingOwner || currentOwner;
  const isViewMode     = !!viewingOwner && viewingOwner !== currentOwner;

  const persistIdentity = (id) => {
    setIdentityState(id);
    try {
      if (id) localStorage.setItem("mgg_identity", JSON.stringify(id));
      else     localStorage.removeItem("mgg_identity");
    } catch {}
  };

  // ── Returns raw Sleeper user object — App.jsx handles matching + lockout ───
  const doSleeperLogin = async () => {
    const username = loginInput.trim().toLowerCase();
    if (!username) return null;
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
      return user;
    } catch(e) {
      setLoginError(e.message || "Login failed. Try again.");
      setLoginLoading(false);
      return null;
    }
  };

  // Called by App.jsx after owner matching + lockout check pass
  const finaliseLogin = (user, ownerName) => {
    const newIdentity = {
      userId:         user.user_id,
      username:       user.username || loginInput.trim().toLowerCase(),
      displayName:    user.metadata?.team_name || user.display_name || user.username,
      ownerName,
      avatar:         user.avatar || null,
      isCommissioner: false,
    };
    runMigration(user.user_id);
    try { localStorage.removeItem("mgg_owner"); } catch {} // clear legacy key
    persistIdentity(newIdentity);
    setLoginOpen(false);
    setLoginInput("");
    setLoginLoading(false);
  };

  const doManualLogin = (ownerName) => {
    const fallback = {
      userId:         `local_${ownerName.replace(/\s+/g,"_").toLowerCase()}`,
      username:       ownerName.toLowerCase().replace(/\s+/g,"_"),
      displayName:    ownerName,
      ownerName,
      avatar:         null,
      isCommissioner: false,
    };
    runMigration(fallback.userId);
    try { localStorage.removeItem("mgg_owner"); } catch {}
    persistIdentity(fallback);
    setLoginOpen(false);
  };

  const doLogout = () => {
    persistIdentity(null);
    setViewingOwner(null);
    setLoginOpen(true);
  };

  const setOwnerMapping = (ownerName) => {
    if (!identity) return;
    persistIdentity({ ...identity, ownerName });
  };

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
