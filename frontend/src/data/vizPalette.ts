/** Shared visualization colors for charts, sparklines, and severity maps. */
export const viz = {
  azure: "#4F8CFF",
  indigo: "#7B6CFF",
  teal: "#20E3C2",
  mint: "#3DDC97",
  amber: "#FFB020",
  coral: "#FF5C7A",
  orchid: "#C77DFF",
  sky: "#5CC8FF",
  lime: "#A8E63D",
  grid: "#2A3A52",
  axis: "#8FA3BF",
  tooltipBg: "#0E1624",
  tooltipBorder: "#31445F",
} as const;

export const series = [viz.teal, viz.azure, viz.amber, viz.mint, viz.coral, viz.orchid, viz.sky, viz.lime];

export const severityColors: Record<string, string> = {
  INFO: viz.azure,
  WARNING: viz.amber,
  ERROR: viz.coral,
  CRITICAL: viz.orchid,
};

export const statusColors: Record<string, string> = {
  "2xx": viz.mint,
  "4xx": viz.amber,
  "5xx": viz.coral,
};

export const chartTooltipStyle = {
  background: viz.tooltipBg,
  border: `1px solid ${viz.tooltipBorder}`,
  borderRadius: "12px",
  color: "#F4F8FF",
  boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
};
