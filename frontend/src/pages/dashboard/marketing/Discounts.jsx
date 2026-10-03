import { Plus } from "lucide-react";
import { useState } from "react";
import { discountApi, sparePartApi } from "../../../api/endpoints";
import { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Checkbox, Input, Select } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, useForm } from "../../../hooks/useForm";
import { addDays, date, money, today } from "../../../utils/format";

export default function Discounts() {
  const { data, loading, error, reload } = useApi(discountApi.list);
  const { data: parts } = useApi(sparePartApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete discount",
      message: `Delete "${row.name}" on ${row.sparePartName}? The part goes back to its normal price.`,
      action: async () => (await runAction(() => discountApi.remove(row.id), "Discount deleted")) && reload(),
    });

  const columns = [
    { key: "name", header: "Discount", render: (r) => <div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted">{r.sparePartName} · {r.sparePartSku}</p></div> },
    { key: "value", header: "Value", render: (r) => (r.type === "PERCENTAGE" ? `${r.value}%` : money(r.value)) },
    { key: "price", header: "Price", render: (r) => <div><p className="font-semibold text-success">{money(r.discountedPrice)}</p><p className="text-xs text-muted line-through">{money(r.originalPrice)}</p></div> },
    { key: "period", header: "Period", render: (r) => <span className="text-xs">{date(r.startDate)} – {date(r.endDate)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "", className: "text-right", render: (r) => <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Marketing" title="Discounts" subtitle="Price reductions on individual parts, applied automatically in the shop and at checkout."
        actions={<Button icon={Plus} onClick={() => setEditing({})} disabled={!parts.length}>New discount</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      {editing && <DiscountForm discount={editing} parts={parts} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function DiscountForm({ discount, parts, onClose, onSaved }) {
  const isNew = !discount.id;
  const form = useForm({
    sparePartId: discount.sparePartId ?? "", name: discount.name || "", type: discount.type || "PERCENTAGE", value: discount.value ?? "",
    startDate: discount.startDate || today(), endDate: discount.endDate || addDays(7), active: discount.active ?? true,
  });
  const e = form.errors;
  const part = parts.find((p) => String(p.id) === String(form.values.sparePartId));

  const onSubmit = form.submit(async (v) => {
    const body = { ...v, sparePartId: toNumber(v.sparePartId), value: toNumber(v.value) };
    await (isNew ? discountApi.create(body) : discountApi.update(discount.id, body));
    onSaved();
    onClose();
  }, "Discount saved");

  return (
    <Modal open title={isNew ? "New discount" : `Edit ${discount.name}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="disc-form" loading={form.saving}>Save</Button></>}>
      <form id="disc-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Spare part" error={e.sparePartId} required className="sm:col-span-2" hint={part ? `Current price ${money(part.price)}` : ""}>
          <Select {...form.bind("sparePartId")} error={e.sparePartId} placeholder="Select part" options={parts.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
        </Field>
        <Field label="Name" error={e.name} required className="sm:col-span-2"><Input {...form.bind("name")} error={e.name} placeholder="10% off brake pads" /></Field>
        <Field label="Type" error={e.type} required>
          <Select {...form.bind("type")} options={[{ value: "PERCENTAGE", label: "Percentage (%)" }, { value: "FIXED_AMOUNT", label: "Fixed amount (Rs.)" }]} />
        </Field>
        <Field label="Value" error={e.value} required hint={form.values.type === "PERCENTAGE" ? "Max 90%" : "Less than the price"}>
          <Input type="number" step="0.01" min="0" {...form.bind("value")} error={e.value} />
        </Field>
        <Field label="Start date" error={e.startDate} required><Input type="date" {...form.bind("startDate")} error={e.startDate} /></Field>
        <Field label="End date" error={e.endDate} required><Input type="date" {...form.bind("endDate")} error={e.endDate} /></Field>
        <Checkbox label="Active" checked={form.values.active} onChange={(ev) => form.set("active", ev.target.checked)} />
      </form>
    </Modal>
  );
}
