import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const TONES = {
  accent: "bg-accent/10 text-accent",
  red: "bg-accent/10 text-accent",
  green: "bg-success/10 text-success",
  amber: "bg-warning/15 text-[#b45309]",
  blue: "bg-info/10 text-info",
  dark: "bg-primary/[0.07] text-ink",
};

/** Percentage change between two numbers, or null when there is nothing to compare with. */
function change(trend) {
  if (!trend) return null;
  const current = Number(trend.current || 0);
  const previous = Number(trend.previous || 0);
  if (previous === 0) return current === 0 ? null : { pct: null, up: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), up: pct >= 0 };
}

/**
 * KPI tile: icon, label, big number and either a trend ("↑ 12% vs last month") or a hint.
 * Pass `to` to make the whole tile a link.
 */
export default function StatCard({ icon: Icon, label, value, hint, tone = "accent", trend, trendLabel = "vs last month", to }) {
  const diff = change(trend);
  const body = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${TONES[tone]}`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted">{label}</p>
        <p className="truncate font-display text-[22px] font-bold leading-snug text-ink" title={String(value)}>{value}</p>
        {diff ? (
          <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted">
            <span className={`inline-flex items-center font-semibold ${diff.up ? "text-success" : "text-accent"}`}>
              {diff.up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {diff.pct === null ? "new" : `${diff.pct}%`}
            </span>
            {trendLabel}
          </p>
        ) : (
          hint && <p className="line-clamp-2 text-xs text-muted">{hint}</p>
        )}
      </div>
    </>
  );
  const className = "card flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5";
  return to ? (
    <Link to={to} className={`${className} transition hover:border-accent/40 hover:shadow-md`}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
