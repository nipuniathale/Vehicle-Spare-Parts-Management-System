export const money = (value) =>
  `Rs. ${Number(value || 0).toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Whole rupees, for KPI tiles: Rs. 125,450 */
export const moneyShort = (value) => `Rs. ${Math.round(Number(value || 0)).toLocaleString("en-LK")}`;

export const date = (value) =>
  value ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—";

/** PARTIALLY_RECEIVED -> Partially received */
export const label = (value) => {
  if (!value) return "";
  const text = String(value).toLowerCase().replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const today = () => new Date().toISOString().slice(0, 10);

export const addDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const ROLE_LABELS = {
  ADMIN: "Administrator",
  INVENTORY_MANAGER: "Inventory Manager",
  PROCUREMENT_OFFICER: "Procurement Officer",
  SALES_STAFF: "Sales Staff",
  MARKETING_MANAGER: "Marketing Manager",
  SUPPLIER: "Supplier",
  CUSTOMER: "Customer",
};

/** "Card, cash on delivery or bank transfer" - the payment methods switched on in Settings. */
export const paymentMethodsText = (settings) => {
  const names = [
    settings.cardPaymentEnabled && "card",
    settings.cashOnDeliveryEnabled && "cash on delivery",
    settings.bankTransferEnabled && "bank transfer",
  ].filter(Boolean);
  const text = names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}` : names[0] || "";
  return text.charAt(0).toUpperCase() + text.slice(1);
};
