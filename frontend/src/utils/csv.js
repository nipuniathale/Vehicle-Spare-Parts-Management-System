/** Downloads rows as a CSV file. columns: [{ header, value: (row) => text/number }] */
export function downloadCsv(filename, columns, rows) {
  const escape = (v) => {
    const text = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const lines = [columns.map((c) => escape(c.header)).join(","), ...rows.map((r) => columns.map((c) => escape(c.value(r))).join(","))];
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
