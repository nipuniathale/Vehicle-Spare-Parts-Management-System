import { Mail, MapPin, Phone } from "lucide-react";
import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { usePublicSettings } from "../../hooks/usePublicSettings";
import Logo from "./Logo";
import StoreHeader from "./StoreHeader";
import { paymentMethodsText } from "../../utils/format";

export default function StoreLayout() {
  const settings = usePublicSettings();
  const { pathname } = useLocation();
  // a new page starts at the top (filter changes on the same page keep the scroll position)
  useEffect(() => {
    window.scrollTo(0, 0); // braces: newer browsers return a Promise here, which React must not receive
  }, [pathname]);
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <StoreHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="carbon mt-16 text-white/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <Logo dark />
            <p className="mt-4 max-w-xs text-sm leading-6">Your trusted source for genuine automotive spare parts, delivered island-wide.</p>
          </div>
          <div className="text-sm leading-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white">Shop</p>
            <Link to="/shop" className="block hover:text-accent">All spare parts</Link>
            <Link to="/my-orders" className="block hover:text-accent">My orders</Link>
            <Link to="/cart" className="block hover:text-accent">Cart</Link>
          </div>
          <div className="text-sm leading-7">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white">Customer care</p>
            <p>Returns within {settings.returnWindowDays} days of delivery</p>
            <p>Warranty claims from My Orders</p>
            <p>{paymentMethodsText(settings)}</p>
          </div>
          <div className="space-y-2 text-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white">Contact</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-accent" /> {settings.storeAddress}</p>
            <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-accent" /> {settings.storePhone}</p>
            <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-accent" /> {settings.storeEmail}</p>
          </div>
        </div>
        <p className="border-t border-white/10 py-4 text-center text-xs">© {new Date().getFullYear()} AutoHub Lanka. All rights reserved.</p>
      </footer>
    </div>
  );
}
