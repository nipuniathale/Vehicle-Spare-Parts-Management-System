import { CreditCard, Tag, Truck } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { couponApi, orderApi, sparePartApi } from "../../api/endpoints";
import Button from "../../components/ui/Button";
import Field, { Checkbox, Input, Textarea } from "../../components/ui/Field";
import PartImage from "../../components/ui/PartImage";
import Spinner from "../../components/ui/Spinner";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useApi } from "../../hooks/useApi";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import { toText, useForm } from "../../hooks/useForm";
import { PHONE_REGEX, invalid } from "../../utils/validation";
import { money } from "../../utils/format";

const METHODS = [
  ["CARD", "Card payment", "Pay now with debit / credit card", "cardPaymentEnabled"],
  ["CASH_ON_DELIVERY", "Cash on delivery", "Pay the courier when it arrives", "cashOnDeliveryEnabled"],
  ["BANK_TRANSFER", "Bank transfer", "Transfer to our bank account, then upload the bank slip", "bankTransferEnabled"],
];

/**
 * Handles both "Buy now" (?buyNow=partId&qty=n) and cart checkout.
 * The phone number and delivery address are asked here (not at registration) and can be saved for next time.
 */
export default function Checkout() {
  const { user, setUser } = useAuth();
  const settings = usePublicSettings();
  const methods = METHODS.filter((m) => settings[m[3]]);
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const buyNowId = params.get("buyNow");
  const buyNowQty = Math.max(1, Number(params.get("qty") || 1));

  const loadPart = useCallback(() => (buyNowId ? sparePartApi.get(buyNowId) : Promise.resolve(null)), [buyNowId]);
  const { data: part, loading } = useApi(loadPart, null);

  const [placed, setPlaced] = useState(false);
  const [coupon, setCoupon] = useState({ code: "", applied: null });
  const form = useForm({ deliveryAddress: user.address || "", contactPhone: user.phone || "", note: "", paymentMethod: "", saveDetails: true });
  // first enabled method unless the customer picked one
  const paymentMethod = methods.some((m) => m[0] === form.values.paymentMethod) ? form.values.paymentMethod : methods[0]?.[0];
  const firstOrder = !user.phone || !user.address;
  const e = form.errors;

  const lines = buyNowId
    ? part ? [{ key: "buy", name: part.name, sku: part.sku, imageUrl: part.imageUrl, quantity: buyNowQty, unitPrice: part.finalPrice, subtotal: part.finalPrice * buyNowQty }] : []
    : cart.items.map((l) => ({ key: l.id, ...l }));
  const subtotal = lines.reduce((sum, l) => sum + Number(l.subtotal), 0);
  const discount = coupon.applied?.discountAmount || 0;

  const applyCoupon = async () => {
    try {
      const result = await couponApi.check(coupon.code.trim(), subtotal);
      setCoupon({ code: result.code, applied: result });
      toast.success(`Coupon applied: −${money(result.discountAmount)}`);
    } catch (err) {
      setCoupon((c) => ({ ...c, applied: null }));
      toast.error(err.message);
    }
  };

  const placeOrder = form.submit(async (v) => {
    const problems = {};
    if (v.deliveryAddress.trim().length < 10) problems.deliveryAddress = "Delivery address must be 10-300 characters";
    if (!PHONE_REGEX.test(v.contactPhone.trim())) problems.contactPhone = "Phone must contain 9-15 digits, e.g. 0771234567";
    if (!paymentMethod) problems.paymentMethod = "No payment method is available right now";
    if (Object.keys(problems).length) {
      throw invalid(problems);
    }
    const order = await orderApi.checkout({
      sparePartId: buyNowId ? Number(buyNowId) : null,
      quantity: buyNowId ? buyNowQty : null,
      deliveryAddress: v.deliveryAddress,
      contactPhone: v.contactPhone,
      note: toText(v.note),
      couponCode: coupon.applied ? coupon.applied.code : null,
      paymentMethod,
      saveDetails: v.saveDetails,
    });
    setPlaced(true);
    if (v.saveDetails) setUser({ ...user, phone: v.contactPhone.trim(), address: v.deliveryAddress.trim() });
    if (paymentMethod === "CARD" || paymentMethod === "BANK_TRANSFER") {
      navigate(`/orders/${order.id}/pay`, { replace: true });
    } else {
      toast.success(`Order #${order.id} placed - pay cash on delivery`);
      navigate("/my-orders", { replace: true });
    }
    // the backend emptied the cart - update the header badge
    refresh().catch(() => {});
  });

  if (loading) return <div className="flex justify-center py-32"><Spinner className="h-8 w-8" /></div>;
  if (!buyNowId && cart.items.length === 0 && !placed) return <Navigate to="/cart" replace />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">{buyNowId ? "Buy now" : "Cart checkout"}</p>
      <h1 className="mb-6 font-display text-3xl font-bold">Checkout</h1>

      <form onSubmit={placeOrder} className="grid gap-8 lg:grid-cols-[1fr_380px]" noValidate>
        <div className="space-y-6">
          <div className="card space-y-4 p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Truck className="h-5 w-5 text-accent" /> Delivery details</h2>
            {firstOrder && <p className="rounded-lg bg-info/10 px-3 py-2 text-xs text-ink">We need your phone number and delivery address to deliver this order.</p>}
            <Field label="Delivery address" error={e.deliveryAddress} required><Textarea rows={3} {...form.bind("deliveryAddress")} error={e.deliveryAddress} placeholder="House no, street, city" /></Field>
            <Field label="Contact phone" error={e.contactPhone} required><Input {...form.bind("contactPhone")} error={e.contactPhone} placeholder="0771234567" /></Field>
            <Field label="Note for the courier" error={e.note}><Input {...form.bind("note")} error={e.note} /></Field>
            <Checkbox label="Save this phone number and address to my profile" checked={form.values.saveDetails} onChange={(ev) => form.set("saveDetails", ev.target.checked)} />
          </div>

          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><CreditCard className="h-5 w-5 text-accent" /> Payment method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {methods.map(([value, title, text]) => (
                <label key={value} className={`cursor-pointer rounded-xl p-4 ring-1 transition ${paymentMethod === value ? "bg-accent/5 ring-2 ring-accent" : "ring-line hover:bg-surface"}`}>
                  <input type="radio" name="paymentMethod" value={value} checked={paymentMethod === value} onChange={() => form.set("paymentMethod", value)} className="sr-only" />
                  <p className="font-semibold">{title}</p>
                  <p className="text-xs text-muted">{text}</p>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="card h-fit p-6">
          <h2 className="font-display text-lg font-bold">Order summary</h2>
          <div className="mt-4 space-y-3">
            {lines.map((l) => (
              <div key={l.key} className="flex items-center gap-3">
                <PartImage src={l.imageUrl} alt={l.name} className="h-12 w-12 rounded-lg" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{l.name}</p><p className="text-xs text-muted">{l.quantity} × {money(l.unitPrice)}</p></div>
                <p className="text-sm font-semibold">{money(l.subtotal)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="input pl-9 uppercase" placeholder="Coupon code" value={coupon.code} onChange={(ev) => setCoupon({ code: ev.target.value, applied: null })} />
            </div>
            <Button variant="secondary" onClick={applyCoupon} disabled={!coupon.code.trim()}>Apply</Button>
          </div>

          <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{money(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-success"><span>Coupon {coupon.applied.code}</span><span>−{money(discount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted">Delivery</span><span className="text-success">Free</span></div>
            <div className="flex justify-between border-t border-line pt-2 font-display text-xl font-bold"><span>Total</span><span>{money(subtotal - discount)}</span></div>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full" loading={form.saving}>
            {paymentMethod === "CARD" ? "Place order & pay" : paymentMethod === "BANK_TRANSFER" ? "Place order & see bank details" : "Place order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
