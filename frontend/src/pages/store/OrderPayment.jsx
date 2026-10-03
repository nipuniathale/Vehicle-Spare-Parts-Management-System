import { AlertTriangle, Building2, CheckCircle2, Clock, Copy, CreditCard, FileText, Lock, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import { orderApi, paymentApi } from "../../api/endpoints";
import Button from "../../components/ui/Button";
import Field, { Input } from "../../components/ui/Field";
import BankSlipViewer from "../../components/ui/BankSlipViewer";
import Spinner from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import { useForm } from "../../hooks/useForm";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import { dateTime, money } from "../../utils/format";

export default function OrderPayment() {
  const { id } = useParams();
  const { data: order, loading, error } = useApi(useCallback(() => orderApi.get(id), [id]), null);
  const [paid, setPaid] = useState(null);
  const form = useForm({ cardHolder: "", cardNumber: "", expiry: "", cvv: "" });
  const e = form.errors;

  const pay = form.submit(async (v) => {
    const payment = await paymentApi.payByCard(id, { ...v, cardNumber: v.cardNumber.replace(/\s/g, "") });
    setPaid(payment);
  }, "Payment successful");

  if (loading) return <div className="flex justify-center py-32"><Spinner className="h-8 w-8" /></div>;
  if (error) return <p className="py-20 text-center text-muted">{error}</p>;

  if (order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus !== "PAID") return <BankTransferPayment order={order} />;

  if (paid || order.paymentStatus === "PAID") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
        <h1 className="mt-4 font-display text-3xl font-bold">Thank you!</h1>
        <p className="mt-2 text-muted">Order <strong>#{order.id}</strong> is paid{paid ? ` (transaction ${paid.transactionId})` : ""}. We will let you know when it ships.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/my-orders" className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white">View my orders</Link>
          <Link to="/shop" className="rounded-xl px-6 py-3 text-sm font-bold ring-1 ring-line">Continue shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Pay for order #{order.id}</h1>
      <p className="mt-1 text-sm text-muted">Your order is placed. Complete the card payment now, or pay later from My Orders.</p>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_300px]">
        <form onSubmit={pay} className="card space-y-4 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><CreditCard className="h-5 w-5 text-accent" /> Card details</h2>
          <Field label="Name on card" error={e.cardHolder} required><Input {...form.bind("cardHolder")} error={e.cardHolder} /></Field>
          <Field label="Card number" error={e.cardNumber} required hint="Test card: 4111 1111 1111 1111">
            <Input inputMode="numeric" maxLength={19} {...form.bind("cardNumber")} error={e.cardNumber} placeholder="1234 5678 9012 3456" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Expiry (MM/YY)" error={e.expiry} required><Input {...form.bind("expiry")} maxLength={5} error={e.expiry} placeholder="12/28" /></Field>
            <Field label="CVV" error={e.cvv} required><Input type="password" inputMode="numeric" maxLength={3} {...form.bind("cvv")} error={e.cvv} /></Field>
          </div>
          <Button type="submit" size="lg" className="w-full" icon={Lock} loading={form.saving}>Pay {money(order.totalAmount)}</Button>
          <Link to="/my-orders" className="block text-center text-sm font-semibold text-muted hover:text-accent">Pay later</Link>
        </form>
        <div className="card h-fit p-6">
          <p className="text-xs font-bold uppercase text-muted">Amount due</p>
          <p className="mt-2 font-display text-3xl font-bold">{money(order.totalAmount)}</p>
          <p className="mt-2 text-xs text-muted">{order.items.length} item(s) · delivering to {order.deliveryAddress}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Bank transfer: the customer transfers the amount to the store's account (details from admin Settings),
 * then uploads the bank slip. Sales staff check it and confirm -> the invoice is generated.
 */
function BankTransferPayment({ order }) {
  const settings = usePublicSettings();
  const payments = useApi(useCallback(() => paymentApi.forOrder(order.id), [order.id]));
  const latest = payments.data[0];
  const [sent, setSent] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const orderRef = `AHL-${order.id}`;

  const copy = (text) => navigator.clipboard?.writeText(text).then(() => toast.success("Copied"), () => {});

  if (payments.loading && !latest) return <div className="flex justify-center py-32"><Spinner className="h-8 w-8" /></div>;

  const waiting = sent || (latest?.slipUrl && latest.status === "PENDING" ? latest : null);
  if (waiting && !replacing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Clock className="mx-auto h-16 w-16 text-warning" />
        <h1 className="mt-4 font-display text-3xl font-bold">Bank slip received</h1>
        <p className="mt-2 text-muted">
          We have your bank slip for order <strong>#{order.id}</strong>
          {waiting.transferSubmittedAt ? ` (uploaded ${dateTime(waiting.transferSubmittedAt)})` : ""}. Our team will check it
          against our bank account and confirm the payment - your invoice will then appear in My Orders.
        </p>
        <div className="mt-5 flex justify-center gap-4 text-sm font-semibold">
          <button type="button" onClick={() => setViewing(true)} className="text-accent hover:underline">View my slip</button>
          <button type="button" onClick={() => setReplacing(true)} className="text-muted hover:text-accent">Upload a different slip</button>
        </div>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/my-orders" className="rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white">View my orders</Link>
          <Link to="/shop" className="rounded-xl px-6 py-3 text-sm font-bold ring-1 ring-line">Continue shopping</Link>
        </div>
        {viewing && <BankSlipViewer payment={{ ...waiting, orderId: order.id }} onClose={() => setViewing(false)} />}
      </div>
    );
  }

  const rejected = latest?.note?.startsWith("Transfer not found") ? latest.note : null;
  const rows = [
    ["Bank", settings.bankName],
    ["Account name", settings.bankAccountName],
    ["Account number", settings.bankAccountNumber, true],
    ["Branch", settings.bankBranch],
    ["Amount", money(order.totalAmount), true],
    ["Payment reference", orderRef, true],
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Pay order #{order.id} by bank transfer</h1>
      <p className="mt-1 text-sm text-muted">Transfer the amount to our account (online banking, ATM or at the bank), then add a photo or PDF of the bank slip.</p>

      {rejected && !replacing && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/5 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
          <p><strong>We could not match your previous slip.</strong> {rejected.replace("Transfer not found: ", "")} Please check and add the bank slip again.</p>
        </div>
      )}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div className="card h-fit p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Building2 className="h-5 w-5 text-accent" /> Our bank account</h2>
          <dl className="mt-4 divide-y divide-line text-sm" data-testid="bank-details">
            {rows.map(([k, v, copyable]) => (
              <div key={k} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="flex items-center gap-1.5 text-right font-semibold">
                  {v || "—"}
                  {copyable && v && (
                    <button type="button" title="Copy" onClick={() => copy(v)} className="rounded p-1 text-muted hover:text-accent"><Copy className="h-3.5 w-3.5" /></button>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted">Please write <strong>{orderRef}</strong> as the payment reference / remark so we can match your transfer.</p>
        </div>

        <SlipForm order={order} onSent={(p) => { setSent(p); setReplacing(false); }} onCancel={replacing ? () => setReplacing(false) : null} />
      </div>
    </div>
  );
}

const SLIP_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const SLIP_MAX = 5 * 1024 * 1024;

function SlipForm({ order, onSent, onCancel }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [reference, setReference] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const choose = (picked) => {
    if (!picked) return;
    if (!SLIP_TYPES.includes(picked.type)) return setErrors({ file: "Please add a photo (JPG, PNG, WEBP, GIF) or a PDF of the slip" });
    if (picked.size > SLIP_MAX) return setErrors({ file: "The bank slip must be 5 MB or smaller" });
    setErrors({});
    setFile(picked);
    setPreview(picked.type.startsWith("image/") ? URL.createObjectURL(picked) : null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const problems = {};
    if (!file) problems.file = "Please add a photo or PDF of the bank slip";
    if (reference.trim() && !/^[A-Za-z0-9/ -]{4,40}$/.test(reference.trim())) problems.reference = "4-40 letters, digits, spaces, '-' or '/'";
    if (Object.keys(problems).length) return setErrors(problems);
    setSaving(true);
    try {
      const payment = await paymentApi.uploadBankSlip(order.id, file, reference.trim() || null);
      toast.success("Bank slip uploaded");
      onSent(payment);
    } catch (err) {
      setErrors({ file: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card h-fit space-y-4 p-6" noValidate>
      <h2 className="font-display text-lg font-bold">Add the bank slip</h2>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink">Bank slip (photo or PDF, up to 5 MB)<span className="ml-0.5 text-danger">*</span></p>
        <input ref={fileRef} type="file" accept={SLIP_TYPES.join(",")} className="hidden" data-testid="slip-input"
          onChange={(ev) => { choose(ev.target.files?.[0]); ev.target.value = ""; }} />
        <button type="button" onClick={() => fileRef.current?.click()}
          onDragOver={(ev) => ev.preventDefault()} onDrop={(ev) => { ev.preventDefault(); choose(ev.dataTransfer.files?.[0]); }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-sm transition hover:border-accent hover:bg-accent/5 ${errors.file ? "border-danger" : "border-line"}`}>
          {preview ? (
            <img src={preview} alt="Selected bank slip" className="max-h-48 rounded-lg object-contain" />
          ) : file ? (
            <FileText className="h-10 w-10 text-accent" />
          ) : (
            <Upload className="h-8 w-8 text-muted" />
          )}
          <span className="font-semibold">{file ? file.name : "Click to choose the slip, or drop it here"}</span>
          <span className="text-xs text-muted">{file ? "Click to choose a different file" : "Photo of the deposit slip or a screenshot / PDF from online banking"}</span>
        </button>
        {errors.file && <p className="mt-1 text-xs font-medium text-danger" data-testid="slip-error">{errors.file}</p>}
      </div>
      <Field label="Transfer reference" error={errors.reference} hint="Optional - the reference number on the slip">
        <Input name="reference" value={reference} maxLength={40} error={errors.reference} placeholder="e.g. FT24123456789"
          onChange={(ev) => { setReference(ev.target.value); setErrors((er) => ({ ...er, reference: undefined })); }} />
      </Field>
      <Button type="submit" size="lg" className="w-full" icon={Upload} loading={saving}>Upload slip · {money(order.totalAmount)}</Button>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="block w-full text-center text-sm font-semibold text-muted hover:text-accent">Keep my current slip</button>
      ) : (
        <Link to="/my-orders" className="block text-center text-sm font-semibold text-muted hover:text-accent">Pay later</Link>
      )}
    </form>
  );
}
