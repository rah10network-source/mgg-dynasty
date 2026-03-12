// Flat 2.0 button — maps old gradient prop to new palette flat tints
export function Btn({ onClick, disabled, grad, children }) {
  let bg, color, border;
  if (disabled) {
    bg = "#1d2535"; color = "#4a5568"; border = "1px solid #242d40";
  } else if (!grad || grad.includes("22c55e") || grad.includes("16a34a") || grad.includes("9580FF")) {
    // sync / primary → purple
    bg = "#9580FF22"; color = "#9580FF"; border = "1px solid #9580FF66";
  } else if (grad.includes("f59e0b") || grad.includes("d97706") || grad.includes("FFD700")) {
    // intel scan → gold
    bg = "#FFD70022"; color = "#FFD700"; border = "1px solid #FFD70066";
  } else if (grad.includes("6366f1") || grad.includes("4f46e5") || grad.includes("0ea5e9") || grad.includes("00D4FF")) {
    // export → cyan
    bg = "#00D4FF22"; color = "#00D4FF"; border = "1px solid #00D4FF66";
  } else {
    bg = "#9580FF22"; color = "#9580FF"; border = "1px solid #9580FF66";
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background:    bg,
        color,
        border,
        borderRadius:  0,
        padding:       "7px 14px",
        fontFamily:    "'Bebas Neue', sans-serif",
        fontWeight:    400,
        fontSize:      13,
        letterSpacing: "0.12em",
        cursor:        disabled ? "not-allowed" : "pointer",
        opacity:       disabled ? 0.5 : 1,
        transition:    "background .15s",
        whiteSpace:    "nowrap",
      }}
    >
      {children}
    </button>
  );
}
