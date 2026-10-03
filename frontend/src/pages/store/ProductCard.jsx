import { ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { cartApi } from "../../api/endpoints";
import WishlistButton from "../../components/store/WishlistButton";
import PartImage from "../../components/ui/PartImage";
import Stars from "../../components/ui/Stars";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { money } from "../../utils/format";

export default function ProductCard({ part }) {
  const { user, isCustomer } = useAuth();
  const { setCart } = useCart();
  const navigate = useNavigate();
  const discounted = Number(part.finalPrice) < Number(part.price);

  const addToCart = async (e) => {
    e.preventDefault();
    if (!user) return navigate("/login", { state: { from: `/parts/${part.id}` } });
    if (!isCustomer) return toast.error("Only customer accounts can shop");
    try {
      setCart(await cartApi.add(part.id, 1));
      toast.success(`${part.name} added to cart`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Link to={`/parts/${part.id}`} className="card group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <PartImage src={part.imageUrl} alt={part.name} className="h-full w-full transition duration-500 group-hover:scale-105" />
        {discounted && (
          <span className="absolute left-3 top-3 rounded-full bg-danger px-2.5 py-1 text-[11px] font-bold text-white">
            {Math.round((1 - part.finalPrice / part.price) * 100)}% OFF
          </span>
        )}
        {part.brand && <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase text-ink">{part.brand}</span>}
        <WishlistButton part={part} className="absolute right-3 top-3 h-9 w-9 rounded-full bg-white/95 text-ink shadow hover:text-accent" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">{part.categoryName}</p>
        <h3 className="mt-1 line-clamp-2 font-display font-bold text-ink">{part.name}</h3>
        <p className="mt-0.5 text-xs text-muted">SKU {part.sku}</p>
        {part.averageRating && <div className="mt-1"><Stars value={part.averageRating} size={13} /></div>}
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <p className="font-display text-lg font-bold text-ink">{money(part.finalPrice)}</p>
            {discounted && <p className="text-xs text-muted line-through">{money(part.price)}</p>}
            <p className={`text-[11px] font-semibold ${part.inStock ? "text-success" : "text-danger"}`}>{part.inStock ? "In stock" : "Out of stock"}</p>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={!part.inStock}
            title="Add to cart"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/25 transition hover:bg-accent-dark disabled:bg-line disabled:shadow-none"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
