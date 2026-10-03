import { Plus } from "lucide-react";
import { useState } from "react";
import { vehicleApi } from "../../../api/endpoints";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Input } from "../../../components/ui/Field";
import ImageInput from "../../../components/ui/ImageInput";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, toText, useForm } from "../../../hooks/useForm";

export default function Vehicles() {
  const { data, loading, error, reload } = useApi(vehicleApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete vehicle",
      message: `Delete ${row.displayName}? Its ${row.fitmentCount} fitment link(s) will be deleted too.`,
      action: async () => (await runAction(() => vehicleApi.remove(row.id), "Vehicle deleted")) && reload(),
    });

  const columns = [
    { key: "displayName", header: "Vehicle", render: (r) => <span className="font-semibold">{r.displayName}</span> },
    { key: "engine", header: "Engine" },
    { key: "fitmentCount", header: "Compatible parts" },
    { key: "actions", header: "", className: "text-right", render: (r) => <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Inventory" title="Vehicles" subtitle="Vehicle models used for part compatibility."
        actions={<Button icon={Plus} onClick={() => setEditing({})}>Add vehicle</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} searchPlaceholder="Search make or model" />
      {editing && <VehicleForm vehicle={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function VehicleForm({ vehicle, onClose, onSaved }) {
  const isNew = !vehicle.id;
  const form = useForm({
    make: vehicle.make || "", model: vehicle.model || "", year: vehicle.year ?? new Date().getFullYear(),
    variant: vehicle.variant || "", engine: vehicle.engine || "", imageUrl: vehicle.imageUrl || "",
  });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = { ...v, year: toNumber(v.year), variant: toText(v.variant), engine: toText(v.engine), imageUrl: toText(v.imageUrl) };
    await (isNew ? vehicleApi.create(body) : vehicleApi.update(vehicle.id, body));
    onSaved();
    onClose();
  }, isNew ? "Vehicle added" : "Vehicle updated");

  return (
    <Modal open title={isNew ? "New vehicle" : "Edit vehicle"} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="vehicle-form" loading={form.saving}>Save</Button></>}>
      <form id="vehicle-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Make" error={e.make} required><Input {...form.bind("make")} error={e.make} placeholder="Toyota" /></Field>
        <Field label="Model" error={e.model} required><Input {...form.bind("model")} error={e.model} placeholder="Corolla" /></Field>
        <Field label="Year" error={e.year} required><Input type="number" {...form.bind("year")} error={e.year} /></Field>
        <Field label="Variant" error={e.variant}><Input {...form.bind("variant")} error={e.variant} placeholder="GLi" /></Field>
        <Field label="Engine" error={e.engine}><Input {...form.bind("engine")} error={e.engine} placeholder="1.5L Petrol" /></Field>
        <Field label="Image" error={e.imageUrl}><ImageInput value={form.values.imageUrl} onChange={(v) => form.set("imageUrl", v)} folder="autohub/vehicles" /></Field>
      </form>
    </Modal>
  );
}
