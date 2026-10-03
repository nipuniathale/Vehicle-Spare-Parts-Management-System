import api, { crud } from "./client";

export const authApi = {
  login: (body) => api.post("/auth/login", body),
  register: (body) => api.post("/auth/register", body),
  google: (credential) => api.post("/auth/google", { credential }),
  googleConfig: () => api.get("/auth/google/config"),
};

export const userApi = {
  ...crud("/users"),
  me: () => api.get("/users/me"),
  updateMe: (body) => api.put("/users/me", body),
  changePassword: (body) => api.put("/users/me/password", body),
  deleteMe: () => api.delete("/users/me"),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/users/me/avatar", form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  removeAvatar: () => api.delete("/users/me/avatar"),
  customers: () => api.get("/users/customers"),
};

// ---- inventory management
export const categoryApi = crud("/categories");
export const sparePartApi = crud("/spare-parts");
export const vehicleApi = crud("/vehicles");
export const fitmentApi = crud("/fitments");
export const inventoryApi = crud("/inventory");
export const movementApi = crud("/stock-movements");

// ---- procurement
export const supplierApi = crud("/suppliers");
export const purchaseRequestApi = {
  ...crud("/purchase-requests"),
  approve: (id, note) => api.patch(`/purchase-requests/${id}/approve`, { note }),
  reject: (id, note) => api.patch(`/purchase-requests/${id}/reject`, { note }),
};
export const purchaseOrderApi = {
  ...crud("/purchase-orders"),
  changeStatus: (id, body) => api.patch(`/purchase-orders/${id}/status`, body),
  mine: () => api.get("/purchase-orders/supplier/mine"),
  supplierStatus: (id, body) => api.patch(`/purchase-orders/${id}/supplier-status`, body),
};
/** Goods are received per purchase order (receive); single receipts can be corrected or deleted. */
export const goodsReceiptApi = {
  list: (params) => api.get("/goods-receipts", { params }),
  get: (id) => api.get(`/goods-receipts/${id}`),
  update: (id, body) => api.put(`/goods-receipts/${id}`, body),
  remove: (id) => api.delete(`/goods-receipts/${id}`),
  receivableOrders: () => api.get("/goods-receipts/receivable-orders"),
  receive: (body) => api.post("/goods-receipts/receive", body),
};

// ---- sales
export const cartApi = {
  get: () => api.get("/cart"),
  add: (sparePartId, quantity) => api.post("/cart/items", { sparePartId, quantity }),
  update: (itemId, sparePartId, quantity) => api.put(`/cart/items/${itemId}`, { sparePartId, quantity }),
  remove: (itemId) => api.delete(`/cart/items/${itemId}`),
  clear: () => api.delete("/cart"),
};
export const orderApi = {
  ...crud("/orders"),
  checkout: (body) => api.post("/orders/checkout", body),
  mine: () => api.get("/orders/mine"),
  changeStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
};
export const paymentApi = {
  ...crud("/payments"),
  forOrder: (orderId) => api.get(`/payments/order/${orderId}`),
  payByCard: (orderId, card) => api.post(`/payments/order/${orderId}/card`, card),
  uploadBankSlip: (orderId, file, reference) => {
    const form = new FormData();
    form.append("file", file);
    if (reference) form.append("reference", reference);
    return api.post(`/payments/order/${orderId}/bank-slip`, form, { headers: { "Content-Type": "multipart/form-data" } });
  },
  /** The slip file as a Blob (needs the login token, so it cannot be a plain <img src>). */
  bankSlip: (paymentId) => api.get(`/payments/${paymentId}/slip`, { responseType: "blob" }),
  confirmTransfer: (id) => api.patch(`/payments/${id}/confirm-transfer`),
  rejectTransfer: (id, reason) => api.patch(`/payments/${id}/reject-transfer`, { reason }),
};
/** Invoices are generated automatically when an order is paid - read-only. */
export const invoiceApi = {
  forOrder: (orderId) => api.get(`/invoices/order/${orderId}`),
};
export const wishlistApi = {
  list: () => api.get("/wishlist"),
  add: (sparePartId) => api.post("/wishlist", { sparePartId }),
  remove: (sparePartId) => api.delete(`/wishlist/${sparePartId}`),
  moveToCart: (sparePartId) => api.post(`/wishlist/${sparePartId}/move-to-cart`),
};

// ---- marketing
export const promotionApi = { ...crud("/promotions"), active: () => api.get("/promotions/active") };
export const discountApi = { ...crud("/discounts"), active: () => api.get("/discounts/active") };
export const couponApi = {
  ...crud("/coupons"),
  check: (code, amount) => api.get("/coupons/check", { params: { code, amount } }),
};

// ---- reviews, feedback, returns & warranty
export const reviewApi = {
  ...crud("/reviews"),
  mine: () => api.get("/reviews/mine"),
  forPart: (sparePartId) => api.get(`/reviews/spare-part/${sparePartId}`),
  reply: (id, reply) => api.patch(`/reviews/${id}/reply`, { reply }),
};
export const feedbackApi = {
  ...crud("/feedback"),
  mine: () => api.get("/feedback/mine"),
  public: () => api.get("/feedback/public"),
};
export const rmaApi = {
  ...crud("/rmas"),
  mine: () => api.get("/rmas/mine"),
  decide: (id, body) => api.patch(`/rmas/${id}/decision`, body),
  complete: (id, body) => api.patch(`/rmas/${id}/complete`, body),
};

export const dashboardApi = {
  summary: () => api.get("/dashboard/summary"),
  overview: () => api.get("/dashboard/overview"),
  inventory: () => api.get("/dashboard/inventory"),
  procurement: () => api.get("/dashboard/procurement"),
  sales: () => api.get("/dashboard/sales"),
  marketing: () => api.get("/dashboard/marketing"),
  customerCare: () => api.get("/dashboard/customer-care"),
};

export const notificationApi = {
  list: () => api.get("/notifications"),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch("/notifications/read-all"),
  remove: (id) => api.delete(`/notifications/${id}`),
};

// ---- administration
export const activityLogApi = {
  search: (params) => api.get("/activity-logs", { params }),
  filters: () => api.get("/activity-logs/filters"),
};
export const reportApi = {
  sales: (params) => api.get("/reports/sales", { params }),
  inventory: (params) => api.get("/reports/inventory", { params }),
  purchases: (params) => api.get("/reports/purchases", { params }),
};
export const settingsApi = {
  get: () => api.get("/settings"),
  update: (body) => api.put("/settings", body),
  public: () => api.get("/settings/public"),
};
