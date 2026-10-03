import { ArrowDownLeft, ArrowUpRight, Lock, Plus } from "lucide-react";
import { useState } from "react";
import { inventoryApi, movementApi } from "../../../api/endpoints";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Input, Select } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, toText, useForm } from "../../../hooks/useForm";
import { dateTime, label } from "../../../utils/format";

const MANUAL_TYPES = ["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "DAMAGE", "RETURN", "PURCHASE", "SALE"];

export default function StockMovements() {
  const { data, loading, error, reload } = useApi(movementApi.list);
  const { data: inventory } = useApi(inventoryApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete movement",
      message: `Delete this ${label(row.type)} of ${row.quantity} for ${row.sparePartName}? The stock level will be reversed.`,
      action: async () => (await runAction(() => movementApi.remove(row.id), "Movement deleted and stock reversed")) && reload(),
    });

  const columns = [
    { key: "createdAt", header: "Date", render: (r) => <span className="text-xs text-muted">{dateTime(r.createdAt)}</span> },
    { key: "sparePartName", header: "Spare part", search: (r) => `${r.sparePartName} ${r.sparePartSku} ${r.reference || ""}`, render: (r) => <div><p className="font-semibold">{r.sparePartName}</p><p className="text-xs text-muted">{r.sparePartSku}</p></div> },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${r.incoming ? "text-success" : "text-danger"}`}>
          {r.incoming ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
          {label(r.type)}
        </span>
      ),
    },
    { key: "quantity", header: "Qty", render: (r) => <span className="font-bold">{r.incoming ? "+" : "−"}{r.quantity}</span> },
    { key: "reference", header: "Reference" },
    { key: "note", header: "Note", render: (r) => <span className="text-xs text-muted">{r.note || "—"}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) =>
        r.manual ? (
          <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} />
        ) : (
          <Badge tone="gray"><Lock className="mr-1 h-3 w-3" />System</Badge>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock Movements"
        subtitle="Every stock change. Manual movements can be edited or deleted; system movements come from orders, goods receipts and claims."
        actions={<Button icon={Plus} onClick={() => setEditing({})} disabled={!inventory.length}>Record movement</Button>}
      />
      <DataTable columns={columns} rows={data} loading={loading} error={error} searchPlaceholder="Search part or reference" />
      {editing && <MovementForm movement={editing} inventory={inventory} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function MovementForm({ movement, inventory, onClose, onSaved }) {
  const isNew = !movement.id;
  const form = useForm({
    inventoryId: movement.inventoryId ?? "",
    type: movement.type || "ADJUSTMENT_IN",
    quantity: movement.quantity ?? 1,
    reference: movement.reference || "",
    note: movement.note || "",
  });
  const e = form.errors;
  const selected = inventory.find((i) => String(i.id) === String(form.values.inventoryId));

  const onSubmit = form.submit(async (v) => {
    const body = { inventoryId: toNumber(v.inventoryId), type: v.type, quantity: toNumber(v.quantity), reference: toText(v.reference), note: toText(v.note) };
    await (isNew ? movementApi.create(body) : movementApi.update(movement.id, body));
    onSaved();
    onClose();
  }, "Stock updated");

  return (
    <Modal open title={isNew ? "Record stock movement" : "Edit stock movement"} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="mv-form" loading={form.saving}>Save</Button></>}>
      <form id="mv-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Spare part" error={e.inventoryId} required className="sm:col-span-2"
          hint={selected ? `Currently in stock: ${selected.quantity}` : ""}>
          <Select {...form.bind("inventoryId")} disabled={!isNew} error={e.inventoryId} placeholder="Select part"
            options={inventory.map((i) => ({ value: i.id, label: `${i.sparePartName} (${i.sparePartSku}) - ${i.quantity} in stock` }))} />
        </Field>
        <Field label="Type" error={e.type} required>
          <Select {...form.bind("type")} error={e.type} options={MANUAL_TYPES.map((t) => ({ value: t, label: label(t) }))} />
        </Field>
        <Field label="Quantity" error={e.quantity} required><Input type="number" min="1" {...form.bind("quantity")} error={e.quantity} /></Field>
        <Field label="Reference" error={e.reference}><Input {...form.bind("reference")} error={e.reference} placeholder="e.g. COUNT-2026-09" /></Field>
        <Field label="Note" error={e.note}><Input {...form.bind("note")} error={e.note} /></Field>
      </form>
    </Modal>
  );
}
