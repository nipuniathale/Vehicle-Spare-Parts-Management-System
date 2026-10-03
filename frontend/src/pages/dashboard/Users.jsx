import { Plus } from "lucide-react";
import { useState } from "react";
import { userApi } from "../../api/endpoints";
import Badge, { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import DataTable from "../../components/ui/DataTable";
import Field, { Checkbox, Input, Select, Textarea } from "../../components/ui/Field";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import RowActions from "../../components/ui/RowActions";
import { useAuth } from "../../context/AuthContext";
import { runAction, useApi } from "../../hooks/useApi";
import { useConfirm } from "../../hooks/useConfirm";
import { toText, useForm } from "../../hooks/useForm";
import { date, ROLE_LABELS } from "../../utils/format";
import { emailError, invalid } from "../../utils/validation";

const ROLE_OPTIONS = Object.entries(ROLE_LABELS)
  .filter(([role]) => role !== "SUPPLIER")
  .map(([value, label]) => ({ value, label }));

export default function Users() {
  const { user: me } = useAuth();
  const { data, loading, error, reload } = useApi(userApi.list);
  const [editing, setEditing] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete user",
      message: `Delete ${row.fullName} (${row.email})? Users with orders or purchase requests cannot be deleted - deactivate them instead.`,
      action: async () => (await runAction(() => userApi.remove(row.id), "User deleted")) && reload(),
    });

  const columns = [
    { key: "fullName", header: "User", search: (r) => `${r.fullName} ${r.email}`, render: (r) => <div><p className="font-semibold">{r.fullName}{r.id === me.id && <span className="ml-1 text-xs text-muted">(you)</span>}</p><p className="text-xs text-muted">{r.email}</p></div> },
    { key: "role", header: "Role", render: (r) => <div className="flex flex-wrap gap-1"><Badge tone={r.role === "CUSTOMER" ? "gray" : r.role === "SUPPLIER" ? "blue" : "navy"}>{ROLE_LABELS[r.role]}</Badge>{r.authProvider === "GOOGLE" && <Badge tone="gray">Google</Badge>}</div> },
    { key: "phone", header: "Phone" },
    { key: "active", header: "Status", render: (r) => <StatusBadge status={r.active ? "ACTIVE" : "INACTIVE"} /> },
    { key: "createdAt", header: "Joined", render: (r) => date(r.createdAt) },
    {
      key: "actions", header: "", className: "text-right",
      render: (r) => r.role === "SUPPLIER"
        ? <span className="text-xs text-muted">Managed in Suppliers</span>
        : <RowActions onEdit={() => setEditing(r)} onDelete={r.id !== me.id ? () => askDelete(r) : undefined} />,
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Users" subtitle="Staff accounts and customers."
        actions={<Button icon={Plus} onClick={() => setEditing({})}>Add user</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} searchPlaceholder="Search name or email" />
      {editing && <UserForm user={editing} self={editing.id === me.id} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function UserForm({ user, self, onClose, onSaved }) {
  const isNew = !user.id;
  const form = useForm({
    firstName: user.firstName || "", lastName: user.lastName || "", email: user.email || "", phone: user.phone || "",
    address: user.address || "", role: user.role || "SALES_STAFF", active: user.active ?? true, password: "",
  });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const problem = emailError(v.email);
    if (problem) {
      throw invalid({ email: problem });
    }
    const body = { ...v, email: v.email.trim(), phone: toText(v.phone), address: toText(v.address), password: toText(v.password) };
    await (isNew ? userApi.create(body) : userApi.update(user.id, body));
    onSaved();
    onClose();
  }, isNew ? "User created" : "User updated");

  return (
    <Modal open title={isNew ? "New user" : `Edit ${user.fullName}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="user-form" loading={form.saving}>Save</Button></>}>
      <form id="user-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="First name" error={e.firstName} required><Input {...form.bind("firstName")} error={e.firstName} /></Field>
        <Field label="Last name" error={e.lastName} required><Input {...form.bind("lastName")} error={e.lastName} /></Field>
        <Field label="Email" error={e.email} required><Input type="email" {...form.bind("email")} error={e.email} /></Field>
        <Field label="Phone" error={e.phone}><Input {...form.bind("phone")} error={e.phone} /></Field>
        <Field label="Role" error={e.role} required><Select {...form.bind("role")} disabled={self} options={ROLE_OPTIONS} /></Field>
        <Field label={isNew ? "Password" : "New password"} error={e.password} required={isNew} hint={isNew ? "At least 6 characters" : "Leave empty to keep"}>
          <Input type="password" autoComplete="new-password" {...form.bind("password")} error={e.password} />
        </Field>
        <Field label="Address" error={e.address} className="sm:col-span-2"><Textarea rows={2} {...form.bind("address")} error={e.address} /></Field>
        {!self && <Checkbox label="Active (can log in)" checked={form.values.active} onChange={(ev) => form.set("active", ev.target.checked)} />}
      </form>
    </Modal>
  );
}
