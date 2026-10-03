import { Toaster } from "react-hot-toast";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import { MENU, rolesFor, SUPPLIER_MENU } from "./components/layout/menu";
import RequireRole from "./components/layout/RequireRole";
import StoreLayout from "./components/layout/StoreLayout";
import { AuthProvider, STAFF_ROLES } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";

import Cart from "./pages/store/Cart";
import Checkout from "./pages/store/Checkout";
import Home from "./pages/store/Home";
import MyOrders from "./pages/store/MyOrders";
import OrderPayment from "./pages/store/OrderPayment";
import ProductDetails from "./pages/store/ProductDetails";
import Profile from "./pages/store/Profile";
import Shop from "./pages/store/Shop";
import Wishlist from "./pages/store/Wishlist";

import ActivityLog from "./pages/dashboard/admin/ActivityLog";
import AdminCustomerCare from "./pages/dashboard/admin/AdminCustomerCare";
import AdminInventory from "./pages/dashboard/admin/AdminInventory";
import AdminMarketing from "./pages/dashboard/admin/AdminMarketing";
import AdminProcurement from "./pages/dashboard/admin/AdminProcurement";
import AdminSales from "./pages/dashboard/admin/AdminSales";
import Reports from "./pages/dashboard/admin/Reports";
import SettingsPage from "./pages/dashboard/admin/Settings";
import Overview from "./pages/dashboard/Overview";
import Categories from "./pages/dashboard/inventory/Categories";
import Fitments from "./pages/dashboard/inventory/Fitments";
import InventoryPage from "./pages/dashboard/inventory/Inventory";
import SpareParts from "./pages/dashboard/inventory/SpareParts";
import StockMovements from "./pages/dashboard/inventory/StockMovements";
import Vehicles from "./pages/dashboard/inventory/Vehicles";
import Coupons from "./pages/dashboard/marketing/Coupons";
import Discounts from "./pages/dashboard/marketing/Discounts";
import Promotions from "./pages/dashboard/marketing/Promotions";
import GoodsReceipts from "./pages/dashboard/procurement/GoodsReceipts";
import PurchaseOrders from "./pages/dashboard/procurement/PurchaseOrders";
import PurchaseRequests from "./pages/dashboard/procurement/PurchaseRequests";
import Suppliers from "./pages/dashboard/procurement/Suppliers";
import Orders from "./pages/dashboard/sales/Orders";
import Payments from "./pages/dashboard/sales/Payments";
import FeedbackPage from "./pages/dashboard/support/Feedback";
import Returns from "./pages/dashboard/support/Returns";
import Reviews from "./pages/dashboard/support/Reviews";
import Users from "./pages/dashboard/Users";
import SupplierDashboard from "./pages/supplier/SupplierDashboard";
import SupplierOrders from "./pages/supplier/SupplierOrders";

/** Work screens of each role. Access = the roles that see the page in the menu (menu.js). */
const WORK_PAGES = [
  ["categories", <Categories />],
  ["spare-parts", <SpareParts />],
  ["vehicles", <Vehicles />],
  ["fitments", <Fitments />],
  ["inventory", <InventoryPage />],
  ["stock-movements", <StockMovements />],
  ["suppliers", <Suppliers />],
  ["purchase-requests", <PurchaseRequests />],
  ["purchase-orders", <PurchaseOrders />],
  ["goods-receipts", <GoodsReceipts />],
  ["orders", <Orders />],
  ["payments", <Payments />],
  ["promotions", <Promotions />],
  ["discounts", <Discounts />],
  ["coupons", <Coupons />],
  ["reviews", <Reviews />],
  ["feedback", <FeedbackPage />],
  ["returns", <Returns />],
];

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
          <Toaster position="top-right" toastOptions={{ style: { fontSize: 14 } }} />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* storefront */}
            <Route element={<StoreLayout />}>
              <Route index element={<Home />} />
              <Route path="shop" element={<Shop />} />
              <Route path="parts/:id" element={<ProductDetails />} />
              <Route element={<RequireRole roles={["CUSTOMER"]} />}>
                <Route path="cart" element={<Cart />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="orders/:id/pay" element={<OrderPayment />} />
                <Route path="my-orders" element={<MyOrders />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Route>

            {/* staff dashboard */}
            <Route element={<RequireRole roles={STAFF_ROLES} />}>
              <Route path="/dashboard" element={<DashboardLayout menu={MENU} />}>
                <Route index element={<Overview />} />
                <Route path="profile" element={<Profile />} />
                {WORK_PAGES.map(([path, element]) => (
                  <Route key={path} element={<RequireRole roles={rolesFor(`/dashboard/${path}`)} />}>
                    <Route path={path} element={element} />
                  </Route>
                ))}
                {/* admin: read-only function summaries, reports, activity log, users and settings */}
                <Route element={<RequireRole roles={["ADMIN"]} />}>
                  <Route path="admin/inventory" element={<AdminInventory />} />
                  <Route path="admin/procurement" element={<AdminProcurement />} />
                  <Route path="admin/sales" element={<AdminSales />} />
                  <Route path="admin/marketing" element={<AdminMarketing />} />
                  <Route path="admin/customer-care" element={<AdminCustomerCare />} />
                  <Route path="admin/reports" element={<Reports />} />
                  <Route path="admin/activity" element={<ActivityLog />} />
                  <Route path="admin/settings" element={<SettingsPage />} />
                  <Route path="users" element={<Users />} />
                </Route>
              </Route>
            </Route>

            {/* supplier portal */}
            <Route element={<RequireRole roles={["SUPPLIER"]} />}>
              <Route path="/supplier" element={<DashboardLayout menu={SUPPLIER_MENU} base="/supplier" />}>
                <Route index element={<SupplierDashboard />} />
                <Route path="orders" element={<SupplierOrders />} />
                <Route path="profile" element={<Profile />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
