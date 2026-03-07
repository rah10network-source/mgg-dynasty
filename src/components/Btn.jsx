export function Btn({ onClick, disabled, grad, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background:    disabled ? "#1e2d3d" : grad,
        color:         disabled ? "#4b6580" : "#080d14",
        border:        "none",
        borderRadius:  6,
        padding:       "8px 16px",
        fontFamily:    "'Courier New',monospace",
        fontWeight:    900,
        fontSize:      10,
        letterSpacing: 2,
        cursor:        disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}
