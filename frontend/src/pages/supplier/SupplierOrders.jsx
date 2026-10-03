import { CheckCircle2, Eye, Truck, XCircle } from "lucide-react";
import { useState } from "react";
import { purchaseOrderApi } from "../../api/endpoints";
import { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import DataTable from "../../components/ui/DataTable";
import Field, { Textarea } from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import { runAction, useApi } from "../../hooks/useApi";
import { date, money } from "../../utils/format";
import { OrderDetails } from "../dashboard/procurement/PurchaseOrders";

/** Supplier portal: purchase orders sent to the logged-in supplier (confirm / decline / ship). */
export default function SupplierOrders() {
  const { data, loading, error, reload } = useApi(purchaseOrderApi.mine);
  const [viewing, setViewing] = useState(null);
  const [responding, setResponding] = useState(null);

  const columns = [
    { key: "id", header: "PO", render: (r) => <span className="font-mono text-xs font-bold">PO-{r.id}</span> },
    { key: "createdAt", header: "Received", render: (r) => date(r.createdAt) },
    { key: "items", header: "Items", render: (r) => <span className="text-xs">{r.items.map((i) => `${i.quantity} × ${i.sparePartName}`).join(", ")}</span> },
    { key: "totalAmount", header: "Value", render: (r) => <span className="font-semibold">{money(r.totalAmount)}</span> },
    { key: "expectedDeliveryDate", header: "Needed by", render: (r) => date(r.expectedDeliveryDate) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button type="button" title="View" onClick={() => setViewing(r)} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"><Eye className="h-4 w-4" /></button>
          {r.status === "PENDING" && (
            <>
              <Button size="sm" variant="success" icon={CheckCircle2} onClick={() => setResponding({ order: r, status: "CONFIRMED" })}>Confirm</Button>
              <Button size="sm" variant="secondary" icon={XCircle} onClick={() => setResponding({ order: r, status: "DECLINED" })}>Decline</Button>
            </>
          )}
          {r.status === "CONFIRMED" && <Button size="sm" icon={Truck} onClick={() => setResponding({ order: r, status: "SHIPPED" })}>Mark shipped</Button>}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Supplier portal" title="Purchase Orders" subtitle="Purchase orders AutoHub Lanka has sent to your company. Confirm or decline new orders and mark them shipped." />
      <DataTable columns={columns} rows={data} loading={loading} error={error} emptyText="No purchase orders yet." />
      {viewing && <OrderDetails order={viewing} onClose={() => setViewing(null)} />}
      {responding && <RespondForm {...responding} onClose={() => setResponding(null)} onSaved={reload} />}
    </>
  );
}

function RespondForm({ order, status, onClose, onSaved }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const titles = { CONFIRMED: "Confirm order", DECLINED: "Decline order", SHIPPED: "Mark as shipped" };

  const save = async () => {
    setSaving(true);
    const ok = await runAction(() => purchaseOrderApi.supplierStatus(order.id, { status, note }), "Order updated");
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal open size="sm" title={`${titles[status]} PO-${order.id}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Close</Button><Button variant={status === "DECLINED" ? "danger" : "primary"} onClick={save} loading={saving}>{titles[status]}</Button></>}>
      <Field label={status === "DECLINED" ? "Reason (required)" : "Message to AutoHub (optional)"}>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={status === "SHIPPED" ? "e.g. Dispatched via courier, tracking #123" : ""} />
      </Field>
    </Modal>
  );
}
