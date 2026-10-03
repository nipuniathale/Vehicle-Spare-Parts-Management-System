import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import Spinner from "./Spinner";

/**
 * columns: [{ key, header, render?(row), className?, search?: (row) => string }]
 */
export default function DataTable({ columns, rows, loading, error, emptyText = "No records yet.", searchPlaceholder, toolbar, rowKey = "id" }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      columns.some((col) => {
        const value = col.search ? col.search(row) : row[col.key];
        return value !== null && value !== undefined && String(value).toLowerCase().includes(q);
      })
    );
  }, [rows, columns, query]);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder || "Search..."}
            className="input pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted">
            {filtered.length} of {rows.length}
          </span>
          {toolbar}
        </div>
      </div>

      {loading && rows.length === 0 ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : error ? (
        <p className="px-6 py-12 text-center text-sm text-danger">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="px-6 py-14 text-center text-sm text-muted">{rows.length ? "Nothing matches your search." : emptyText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-surface text-[11px] font-bold uppercase tracking-wider text-muted">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 ${col.className || ""}`}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((row) => (
                <tr key={row[rowKey]} className="transition hover:bg-surface/60">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 align-middle ${col.className || ""}`}>
                      {col.render ? col.render(row) : row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
