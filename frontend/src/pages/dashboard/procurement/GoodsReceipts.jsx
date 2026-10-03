import { ArrowLeft, PackageCheck, Truck } from "lucide-react";
import { useState } from "react";
import { goodsReceiptApi } from "../../../api/endpoints";
import { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Input } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import Panel from "../../../components/ui/Panel";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, toText, useForm } from "../../../hooks/useForm";
import { date, dateTime } from "../../../utils/format";

/**
 * Goods receipts (GRN) - the warehouse workflow for supplier deliveries:
 * 1. pick a purchase order that is waiting for goods (confirmed / shipped / partly received)
 * 2. enter how many units of each line arrived -> stock goes up, the order becomes PARTIALLY_RECEIVED / RECEIVED.
 */
export default function GoodsReceipts() {
  const { data, loading, error, reload } = useApi(goodsReceiptApi.list);
  const waiting = useApi(goodsReceiptApi.receivableOrders);
  const [receiving, setReceiving] = useState(null); // {} = choose order, {order} = enter quantities
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const refresh = () => {
    reload();
    waiting.reload();
  };

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete goods receipt",
      message: `Delete GRN-${row.id}? ${row.receivedQuantity} × ${row.sparePartName} will be removed from stock again.`,
      action: async () => (await runAction(() => goodsReceiptApi.remove(row.id), "Goods receipt deleted and stock reversed")) && refresh(),
    });

  const columns = [
    { key: "id", header: "GRN", render: (r) => <span className="font-mono text-xs font-bold">GRN-{r.id}</span> },
    { key: "createdAt", header: "Received", render: (r) => <div className="text-xs"><p>{dateTime(r.createdAt)}</p><p className="text-muted">{r.receivedBy || ""}</p></div> },
    { key: "purchaseOrderId", header: "PO", render: (r) => <div><p className="font-mono text-xs">PO-{r.purchaseOrderId}</p><p className="text-xs text-muted">{r.supplierName}</p></div> },
    { key: "sparePartName", header: "Spare part", render: (r) => <div><p className="font-semibold">{r.sparePartName}</p><p className="text-xs text-muted">{r.sparePartSku}</p></div> },
    { key: "receivedQuantity", header: "Qty received", render: (r) => <span className="font-bold text-success">+{r.receivedQuantity}</span> },
    { key: "lineReceivedTotal", header: "Line progress", render: (r) => `${r.lineReceivedTotal} / ${r.orderedQuantity}` },
    { key: "note", header: "Note" },
    { key: "actions", header: "", className: "text-right", render: (r) => <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Procurement" title="Goods Receipts (GRN)"
        subtitle="Record deliveries from suppliers against their purchase order. Each receipt adds stock through a PURCHASE movement."
        actions={<Button icon={PackageCheck} onClick={() => setReceiving({})} disabled={waiting.data.length === 0}
          title={waiting.data.length === 0 ? "No purchase orders are waiting for goods" : undefined}>Receive goods</Button>} />

      <Panel title="Waiting for delivery" subtitle="Purchase orders confirmed or shipped by the supplier" className="mb-6">
        {waiting.loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : waiting.data.length === 0 ? (
          <p className="text-sm text-muted">Nothing to receive right now. Orders appear here once the supplier confirms them.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {waiting.data.map((o) => <WaitingOrder key={o.id} order={o} onReceive={() => setReceiving({ order: o })} />)}
          </div>
        )}
      </Panel>

      <DataTable columns={columns} rows={data} loading={loading} error={error} emptyText="No goods received yet." />
      {receiving && (
        <ReceiveGoods orders={waiting.data} initial={receiving.order} onClose={() => setReceiving(null)} onSaved={refresh} />
      )}
      {editing && <EditReceipt receipt={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function WaitingOrder({ order, onReceive }) {
  const ordered = order.items.reduce((s, i) => s + i.quantity, 0);
  const received = order.items.reduce((s, i) => s + i.receivedQuantity, 0);
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-xs font-bold">PO-{order.id}</p>
          <p className="font-semibold">{order.supplierName}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-2 text-xs text-muted">
        {order.items.map((i) => i.sparePartName).join(", ")}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-success" style={{ width: `${ordered ? (received / ordered) * 100 : 0}%` }} />
      </div>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-muted">{received} / {ordered} received · expected {date(order.expectedDeliveryDate)}</span>
        <Button size="sm" variant="success" icon={Truck} onClick={onReceive}>Receive</Button>
      </div>
    </div>
  );
}

/** Step 1: choose the purchase order. Step 2: quantities per line (defaults to everything still expected). */
function ReceiveGoods({ orders, initial, onClose, onSaved }) {
  const [order, setOrder] = useState(initial || null);
  const [quantities, setQuantities] = useState(() => defaults(initial));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const choose = (o) => {
    setOrder(o);
    setQuantities(defaults(o));
    setErrors({});
  };

  const save = async () => {
    const problems = {};
    order.items.forEach((i) => {
      const q = Number(quantities[i.id] || 0);
      if (q < 0 || !Number.isInteger(q)) problems[i.id] = "Whole number, 0 or more";
      else if (q > i.remainingQuantity) problems[i.id] = `Only ${i.remainingQuantity} still expected`;
    });
    if (Object.keys(problems).length) return setErrors(problems);
    if (order.items.every((i) => Number(quantities[i.id] || 0) === 0)) return setErrors({ all: "Enter the quantity received for at least one line" });

    setSaving(true);
    const result = await runAction(() => goodsReceiptApi.receive({
      purchaseOrderId: order.id,
      note: toText(note),
      lines: order.items.map((i) => ({ purchaseOrderItemId: i.id, receivedQuantity: Number(quantities[i.id] || 0) })),
    }), "Goods received - stock updated");
    setSaving(false);
    if (result) {
      onSaved();
      onClose();
    }
  };

  if (!order) {
    return (
      <Modal open size="lg" title="Receive goods" subtitle="Step 1 of 2 · Which purchase order is this delivery for?" onClose={onClose}
        footer={<Button variant="secondary" onClick={onClose}>Cancel</Button>}>
        <div className="space-y-2">
          {orders.map((o) => (
            <button key={o.id} type="button" onClick={() => choose(o)}
              className="flex w-full items-center gap-4 rounded-xl border border-line p-4 text-left transition hover:border-accent hover:bg-accent/5">
              <span className="font-mono text-xs font-bold">PO-{o.id}</span>
              <span className="flex-1">
                <span className="block font-semibold">{o.supplierName}</span>
                <span className="block text-xs text-muted">{o.items.map((i) => `${i.sparePartName} (${i.remainingQuantity} expected)`).join(", ")}</span>
              </span>
              <StatusBadge status={o.status} />
            </button>
          ))}
        </div>
      </Modal>
    );
  }

  return (
    <Modal open size="lg" title={`Receive goods · PO-${order.id}`} subtitle={`Step 2 of 2 · ${order.supplierName} - enter what arrived in this delivery`} onClose={onClose}
      footer={
        <>
          {!initial && <Button variant="secondary" icon={ArrowLeft} className="mr-auto" onClick={() => setOrder(null)}>Back</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="success" icon={PackageCheck} onClick={save} loading={saving}>Confirm receipt</Button>
        </>
      }>
      <table className="w-full text-sm">
        <thead className="bg-surface text-left text-[11px] uppercase text-muted">
          <tr><th className="px-3 py-2">Spare part</th><th className="px-3 py-2">Ordered</th><th className="px-3 py-2">Already received</th><th className="px-3 py-2">Received now</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {order.items.map((i) => (
            <tr key={i.id}>
              <td className="px-3 py-2"><p className="font-semibold">{i.sparePartName}</p><p className="text-xs text-muted">{i.sparePartSku}</p></td>
              <td className="px-3 py-2">{i.quantity}</td>
              <td className="px-3 py-2">{i.receivedQuantity}</td>
              <td className="px-3 py-2">
                {i.remainingQuantity === 0 ? (
                  <span className="text-xs font-semibold text-success">Complete</span>
                ) : (
                  <>
                    <Input type="number" min="0" max={i.remainingQuantity} className="w-28" value={quantities[i.id] ?? ""}
                      onChange={(e) => {
                        setQuantities((q) => ({ ...q, [i.id]: e.target.value }));
                        setErrors((er) => ({ ...er, [i.id]: undefined, all: undefined }));
                      }} error={errors[i.id]} />
                    <p className={`mt-1 text-xs ${errors[i.id] ? "font-medium text-danger" : "text-muted"}`}>{errors[i.id] || `up to ${i.remainingQuantity}`}</p>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {errors.all && <p className="mt-3 text-sm font-medium text-danger">{errors.all}</p>}
      <Field label="Note" className="mt-4"><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivery note DN-4521, box 1 of 2" /></Field>
    </Modal>
  );
}

function defaults(order) {
  return Object.fromEntries((order?.items || []).map((i) => [i.id, i.remainingQuantity]));
}

/** Correct the quantity / note of a receipt (stock is corrected too). */
function EditReceipt({ receipt, onClose, onSaved }) {
  const form = useForm({ receivedQuantity: receipt.receivedQuantity, note: receipt.note || "" });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    await goodsReceiptApi.update(receipt.id, {
      purchaseOrderItemId: receipt.purchaseOrderItemId,
      receivedQuantity: toNumber(v.receivedQuantity),
      note: toText(v.note),
    });
    onSaved();
    onClose();
  }, "Goods receipt updated");

  return (
    <Modal open title={`Edit GRN-${receipt.id}`} subtitle={`${receipt.sparePartName} on PO-${receipt.purchaseOrderId}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="grn-form" loading={form.saving}>Save</Button></>}>
      <form id="grn-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantity received" error={e.receivedQuantity} required hint={`Ordered ${receipt.orderedQuantity}`}>
          <Input type="number" min="1" {...form.bind("receivedQuantity")} error={e.receivedQuantity} />
        </Field>
        <Field label="Note" error={e.note}><Input {...form.bind("note")} error={e.note} /></Field>
      </form>
    </Modal>
  );
}
