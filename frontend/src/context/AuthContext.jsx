import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { tokenStorage } from "../api/client";
import { authApi, userApi } from "../api/endpoints";

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const STAFF_ROLES = ["ADMIN", "INVENTORY_MANAGER", "PROCUREMENT_OFFICER", "SALES_STAFF", "MARKETING_MANAGER"];

/** Where each role lands after logging in. */
// eslint-disable-next-line react-refresh/only-export-components
export function homeFor(user) {
  if (!user) return "/";
  if (user.role === "SUPPLIER") return "/supplier";
  if (STAFF_ROLES.includes(user.role)) return "/dashboard";
  return "/";
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStorage.get()));

  useEffect(() => {
    if (!tokenStorage.get()) return;
    userApi
      .me()
      .then(setUser)
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user } = await authApi.login({ email, password });
    tokenStorage.set(token);
    setUser(user);
    return user;
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const { token, user } = await authApi.google(credential);
    tokenStorage.set(token);
    setUser(user);
    return user;
  }, []);

  const register = useCallback(async (form) => {
    const { token, user } = await authApi.register(form);
    tokenStorage.set(token);
    setUser(user);
    return user;
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      login,
      loginWithGoogle,
      register,
      logout,
      isCustomer: user?.role === "CUSTOMER",
      isStaff: STAFF_ROLES.includes(user?.role),
      hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
    }),
    [user, loading, login, loginWithGoogle, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
