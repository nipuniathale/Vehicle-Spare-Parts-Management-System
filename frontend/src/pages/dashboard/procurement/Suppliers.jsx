import { KeyRound, Plus } from "lucide-react";
import { useState } from "react";
import { supplierApi } from "../../../api/endpoints";
import Badge, { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Checkbox, Input, Textarea } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { toText, useForm } from "../../../hooks/useForm";
import { emailError, invalid } from "../../../utils/validation";

export default function Suppliers() {
  const { data, loading, error, reload } = useApi(supplierApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete supplier",
      message: `Delete ${row.name}? Its supplier portal login is deleted too. Suppliers with purchase requests or orders cannot be deleted.`,
      action: async () => (await runAction(() => supplierApi.remove(row.id), "Supplier deleted")) && reload(),
    });

  const columns = [
    { key: "name", header: "Supplier", render: (r) => <div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted">{r.contactPerson || "—"}</p></div> },
    { key: "email", header: "Contact", render: (r) => <div className="text-xs"><p>{r.email}</p><p className="text-muted">{r.phone}</p></div> },
    { key: "purchaseOrderCount", header: "POs" },
    { key: "portalAccess", header: "Portal", render: (r) => (r.portalAccess ? <Badge tone="blue"><KeyRound className="mr-1 h-3 w-3" />Enabled</Badge> : <Badge tone="gray">No login</Badge>) },
    { key: "active", header: "Status", render: (r) => <StatusBadge status={r.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "actions", header: "", className: "text-right", render: (r) => <RowActions onEdit={() => setEditing(r)} onDelete={() => askDelete(r)} /> },
  ];

  return (
    <>
      <PageHeader eyebrow="Procurement" title="Suppliers" subtitle="Companies you buy stock from. Give them a portal password so they can see their purchase orders."
        actions={<Button icon={Plus} onClick={() => setEditing({})}>Add supplier</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      {editing && <SupplierForm supplier={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function SupplierForm({ supplier, onClose, onSaved }) {
  const isNew = !supplier.id;
  const form = useForm({
    name: supplier.name || "", email: supplier.email || "", phone: supplier.phone || "",
    contactPerson: supplier.contactPerson || "", address: supplier.address || "", active: supplier.active ?? true, portalPassword: "",
  });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const problem = emailError(v.email);
    if (problem) {
      throw invalid({ email: problem });
    }
    const body = { ...v, email: v.email.trim(), contactPerson: toText(v.contactPerson), address: toText(v.address), portalPassword: toText(v.portalPassword) };
    await (isNew ? supplierApi.create(body) : supplierApi.update(supplier.id, body));
    onSaved();
    onClose();
  }, isNew ? "Supplier added" : "Supplier updated");

  return (
    <Modal open title={isNew ? "New supplier" : `Edit ${supplier.name}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="sup-form" loading={form.saving}>Save</Button></>}>
      <form id="sup-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" error={e.name} required className="sm:col-span-2"><Input {...form.bind("name")} error={e.name} /></Field>
        <Field label="Email" error={e.email} required hint="Also the portal login"><Input type="email" {...form.bind("email")} error={e.email} /></Field>
        <Field label="Phone" error={e.phone} required><Input {...form.bind("phone")} error={e.phone} placeholder="0112345678" /></Field>
        <Field label="Contact person" error={e.contactPerson}><Input {...form.bind("contactPerson")} error={e.contactPerson} /></Field>
        <Field label={supplier.portalAccess ? "Reset portal password" : "Portal password"} error={e.portalPassword}
          hint={supplier.portalAccess ? "Leave empty to keep the current password" : "Optional - creates a supplier login"}>
          <Input type="password" {...form.bind("portalPassword")} error={e.portalPassword} autoComplete="new-password" />
        </Field>
        <Field label="Address" error={e.address} className="sm:col-span-2"><Textarea rows={2} {...form.bind("address")} error={e.address} /></Field>
        <Checkbox label="Active" checked={form.values.active} onChange={(ev) => form.set("active", ev.target.checked)} />
      </form>
    </Modal>
  );
}
