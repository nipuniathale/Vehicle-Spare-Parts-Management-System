/** Floating tooltip positioned inside a relative chart container. */
export default function Tooltip({ x, y, title, rows, width }) {
  const left = Math.min(Math.max(x, 70), width - 70);
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left, top: y - 10 }}
    >
      <p className="mb-0.5 font-semibold text-muted">{title}</p>
      {rows.map((row) => (
        <p key={row.label} className="flex items-center gap-2 whitespace-nowrap font-semibold text-ink">
          {row.color && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: row.color }} />}
          {row.label && <span className="font-medium text-muted">{row.label}</span>}
          <span>{row.value}</span>
        </p>
      ))}
    </div>
  );
}
