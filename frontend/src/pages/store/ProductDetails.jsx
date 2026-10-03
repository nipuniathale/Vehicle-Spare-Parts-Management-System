import { ArrowLeft, Car, Minus, Plus, ShieldCheck, ShoppingCart, Zap } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { cartApi, fitmentApi, reviewApi, sparePartApi } from "../../api/endpoints";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";
import WishlistButton from "../../components/store/WishlistButton";
import PartImage from "../../components/ui/PartImage";
import Spinner from "../../components/ui/Spinner";
import Stars from "../../components/ui/Stars";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useApi } from "../../hooks/useApi";
import { date, money } from "../../utils/format";

export default function ProductDetails() {
  const { id } = useParams();
  const { user, isCustomer } = useAuth();
  const { setCart } = useCart();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const settings = usePublicSettings();

  const { data: part, loading, error } = useApi(useCallback(() => sparePartApi.get(id), [id]), null);
  const { data: fitments } = useApi(useCallback(() => fitmentApi.list({ sparePartId: id }), [id]));
  const { data: reviews } = useApi(useCallback(() => reviewApi.forPart(id), [id]));

  if (loading) return <div className="flex justify-center py-32"><Spinner className="h-8 w-8" /></div>;
  if (error || !part) return <div className="mx-auto max-w-7xl px-4 py-20 text-center text-muted">{error || "Part not found"}</div>;

  const discounted = Number(part.finalPrice) < Number(part.price);
  const maxQty = Math.min(part.stockQuantity || 0, settings.maxQuantityPerItem);

  const requireCustomer = () => {
    if (!user) {
      navigate("/login", { state: { from: `/parts/${id}` } });
      return false;
    }
    if (!isCustomer) {
      toast.error("Only customer accounts can shop");
      return false;
    }
    return true;
  };

  const addToCart = async () => {
    if (!requireCustomer()) return;
    setAdding(true);
    try {
      setCart(await cartApi.add(part.id, quantity));
      toast.success("Added to cart");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAdding(false);
    }
  };

  const buyNow = () => requireCustomer() && navigate(`/checkout?buyNow=${part.id}&qty=${quantity}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Link to="/shop" className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent"><ArrowLeft className="h-4 w-4" /> Back to shop</Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <PartImage src={part.imageUrl} alt={part.name} className="aspect-square w-full" />
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-accent">{part.categoryName}{part.brand ? ` · ${part.brand}` : ""}</p>
          <h1 className="mt-2 font-display text-3xl font-bold">{part.name}</h1>
          <p className="mt-1 text-sm text-muted">SKU {part.sku}</p>
          {part.averageRating && <div className="mt-2 flex items-center gap-2"><Stars value={part.averageRating} /><span className="text-xs text-muted">{reviews.length} review(s)</span></div>}

          <div className="mt-6 flex items-end gap-3">
            <p className="font-display text-3xl font-bold">{money(part.finalPrice)}</p>
            {discounted && <p className="pb-1 text-muted line-through">{money(part.price)}</p>}
            {discounted && <span className="mb-1.5 rounded-full bg-danger/10 px-2.5 py-0.5 text-xs font-bold text-danger">{part.discountName}</span>}
          </div>
          <p className={`mt-2 text-sm font-semibold ${part.inStock ? "text-success" : "text-danger"}`}>
            {part.inStock ? `${part.stockQuantity} in stock` : "Out of stock"}
          </p>

          {part.description && <p className="mt-6 leading-7 text-muted">{part.description}</p>}

          <div className="mt-6 flex items-center gap-2 text-sm">
            <ShieldCheck className="h-5 w-5 text-accent" />
            {part.warrantyMonths ? `${part.warrantyMonths}-month warranty` : "No warranty"} · {settings.returnWindowDays}-day returns
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex h-12 items-center rounded-xl ring-1 ring-line">
              <button type="button" className="px-3 text-muted disabled:opacity-30" disabled={quantity <= 1} onClick={() => setQuantity((q) => q - 1)}><Minus className="h-4 w-4" /></button>
              <span className="w-10 text-center font-bold">{quantity}</span>
              <button type="button" className="px-3 text-muted disabled:opacity-30" disabled={quantity >= maxQty} onClick={() => setQuantity((q) => q + 1)}><Plus className="h-4 w-4" /></button>
            </div>
            <Button size="lg" variant="secondary" icon={ShoppingCart} onClick={addToCart} loading={adding} disabled={!part.inStock}>Add to cart</Button>
            <Button size="lg" icon={Zap} onClick={buyNow} disabled={!part.inStock}>Buy now</Button>
            <WishlistButton part={part} withLabel className="h-12 rounded-xl px-4 text-sm font-semibold ring-1 ring-line hover:text-accent" />
          </div>

          {fitments.length > 0 && (
            <div className="card mt-8 p-5">
              <p className="mb-3 flex items-center gap-2 font-semibold"><Car className="h-4 w-4 text-accent" /> Fits these vehicles</p>
              <div className="flex flex-wrap gap-2">
                {fitments.map((f) => (
                  <Link key={f.id} to={`/shop?vehicleId=${f.vehicleId}`} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold ring-1 ring-line hover:text-accent" title={f.notes || ""}>
                    {f.vehicleName}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <section className="mt-14">
        <h2 className="mb-4 font-display text-2xl font-bold">Customer reviews</h2>
        {reviews.length === 0 ? (
          <p className="card p-8 text-center text-sm text-muted">No reviews yet. Customers can review this part after delivery.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <Avatar src={r.customerImageUrl} name={r.customerName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{r.customerName}</p>
                    <Stars value={r.rating} size={13} />
                  </div>
                  <span className="text-xs text-muted">{date(r.createdAt)}</span>
                </div>
                <p className="mt-3 text-sm">{r.comment || "—"}</p>
                {r.staffReply && (
                  <div className="mt-3 rounded-lg border-l-4 border-accent bg-surface px-3 py-2 text-sm" data-testid="review-reply">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-accent">Reply from AutoHub Lanka · {date(r.repliedAt)}</p>
                    <p className="mt-1">{r.staffReply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
