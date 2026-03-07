// ─── ANTHROPIC API HELPER ─────────────────────────────────────────────────────
// Central helper so all AI features share the same key management.
// Key is stored in localStorage under "mgg_anthropic_key".
// In the claude.ai artifact environment no key is needed (auto-proxied).
// On GitHub Pages / any deployed site, the user must supply their own key.

export const STORAGE_KEY = "mgg_anthropic_key";

export const getApiKey = () => {
  try { return localStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; }
};

export const saveApiKey = (key) => {
  try { localStorage.setItem(STORAGE_KEY, key.trim()); } catch {}
};

export const clearApiKey = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
};

// Main call wrapper — injects key + required headers
export const callAnthropic = async (body, apiKey) => {
  const key = apiKey || getApiKey();
  const headers = { "Content-Type": "application/json" };
  if (key) {
    headers["x-api-key"]         = key;
    headers["anthropic-version"] = "2023-06-01";
    headers["anthropic-dangerous-direct-browser-access"] = "true";
  }
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = err?.error?.message || `HTTP ${resp.status}`;
    if (resp.status === 401) throw new Error("Invalid or missing API key. Add your key via the ⚙ button in the top bar.");
    if (resp.status === 429) throw new Error("Rate limited — wait a moment and try again.");
    throw new Error(msg);
  }
  return resp.json();
};

// Check if we're in the claude.ai artifact proxy environment
// (no key needed — requests are auto-authenticated)
export const isProxied = () => {
  return window.location.hostname.includes("claude.ai") ||
         window.location.hostname === "localhost" ||
         window.location.hostname === "127.0.0.1";
};

export const hasValidKey = () => isProxied() || !!getApiKey();
