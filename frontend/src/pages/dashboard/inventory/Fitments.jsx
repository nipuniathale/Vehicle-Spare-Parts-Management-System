import { Plus } from "lucide-react";
import { useState } from "react";
import { fitmentApi, sparePartApi, vehicleApi } from "../../../api/endpoints";
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

export default function Fitments() {
  const { data, loading, error, reload } = useApi(fitmentApi.list);
  const { data: vehicles } = useApi(vehicleApi.list);
  const { data: parts } = useApi(sparePartApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Remove fitment",
      message: `Remove the link between ${row.sparePartName} and ${row.vehicleName}?`,
      confirmLabel: "Remove",
      action: async () => (await runAction(() => fitmentApi.remove(row.id), "Fitment removed")) && reload(),
    });

  const columns = [
    { key: "sparePartName", header: "Spare part", render: (r) => <div><p className="font-semibold">{r.sparePartName}</p><p className="text-xs text-muted">{r.sparePartSku}</p></div> },
    { key: "vehicleName", header: "Fits vehicle" },
    { key: "notes", header: "Notes" },
    { key: "actions", header: "", className: "text-right", render: (r) => <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Inventory" title="Fitments" subtitle="Which spare part fits which vehicle."
        actions={<Button icon={Plus} onClick={() => setEditing({})} disabled={!vehicles.length || !parts.length}>Add fitment</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      {editing && <FitmentForm fitment={editing} vehicles={vehicles} parts={parts} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function FitmentForm({ fitment, vehicles, parts, onClose, onSaved }) {
  const isNew = !fitment.id;
  const form = useForm({ vehicleId: fitment.vehicleId ?? "", sparePartId: fitment.sparePartId ?? "", notes: fitment.notes || "" });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = { vehicleId: toNumber(v.vehicleId), sparePartId: toNumber(v.sparePartId), notes: toText(v.notes) };
    await (isNew ? fitmentApi.create(body) : fitmentApi.update(fitment.id, body));
    onSaved();
    onClose();
  }, "Fitment saved");

  return (
    <Modal open title={isNew ? "New fitment" : "Edit fitment"} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="fitment-form" loading={form.saving}>Save</Button></>}>
      <form id="fitment-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Spare part" error={e.sparePartId} required>
          <Select {...form.bind("sparePartId")} error={e.sparePartId} placeholder="Select part" options={parts.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
        </Field>
        <Field label="Vehicle" error={e.vehicleId} required>
          <Select {...form.bind("vehicleId")} error={e.vehicleId} placeholder="Select vehicle" options={vehicles.map((v) => ({ value: v.id, label: v.displayName }))} />
        </Field>
        <Field label="Notes" error={e.notes}><Input {...form.bind("notes")} error={e.notes} placeholder="e.g. Only for 1.5L engine" /></Field>
      </form>
    </Modal>
  );
}
