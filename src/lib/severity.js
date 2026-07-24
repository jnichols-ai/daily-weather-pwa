// Heat-index severity thresholds and styling tokens, shared across page.js,
// WeatherMap, and WeatherTable. Thresholds match NWS Heat Index guidance.

export const SEV = {
  normal:  { label: "Normal",  bg: "#f2f1f0", color: "#6b6b6b", border: "#e4e2e0", dot: "#9ca3af" },
  caution: { label: "Caution", bg: "#fef9c3", color: "#854d0e", border: "#fde68a", dot: "#ca8a04" },
  danger:  { label: "Danger",  bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", dot: "#ef4444" },
  extreme: { label: "Extreme", bg: "#d42121", color: "#ffffff", border: "#b91c1c", dot: "#d42121" },
};

/** Returns one of "normal" | "caution" | "danger" | "extreme" for a heat index value. */
export function severityFor(hi) {
  const n = parseFloat(hi);
  if (!hi || isNaN(n)) return "normal";
  if (n >= 125) return "extreme";
  if (n >= 103) return "danger";
  if (n >= 90)  return "caution";
  return "normal";
}

/**
 * Adds severity fields to a row object. Works for both current-conditions rows
 * (where name = "City, ST") and history rows (where address = "City, ST").
 */
export function enrichRow(r) {
  const sevKey = severityFor(r.heatIndexF);
  const sev = SEV[sevKey];
  // address is "City, ST" for history; name is "City, ST" for current conditions.
  const source = r.address || r.name || "";
  const parts = source.split(", ");
  return {
    ...r,
    cityName: parts[0] || source,
    stateName: parts[1] || "",
    sevKey,
    sevLabel: sev.label,
    sevBg:    sev.bg,
    sevColor: sev.color,
    sevBorder: sev.border,
    sevDot:   sev.dot,
  };
}
