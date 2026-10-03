import { Download, RefreshCw } from "lucide-react";
import { useCallback, useState } from "react";
import { activityLogApi } from "../../../api/endpoints";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/DataTable";
import PageHeader from "../../../components/ui/PageHeader";
import { useApi } from "../../../hooks/useApi";
import { downloadCsv } from "../../../utils/csv";
import { addDays, dateTime, label, ROLE_LABELS, today } from "../../../utils/format";

const TONES = {
  LOGIN: "blue", REGISTER: "blue", LOGIN_FAILED: "red",
  CREATE: "green", RECEIVE: "green", PAYMENT: "green", APPROVE: "green", COMPLETE: "green",
  UPDATE: "amber", STATUS_CHANGE: "amber", DECISION: "amber", PASSWORD_CHANGE: "amber",
  DELETE: "red", REJECT: "red", CANCEL: "red",
};

/** Who did what and when - log-ins, creates, updates, deletes, approvals, payments ... (newest first). */
export default function ActivityLog() {
  const [filters, setFilters] = useState({ module: "", action: "", q: "", from: addDays(-6), to: today() });
  const [applied, setApplied] = useState(filters);
  const loader = useCallback(() => activityLogApi.search(clean(applied)), [applied]);
  const { data, loading, error, reload } = useApi(loader);
  const { data: lists } = useApi(activityLogApi.filters, { modules: [], actions: [] });

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const apply = (e) => {
    e?.preventDefault();
    setApplied({ ...filters });
  };

  const columns = [
    { key: "createdAt", header: "Date & time", render: (a) => <span className="whitespace-nowrap text-xs">{dateTime(a.createdAt)}</span> },
    {
      key: "userName", header: "User", search: (a) => `${a.userName || ""} ${a.userEmail || ""}`,
      render: (a) => (
        <div className="text-xs">
          <p className="font-semibold text-ink">{a.userName || "—"}</p>
          <p className="text-muted">{a.userEmail}{a.userRole ? ` · ${ROLE_LABELS[a.userRole] || a.userRole}` : ""}</p>
        </div>
      ),
    },
    { key: "action", header: "Action", render: (a) => <Badge tone={TONES[a.action] || "gray"}>{label(a.action)}</Badge> },
    { key: "module", header: "Module", render: (a) => <span className="text-xs font-semibold">{a.module}</span> },
    { key: "description", header: "Details", render: (a) => <span className="text-sm">{a.description}</span> },
    { key: "ipAddress", header: "IP", render: (a) => <span className="font-mono text-[11px] text-muted">{a.ipAddress || ""}</span> },
  ];

  const exportCsv = () => downloadCsv(`activity-log-${today()}.csv`, [
    { header: "Date & time", value: (a) => a.createdAt },
    { header: "User", value: (a) => a.userName },
    { header: "Email", value: (a) => a.userEmail },
    { header: "Role", value: (a) => a.userRole },
    { header: "Action", value: (a) => a.action },
    { header: "Module", value: (a) => a.module },
    { header: "Record id", value: (a) => a.entityId },
    { header: "Details", value: (a) => a.description },
    { header: "IP", value: (a) => a.ipAddress },
  ], data);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Activity Log"
        subtitle="Important actions in the system: log-ins, new records, changes, deletions, approvals, orders and payments. At most 500 rows per search."
        actions={<>
          <Button variant="secondary" icon={RefreshCw} onClick={reload}>Refresh</Button>
          <Button variant="secondary" icon={Download} onClick={exportCsv} disabled={!data.length}>Export CSV</Button>
        </>} />

      <form onSubmit={apply} className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-xs font-semibold lg:col-span-2">User or text
          <input className="input mt-1" value={filters.q} onChange={set("q")} placeholder="Name, email or details" />
        </label>
        <label className="text-xs font-semibold">Module
          <select className="input mt-1" value={filters.module} onChange={set("module")}>
            <option value="">All modules</option>
            {lists.modules.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">Action
          <select className="input mt-1" value={filters.action} onChange={set("action")}>
            <option value="">All actions</option>
            {lists.actions.map((a) => <option key={a} value={a}>{label(a)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">From
          <input type="date" className="input mt-1" value={filters.from} max={filters.to} onChange={set("from")} />
        </label>
        <label className="text-xs font-semibold">To
          <input type="date" className="input mt-1" value={filters.to} min={filters.from} max={today()} onChange={set("to")} />
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit">Search</Button>
          <Button variant="ghost" onClick={() => {
            const reset = { module: "", action: "", q: "", from: addDays(-6), to: today() };
            setFilters(reset);
            setApplied(reset);
          }}>Reset</Button>
        </div>
      </form>

      <DataTable columns={columns} rows={data} loading={loading} error={error} emptyText="No activity for these filters." searchPlaceholder="Filter these rows" />
    </>
  );
}

function clean(f) {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== null && v !== undefined));
}
