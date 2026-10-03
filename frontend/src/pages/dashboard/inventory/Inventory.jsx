import { AlertTriangle, Plus, ShoppingBag } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { inventoryApi, sparePartApi } from "../../../api/endpoints";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Checkbox, Input, Select } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import { useAuth } from "../../../context/AuthContext";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, toText, useForm } from "../../../hooks/useForm";
import { dateTime } from "../../../utils/format";

export default function Inventory() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("ADMIN", "INVENTORY_MANAGER");
  const canReorder = hasRole("PROCUREMENT_OFFICER"); // raises a purchase request for the inventory manager to approve
  const navigate = useNavigate();
  const [lowOnly, setLowOnly] = useState(false);
  const loader = useCallback(() => inventoryApi.list({ lowStock: lowOnly }), [lowOnly]);
  const { data, loading, error, reload } = useApi(loader);
  const { data: parts } = useApi(sparePartApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const partsWithoutRecord = parts.filter((p) => p.stockQuantity == null);

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete stock record",
      message: `Delete the stock record of ${row.sparePartName} (${row.quantity} in stock) together with its movement history? Records with goods receipts cannot be deleted.`,
      action: async () => (await runAction(() => inventoryApi.remove(row.id), "Stock record deleted")) && reload(),
    });

  const columns = [
    { key: "sparePartName", header: "Spare part", search: (r) => `${r.sparePartName} ${r.sparePartSku}`, render: (r) => <div><p className="font-semibold">{r.sparePartName}</p><p className="text-xs text-muted">{r.sparePartSku}</p></div> },
    { key: "quantity", header: "In stock", render: (r) => <span className="font-display text-lg font-bold">{r.quantity}</span> },
    { key: "reorderLevel", header: "Reorder at" },
    { key: "lowStock", header: "Level", render: (r) => (r.quantity === 0 ? <Badge tone="red">Out of stock</Badge> : r.lowStock ? <Badge tone="amber">Low</Badge> : <Badge tone="green">OK</Badge>) },
    { key: "location", header: "Location" },
    { key: "updatedAt", header: "Updated", render: (r) => <span className="text-xs text-muted">{dateTime(r.updatedAt)}</span> },
    {
      key: "actions", header: "", className: "text-right",
      render: (r) => canEdit
        ? <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} />
        : canReorder && r.lowStock && <Button size="sm" icon={ShoppingBag} onClick={() => navigate(`/dashboard/purchase-requests?part=${r.sparePartId}`)}>Reorder</Button>,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Stock Levels"
        subtitle="One stock record per spare part. Quantities change through stock movements, goods receipts and orders."
        actions={canEdit && <Button icon={Plus} onClick={() => setEditing({})} disabled={!partsWithoutRecord.length}>Add stock record</Button>}
      />
      <DataTable
        columns={columns}
        rows={data}
        loading={loading}
        error={error}
        toolbar={<Checkbox label={<span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-warning" /> Low stock only</span>} checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />}
      />
      {editing && <InventoryForm record={editing} parts={partsWithoutRecord} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function InventoryForm({ record, parts, onClose, onSaved }) {
  const isNew = !record.id;
  const form = useForm({ sparePartId: record.sparePartId ?? "", quantity: record.quantity ?? 0, reorderLevel: record.reorderLevel ?? 5, location: record.location || "" });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = { sparePartId: toNumber(v.sparePartId), quantity: toNumber(v.quantity), reorderLevel: toNumber(v.reorderLevel), location: toText(v.location) };
    await (isNew ? inventoryApi.create(body) : inventoryApi.update(record.id, body));
    onSaved();
    onClose();
  }, "Stock record saved");

  return (
    <Modal open title={isNew ? "New stock record" : `Stock record - ${record.sparePartName}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="inv-form" loading={form.saving}>Save</Button></>}>
      <form id="inv-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        {isNew && (
          <Field label="Spare part" error={e.sparePartId} required className="sm:col-span-2" hint="Only parts without a stock record are listed">
            <Select {...form.bind("sparePartId")} error={e.sparePartId} placeholder="Select part" options={parts.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
          </Field>
        )}
        <Field label={isNew ? "Opening quantity" : "Quantity"} error={e.quantity} hint={isNew ? "" : "Use Stock Movements to change the quantity"}>
          <Input type="number" min="0" {...form.bind("quantity")} disabled={!isNew} error={e.quantity} />
        </Field>
        <Field label="Reorder level" error={e.reorderLevel} required><Input type="number" min="0" {...form.bind("reorderLevel")} error={e.reorderLevel} /></Field>
        <Field label="Location" error={e.location} className="sm:col-span-2"><Input {...form.bind("location")} error={e.location} placeholder="Rack A1" /></Field>
      </form>
    </Modal>
  );
}
