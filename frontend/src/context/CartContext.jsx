import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { cartApi } from "../api/endpoints";
import { useAuth } from "./AuthContext";

const CartContext = createContext(null);
const EMPTY = { items: [], itemCount: 0, total: 0 };

/** Keeps the header badge in sync with the cart stored in the database. */
export function CartProvider({ children }) {
  const { isCustomer } = useAuth();
  const [cart, setCart] = useState(EMPTY);

  const refresh = useCallback(async () => {
    if (!isCustomer) {
      setCart(EMPTY);
      return EMPTY;
    }
    const data = await cartApi.get();
    setCart(data);
    return data;
  }, [isCustomer]);

  useEffect(() => {
    // reload the cart when the logged-in user changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh().catch(() => setCart(EMPTY));
  }, [refresh]);

  return <CartContext.Provider value={{ cart, setCart, refresh }}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
