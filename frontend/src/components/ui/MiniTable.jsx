import { Empty } from "./Panel";

/** Compact read-only table for dashboard panels. columns: [{ header, render, className }] */
export default function MiniTable({ columns, rows, empty = "Nothing to show.", rowKey = "id" }) {
  if (!rows || rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-y border-line bg-surface/60 text-left text-xs font-semibold text-muted">
            {columns.map((c) => (
              <th key={c.header} className={`whitespace-nowrap px-5 py-2.5 ${c.className || ""}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row) => (
            <tr key={row[rowKey]} className="hover:bg-surface/50">
              {columns.map((c) => (
                <td key={c.header} className={`px-5 py-3 align-middle ${c.className || ""}`}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
