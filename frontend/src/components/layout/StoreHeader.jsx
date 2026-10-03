import { Heart, LayoutDashboard, LogOut, Package, RotateCcw, Search, ShieldCheck, ShoppingCart, Trash2, Truck } from "lucide-react";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { cartApi } from "../../api/endpoints";
import { homeFor, useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useClickOutside } from "../../hooks/useClickOutside";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import { money } from "../../utils/format";
import Avatar from "../ui/Avatar";
import PartImage from "../ui/PartImage";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";

/** Storefront header: black promo strip + dark main bar (logo, menu, search, account, wishlist, cart). */
export default function StoreHeader() {
  const { user, isCustomer, logout } = useAuth();
  const { items: wishlist } = useWishlist();
  const settings = usePublicSettings();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const onSearch = (e) => {
    e.preventDefault();
    navigate(`/shop?search=${encodeURIComponent(search.trim())}`);
  };

  const navClass = ({ isActive }) =>
    `px-1 py-2 text-[13px] font-semibold uppercase tracking-wide transition ${isActive ? "text-accent" : "text-white hover:text-accent"}`;

  return (
    <>
      <div className="hidden bg-black text-[12px] font-semibold uppercase tracking-wide text-white/85 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 sm:px-6">
          <span className="flex items-center gap-2"><Truck className="h-4 w-4 text-accent" /> Island-wide delivery</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-accent" /> Genuine parts with warranty</span>
          <span className="flex items-center gap-2"><RotateCcw className="h-4 w-4 text-accent" /> Hassle-free returns in {settings.returnWindowDays} days</span>
        </div>
      </div>

      <header className="carbon sticky top-0 z-50 border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3.5 sm:px-6">
          <Logo dark />

          <nav className="hidden items-center gap-5 lg:flex">
            <NavLink to="/" end className={navClass}>Home</NavLink>
            <NavLink to="/shop" className={navClass}>Shop parts</NavLink>
            {isCustomer && <NavLink to="/my-orders" className={navClass}>My orders</NavLink>}
          </nav>

          <form onSubmit={onSearch} className="relative hidden flex-1 md:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search parts, brands or SKU"
              className="h-10 w-full rounded-lg border border-white/15 bg-white/[0.07] pl-10 pr-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-accent focus:ring-4 focus:ring-accent/20"
            />
          </form>

          <div className="ml-auto flex items-center gap-1 text-white">
            {!user && (
              <>
                <Link to="/login" className="rounded-lg px-3 py-2 text-sm font-semibold hover:text-accent">Login</Link>
                <Link to="/register" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold hover:bg-accent-dark">Register</Link>
              </>
            )}

            {user && !isCustomer && (
              <Link to={homeFor(user)} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold hover:bg-accent-dark">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </Link>
            )}

            {isCustomer && (
              <>
                <Link to="/my-orders" title="My Orders" className="rounded-lg p-2 hover:text-accent lg:hidden"><Package className="h-5 w-5" /></Link>
                <Link to="/profile" title="My profile" className="flex items-center gap-2 rounded-lg p-1.5 text-sm font-semibold hover:text-accent">
                  <Avatar src={user.profileImageUrl} name={user.fullName} size="sm" className="!ring-white/20" /> <span className="hidden sm:inline">{user.firstName}</span>
                </Link>
                <NotificationBell dark />
                <Link to="/wishlist" title="My wishlist" className="relative rounded-lg p-2 hover:text-accent">
                  <Heart className="h-5 w-5" />
                  {wishlist.length > 0 && <Count value={wishlist.length} />}
                </Link>
                <CartMenu />
              </>
            )}

            {user && (
              <button type="button" onClick={() => { logout(); navigate("/"); }} title="Logout" className="rounded-lg p-2 text-white/70 hover:text-accent">
                <LogOut className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

function Count({ value }) {
  return (
    <span className="absolute right-0 top-0 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
      {value}
    </span>
  );
}

/** Cart icon with a drop-down that lists everything in the cart, so the customer can check it from any page. */
function CartMenu() {
  const { cart, setCart } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(close);

  const remove = async (line) => {
    try {
      setCart(await cartApi.remove(line.id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const go = (to) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} title="Cart" aria-expanded={open}
        className="relative flex items-center gap-2 rounded-lg p-2 hover:text-accent">
        <ShoppingCart className="h-5 w-5" />
        {cart.itemCount > 0 && <Count value={cart.itemCount} />}
        <span className="hidden text-xs font-bold xl:block">{money(cart.total)}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-white text-ink shadow-xl">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold">Your cart</p>
            <p className="text-xs text-muted">{cart.itemCount} item(s)</p>
          </div>
          {cart.items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Your cart is empty.</p>
          ) : (
            <div className="max-h-80 divide-y divide-line overflow-y-auto">
              {cart.items.map((line) => (
                <div key={line.id} className="flex items-center gap-3 px-4 py-3">
                  <PartImage src={line.imageUrl} alt={line.name} className="h-12 w-12 shrink-0 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <button type="button" onClick={() => go(`/parts/${line.sparePartId}`)} className="block w-full truncate text-left text-sm font-semibold hover:text-accent">{line.name}</button>
                    <p className="text-xs text-muted">{line.quantity} × {money(line.unitPrice)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">{money(line.subtotal)}</p>
                  <button type="button" title="Remove" onClick={() => remove(line)} className="rounded-lg p-1.5 text-muted hover:bg-danger/10 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="border-t border-line p-4">
            <div className="mb-3 flex justify-between font-display font-bold"><span>Total</span><span>{money(cart.total)}</span></div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => go("/cart")} className="rounded-lg py-2 text-sm font-semibold ring-1 ring-line hover:bg-surface">View cart</button>
              <button type="button" disabled={!cart.items.length} onClick={() => go("/checkout")}
                className="rounded-lg bg-accent py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-40">Checkout</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
