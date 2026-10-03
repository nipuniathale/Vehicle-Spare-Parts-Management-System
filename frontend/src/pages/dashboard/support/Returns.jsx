import { CheckCheck, Eye, Gavel } from "lucide-react";
import { useState } from "react";
import { rmaApi } from "../../../api/endpoints";
import Badge, { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Input, Select, Textarea } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, toText } from "../../../hooks/useForm";
import { date, dateTime, label, money } from "../../../utils/format";
import { usePublicSettings } from "../../../hooks/usePublicSettings";

export default function Returns() {
  const { returnWindowDays } = usePublicSettings();
  const { data, loading, error, reload } = useApi(rmaApi.list);
  const [viewing, setViewing] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const [completing, setCompleting] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: `Delete claim RMA-${row.id}`,
      message: "Delete this claim permanently? Stock movements already made for it stay in the history.",
      action: async () => (await runAction(() => rmaApi.remove(row.id), "Claim deleted")) && reload(),
    });

  const columns = [
    { key: "id", header: "Claim", render: (r) => <div><p className="font-mono text-xs font-bold">RMA-{r.id}</p><Badge tone={r.type === "WARRANTY" ? "navy" : "blue"}>{label(r.type)}</Badge></div> },
    { key: "sparePartName", header: "Item", render: (r) => <div><p className="font-semibold">{r.sparePartName}</p><p className="text-xs text-muted">Order #{r.orderId} · qty {r.quantity}</p></div> },
    { key: "customerName", header: "Customer", render: (r) => <div className="text-xs"><p className="font-semibold">{r.customerName}</p><p className="text-muted">{date(r.createdAt)}</p></div> },
    { key: "reason", header: "Reason", render: (r) => <span className="text-xs">{label(r.reason)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions", header: "", className: "text-right",
      render: (r) => (
        <RowActions onDelete={() => askDelete(r)}>
          <button type="button" title="View" onClick={() => setViewing(r)} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"><Eye className="h-4 w-4" /></button>
          {r.status === "REQUESTED" && <Button size="sm" icon={Gavel} onClick={() => setDeciding(r)}>Review</Button>}
          {r.status === "APPROVED" && <Button size="sm" variant="success" icon={CheckCheck} onClick={() => setCompleting(r)}>Complete</Button>}
        </RowActions>
      ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Customer care" title="Returns & Warranty" subtitle={`Returns are accepted within ${returnWindowDays} days of delivery (see Settings); warranty claims within each part's warranty period.`} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      {viewing && <ClaimDetails claim={viewing} onClose={() => setViewing(null)} />}
      {deciding && <DecisionForm claim={deciding} onClose={() => setDeciding(null)} onSaved={reload} />}
      {completing && <CompleteForm claim={completing} onClose={() => setCompleting(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function ClaimDetails({ claim, onClose }) {
  return (
    <Modal open title={`RMA-${claim.id} · ${label(claim.type)}`} subtitle={`${claim.customerName} · ${dateTime(claim.createdAt)}`} onClose={onClose}>
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p><span className="text-muted">Item:</span> {claim.sparePartName} ({claim.sparePartSku})</p>
        <p><span className="text-muted">Order:</span> #{claim.orderId} · bought {claim.purchasedQuantity} × {money(claim.unitPrice)}</p>
        <p><span className="text-muted">Claimed qty:</span> {claim.quantity}</p>
        <p><span className="text-muted">Reason:</span> {label(claim.reason)}</p>
        <p className="sm:col-span-2"><span className="text-muted">Status:</span> <StatusBadge status={claim.status} /></p>
      </div>
      <p className="mt-4 rounded-xl bg-surface p-3 text-sm">{claim.description}</p>
      {claim.imageUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {claim.imageUrls.map((url) => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="evidence" className="h-24 w-24 rounded-lg object-cover ring-1 ring-line" /></a>)}
        </div>
      )}
      {claim.staffNote && <p className="mt-3 text-sm"><span className="font-semibold">Staff note:</span> {claim.staffNote}</p>}
      {claim.refundAmount && <p className="mt-1 text-sm"><span className="font-semibold">Refunded:</span> {money(claim.refundAmount)}</p>}
    </Modal>
  );
}

function DecisionForm({ claim, onClose, onSaved }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const decide = async (approve) => {
    setSaving(true);
    const ok = await runAction(() => rmaApi.decide(claim.id, { approve, note: toText(note) }), approve ? "Claim approved" : "Claim rejected");
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal open title={`Review RMA-${claim.id}`} subtitle={`${label(claim.type)} · ${claim.quantity} × ${claim.sparePartName}`} onClose={onClose}
      footer={<><Button variant="danger" onClick={() => decide(false)} loading={saving}>Reject</Button><Button variant="success" onClick={() => decide(true)} loading={saving}>Approve</Button></>}>
      <p className="mb-4 rounded-xl bg-surface p-3 text-sm">{claim.description}</p>
      <Field label="Note to customer" hint="Required when rejecting"><Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
    </Modal>
  );
}

function CompleteForm({ claim, onClose, onSaved }) {
  const max = Number(claim.unitPrice) * claim.quantity;
  const [resolution, setResolution] = useState(claim.type === "WARRANTY" ? "REPLACED" : "REFUNDED");
  const [amount, setAmount] = useState(max);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const body = { resolution, refundAmount: resolution === "REFUNDED" ? toNumber(amount) : null, note: toText(note) };
    const ok = await runAction(() => rmaApi.complete(claim.id, body), "Claim completed");
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal open title={`Complete RMA-${claim.id}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} loading={saving}>Complete claim</Button></>}>
      <div className="space-y-4">
        <Field label="Resolution">
          <Select value={resolution} onChange={(e) => setResolution(e.target.value)}
            options={[{ value: "REPLACED", label: "Replace the item (stock goes out)" }, { value: "REFUNDED", label: `Refund the customer${claim.type === "RETURN" ? " (returned stock goes back in)" : ""}` }]} />
        </Field>
        {resolution === "REFUNDED" && (
          <Field label="Refund amount (Rs.)" hint={`Maximum ${money(max)}`}><Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        )}
        <Field label="Note"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}
