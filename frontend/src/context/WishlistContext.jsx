import { createContext, useCallback, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { wishlistApi } from "../api/endpoints";
import { useAuth } from "./AuthContext";
import { useCart } from "./CartContext";

const WishlistContext = createContext(null);

/** The logged-in customer's wishlist (stored in the database), shared by the header, product cards and the wishlist page. */
export function WishlistProvider({ children }) {
  const { isCustomer } = useAuth();
  const { setCart } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isCustomer) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      setItems(await wishlistApi.list());
    } finally {
      setLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => setItems([]));
  }, [refresh]);

  const has = useCallback((partId) => items.some((i) => i.part.id === partId), [items]);

  const toggle = useCallback(async (part) => {
    try {
      if (items.some((i) => i.part.id === part.id)) {
        setItems(await wishlistApi.remove(part.id));
        toast.success("Removed from your wishlist");
      } else {
        setItems(await wishlistApi.add(part.id));
        toast.success(`${part.name} saved to your wishlist`);
      }
    } catch (err) {
      toast.error(err.message);
    }
  }, [items]);

  const remove = useCallback(async (partId) => {
    try {
      setItems(await wishlistApi.remove(partId));
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  const moveToCart = useCallback(async (part) => {
    try {
      setCart(await wishlistApi.moveToCart(part.id));
      setItems((list) => list.filter((i) => i.part.id !== part.id));
      toast.success(`${part.name} moved to your cart`);
    } catch (err) {
      toast.error(err.message);
    }
  }, [setCart]);

  return (
    <WishlistContext.Provider value={{ items, loading, refresh, has, toggle, remove, moveToCart }}>
      {children}
    </WishlistContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useWishlist = () => useContext(WishlistContext);
