import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ── Load fonts ─────────────────────────────────────────────────────────────
// Injects into <head> at runtime (safe for Vite / GitHub Pages)
(function loadFonts() {
  if (document.getElementById("mgg-fonts")) return;
  const link = document.createElement("link");
  link.id   = "mgg-fonts";
  link.rel  = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap";
  document.head.appendChild(link);

  const style = document.createElement("style");
  style.id = "mgg-reset";
  style.textContent = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body, #root { background: #0d1117; color: #e2e8f0; font-family: 'Inter', sans-serif; min-height: 100vh; margin: 0; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: #0d1117; }
    ::-webkit-scrollbar-thumb { background: #2e3a50; }
    ::-webkit-scrollbar-thumb:hover { background: #4a5568; }
  `;
  document.head.appendChild(style);
})();

// ── Error boundary (v1.3.12) ────────────────────────────────────────────────
// Without this, any unexpected render error unmounts the entire app: white
// screen, all synced data gone, full re-sync required — the worst possible
// failure mode mid-draft. Synced data lives in memory only, so we can't
// recover it, but we can fail visibly with a one-click reload instead.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("MGG crash:", error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#0d1117", padding: 24 }}>
        <div style={{ background: "#161b26", border: "1px solid #FF4757",
          padding: "28px 34px", maxWidth: 520, textAlign: "center" }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18,
            color: "#FF4757", letterSpacing: "0.15em", marginBottom: 10 }}>
            ⚠ SOMETHING BROKE
          </div>
          <div style={{ fontSize: 12, color: "#8892a4", lineHeight: 1.7, marginBottom: 6 }}>
            The app hit an unexpected error. Your Big Board, watchlist, and notes
            are saved — reloading and re-syncing gets you back.
          </div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
            color: "#4a5568", marginBottom: 18, wordBreak: "break-word" }}>
            {String(this.state.error?.message || this.state.error).slice(0, 200)}
          </div>
          <button onClick={() => window.location.reload()}
            style={{ background: "#9580FF22", color: "#9580FF",
              border: "1px solid #9580FF44", padding: "10px 26px",
              fontFamily: "'Bebas Neue',sans-serif", fontSize: 14,
              letterSpacing: "0.12em", cursor: "pointer" }}>
            ⟳ RELOAD APP
          </button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
