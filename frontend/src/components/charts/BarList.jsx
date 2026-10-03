import { SERIES } from "./palette";

/**
 * Horizontal bars with the value printed at the end (ranked lists such as "top categories").
 * data: [{ label, value }]
 */
export default function BarList({ data, color = SERIES.primary, format = (v) => v, empty = "No data yet." }) {
  const max = Math.max(...data.map((d) => Number(d.value)), 0);
  if (data.length === 0 || max === 0) return <p className="py-10 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="space-y-3.5">
      {data.map((d) => (
        <li key={d.label} className="group grid grid-cols-[minmax(90px,140px)_1fr_auto] items-center gap-3 text-sm" title={`${d.label}: ${format(d.value)}`}>
          <span className="truncate text-ink">{d.label}</span>
          <span className="h-2.5 overflow-hidden rounded-full bg-[#f0f0f2]">
            <span
              className="block h-full rounded-full transition-opacity group-hover:opacity-80"
              style={{ width: `${Number(d.value) > 0 ? Math.max((Number(d.value) / max) * 100, 2) : 0}%`, background: color }}
            />
          </span>
          <span className="min-w-10 text-right font-semibold text-ink">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}
