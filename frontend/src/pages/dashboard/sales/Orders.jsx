import { Ban, ChevronRight, Eye, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { couponApi, orderApi, sparePartApi, userApi } from "../../../api/endpoints";
import { InvoiceButton } from "../../../components/sales/InvoiceView";
import { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Input, Select, Textarea } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { usePublicSettings } from "../../../hooks/usePublicSettings";
import { toText, useForm } from "../../../hooks/useForm";
import { PHONE_REGEX, invalid } from "../../../utils/validation";
import { dateTime, label, money } from "../../../utils/format";
import OrderSummary from "./OrderDetails";

const NEXT = { PLACED: "PROCESSING", PROCESSING: "SHIPPED", SHIPPED: "DELIVERED" };

export default function Orders() {
  const { data, loading, error, reload } = useApi(orderApi.list);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const confirm = useConfirm();

  const advance = (row) =>
    confirm.ask({
      title: `Mark order #${row.id} as ${label(NEXT[row.status])}`,
      message: NEXT[row.status] === "DELIVERED" && row.paymentMethod === "CASH_ON_DELIVERY"
        ? "The cash-on-delivery payment will be recorded as PAID."
        : `Move the order from ${label(row.status)} to ${label(NEXT[row.status])}?`,
      confirmLabel: label(NEXT[row.status]),
      variant: "primary",
      action: async () => (await runAction(() => orderApi.changeStatus(row.id, NEXT[row.status]), "Order updated")) && reload(),
    });

  const cancel = (row) =>
    confirm.ask({
      title: `Cancel order #${row.id}`,
      message: "Items go back into stock. A paid order is marked REFUNDED.",
      confirmLabel: "Cancel order",
      action: async () => (await runAction(() => orderApi.changeStatus(row.id, "CANCELLED"), "Order cancelled")) && reload(),
    });

  const askDelete = (row) =>
    confirm.ask({
      title: `Delete order #${row.id}`,
      message: "This permanently deletes the order with its items, payments, invoice, reviews and return/warranty claims. Only CANCELLED or DELIVERED orders can be deleted.",
      action: async () => (await runAction(() => orderApi.remove(row.id), "Order deleted")) && reload(),
    });

  const columns = [
    { key: "id", header: "Order", render: (r) => <div><p className="font-mono text-xs font-bold">#{r.id}</p><p className="text-xs text-muted">{dateTime(r.createdAt)}</p></div> },
    { key: "customerName", header: "Customer", search: (r) => `${r.customerName} ${r.customerEmail}`, render: (r) => <div><p className="font-semibold">{r.customerName}</p><p className="text-xs text-muted">{r.contactPhone}{r.placedBy ? " · by sales" : ""}</p></div> },
    { key: "items", header: "Items", render: (r) => r.items.reduce((s, i) => s + i.quantity, 0) },
    { key: "totalAmount", header: "Total", render: (r) => <span className="font-semibold">{money(r.totalAmount)}</span> },
    { key: "paymentStatus", header: "Payment", render: (r) => <div><StatusBadge status={r.paymentStatus} /><p className="mt-0.5 text-[11px] text-muted">{label(r.paymentMethod)}</p></div> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <RowActions
          onEdit={["PLACED", "PROCESSING"].includes(r.status) ? () => setEditing(r) : undefined}
          onDelete={["CANCELLED", "DELIVERED"].includes(r.status) ? () => askDelete(r) : undefined}
        >
          <button type="button" title="View" onClick={() => setViewing(r)} className="rounded-lg p-2 text-muted hover:bg-surface hover:text-ink"><Eye className="h-4 w-4" /></button>
          {NEXT[r.status] && <Button size="sm" onClick={() => advance(r)}>{label(NEXT[r.status])}<ChevronRight className="h-3.5 w-3.5" /></Button>}
          {["PLACED", "PROCESSING"].includes(r.status) && (
            <button type="button" title="Cancel order" onClick={() => cancel(r)} className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"><Ban className="h-4 w-4" /></button>
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Sales" title="Customer Orders"
        subtitle="Process orders: Placed → Processing → Shipped → Delivered. Phone and walk-in orders can be created for a registered customer."
        actions={<Button icon={Plus} onClick={() => setCreating(true)}>New order</Button>} />
      <DataTable columns={columns} rows={data} loading={loading} error={error} searchPlaceholder="Search customer or order" />
      {viewing && (
        <Modal open size="lg" title={`Order #${viewing.id}`} onClose={() => setViewing(null)} footer={<InvoiceButton order={viewing} />}>
          <OrderSummary order={viewing} />
        </Modal>
      )}
      {creating && <NewOrderForm onClose={() => setCreating(false)} onSaved={reload} />}
      {editing && <DeliveryForm order={editing} onClose={() => setEditing(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

export function DeliveryForm({ order, onClose, onSaved }) {
  const form = useForm({ deliveryAddress: order.deliveryAddress, contactPhone: order.contactPhone, note: order.note || "" });
  const e = form.errors;
  const onSubmit = form.submit(async (v) => {
    await orderApi.update(order.id, { ...v, note: toText(v.note) });
    onSaved();
    onClose();
  }, "Delivery details updated");

  return (
    <Modal open title={`Delivery details · order #${order.id}`} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="delivery-form" loading={form.saving}>Save</Button></>}>
      <form id="delivery-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Delivery address" error={e.deliveryAddress} required><Textarea rows={2} {...form.bind("deliveryAddress")} error={e.deliveryAddress} /></Field>
        <Field label="Contact phone" error={e.contactPhone} required><Input {...form.bind("contactPhone")} error={e.contactPhone} /></Field>
        <Field label="Note" error={e.note}><Input {...form.bind("note")} error={e.note} /></Field>
      </form>
    </Modal>
  );
}

/**
 * Sales staff create an order for a registered customer (phone / walk-in order).
 * Prices, discounts, coupon and stock are checked again by the backend.
 */
function NewOrderForm({ onClose, onSaved }) {
  const settings = usePublicSettings();
  const { data: customers } = useApi(userApi.customers);
  const loadParts = useMemo(() => () => sparePartApi.list({ activeOnly: true }), []);
  const { data: parts } = useApi(loadParts);
  const methods = [
    settings.cashOnDeliveryEnabled && { value: "CASH_ON_DELIVERY", label: "Cash on delivery" },
    settings.cardPaymentEnabled && { value: "CARD", label: "Card - customer pays online from My Orders" },
    settings.bankTransferEnabled && { value: "BANK_TRANSFER", label: "Bank transfer - customer uploads the bank slip from My Orders" },
  ].filter(Boolean);

  const form = useForm({ customerId: "", deliveryAddress: "", contactPhone: "", couponCode: "", note: "", paymentMethod: methods[0]?.value || "CASH_ON_DELIVERY" });
  const [lines, setLines] = useState([{ sparePartId: "", quantity: 1 }]);
  const [coupon, setCoupon] = useState(null);
  const e = form.errors;
  const v = form.values;

  const pickCustomer = (id) => {
    form.set("customerId", id);
    const c = customers.find((x) => String(x.id) === String(id));
    if (c) {
      if (c.address) form.set("deliveryAddress", c.address);
      if (c.phone) form.set("contactPhone", c.phone);
    }
  };

  const partOf = (id) => parts.find((p) => String(p.id) === String(id));
  const subtotal = lines.reduce((sum, l) => sum + (partOf(l.sparePartId)?.finalPrice || 0) * Number(l.quantity || 0), 0);
  const setLine = (i, patch) => {
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
    setCoupon(null);
  };

  const checkCoupon = () => runAction(async () => setCoupon(await couponApi.check(v.couponCode.trim(), subtotal)), "Coupon is valid");

  const onSubmit = form.submit(async (values) => {
    const problems = {};
    if (!values.customerId) problems.customerId = "Choose the customer";
    if (!PHONE_REGEX.test(values.contactPhone.trim())) problems.contactPhone = "Phone must contain 9-15 digits";
    if (values.deliveryAddress.trim().length < 10) problems.deliveryAddress = "Delivery address must be 10-300 characters";
    const filled = lines.filter((l) => l.sparePartId);
    if (!filled.length) problems.items = "Add at least one spare part";
    if (new Set(filled.map((l) => l.sparePartId)).size !== filled.length) problems.items = "A part is added twice - combine the quantities";
    filled.forEach((l) => {
      const p = partOf(l.sparePartId);
      if (Number(l.quantity) < 1) problems.items = "Quantity must be at least 1";
      else if (p && Number(l.quantity) > (p.stockQuantity ?? 0)) problems.items = `Only ${p.stockQuantity ?? 0} × ${p.name} in stock`;
    });
    if (Object.keys(problems).length) {
      throw invalid(problems);
    }
    const order = await orderApi.create({
      customerId: Number(values.customerId),
      items: filled.map((l) => ({ sparePartId: Number(l.sparePartId), quantity: Number(l.quantity) })),
      deliveryAddress: values.deliveryAddress,
      contactPhone: values.contactPhone,
      couponCode: toText(values.couponCode.trim()),
      note: toText(values.note),
      paymentMethod: values.paymentMethod,
    });
    onSaved();
    onClose();
    return order;
  }, "Order created - the customer can see it in My Orders");

  const discount = coupon?.discountAmount || 0;

  return (
    <Modal open size="lg" title="New order for a customer" subtitle="Phone or walk-in order" onClose={onClose}
      footer={<><span className="mr-auto self-center text-sm font-semibold">Total: {money(subtotal - discount)}</span><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="staff-order" loading={form.saving}>Create order</Button></>}>
      <form id="staff-order" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Customer" error={e.customerId} required className="sm:col-span-2" hint="Only registered customers - ask the customer to register first if needed">
          <Select value={v.customerId} onChange={(ev) => pickCustomer(ev.target.value)} error={e.customerId} placeholder="Select customer"
            options={customers.map((c) => ({ value: c.id, label: `${c.fullName} · ${c.email}${c.phone ? ` · ${c.phone}` : ""}` }))} />
        </Field>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-semibold text-ink">Items <span className="text-danger">*</span></p>
          <div className="space-y-2">
            {lines.map((l, i) => {
              const p = partOf(l.sparePartId);
              return (
                <div key={i} className="flex items-start gap-2">
                  <Select className="flex-1" value={l.sparePartId} onChange={(ev) => setLine(i, { sparePartId: ev.target.value })} placeholder="Select spare part"
                    options={parts.map((x) => ({ value: x.id, label: `${x.name} (${x.sku}) · ${money(x.finalPrice)} · stock ${x.stockQuantity ?? 0}` }))} />
                  <Input type="number" min="1" max={settings.maxQuantityPerItem} className="w-24" value={l.quantity} onChange={(ev) => setLine(i, { quantity: ev.target.value })} />
                  <span className="w-28 pt-2.5 text-right text-sm font-semibold">{p ? money(p.finalPrice * Number(l.quantity || 0)) : "—"}</span>
                  <button type="button" title="Remove line" disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                    className="rounded-lg p-2.5 text-muted hover:bg-danger/10 hover:text-danger disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
          {e.items && <p className="mt-1 text-xs font-medium text-danger">{e.items}</p>}
          <Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => setLines((ls) => [...ls, { sparePartId: "", quantity: 1 }])}>Add item</Button>
        </div>

        <Field label="Delivery address" error={e.deliveryAddress} required className="sm:col-span-2"><Textarea rows={2} {...form.bind("deliveryAddress")} error={e.deliveryAddress} /></Field>
        <Field label="Contact phone" error={e.contactPhone} required><Input {...form.bind("contactPhone")} error={e.contactPhone} placeholder="0771234567" /></Field>
        <Field label="Payment method" error={e.paymentMethod} required><Select {...form.bind("paymentMethod")} options={methods} /></Field>
        <Field label="Coupon code" error={e.couponCode} hint={coupon ? `−${money(coupon.discountAmount)}` : "Optional"}>
          <div className="flex gap-2">
            <Input className="uppercase" value={v.couponCode} onChange={(ev) => { form.set("couponCode", ev.target.value); setCoupon(null); }} />
            <Button variant="secondary" onClick={checkCoupon} disabled={!v.couponCode.trim() || !subtotal}>Check</Button>
          </div>
        </Field>
        <Field label="Note" error={e.note}><Input {...form.bind("note")} error={e.note} placeholder="e.g. Customer called at 10.30" /></Field>
      </form>
    </Modal>
  );
}
