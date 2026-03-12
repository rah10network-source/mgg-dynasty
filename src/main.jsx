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

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
