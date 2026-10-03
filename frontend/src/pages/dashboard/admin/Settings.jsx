import { Boxes, CreditCard, RotateCcw, Save, ShoppingCart, Store } from "lucide-react";
import { settingsApi } from "../../../api/endpoints";
import Button from "../../../components/ui/Button";
import Field, { Checkbox, Input, Textarea } from "../../../components/ui/Field";
import PageHeader from "../../../components/ui/PageHeader";
import { useApi } from "../../../hooks/useApi";
import { useForm } from "../../../hooks/useForm";
import { clearPublicSettings } from "../../../hooks/usePublicSettings";
import { dateTime } from "../../../utils/format";
import { PHONE_REGEX, emailError, invalid } from "../../../utils/validation";
import { Loading } from "../home/shared";

/** System settings - administrator only (the backend checks the ADMIN role as well). */
export default function Settings() {
  const { data, error, setData } = useApi(settingsApi.get, null);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Settings"
        subtitle={`Application settings used by the storefront, checkout, returns and inventory.${data?.lastUpdated ? ` Last saved ${dateTime(data.lastUpdated)}.` : ""}`} />
      {!data ? <Loading error={error} /> : <SettingsForm key={data.lastUpdated || "new"} initial={data.settings} onSaved={setData} />}
    </>
  );
}

function SettingsForm({ initial, onSaved }) {
  const form = useForm({ ...initial });
  const e = form.errors;
  const v = form.values;

  const onSubmit = form.submit(async (values) => {
    const problems = {};
    const email = emailError(values.storeEmail);
    if (email) problems.storeEmail = email;
    if (!PHONE_REGEX.test(String(values.storePhone).trim())) problems.storePhone = "Phone must contain 9-15 digits";
    if (!values.cardPaymentEnabled && !values.cashOnDeliveryEnabled && !values.bankTransferEnabled) problems.payments = "At least one payment method must be enabled";
    if (values.bankTransferEnabled) {
      ["bankName", "bankAccountName", "bankAccountNumber", "bankBranch"].forEach((k) => {
        if (!String(values[k] || "").trim()) problems[k] = "Required for bank transfer";
      });
      if (values.bankAccountNumber && !/^[0-9 -]{6,24}$/.test(String(values.bankAccountNumber).trim())) problems.bankAccountNumber = "6-24 digits (spaces and dashes allowed)";
    }
    if (Object.keys(problems).length) {
      throw invalid(problems);
    }
    const saved = await settingsApi.update({
      ...values,
      maxQuantityPerItem: Number(values.maxQuantityPerItem),
      returnWindowDays: Number(values.returnWindowDays),
      defaultReorderLevel: Number(values.defaultReorderLevel),
    });
    clearPublicSettings();
    onSaved(saved);
  }, "Settings saved");

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Section icon={Store} title="Store information" text="Shown in the storefront and printed on every invoice.">
        <Field label="Store name" error={e.storeName} required><Input {...form.bind("storeName")} error={e.storeName} /></Field>
        <Field label="Contact email" error={e.storeEmail} required><Input type="email" {...form.bind("storeEmail")} error={e.storeEmail} /></Field>
        <Field label="Contact phone" error={e.storePhone} required><Input {...form.bind("storePhone")} error={e.storePhone} /></Field>
        <Field label="Address" error={e.storeAddress} required className="sm:col-span-2"><Textarea rows={2} {...form.bind("storeAddress")} error={e.storeAddress} /></Field>
      </Section>

      <Section icon={CreditCard} title="Payments" text="Payment methods customers and sales staff can choose at checkout.">
        <div className="space-y-3 sm:col-span-2">
          <Checkbox label="Card payment (online)" checked={v.cardPaymentEnabled} onChange={(ev) => form.set("cardPaymentEnabled", ev.target.checked)} />
          <br />
          <Checkbox label="Cash on delivery" checked={v.cashOnDeliveryEnabled} onChange={(ev) => form.set("cashOnDeliveryEnabled", ev.target.checked)} />
          <br />
          <Checkbox label="Bank transfer (customer uploads the bank slip, sales staff confirm it)" checked={v.bankTransferEnabled} onChange={(ev) => form.set("bankTransferEnabled", ev.target.checked)} />
          {(e.payments || e.anyPaymentEnabled) && <p className="text-xs font-medium text-danger">{e.payments || e.anyPaymentEnabled}</p>}
          {e.bankDetailsComplete && <p className="text-xs font-medium text-danger">{e.bankDetailsComplete}</p>}
        </div>
        {v.bankTransferEnabled && (
          <>
            <Field label="Bank name" error={e.bankName} required><Input {...form.bind("bankName")} error={e.bankName} placeholder="e.g. Bank of Ceylon" /></Field>
            <Field label="Branch" error={e.bankBranch} required><Input {...form.bind("bankBranch")} error={e.bankBranch} /></Field>
            <Field label="Account name" error={e.bankAccountName} required><Input {...form.bind("bankAccountName")} error={e.bankAccountName} /></Field>
            <Field label="Account number" error={e.bankAccountNumber} required><Input {...form.bind("bankAccountNumber")} error={e.bankAccountNumber} /></Field>
          </>
        )}
      </Section>

      <Section icon={ShoppingCart} title="Orders">
        <Field label="Maximum quantity of one item per order" error={e.maxQuantityPerItem} required hint="1 - 100. Checked in the cart, at checkout and for staff orders.">
          <Input type="number" min="1" max="100" {...form.bind("maxQuantityPerItem")} error={e.maxQuantityPerItem} />
        </Field>
      </Section>

      <Section icon={RotateCcw} title="Returns & warranty">
        <Field label="Return period (days after delivery)" error={e.returnWindowDays} required hint="1 - 90 days. Warranty claims use each part's own warranty period.">
          <Input type="number" min="1" max="90" {...form.bind("returnWindowDays")} error={e.returnWindowDays} />
        </Field>
      </Section>

      <Section icon={Boxes} title="Inventory">
        <Field label="Default reorder level for new parts" error={e.defaultReorderLevel} required hint="Used when a part is added without its own reorder level.">
          <Input type="number" min="0" {...form.bind("defaultReorderLevel")} error={e.defaultReorderLevel} />
        </Field>
        <div className="flex items-center">
          <Checkbox label="Notify the inventory manager and procurement when stock gets low"
            checked={v.lowStockNotifications} onChange={(ev) => form.set("lowStockNotifications", ev.target.checked)} />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" icon={Save} size="lg" loading={form.saving}>Save settings</Button>
      </div>
    </form>
  );
}

function Section({ icon: Icon, title, text, children }) {
  return (
    <section className="card grid gap-6 p-6 lg:grid-cols-[260px_1fr]">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Icon className="h-5 w-5 text-accent" /> {title}</h2>
        {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
