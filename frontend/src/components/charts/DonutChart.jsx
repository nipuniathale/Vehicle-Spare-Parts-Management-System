import { useState } from "react";
import { label as prettyLabel } from "../../utils/format";

/**
 * Part-to-whole donut with a legend that always shows count and share (so colour is never the only cue).
 * segments: [{ key, label, value, color }]
 */
export default function DonutChart({ segments, centerLabel = "Total", size = 160 }) {
  const [active, setActive] = useState(null);
  const total = segments.reduce((sum, s) => sum + Number(s.value), 0);
  const radius = size / 2 - 12;
  const stroke = 22;
  const circumference = 2 * Math.PI * radius;

  // each arc starts where the previous one ended
  const arcs = segments
    .filter((s) => s.value > 0)
    .reduce((list, s) => {
      const previous = list[list.length - 1];
      const offset = previous ? previous.offset + previous.length : 0;
      return [...list, { ...s, length: (s.value / total) * circumference, offset }];
    }, []);

  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-5 @[380px]:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`${centerLabel} by status`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f0f0f2" strokeWidth={stroke} />
          {arcs.map((a) => (
            <circle
              key={a.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={a.color}
              strokeWidth={active === a.key ? stroke + 6 : stroke}
              strokeDasharray={`${Math.max(a.length - (arcs.length > 1 ? 2 : 0), 0)} ${circumference}`}
              strokeDashoffset={-a.offset}
              onMouseEnter={() => setActive(a.key)}
              onMouseLeave={() => setActive(null)}
              className="cursor-pointer transition-[stroke-width]"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-bold text-ink">{total}</span>
          <span className="text-xs text-muted">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2.5 text-sm">
        {segments.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setActive(s.key)}
            onMouseLeave={() => setActive(null)}
            className={`flex items-center gap-2.5 rounded-md px-1 ${active === s.key ? "bg-surface" : ""}`}
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1 text-ink">{s.label || prettyLabel(s.key)}</span>
            <span className="font-semibold text-ink">{s.value}</span>
            <span className="w-10 text-right text-xs text-muted">{total ? Math.round((s.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
