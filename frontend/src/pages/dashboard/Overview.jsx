import { useAuth } from "../../context/AuthContext";
import AdminDashboard from "./home/AdminDashboard";
import InventoryDashboard from "./home/InventoryDashboard";
import MarketingDashboard from "./home/MarketingDashboard";
import ProcurementDashboard from "./home/ProcurementDashboard";
import SalesDashboard from "./home/SalesDashboard";

const HOME = {
  ADMIN: AdminDashboard,
  INVENTORY_MANAGER: InventoryDashboard,
  PROCUREMENT_OFFICER: ProcurementDashboard,
  SALES_STAFF: SalesDashboard,
  MARKETING_MANAGER: MarketingDashboard,
};

/** "Dashboard" menu option: each role gets its own home page with charts. */
export default function Overview() {
  const { user } = useAuth();
  const Home = HOME[user.role];
  return Home ? <Home /> : null;
}
