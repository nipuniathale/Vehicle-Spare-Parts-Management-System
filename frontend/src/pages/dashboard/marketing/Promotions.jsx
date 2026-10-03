import { Plus } from "lucide-react";
import { useState } from "react";
import { promotionApi, sparePartApi } from "../../../api/endpoints";
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
import { addDays, date, today } from "../../../utils/format";

export default function Promotions() {
  const { data, loading, error, reload } = useApi(promotionApi.list);
  const { data: parts } = useApi(sparePartApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete promotion",
      message: `Delete "${row.title}"? It will disappear from the storefront banner.`,
      action: async () => (await runAction(() => promotionApi.remove(row.id), "Promotion deleted")) && reload(),
    });

  const columns = [
    {
      key: "title", header: "Promotion",
      render: (r) => (
        <div className="flex items-center gap-3">
          <PartImage src={r.imageUrl} alt={r.title} className="h-11 w-16 rounded-lg" />
          <div><p className="font-semibold">{r.title}</p><p className="line-clamp-1 max-w-xs text-xs text-muted">{r.description}</p></div>
        </div>
      ),
    },
    { key: "period", header: "Period", render: (r) => <span className="text-xs">{date(r.startDate)} – {date(r.endDate)}</span> },
    { key: "spareParts", header: "Featured parts", render: (r) => r.spareParts.length },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "", className: "text-right", render: (r) => <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Marketing" title="Promotions" subtitle="Campaign banners shown on the storefront home page while they are running."
        actions={<Button icon={Plus} onClick={() => setEditing({})}>New promotion</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      {editing && <PromotionForm promotion={editing} parts={parts} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function PromotionForm({ promotion, parts, onClose, onSaved }) {
  const isNew = !promotion.id;
  const form = useForm({
    title: promotion.title || "", description: promotion.description || "", imageUrl: promotion.imageUrl || "",
    startDate: promotion.startDate || today(), endDate: promotion.endDate || addDays(14), active: promotion.active ?? true,
    sparePartIds: promotion.spareParts?.map((p) => p.id) || [],
  });
  const e = form.errors;

  const togglePart = (id) =>
    form.set("sparePartIds", form.values.sparePartIds.includes(id) ? form.values.sparePartIds.filter((x) => x !== id) : [...form.values.sparePartIds, id]);

  const onSubmit = form.submit(async (v) => {
    const body = { ...v, description: toText(v.description), imageUrl: toText(v.imageUrl) };
    await (isNew ? promotionApi.create(body) : promotionApi.update(promotion.id, body));
    onSaved();
    onClose();
  }, "Promotion saved");

  return (
    <Modal open size="lg" title={isNew ? "New promotion" : `Edit ${promotion.title}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="promo-form" loading={form.saving}>Save</Button></>}>
      <form id="promo-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" error={e.title} required className="sm:col-span-2"><Input {...form.bind("title")} error={e.title} placeholder="Brake Week - up to 20% off" /></Field>
        <Field label="Description" error={e.description} className="sm:col-span-2"><Textarea rows={2} {...form.bind("description")} error={e.description} /></Field>
        <Field label="Start date" error={e.startDate} required><Input type="date" {...form.bind("startDate")} error={e.startDate} /></Field>
        <Field label="End date" error={e.endDate} required><Input type="date" {...form.bind("endDate")} error={e.endDate} /></Field>
        <Field label="Banner image" className="sm:col-span-2"><ImageInput value={form.values.imageUrl} onChange={(v) => form.set("imageUrl", v)} folder="autohub/promotions" /></Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-semibold">Featured parts ({form.values.sparePartIds.length})</p>
          <div className="grid max-h-44 gap-1 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
            {parts.map((p) => (
              <Checkbox key={p.id} label={`${p.name} (${p.sku})`} checked={form.values.sparePartIds.includes(p.id)} onChange={() => togglePart(p.id)} />
            ))}
            {!parts.length && <p className="text-xs text-muted">No spare parts yet.</p>}
          </div>
          {e.sparePartIds && <p className="mt-1 text-xs text-danger">{e.sparePartIds}</p>}
        </div>
        <Checkbox label="Active" checked={form.values.active} onChange={(ev) => form.set("active", ev.target.checked)} />
      </form>
    </Modal>
  );
}
