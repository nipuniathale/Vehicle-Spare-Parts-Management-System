import {
  BadgePercent, BarChart3, Boxes, Car, ClipboardList, Gauge, HeartHandshake, History, LayoutGrid, Link2,
  Megaphone, MessageSquare, PackageCheck, Receipt, RotateCcw, Settings, ShoppingBag, ShoppingCart, Star, Tags, Truck,
  Users, Wallet, Warehouse, Wrench,
} from "lucide-react";

const ADMIN = "ADMIN";
const INV = "INVENTORY_MANAGER";
const PROC = "PROCUREMENT_OFFICER";
const SALES = "SALES_STAFF";
const MKT = "MARKETING_MANAGER";
const STAFF = [ADMIN, INV, PROC, SALES, MKT];

/**
 * Sidebar sections. Each item is shown only to the listed roles.
 * The admin only sees summaries, reports, the activity log and settings (no create / edit / delete screens
 * of business data); the other roles get the screens they work with every day.
 * `badge` names a counter from useAttention() - or one per role ({ ROLE: counter }).
 */
export const MENU = [
  {
    title: "Main menu",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: Gauge, roles: STAFF, end: true },
    ],
  },
  {
    title: "Business functions",
    items: [
      { to: "/dashboard/admin/inventory", label: "Inventory", icon: Warehouse, roles: [ADMIN] },
      { to: "/dashboard/admin/procurement", label: "Procurement", icon: Truck, roles: [ADMIN] },
      { to: "/dashboard/admin/sales", label: "Sales & Orders", icon: ShoppingCart, roles: [ADMIN] },
      { to: "/dashboard/admin/marketing", label: "Marketing", icon: Megaphone, roles: [ADMIN] },
      { to: "/dashboard/admin/customer-care", label: "Customer Care", icon: HeartHandshake, roles: [ADMIN] },
    ],
  },
  {
    title: "Inventory",
    items: [
      { to: "/dashboard/categories", label: "Categories", icon: LayoutGrid, roles: [INV] },
      { to: "/dashboard/spare-parts", label: "Spare Parts", icon: Wrench, roles: [INV] },
      { to: "/dashboard/vehicles", label: "Vehicles", icon: Car, roles: [INV] },
      { to: "/dashboard/fitments", label: "Fitments", icon: Link2, roles: [INV] },
      { to: "/dashboard/inventory", label: "Stock Levels", icon: Warehouse, roles: [INV, PROC], badge: "lowStock" },
      { to: "/dashboard/stock-movements", label: "Stock Movements", icon: Boxes, roles: [INV] },
    ],
  },
  {
    title: "Procurement",
    items: [
      { to: "/dashboard/suppliers", label: "Suppliers", icon: Truck, roles: [PROC] },
      { to: "/dashboard/purchase-requests", label: "Purchase Requests", icon: ClipboardList, roles: [PROC, INV], badge: { [INV]: "approvals", [PROC]: "approvedRequests" } },
      { to: "/dashboard/purchase-orders", label: "Purchase Orders", icon: ShoppingBag, roles: [PROC] },
      { to: "/dashboard/goods-receipts", label: "Goods Receipts", icon: PackageCheck, roles: [PROC, INV], badge: "receivable" },
    ],
  },
  {
    title: "Sales",
    items: [
      { to: "/dashboard/orders", label: "Orders", icon: Receipt, roles: [SALES], badge: "newOrders" },
      { to: "/dashboard/payments", label: "Payments", icon: Wallet, roles: [SALES] },
    ],
  },
  {
    title: "Marketing",
    items: [
      { to: "/dashboard/promotions", label: "Promotions", icon: Megaphone, roles: [MKT] },
      { to: "/dashboard/discounts", label: "Discounts", icon: BadgePercent, roles: [MKT] },
      { to: "/dashboard/coupons", label: "Coupons", icon: Tags, roles: [MKT] },
    ],
  },
  {
    title: "Customer care",
    items: [
      { to: "/dashboard/reviews", label: "Reviews", icon: Star, roles: [SALES] },
      { to: "/dashboard/feedback", label: "Feedback", icon: MessageSquare, roles: [SALES] },
      { to: "/dashboard/returns", label: "Returns & Warranty", icon: RotateCcw, roles: [SALES], badge: "openClaims" },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/dashboard/admin/reports", label: "Reports", icon: BarChart3, roles: [ADMIN] },
      { to: "/dashboard/admin/activity", label: "Activity Log", icon: History, roles: [ADMIN] },
      { to: "/dashboard/users", label: "Users", icon: Users, roles: [ADMIN] },
      { to: "/dashboard/admin/settings", label: "Settings", icon: Settings, roles: [ADMIN] },
    ],
  },
];

export const SUPPLIER_MENU = [
  {
    title: "Main menu",
    items: [
      { to: "/supplier", label: "Dashboard", icon: Gauge, roles: ["SUPPLIER"], end: true },
      { to: "/supplier/orders", label: "Purchase Orders", icon: ShoppingBag, roles: ["SUPPLIER"], badge: "newPurchaseOrders" },
    ],
  },
];

/** The roles allowed on each CRUD route (taken from the menu so the two never disagree). */
export function rolesFor(path) {
  for (const section of MENU) {
    const item = section.items.find((i) => i.to === path);
    if (item) return item.roles;
  }
  return [];
}
