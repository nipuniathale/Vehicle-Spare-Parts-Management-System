import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../../components/ui/Button";
import PartImage from "../../components/ui/PartImage";
import Spinner from "../../components/ui/Spinner";
import { useWishlist } from "../../context/WishlistContext";
import { date, money } from "../../utils/format";

/** Parts the customer saved for later - with today's price and stock. */
export default function Wishlist() {
  const { items, loading, remove, moveToCart } = useWishlist();

  if (loading && !items.length) return <div className="flex justify-center py-32"><Spinner className="h-8 w-8" /></div>;

  if (!items.length) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent"><Heart className="h-8 w-8" /></span>
        <h1 className="mt-4 font-display text-2xl font-bold">Your wishlist is empty</h1>
        <p className="mt-2 text-sm text-muted">Tap the heart on any part to save it for later.</p>
        <Link to="/shop" className="mt-6 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white">Browse parts</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">My account</p>
      <h1 className="mb-6 font-display text-3xl font-bold">My wishlist <span className="text-lg text-muted">({items.length})</span></h1>

      <div className="space-y-3">
        {items.map(({ id, addedAt, part }) => {
          const discounted = Number(part.finalPrice) < Number(part.price);
          const sellable = part.active && part.inStock;
          return (
            <div key={id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <PartImage src={part.imageUrl} alt={part.name} className="h-20 w-20 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{part.categoryName}</p>
                <Link to={`/parts/${part.id}`} className="font-display font-bold hover:text-accent">{part.name}</Link>
                <p className="text-xs text-muted">SKU {part.sku} · saved {date(addedAt)}</p>
                <p className={`mt-1 text-xs font-semibold ${sellable ? "text-success" : "text-danger"}`}>
                  {!part.active ? "No longer sold" : part.inStock ? `${part.stockQuantity} in stock` : "Out of stock"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-bold">{money(part.finalPrice)}</p>
                {discounted && <p className="text-xs text-muted line-through">{money(part.price)}</p>}
              </div>
              <div className="flex gap-2">
                <Button icon={ShoppingCart} disabled={!sellable} onClick={() => moveToCart(part)}>Move to cart</Button>
                <button type="button" title="Remove" onClick={() => remove(part.id)} className="rounded-lg p-2.5 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
