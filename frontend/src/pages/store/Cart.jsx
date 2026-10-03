import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { cartApi } from "../../api/endpoints";
import Button from "../../components/ui/Button";
import PartImage from "../../components/ui/PartImage";
import { useCart } from "../../context/CartContext";
import { money } from "../../utils/format";

export default function Cart() {
  const { cart, setCart, refresh } = useCart();
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const run = async (action) => {
    setBusy(true);
    try {
      const result = await action();
      if (result) setCart(result);
      else await refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent"><ShoppingBag className="h-8 w-8" /></span>
        <h1 className="mt-4 font-display text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-sm text-muted">Find the parts you need in our catalogue.</p>
        <Link to="/shop" className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white">Browse parts</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="font-display text-3xl font-bold">Your cart</h1>
        <button type="button" disabled={busy} onClick={() => run(() => cartApi.clear())} className="text-sm font-semibold text-danger">Clear cart</button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {cart.items.map((line) => (
            <div key={line.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <PartImage src={line.imageUrl} alt={line.name} className="h-20 w-20 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <Link to={`/parts/${line.sparePartId}`} className="font-display font-bold hover:text-accent">{line.name}</Link>
                <p className="text-xs text-muted">SKU {line.sku} · {line.availableStock} in stock</p>
                <p className="mt-1 text-sm font-semibold">
                  {money(line.unitPrice)}
                  {Number(line.unitPrice) < Number(line.listPrice) && <span className="ml-2 text-xs text-muted line-through">{money(line.listPrice)}</span>}
                </p>
              </div>
              <div className="flex h-10 items-center rounded-lg ring-1 ring-line">
                <button type="button" disabled={busy || line.quantity <= 1} onClick={() => run(() => cartApi.update(line.id, line.sparePartId, line.quantity - 1))} className="px-2.5 disabled:opacity-30"><Minus className="h-4 w-4" /></button>
                <span className="w-8 text-center text-sm font-bold">{line.quantity}</span>
                <button type="button" disabled={busy || line.quantity >= line.availableStock} onClick={() => run(() => cartApi.update(line.id, line.sparePartId, line.quantity + 1))} className="px-2.5 disabled:opacity-30"><Plus className="h-4 w-4" /></button>
              </div>
              <p className="w-28 text-right font-display font-bold">{money(line.subtotal)}</p>
              <button type="button" disabled={busy} onClick={() => run(() => cartApi.remove(line.id))} title="Remove" className="rounded-lg p-2 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>

        <div className="card h-fit p-6">
          <h2 className="font-display text-lg font-bold">Summary</h2>
          <div className="mt-4 flex justify-between text-sm"><span className="text-muted">Items</span><span>{cart.itemCount}</span></div>
          <div className="mt-2 flex justify-between border-t border-line pt-3 font-display text-xl font-bold"><span>Total</span><span>{money(cart.total)}</span></div>
          <p className="mt-1 text-xs text-muted">Coupons can be applied at checkout.</p>
          <Button size="lg" className="mt-6 w-full" onClick={() => navigate("/checkout")} disabled={busy}>Proceed to checkout</Button>
        </div>
      </div>
    </div>
  );
}
