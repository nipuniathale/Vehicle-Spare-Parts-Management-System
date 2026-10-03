import { useState } from "react";
import { compact, niceTicks } from "./palette";
import Tooltip from "./Tooltip";
import { useWidth } from "./useSize";

/**
 * Vertical (grouped) column chart.
 * labels: ["Week 1", …]; series: [{ name, color, values: [..] }]
 * A legend is shown for two or more series.
 */
export default function ColumnChart({ labels, series, height = 220, format = compact }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);

  const pad = { top: 12, right: 8, bottom: 30, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(...series.flatMap((s) => s.values.map(Number)), 0));
  const max = ticks[ticks.length - 1] || 1;

  const group = w / labels.length;
  // with many bars (e.g. 30 days) only every n-th label is printed so they do not overlap
  const labelStep = Math.max(1, Math.ceil(labels.length / Math.max(1, Math.floor(w / 64))));
  const barWidth = Math.min(28, (group * 0.6) / series.length);
  const gap = 2;
  const groupWidth = series.length * barWidth + (series.length - 1) * gap;
  const y = (v) => pad.top + h - (Number(v) / max) * h;

  return (
    <div ref={ref} className="relative w-full min-w-0">
      {series.length > 1 && (
        <div className="mb-2 flex justify-end gap-4 text-xs text-muted">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} /> {s.name}
            </span>
          ))}
        </div>
      )}
      <svg width={width} height={height} role="img" aria-label={series.map((s) => s.name).join(" and ")} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={pad.left + w} y1={y(t)} y2={y(t)} stroke="#ececef" />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">{compact(t)}</text>
          </g>
        ))}
        {labels.map((label, i) => {
          const start = pad.left + i * group + (group - groupWidth) / 2;
          return (
            <g key={label} onMouseEnter={() => setHover(i)}>
              <rect x={pad.left + i * group} y={pad.top} width={group} height={h} fill={hover === i ? "#f6f6f8" : "transparent"} />
              {series.map((s, j) => {
                const value = Number(s.values[i] || 0);
                const top = y(value);
                const barHeight = pad.top + h - top;
                const x = start + j * (barWidth + gap);
                const r = Math.min(4, barHeight);
                return (
                  <path
                    key={s.name}
                    d={`M${x},${pad.top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barWidth - r} Q${x + barWidth},${top} ${x + barWidth},${top + r} V${pad.top + h} Z`}
                    fill={s.color}
                  />
                );
              })}
              {i % labelStep === 0 && <text x={pad.left + i * group + group / 2} y={height - 10} textAnchor="middle" className="fill-muted text-[11px]">{label}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <Tooltip
          x={pad.left + hover * group + group / 2}
          y={y(Math.max(...series.map((s) => Number(s.values[hover] || 0))))}
          width={width}
          title={labels[hover]}
          rows={series.map((s) => ({ label: s.name, value: format(s.values[hover]), color: s.color }))}
        />
      )}
    </div>
  );
}
