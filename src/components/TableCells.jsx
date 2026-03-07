// TH — sortable column header.
// sortKey / sortAsc / onSort are passed from the Board tab.
export function TH({ label, k, w, sortKey, sortAsc, onSort }) {
  return (
    <th
      onClick={() => k && onSort(k)}
      style={{
        padding:       "8px 7px",
        background:    "#0c151e",
        color:         "#7a95ae",
        fontSize:      9,
        letterSpacing: 1.5,
        fontWeight:    700,
        cursor:        k ? "pointer" : "default",
        userSelect:    "none",
        borderRight:   "1px solid #1e2d3d",
        width:         w,
        whiteSpace:    "nowrap",
        textAlign:     "center",
      }}
    >
      {label}{k && sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}
    </th>
  );
}

export function TD({ children, align = "center", style = {} }) {
  return (
    <td
      style={{
        padding:        "6px 7px",
        textAlign:      align,
        borderBottom:   "1px solid #0f1923",
        borderRight:    "1px solid #0f1923",
        fontSize:       11,
        verticalAlign:  "middle",
        ...style,
      }}
    >
      {children}
    </td>
  );
}
