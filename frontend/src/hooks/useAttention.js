import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { dashboardApi, purchaseOrderApi } from "../api/endpoints";

/**
 * Things that need the logged-in user's attention, for the bell and the menu badges.
 * Reloaded on every page change so counts drop right after something is handled.
 */
export function useAttention(user) {
  const { pathname } = useLocation();
  const [counts, setCounts] = useState({});

  const load = useCallback(async () => {
    try {
      if (user.role === "SUPPLIER") {
        const orders = await purchaseOrderApi.mine();
        setCounts({ newPurchaseOrders: orders.filter((o) => o.status === "PENDING").length });
        return;
      }
      const s = await dashboardApi.summary();
      setCounts({
        approvals: s.pendingPurchaseRequests,
        approvedRequests: s.approvedPurchaseRequests,
        receivable: s.receivableOrders,
        lowStock: s.lowStockItems,
        newOrders: s.placedOrders,
        openClaims: s.openClaims,
      });
    } catch {
      setCounts({});
    }
  }, [user.role]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, pathname]);

  return { counts, notifications: notificationsFor(user.role, counts) };
}

/** Bell entries per role: [counter, text, link]. */
const NOTIFICATIONS = {
  ADMIN: [
    ["lowStock", "spare part(s) at or below reorder level", "/dashboard/admin/inventory"],
    ["newOrders", "new customer order(s) not processed yet", "/dashboard/admin/sales"],
    ["openClaims", "open return / warranty claim(s)", "/dashboard/admin/customer-care"],
  ],
  INVENTORY_MANAGER: [
    ["approvals", "purchase request(s) waiting for your approval", "/dashboard/purchase-requests"],
    ["receivable", "purchase order(s) waiting to be received", "/dashboard/goods-receipts"],
    ["lowStock", "spare part(s) at or below reorder level", "/dashboard/inventory"],
  ],
  PROCUREMENT_OFFICER: [
    ["approvedRequests", "approved request(s) ready for a purchase order", "/dashboard/purchase-requests"],
    ["receivable", "purchase order(s) waiting to be received", "/dashboard/goods-receipts"],
    ["lowStock", "spare part(s) at or below reorder level", "/dashboard/inventory"],
  ],
  SALES_STAFF: [
    ["newOrders", "new order(s) to process", "/dashboard/orders"],
    ["openClaims", "open return / warranty claim(s)", "/dashboard/returns"],
  ],
  MARKETING_MANAGER: [],
  SUPPLIER: [["newPurchaseOrders", "new purchase order(s) waiting for your reply", "/supplier/orders"]],
};

function notificationsFor(role, counts) {
  return (NOTIFICATIONS[role] || [])
    .filter(([key]) => counts[key] > 0)
    .map(([key, text, to]) => ({ key, count: counts[key], text, to }));
}
