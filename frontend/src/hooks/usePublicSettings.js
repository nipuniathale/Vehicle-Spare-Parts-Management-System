import { useEffect, useState } from "react";
import { settingsApi } from "../api/endpoints";

/** Used until the real values arrive (same as the backend defaults). */
export const DEFAULT_SETTINGS = {
  storeName: "AutoHub Lanka",
  storeEmail: "info@autohub.lk",
  storePhone: "0112345678",
  storeAddress: "No. 25, Galle Road, Colombo 03",
  cardPaymentEnabled: true,
  cashOnDeliveryEnabled: true,
  bankTransferEnabled: false,
  maxQuantityPerItem: 100,
  returnWindowDays: 14,
};

let cache = null;
let pending = null;

/** Store details and enabled payment methods from Settings (loaded once, shared by every page). */
export function usePublicSettings() {
  const [settings, setSettings] = useState(cache || DEFAULT_SETTINGS);
  useEffect(() => {
    if (cache) return;
    pending ??= settingsApi.public().then((s) => (cache = s));
    pending.then(setSettings).catch(() => {
      pending = null;
    });
  }, []);
  return settings;
}

/** Called after the admin saves Settings so the next page shows the new values. */
export function clearPublicSettings() {
  cache = null;
  pending = null;
}
