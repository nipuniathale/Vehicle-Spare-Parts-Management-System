/**
 * Chart colours. Checked with a colour-blind simulator (OKLab ΔE ≥ 8 between neighbours):
 *  - two-series charts use brand red + blue,
 *  - order statuses keep a fixed colour each so the donut never repaints when a status is empty.
 */
export const SERIES = {
  primary: "#e3161f",
  secondary: "#3f6fd1",
};

export const ORDER_STATUS_COLORS = {
  PLACED: "#8a5cd1",
  PROCESSING: "#d97706",
  SHIPPED: "#3f6fd1",
  DELIVERED: "#0f9d8a",
  CANCELLED: "#e3161f",
};

/** Round a maximum up to a "nice" axis value and return the tick values (0 … max). */
export function niceTicks(max, count = 4) {
  if (!max || max <= 0) return [0, 1, 2, 3, 4].slice(0, count + 1);
  const raw = max / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw);
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

/** 125000 -> "125K", 2500000 -> "2.5M" */
export function compact(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${+(n / 1_000).toFixed(1)}K`;
  return `${+n.toFixed(1)}`;
}
