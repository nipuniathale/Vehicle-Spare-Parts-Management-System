import { Plus } from "lucide-react";
import { useState } from "react";
import { categoryApi, sparePartApi } from "../../../api/endpoints";
import Badge, { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Checkbox, Input, Select, Textarea } from "../../../components/ui/Field";
import ImageInput from "../../../components/ui/ImageInput";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import PartImage from "../../../components/ui/PartImage";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toNumber, toText, useForm } from "../../../hooks/useForm";
import { money } from "../../../utils/format";

export default function SpareParts() {
  const { data, loading, error, reload } = useApi(sparePartApi.list);
  const { data: categories } = useApi(categoryApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete spare part",
      message: `Delete "${row.name}" (${row.sku})? Its stock record, stock movements, fitments, discounts and cart lines are deleted too. Parts used in orders or purchase orders cannot be deleted.`,
      action: async () => (await runAction(() => sparePartApi.remove(row.id), "Spare part deleted")) && reload(),
    });

  const columns = [
    {
      key: "name",
      header: "Part",
      search: (r) => `${r.name} ${r.sku} ${r.brand || ""}`,
      render: (r) => (
        <div className="flex items-center gap-3">
          <PartImage src={r.imageUrl} alt={r.name} className="h-11 w-11 rounded-lg" />
          <div>
            <p className="font-semibold text-ink">{r.name}</p>
            <p className="text-xs text-muted">{r.sku}{r.brand ? ` · ${r.brand}` : ""}</p>
          </div>
        </div>
      ),
    },
    { key: "categoryName", header: "Category" },
    {
      key: "price",
      header: "Price",
      render: (r) => (
        <div>
          <p className="font-semibold">{money(r.finalPrice)}</p>
          {r.discountName && <p className="text-xs text-muted line-through">{money(r.price)}</p>}
        </div>
      ),
    },
    {
      key: "stockQuantity",
      header: "Stock",
      render: (r) => (r.stockQuantity == null ? <Badge tone="gray">No record</Badge> : <Badge tone={r.stockQuantity > 0 ? "green" : "red"}>{r.stockQuantity}</Badge>),
    },
    { key: "warrantyMonths", header: "Warranty", render: (r) => (r.warrantyMonths ? `${r.warrantyMonths} mo` : "None") },
    { key: "active", header: "Status", render: (r) => <StatusBadge status={r.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "actions", header: "", className: "text-right", render: (r) => <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} /> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Spare Parts"
        subtitle="The product catalogue. Creating a part also creates its stock record."
        actions={<Button icon={Plus} onClick={() => setEditing({})} disabled={!categories.length}>Add spare part</Button>}
      />
      {!loading && !categories.length && (
        <p className="mb-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-[#9a5b00]">Create a category first - every spare part belongs to a category.</p>
      )}
      <DataTable columns={columns} rows={data} loading={loading} error={error} searchPlaceholder="Search name, SKU or brand" />
      {editing && <PartForm part={editing} categories={categories} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function PartForm({ part, categories, onClose, onSaved }) {
  const isNew = !part.id;
  const form = useForm({
    name: part.name || "",
    sku: part.sku || "",
    brand: part.brand || "",
    description: part.description || "",
    price: part.price ?? "",
    imageUrl: part.imageUrl || "",
    warrantyMonths: part.warrantyMonths ?? 12,
    categoryId: part.categoryId ?? "",
    active: part.active ?? true,
    initialStock: 0,
    reorderLevel: 5,
    location: "",
  });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = {
      ...v,
      brand: toText(v.brand),
      description: toText(v.description),
      imageUrl: toText(v.imageUrl),
      location: toText(v.location),
      price: toNumber(v.price),
      warrantyMonths: toNumber(v.warrantyMonths),
      categoryId: toNumber(v.categoryId),
      initialStock: toNumber(v.initialStock),
      reorderLevel: toNumber(v.reorderLevel),
    };
    await (isNew ? sparePartApi.create(body) : sparePartApi.update(part.id, body));
    onSaved();
    onClose();
  }, isNew ? "Spare part created" : "Spare part updated");

  return (
    <Modal
      open
      size="lg"
      title={isNew ? "New spare part" : `Edit ${part.name}`}
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="part-form" loading={form.saving}>Save</Button></>}
    >
      <form id="part-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" error={e.name} required className="sm:col-span-2"><Input {...form.bind("name")} error={e.name} /></Field>
        <Field label="SKU" error={e.sku} required hint="Letters, digits and dashes"><Input {...form.bind("sku")} error={e.sku} placeholder="BP-100" /></Field>
        <Field label="Brand" error={e.brand}><Input {...form.bind("brand")} error={e.brand} /></Field>
        <Field label="Category" error={e.categoryId} required>
          <Select {...form.bind("categoryId")} error={e.categoryId} placeholder="Select category" options={categories.map((c) => ({ value: c.id, label: c.name }))} />
        </Field>
        <Field label="Price (Rs.)" error={e.price} required><Input type="number" step="0.01" min="0" {...form.bind("price")} error={e.price} /></Field>
        <Field label="Warranty (months)" error={e.warrantyMonths} required hint="0 = no warranty"><Input type="number" min="0" max="60" {...form.bind("warrantyMonths")} error={e.warrantyMonths} /></Field>
        <Field label="Image" error={e.imageUrl}><ImageInput value={form.values.imageUrl} onChange={(v) => form.set("imageUrl", v)} folder="autohub/spare-parts" /></Field>
        <Field label="Description" error={e.description} className="sm:col-span-2"><Textarea {...form.bind("description")} error={e.description} /></Field>

        {isNew && (
          <div className="grid gap-4 rounded-xl bg-surface p-4 sm:col-span-2 sm:grid-cols-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted sm:col-span-3">Stock record</p>
            <Field label="Opening stock" error={e.initialStock}><Input type="number" min="0" {...form.bind("initialStock")} error={e.initialStock} /></Field>
            <Field label="Reorder level" error={e.reorderLevel}><Input type="number" min="0" {...form.bind("reorderLevel")} error={e.reorderLevel} /></Field>
            <Field label="Location" error={e.location}><Input {...form.bind("location")} error={e.location} placeholder="Rack A1" /></Field>
          </div>
        )}
        <div className="sm:col-span-2">
          <Checkbox label="Active (available for sale)" checked={form.values.active} onChange={(ev) => form.set("active", ev.target.checked)} />
        </div>
      </form>
    </Modal>
  );
}
