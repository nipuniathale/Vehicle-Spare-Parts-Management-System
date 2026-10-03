import { Check, Clock, Plus, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { purchaseRequestApi, sparePartApi, supplierApi } from "../../../api/endpoints";
import { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Input, Select, Textarea } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import { useAuth } from "../../../context/AuthContext";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, toText, useForm } from "../../../hooks/useForm";
import { date } from "../../../utils/format";

/**
 * Purchase requests.
 * The procurement officer raises requests; the INVENTORY MANAGER approves or rejects them
 * (a person never decides on a request they raised). Only an approved request can become a purchase order.
 */
export default function PurchaseRequests() {
  const { hasRole } = useAuth();
  const canReview = hasRole("INVENTORY_MANAGER");
  const canRaise = hasRole("PROCUREMENT_OFFICER");
  const canOrder = hasRole("PROCUREMENT_OFFICER");
  const [filter, setFilter] = useState(canReview ? "PENDING" : "ALL");
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApi(purchaseRequestApi.list);
  const { data: parts } = useApi(sparePartApi.list);
  const { data: suppliers } = useApi(supplierApi.list);
  const [params, setParams] = useSearchParams();
  // "Reorder" on the dashboard opens a new request for that part: /purchase-requests?part=12
  const [editing, setEditing] = useState(() =>
    params.get("part") ? { sparePartId: Number(params.get("part")), reason: "Below reorder level" } : null);
  const closeForm = () => {
    setEditing(null);
    if (params.has("part")) setParams({}, { replace: true });
  };
  const [deciding, setDeciding] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete purchase request",
      message: `Delete request #${row.id} for ${row.quantity} × ${row.sparePartName}?`,
      action: async () => (await runAction(() => purchaseRequestApi.remove(row.id), "Request deleted")) && reload(),
    });

  const columns = [
    { key: "id", header: "#", render: (r) => <span className="font-mono text-xs">PR-{r.id}</span> },
    { key: "sparePartName", header: "Spare part", render: (r) => <div><p className="font-semibold">{r.sparePartName}</p><p className="text-xs text-muted">{r.sparePartSku}</p></div> },
    { key: "quantity", header: "Qty" },
    { key: "supplierName", header: "Supplier" },
    { key: "requestedBy", header: "Requested by", render: (r) => <div className="text-xs"><p>{r.requestedBy || "—"}</p><p className="text-muted">{date(r.createdAt)}</p></div> },
    { key: "status", header: "Status", render: (r) => <div><StatusBadge status={r.status} />{r.reviewNote && <p className="mt-1 max-w-48 text-xs text-muted">{r.reviewNote}</p>}</div> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <RowActions onEdit={canRaise && r.status === "PENDING" ? () => setEditing(r) : undefined} onDelete={canRaise ? () => askDelete(r) : undefined}>
          {canReview && r.status === "PENDING" && (
            <>
              <Button size="sm" variant="success" icon={Check} onClick={() => setDeciding({ row: r, approve: true })}>Approve</Button>
              <Button size="sm" variant="secondary" icon={X} onClick={() => setDeciding({ row: r, approve: false })}>Reject</Button>
            </>
          )}
          {!canReview && r.status === "PENDING" && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted"><Clock className="h-3.5 w-3.5" /> Awaiting inventory manager approval</span>
          )}
          {canOrder && r.status === "APPROVED" && (
            <Button size="sm" icon={ShoppingBag} onClick={() => navigate(`/dashboard/purchase-orders?fromRequest=${r.id}`)}>Create PO</Button>
          )}
        </RowActions>
      ),
    },
  ];

  const rows = filter === "ALL" ? data : data.filter((r) => r.status === filter);
  const pending = data.filter((r) => r.status === "PENDING").length;

  return (
    <>
      <PageHeader eyebrow="Procurement" title="Purchase Requests"
        subtitle={canReview
          ? "Requests raised by procurement. Approve them so a purchase order can be created, or reject them with a reason."
          : "Raise a request to buy stock. The inventory manager approves it, then you can create the purchase order."}
        actions={canRaise && <Button icon={Plus} onClick={() => setEditing({})}>New request</Button>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {["PENDING", "APPROVED", "ORDERED", "REJECTED", "ALL"].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${filter === f ? "bg-primary text-white" : "bg-white text-muted ring-1 ring-line hover:text-ink"}`}>
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            {f === "PENDING" && pending > 0 && <span className="ml-1.5 rounded-full bg-accent px-1.5 text-[10px] text-white">{pending}</span>}
          </button>
        ))}
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} error={error}
        emptyText={filter === "PENDING" ? "No requests are waiting for approval." : "No purchase requests here."} />
      {editing && <RequestForm request={editing} parts={parts} suppliers={suppliers.filter((s) => s.active)} onClose={closeForm} onSaved={reload} />}
      {deciding && <DecisionForm {...deciding} onClose={() => setDeciding(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function RequestForm({ request, parts, suppliers, onClose, onSaved }) {
  const isNew = !request.id;
  const form = useForm({ sparePartId: request.sparePartId ?? "", supplierId: request.supplierId ?? "", quantity: request.quantity ?? 10, reason: request.reason || "" });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = { sparePartId: toNumber(v.sparePartId), supplierId: toNumber(v.supplierId), quantity: toNumber(v.quantity), reason: toText(v.reason) };
    await (isNew ? purchaseRequestApi.create(body) : purchaseRequestApi.update(request.id, body));
    onSaved();
    onClose();
  }, "Purchase request saved");

  return (
    <Modal open title={isNew ? "New purchase request" : `Edit PR-${request.id}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="pr-form" loading={form.saving}>Save</Button></>}>
      <form id="pr-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Spare part" error={e.sparePartId} required className="sm:col-span-2">
          <Select {...form.bind("sparePartId")} error={e.sparePartId} placeholder="Select part"
            options={parts.map((p) => ({ value: p.id, label: `${p.name} (${p.sku}) - stock ${p.stockQuantity ?? 0}` }))} />
        </Field>
        <Field label="Supplier" error={e.supplierId} required>
          <Select {...form.bind("supplierId")} error={e.supplierId} placeholder="Select supplier" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        </Field>
        <Field label="Quantity" error={e.quantity} required><Input type="number" min="1" {...form.bind("quantity")} error={e.quantity} /></Field>
        <Field label="Reason" error={e.reason} className="sm:col-span-2"><Textarea rows={2} {...form.bind("reason")} error={e.reason} placeholder="e.g. Below reorder level" /></Field>
      </form>
    </Modal>
  );
}

export function DecisionForm({ row, approve, onClose, onSaved }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const ok = await runAction(
      () => (approve ? purchaseRequestApi.approve(row.id, note) : purchaseRequestApi.reject(row.id, note)),
      approve ? "Request approved" : "Request rejected"
    );
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal open size="sm" title={`${approve ? "Approve" : "Reject"} PR-${row.id}`} subtitle={`${row.quantity} × ${row.sparePartName} from ${row.supplierName}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant={approve ? "success" : "danger"} onClick={save} loading={saving}>{approve ? "Approve" : "Reject"}</Button></>}>
      <Field label={approve ? "Note (optional)" : "Reason for rejecting"} required={!approve}>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}
