import { useState } from "react";
import { compact, niceTicks, SERIES } from "./palette";
import Tooltip from "./Tooltip";
import { useWidth } from "./useSize";

/**
 * Single-series area/line chart with a hover crosshair.
 * data: [{ label, value }]
 */
export default function LineChart({ data, height = 230, color = SERIES.primary, format = compact, name = "Value" }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);

  const pad = { top: 16, right: 16, bottom: 28, left: 48 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(...data.map((d) => Number(d.value)), 0));
  const max = ticks[ticks.length - 1] || 1;

  // with many points (e.g. 30 days) only every n-th label is printed so they do not overlap
  const labelStep = Math.max(1, Math.ceil(data.length / Math.max(1, Math.floor(w / 64))));
  const x = (i) => pad.left + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
  const y = (v) => pad.top + h - (Number(v) / max) * h;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i)},${y(d.value)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${pad.top + h} L${x(0)},${pad.top + h} Z`;
  const gradientId = `area-${color.replace("#", "")}`;

  const onMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - box.left;
    const step = data.length > 1 ? w / (data.length - 1) : w;
    const index = Math.round((px - pad.left) / step);
    setHover(Math.min(Math.max(index, 0), data.length - 1));
  };

  return (
    <div ref={ref} className="relative w-full min-w-0">
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`${name} chart`}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={pad.left + w} y1={y(t)} y2={y(t)} stroke="#ececef" />
            <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">{compact(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (
          i % labelStep === 0 && (
            <text key={d.label} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">{d.label}</text>
          )
        ))}
        <path d={area} fill={`url(#${gradientId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.top} y2={pad.top + h} stroke="#9ca3af" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].value)} r="5" fill={color} stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <Tooltip x={x(hover)} y={y(data[hover].value)} width={width} title={data[hover].label} rows={[{ label: name, value: format(data[hover].value) }]} />
      )}
    </div>
  );
}
