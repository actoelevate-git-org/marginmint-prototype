/**
 * Chart palette. Series hues were run through a CVD validator against the white
 * card surface: lightness band, chroma floor and contrast pass; the worst
 * all-pairs CVD separation (orange↔green, ΔE 7.4) sits in the "secondary encoding
 * required" band, so every multi-series chart ships a legend, hover tooltips and a
 * table view. Status colours (green/red/amber) are reserved for state and carry
 * text labels.
 */
export const CHART_COLORS = {
  netSales: "#2A78D6",
  grossProfit: "#EB6834",
  netProfit: "#16A34A",
  deduction: "#94A3B8",
  loss: "#DC2626",
  grid: "#EEF0F3",
  axis: "#6B7280",
  baseline: "#CBD5E1",
} as const;

/**
 * Compact axis labels (₹12K, ₹3.4L, ₹1.2Cr). Display-only formatting of
 * already-computed chart values; never used for financial calculation.
 */
export function compactInrTick(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const fmt = (n: number, unit: string) => `${sign}₹${n >= 100 ? n.toFixed(0) : Number(n.toFixed(1))}${unit}`;
  if (abs >= 1e7) return fmt(abs / 1e7, "Cr");
  if (abs >= 1e5) return fmt(abs / 1e5, "L");
  if (abs >= 1e3) return fmt(abs / 1e3, "K");
  return `${sign}₹${abs.toFixed(0)}`;
}
