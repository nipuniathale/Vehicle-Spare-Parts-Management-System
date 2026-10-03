import { Plus } from "lucide-react";
import { useState } from "react";
import { couponApi } from "../../../api/endpoints";
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
import { toNumber, toText, useForm } from "../../../hooks/useForm";
import { addDays, date, money, today } from "../../../utils/format";

export default function Coupons() {
  const { data, loading, error, reload } = useApi(couponApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete coupon",
      message: `Delete coupon ${row.code}? Orders that already used it keep their discount.`,
      action: async () => (await runAction(() => couponApi.remove(row.id), "Coupon deleted")) && reload(),
    });

  const columns = [
    { key: "code", header: "Code", render: (r) => <div><p className="font-mono font-bold">{r.code}</p><p className="text-xs text-muted">{r.description}</p></div> },
    { key: "value", header: "Discount", render: (r) => (r.type === "PERCENTAGE" ? `${r.value}%${r.maxDiscountAmount ? ` (max ${money(r.maxDiscountAmount)})` : ""}` : money(r.value)) },
    { key: "minOrderAmount", header: "Min. order", render: (r) => money(r.minOrderAmount) },
    { key: "usage", header: "Used", render: (r) => `${r.usedCount} / ${r.usageLimit || "∞"}` },
    { key: "period", header: "Valid", render: (r) => <span className="text-xs">{date(r.startDate)} – {date(r.endDate)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "actions", header: "", className: "text-right", render: (r) => <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Marketing" title="Coupons" subtitle="Codes customers enter at checkout."
        actions={<Button icon={Plus} onClick={() => setEditing({})}>New coupon</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      {editing && <CouponForm coupon={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function CouponForm({ coupon, onClose, onSaved }) {
  const isNew = !coupon.id;
  const form = useForm({
    code: coupon.code || "", description: coupon.description || "", type: coupon.type || "PERCENTAGE", value: coupon.value ?? "",
    minOrderAmount: coupon.minOrderAmount ?? 0, maxDiscountAmount: coupon.maxDiscountAmount ?? "", usageLimit: coupon.usageLimit ?? 0,
    startDate: coupon.startDate || today(), endDate: coupon.endDate || addDays(30), active: coupon.active ?? true,
  });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = {
      ...v, description: toText(v.description), value: toNumber(v.value), minOrderAmount: toNumber(v.minOrderAmount),
      maxDiscountAmount: v.type === "PERCENTAGE" ? toNumber(v.maxDiscountAmount) : null, usageLimit: toNumber(v.usageLimit),
    };
    await (isNew ? couponApi.create(body) : couponApi.update(coupon.id, body));
    onSaved();
    onClose();
  }, "Coupon saved");

  return (
    <Modal open title={isNew ? "New coupon" : `Edit ${coupon.code}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="coupon-form" loading={form.saving}>Save</Button></>}>
      <form id="coupon-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Code" error={e.code} required hint="4-20 letters/digits, saved in capitals"><Input {...form.bind("code")} error={e.code} placeholder="SAVE500" className="uppercase" /></Field>
        <Field label="Type" error={e.type} required>
          <Select {...form.bind("type")} options={[{ value: "PERCENTAGE", label: "Percentage (%)" }, { value: "FIXED_AMOUNT", label: "Fixed amount (Rs.)" }]} />
        </Field>
        <Field label="Value" error={e.value} required><Input type="number" step="0.01" min="0" {...form.bind("value")} error={e.value} /></Field>
        {form.values.type === "PERCENTAGE" ? (
          <Field label="Max discount (Rs.)" error={e.maxDiscountAmount} hint="Optional cap"><Input type="number" step="0.01" min="0" {...form.bind("maxDiscountAmount")} error={e.maxDiscountAmount} /></Field>
        ) : <div />}
        <Field label="Minimum order (Rs.)" error={e.minOrderAmount} required><Input type="number" step="0.01" min="0" {...form.bind("minOrderAmount")} error={e.minOrderAmount} /></Field>
        <Field label="Usage limit" error={e.usageLimit} required hint="0 = unlimited"><Input type="number" min="0" {...form.bind("usageLimit")} error={e.usageLimit} /></Field>
        <Field label="Start date" error={e.startDate} required><Input type="date" {...form.bind("startDate")} error={e.startDate} /></Field>
        <Field label="End date" error={e.endDate} required><Input type="date" {...form.bind("endDate")} error={e.endDate} /></Field>
        <Field label="Description" error={e.description} className="sm:col-span-2"><Input {...form.bind("description")} error={e.description} /></Field>
        <Checkbox label="Active" checked={form.values.active} onChange={(ev) => form.set("active", ev.target.checked)} />
      </form>
    </Modal>
  );
}
