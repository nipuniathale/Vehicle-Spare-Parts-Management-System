import { Ban, Eye, Info, Plus, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { purchaseOrderApi, purchaseRequestApi } from "../../../api/endpoints";
import { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Input, Select, Textarea } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, toText, useForm } from "../../../hooks/useForm";
import { addDays, date, money } from "../../../utils/format";

export default function PurchaseOrders() {
  const { data, loading, error, reload } = useApi(purchaseOrderApi.list);
  const { data: requests, reload: reloadRequests } = useApi(purchaseRequestApi.list);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [params, setParams] = useSearchParams();
  const confirm = useConfirm();

  // "Create PO" button on the purchase requests page
  useEffect(() => {
    const requestId = params.get("fromRequest");
    const request = requests.find((r) => String(r.id) === requestId);
    if (request) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditing({ fromRequest: request });
      setParams({}, { replace: true });
    }
  }, [params, requests, setParams]);

  const refresh = () => {
    reload();
    reloadRequests();
  };

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete purchase order",
      message: `Delete PO-${row.id} (${money(row.totalAmount)})? Orders with goods receipts cannot be deleted. A linked purchase request goes back to APPROVED.`,
      action: async () => (await runAction(() => purchaseOrderApi.remove(row.id), "Purchase order deleted")) && refresh(),
    });

  const changeStatus = (row, status) =>
    confirm.ask({
      title: status === "CANCELLED" ? "Cancel purchase order" : "Re-open purchase order",
      message: status === "CANCELLED" ? `Cancel PO-${row.id}? The supplier will see it as cancelled.` : `Send PO-${row.id} to the supplier again?`,
      confirmLabel: status === "CANCELLED" ? "Cancel order" : "Re-open",
      variant: status === "CANCELLED" ? "danger" : "primary",
      action: async () => (await runAction(() => purchaseOrderApi.changeStatus(row.id, { status }), "Status updated")) && reload(),
    });

  const columns = [
    { key: "id", header: "PO", render: (r) => <span className="font-mono text-xs font-bold">PO-{r.id}</span> },
    { key: "supplierName", header: "Supplier", render: (r) => <div><p className="font-semibold">{r.supplierName}</p>{r.purchaseRequestId && <p className="text-xs text-muted">from PR-{r.purchaseRequestId}</p>}</div> },
    { key: "items", header: "Lines", render: (r) => r.items.length },
    { key: "totalAmount", header: "Total", render: (r) => <span className="font-semibold">{money(r.totalAmount)}</span> },
    { key: "expectedDeliveryDate", header: "Expected", render: (r) => date(r.expectedDeliveryDate) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <RowActions onEdit={r.status === "PENDING" ? () => setEditing(r) : undefined} onDelete={() => askDelete(r)}>
          <button type="button" title="View" onClick={() => setViewing(r)} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"><Eye className="h-4 w-4" /></button>
          {["PENDING", "CONFIRMED", "DECLINED", "SHIPPED"].includes(r.status) && (
            <button type="button" title="Cancel order" onClick={() => changeStatus(r, "CANCELLED")} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"><Ban className="h-4 w-4" /></button>
          )}
          {["CANCELLED", "DECLINED"].includes(r.status) && (
            <button type="button" title="Re-open" onClick={() => changeStatus(r, "PENDING")} className="rounded-lg p-2 text-muted hover:bg-accent/10 hover:text-accent"><RotateCcw className="h-4 w-4" /></button>
          )}
        </RowActions>
      ),
    },
  ];

  const approvedRequests = requests.filter((r) => r.status === "APPROVED");

  return (
    <>
      <PageHeader eyebrow="Procurement" title="Purchase Orders"
        subtitle="Orders sent to suppliers. Every order comes from a purchase request approved by the inventory manager; suppliers confirm and ship it from their portal. Deliveries are recorded on the Goods Receipts page."
        actions={
          <Button icon={Plus} disabled={approvedRequests.length === 0} onClick={() => setEditing({})}
            title={approvedRequests.length === 0 ? "No approved purchase requests to order" : undefined}>
            New purchase order{approvedRequests.length > 0 ? ` (${approvedRequests.length} approved)` : ""}
          </Button>
        } />
      {approvedRequests.length === 0 && (
        <p className="-mt-3 mb-4 flex items-center gap-2 text-xs text-muted">
          <Info className="h-4 w-4 text-info" /> A purchase order can only be created after the inventory manager approves a purchase request. Raise one on the Purchase Requests page.
        </p>
      )}
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      {editing && (
        <OrderForm order={editing} approvedRequests={approvedRequests} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
      {viewing && <OrderDetails order={viewing} onClose={() => setViewing(null)} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

/**
 * Create / edit a purchase order. The order always belongs to one approved purchase request:
 * supplier and part come from the request, the quantity can be lowered but not raised.
 */
function OrderForm({ order, approvedRequests, onClose, onSaved }) {
  const isNew = !order.id;
  const existing = order.items?.[0];
  const form = useForm({
    purchaseRequestId: order.purchaseRequestId ?? order.fromRequest?.id ?? "",
    quantity: existing?.quantity ?? order.fromRequest?.quantity ?? "",
    unitCost: existing?.unitCost ?? "",
    expectedDeliveryDate: order.expectedDeliveryDate || addDays(7),
    deliveryAddress: order.deliveryAddress || "AutoHub Warehouse, No. 25, Galle Road, Colombo 03",
    note: order.note || "",
  });
  const e = form.errors;
  const v = form.values;

  // the request this order is for (on edit it is no longer APPROVED but ORDERED, so fall back to the order itself)
  const request = approvedRequests.find((r) => String(r.id) === String(v.purchaseRequestId));
  const supplierId = request?.supplierId ?? order.supplierId;
  const supplierName = request?.supplierName ?? order.supplierName;
  const sparePartId = request?.sparePartId ?? existing?.sparePartId;
  const sparePartName = request?.sparePartName ?? existing?.sparePartName;
  const approvedQuantity = request?.quantity ?? order.approvedQuantity;
  const total = Number(v.quantity || 0) * Number(v.unitCost || 0);

  const pickRequest = (id) => {
    form.set("purchaseRequestId", id);
    const picked = approvedRequests.find((r) => String(r.id) === String(id));
    if (picked) form.set("quantity", picked.quantity);
  };

  const onSubmit = form.submit(async (values) => {
    const body = {
      supplierId,
      purchaseRequestId: toNumber(values.purchaseRequestId),
      expectedDeliveryDate: toText(values.expectedDeliveryDate),
      deliveryAddress: values.deliveryAddress,
      note: toText(values.note),
      items: sparePartId ? [{ sparePartId, quantity: toNumber(values.quantity), unitCost: toNumber(values.unitCost) }] : [],
    };
    await (isNew ? purchaseOrderApi.create(body) : purchaseOrderApi.update(order.id, body));
    onSaved();
    onClose();
  }, isNew ? "Purchase order created" : "Purchase order updated");

  return (
    <Modal open size="lg" title={isNew ? "New purchase order" : `Edit PO-${order.id}`} onClose={onClose}
      footer={<><span className="mr-auto self-center text-sm font-semibold">Total: {money(total)}</span><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="po-form" loading={form.saving}>Save</Button></>}>
      <form id="po-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {isNew ? (
          <Field label="Approved purchase request" error={e.purchaseRequestId} required className="sm:col-span-2">
            <Select value={v.purchaseRequestId} onChange={(ev) => pickRequest(ev.target.value)} placeholder="Select an approved request"
              options={approvedRequests.map((r) => ({ value: r.id, label: `PR-${r.id}: ${r.quantity} × ${r.sparePartName} (${r.supplierName})` }))} />
          </Field>
        ) : (
          <p className="text-sm text-muted sm:col-span-2">For purchase request <span className="font-semibold text-ink">PR-{order.purchaseRequestId}</span></p>
        )}

        {sparePartName && (
          <div className="grid gap-3 rounded-xl bg-surface p-4 text-sm sm:col-span-2 sm:grid-cols-3">
            <div><p className="text-xs text-muted">Supplier</p><p className="font-semibold">{supplierName}</p></div>
            <div><p className="text-xs text-muted">Spare part</p><p className="font-semibold">{sparePartName}</p></div>
            <div><p className="text-xs text-muted">Approved quantity</p><p className="font-semibold">{approvedQuantity ?? "—"}</p></div>
          </div>
        )}

        <Field label="Quantity to order" error={e.quantity || e["items[0].quantity"] || e.items} required hint={approvedQuantity ? `Up to ${approvedQuantity}` : undefined}>
          <Input type="number" min="1" max={approvedQuantity} {...form.bind("quantity")} error={e.quantity} />
        </Field>
        <Field label="Unit cost (Rs.)" error={e.unitCost || e["items[0].unitCost"]} required>
          <Input type="number" min="0" step="0.01" {...form.bind("unitCost")} error={e.unitCost} placeholder="Unit cost" />
        </Field>
        <Field label="Expected delivery" error={e.expectedDeliveryDate}><Input type="date" {...form.bind("expectedDeliveryDate")} error={e.expectedDeliveryDate} /></Field>
        <Field label="Delivery address" error={e.deliveryAddress} required><Input {...form.bind("deliveryAddress")} error={e.deliveryAddress} /></Field>
        <Field label="Note to supplier" error={e.note} className="sm:col-span-2"><Textarea rows={2} {...form.bind("note")} error={e.note} /></Field>
      </form>
    </Modal>
  );
}

export function OrderDetails({ order, onClose }) {
  return (
    <Modal open size="lg" title={`PO-${order.id} · ${order.supplierName}`} subtitle={`Created ${date(order.createdAt)}${order.createdBy ? ` by ${order.createdBy}` : ""}`} onClose={onClose}>
      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <div><p className="text-xs text-muted">Status</p><StatusBadge status={order.status} /></div>
        <div><p className="text-xs text-muted">Expected</p><p className="font-semibold">{date(order.expectedDeliveryDate)}</p></div>
        <div><p className="text-xs text-muted">Deliver to</p><p className="font-semibold">{order.deliveryAddress}</p></div>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-[11px] uppercase text-muted">
          <tr><th className="px-3 py-2">Part</th><th className="px-3 py-2">Ordered</th><th className="px-3 py-2">Received</th><th className="px-3 py-2">Unit cost</th><th className="px-3 py-2 text-right">Subtotal</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {order.items.map((i) => (
            <tr key={i.id}>
              <td className="px-3 py-2"><p className="font-semibold">{i.sparePartName}</p><p className="text-xs text-muted">{i.sparePartSku}</p></td>
              <td className="px-3 py-2">{i.quantity}</td>
              <td className="px-3 py-2">{i.receivedQuantity}</td>
              <td className="px-3 py-2">{money(i.unitCost)}</td>
              <td className="px-3 py-2 text-right font-semibold">{money(i.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-right font-display text-lg font-bold">{money(order.totalAmount)}</p>
      {(order.note || order.supplierNote) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {order.note && <div className="rounded-xl bg-surface p-3 text-sm"><p className="text-xs font-bold text-muted">Our note</p>{order.note}</div>}
          {order.supplierNote && <div className="rounded-xl bg-accent/5 p-3 text-sm"><p className="text-xs font-bold text-accent">Supplier note</p>{order.supplierNote}</div>}
        </div>
      )}
    </Modal>
  );
}
