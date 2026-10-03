import { Building2, Check, FileImage, Plus, X } from "lucide-react";
import { useState } from "react";
import { orderApi, paymentApi } from "../../../api/endpoints";
import { StatusBadge } from "../../../components/ui/Badge";
import BankSlipViewer from "../../../components/ui/BankSlipViewer";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Input, Select } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import Panel from "../../../components/ui/Panel";
import RowActions from "../../../components/ui/RowActions";
import { useAuth } from "../../../context/AuthContext";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, toText, useForm } from "../../../hooks/useForm";
import { dateTime, label, money } from "../../../utils/format";

const METHODS = ["CARD", "CASH_ON_DELIVERY", "BANK_TRANSFER"].map((v) => ({ value: v, label: label(v) }));
const STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"].map((v) => ({ value: v, label: label(v) }));

export default function Payments() {
  const { data, loading, error, reload } = useApi(paymentApi.list);
  const { data: orders } = useApi(orderApi.list);
  const [editing, setEditing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [viewing, setViewing] = useState(null);
  const confirm = useConfirm();
  const { hasRole } = useAuth();
  const isSales = hasRole("SALES_STAFF");
  const transfers = data.filter((p) => p.method === "BANK_TRANSFER" && p.status === "PENDING");

  const askConfirm = (row) =>
    confirm.ask({
      title: "Confirm bank transfer",
      message: `Did ${money(row.amount)} for order #${row.orderId} arrive in the bank account${row.bankReference ? ` (ref ${row.bankReference})` : ""}? The order is marked PAID and the invoice is generated.`,
      confirmLabel: "Yes, money received",
      variant: "success",
      action: async () => (await runAction(() => paymentApi.confirmTransfer(row.id), "Transfer confirmed - invoice generated")) && reload(),
    });

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete payment",
      message: `Delete payment #${row.id} of ${money(row.amount)} for order #${row.orderId}? PAID payments must be marked REFUNDED first.`,
      action: async () => (await runAction(() => paymentApi.remove(row.id), "Payment deleted")) && reload(),
    });

  const columns = [
    { key: "id", header: "#", render: (r) => <span className="font-mono text-xs">PAY-{r.id}</span> },
    { key: "orderId", header: "Order", render: (r) => <div><p className="font-mono text-xs font-bold">#{r.orderId}</p><p className="text-xs text-muted">{r.customerName}</p></div> },
    { key: "amount", header: "Amount", render: (r) => <span className="font-semibold">{money(r.amount)}</span> },
    { key: "method", header: "Method", render: (r) => label(r.method) },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "transactionId", header: "Transaction",
      render: (r) => (
        <div className="text-xs">
          <p className="font-mono">{r.transactionId || (r.bankReference ? `Ref ${r.bankReference}` : "—")}</p>
          <p className="text-muted">{r.note}</p>
          {r.slipUrl && <button type="button" onClick={() => setViewing(r)} className="font-semibold text-accent hover:underline">View bank slip</button>}
        </div>
      ),
    },
    { key: "paidAt", header: "Paid at", render: (r) => <span className="text-xs text-muted">{dateTime(r.paidAt)}</span> },
    { key: "actions", header: "", className: "text-right", render: (r) => <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Sales" title="Payments" subtitle="Card and cash-on-delivery payments are recorded automatically. Confirm bank transfers here, and record refunds or failed payments."
        actions={<Button icon={Plus} onClick={() => setEditing({})}>Record payment</Button>} />
      {transfers.length > 0 && (
        <Panel title="Bank transfers" subtitle="Open the bank slip, check it against the bank account, then confirm (invoice is generated) or tell the customer it was not found" className="mb-6">
          <div className="divide-y divide-line" data-testid="bank-transfers">
            {transfers.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-4 py-3">
                <Building2 className="h-5 w-5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">Order #{p.orderId} · {p.customerName} · {money(p.amount)}</p>
                  <p className="text-xs text-muted">
                    {p.slipUrl
                      ? <>Bank slip uploaded {dateTime(p.transferSubmittedAt)}{p.bankReference && <> · ref <strong className="font-mono text-ink">{p.bankReference}</strong></>}</>
                      : "Waiting for the customer to transfer and upload the bank slip"}
                  </p>
                </div>
                {p.slipUrl && <Button size="sm" variant="secondary" icon={FileImage} onClick={() => setViewing(p)}>View slip</Button>}
                {isSales && p.slipUrl && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={X} onClick={() => setRejecting(p)}>Not found</Button>
                    <Button size="sm" variant="success" icon={Check} onClick={() => askConfirm(p)}>Confirm</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      {viewing && (
        <BankSlipViewer payment={viewing} onClose={() => setViewing(null)}
          footer={isSales && viewing.status === "PENDING" ? (
            <>
              <Button variant="secondary" icon={X} onClick={() => { setRejecting(viewing); setViewing(null); }}>Not found</Button>
              <Button variant="success" icon={Check} onClick={() => { askConfirm(viewing); setViewing(null); }}>Confirm payment</Button>
            </>
          ) : null} />
      )}
      {rejecting && <RejectTransfer payment={rejecting} onClose={() => setRejecting(null)} onSaved={reload} />}
      {editing && <PaymentForm payment={editing} orders={orders} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function PaymentForm({ payment, orders, onClose, onSaved }) {
  const isNew = !payment.id;
  const form = useForm({ orderId: payment.orderId ?? "", method: payment.method || "CARD", status: payment.status || "PAID", note: payment.note || "" });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = { orderId: toNumber(v.orderId), method: v.method, status: v.status, note: toText(v.note) };
    await (isNew ? paymentApi.create(body) : paymentApi.update(payment.id, body));
    onSaved();
    onClose();
  }, "Payment saved");

  return (
    <Modal open title={isNew ? "Record payment" : `Edit payment PAY-${payment.id}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="pay-form" loading={form.saving}>Save</Button></>}>
      <form id="pay-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Order" error={e.orderId} required className="sm:col-span-2">
          <Select {...form.bind("orderId")} disabled={!isNew} error={e.orderId} placeholder="Select order"
            options={orders.map((o) => ({ value: o.id, label: `#${o.id} · ${o.customerName} · ${money(o.totalAmount)} · ${label(o.paymentStatus)}` }))} />
        </Field>
        <Field label="Method" error={e.method} required><Select {...form.bind("method")} options={METHODS} /></Field>
        <Field label="Status" error={e.status} required><Select {...form.bind("status")} options={STATUSES} /></Field>
        <Field label="Note" error={e.note} className="sm:col-span-2"><Input {...form.bind("note")} error={e.note} placeholder="e.g. Bank transfer ref 12345" /></Field>
      </form>
    </Modal>
  );
}

function RejectTransfer({ payment, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!reason.trim()) return setError("Please tell the customer why");
    setSaving(true);
    const ok = await runAction(() => paymentApi.rejectTransfer(payment.id, reason.trim()), "Customer asked to check the transfer");
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal open title="Transfer not found" subtitle={`Order #${payment.orderId} · ${payment.customerName}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={save} loading={saving}>Notify customer</Button></>}>
      <Field label="Reason (sent to the customer)" error={error} required>
        <Input value={reason} error={error} maxLength={250} onChange={(ev) => { setReason(ev.target.value); setError(""); }}
          placeholder="e.g. The slip is not readable / no such transfer reached our account" />
      </Field>
    </Modal>
  );
}
