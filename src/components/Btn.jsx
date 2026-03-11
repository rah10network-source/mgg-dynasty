// Flat 2.0 button — squared, no gradient, no shadow
// grad prop is kept for API compat but we use it only as a flat tint reference
export function Btn({ onClick, disabled, grad, children, variant = "primary" }) {
  // Map old gradient colors to flat accent colors
  let bg, color, border;
  if (disabled) {
    bg = "#1d2535"; color = "#4a5568"; border = "#242d40";
  } else if (grad?.includes("22c55e") || grad?.includes("16a34a")) {
    bg = "#9580FF22"; color = "#9580FF"; border = "#9580FF66";
  } else if (grad?.includes("f59e0b") || grad?.includes("d97706")) {
    bg = "#FFD70022"; color = "#FFD700"; border = "#FFD70066";
  } else if (grad?.includes("6366f1") || grad?.includes("4f46e5")) {
    bg = "#00D4FF22"; color = "#00D4FF"; border = "#00D4FF66";
  } else if (grad?.includes("0ea5e9")) {
    bg = "#00D4FF22"; color = "#00D4FF"; border = "#00D4FF66";
  } else {
    bg = "#9580FF22"; color = "#9580FF"; border = "#9580FF66";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background:    bg,
        color,
        border:        `1px solid ${border}`,
        borderRadius:  0,
        padding:       "7px 14px",
        fontFamily:    "'Bebas Neue', sans-serif",
        fontWeight:    400,
        fontSize:      13,
        letterSpacing: "0.12em",
        cursor:        disabled ? "not-allowed" : "pointer",
        opacity:       disabled ? 0.5 : 1,
        transition:    "background .15s, color .15s",
        whiteSpace:    "nowrap",
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = bg.replace("22","44"); }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.background = bg; }}
    >
      {children}
    </button>
  );
}
