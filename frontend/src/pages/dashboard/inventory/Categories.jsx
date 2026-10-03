import { Plus } from "lucide-react";
import { useState } from "react";
import { categoryApi } from "../../../api/endpoints";
import { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Checkbox, Input, Textarea } from "../../../components/ui/Field";
import ImageInput from "../../../components/ui/ImageInput";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import PartImage from "../../../components/ui/PartImage";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toText, useForm } from "../../../hooks/useForm";

export default function Categories() {
  const { data, loading, error, reload } = useApi(categoryApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete category",
      message: `Delete "${row.name}"? Categories that still contain spare parts cannot be deleted.`,
      action: async () => (await runAction(() => categoryApi.remove(row.id), "Category deleted")) && reload(),
    });

  const columns = [
    {
      key: "name",
      header: "Category",
      render: (row) => (
        <div className="flex items-center gap-3">
          <PartImage src={row.imageUrl} alt={row.name} className="h-10 w-10 rounded-lg" />
          <div>
            <p className="font-semibold text-ink">{row.name}</p>
            <p className="line-clamp-1 text-xs text-muted">{row.description || "No description"}</p>
          </div>
        </div>
      ),
    },
    { key: "partCount", header: "Parts" },
    { key: "active", header: "Status", render: (row) => <StatusBadge status={row.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "actions", header: "", className: "text-right", render: (row) => <RowActions onEdit={() => setEditing(row)} onDelete={() => askDelete(row)} /> },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Categories"
        subtitle="Group spare parts so customers can browse them easily."
        actions={<Button icon={Plus} onClick={() => setEditing({})}>Add category</Button>}
      />
      <DataTable columns={columns} rows={data} loading={loading} error={error} searchPlaceholder="Search categories" />
      {editing && <CategoryForm category={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function CategoryForm({ category, onClose, onSaved }) {
  const isNew = !category.id;
  const form = useForm({
    name: category.name || "",
    description: category.description || "",
    imageUrl: category.imageUrl || "",
    active: category.active ?? true,
  });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = { ...v, description: toText(v.description), imageUrl: toText(v.imageUrl) };
    await (isNew ? categoryApi.create(body) : categoryApi.update(category.id, body));
    onSaved();
    onClose();
  }, isNew ? "Category created" : "Category updated");

  return (
    <Modal
      open
      title={isNew ? "New category" : `Edit ${category.name}`}
      onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="category-form" loading={form.saving}>Save</Button></>}
    >
      <form id="category-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" error={e.name} required><Input {...form.bind("name")} error={e.name} placeholder="e.g. Brake System" /></Field>
        <Field label="Description" error={e.description}><Textarea {...form.bind("description")} error={e.description} /></Field>
        <Field label="Image" error={e.imageUrl}><ImageInput value={form.values.imageUrl} onChange={(v) => form.set("imageUrl", v)} folder="autohub/categories" error={e.imageUrl} /></Field>
        <Checkbox label="Active (visible in the shop)" checked={form.values.active} onChange={(ev) => form.set("active", ev.target.checked)} />
      </form>
    </Modal>
  );
}
