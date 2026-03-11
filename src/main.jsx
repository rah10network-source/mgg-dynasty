import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// ── Design system fonts ────────────────────────────────────────────────────
// Bebas Neue  → all labels, headings, nav, grades, stat labels
// Inter       → body text, descriptions, notes
// JetBrains Mono → numeric data values (DV, SV, scores, PPG)
const fontLink = document.createElement("link");
fontLink.rel  = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap";
document.head.appendChild(fontLink);

// ── Global reset + CSS variables ──────────────────────────────────────────
const style = document.createElement("style");
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:      #0d1117;
    --s1:      #161b26;
    --s2:      #1d2535;
    --s3:      #232e42;
    --border:  #242d40;
    --border2: #2e3a50;

    --purple:  #9580FF;
    --green:   #00FF87;
    --cyan:    #00D4FF;
    --yellow:  #FFD700;
    --orange:  #FF9040;
    --red:     #FF4757;
    --muted:   #4a5568;
    --dim:     #2a3548;
    --text:    #e2e8f0;
    --text2:   #8892a4;
    --text3:   #4a5568;

    --font-display: 'Bebas Neue', sans-serif;
    --font-body:    'Inter', sans-serif;
    --font-mono:    'JetBrains Mono', 'Courier New', monospace;
  }

  html, body, #root {
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-body);
    min-height: 100vh;
  }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border2); }
  ::-webkit-scrollbar-thumb:hover { background: var(--muted); }

  button:focus-visible { outline: 2px solid var(--purple); outline-offset: 1px; }
  input:focus-visible  { outline: 1px solid var(--purple); }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
