import { AlertTriangle, ClipboardList, DollarSign, RotateCcw, ShoppingCart, Star, Users, Wrench } from "lucide-react";
import { dashboardApi } from "../../../api/endpoints";
import BarList from "../../../components/charts/BarList";
import ColumnChart from "../../../components/charts/ColumnChart";
import DonutChart from "../../../components/charts/DonutChart";
import LineChart from "../../../components/charts/LineChart";
import { SERIES } from "../../../components/charts/palette";
import DashboardHeader from "../../../components/ui/DashboardHeader";
import MiniTable from "../../../components/ui/MiniTable";
import Panel, { Empty } from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { money, moneyShort } from "../../../utils/format";
import { Loading, ReviewRow } from "./shared";
import { orderColumns, orderSegments, stockColumns } from "./columns";

/** Admin home: the whole business at a glance, with charts. */
export default function AdminDashboard() {
  const { data: d, error } = useApi(dashboardApi.overview, null);

  return (
    <>
      <DashboardHeader />
      {!d ? (
        <Loading error={error} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={DollarSign} label="Revenue (paid)" value={moneyShort(d.revenue)} trend={d.revenueTrend} trendLabel="sales vs last month" />
            <StatCard icon={ShoppingCart} label="Orders" value={d.orders} trend={d.ordersTrend} />
            <StatCard icon={Wrench} label="Spare parts" value={d.spareParts} tone="dark" hint="total products" />
            <StatCard icon={AlertTriangle} label="Low stock" value={d.lowStock} tone={d.lowStock ? "red" : "green"} hint="items at or below reorder level" to="/dashboard/admin/inventory" />
            <StatCard icon={Users} label="Customers" value={d.customers} tone="blue" hint="registered" />
            <StatCard icon={ClipboardList} label="Pending purchase requests" value={d.pendingPurchaseRequests} tone="amber" hint="approved by the inventory manager" to="/dashboard/admin/procurement" />
            <StatCard icon={Star} label="Product reviews" value={d.reviews} tone="dark" hint="published" to="/dashboard/admin/customer-care" />
            <StatCard icon={RotateCcw} label="Open claims" value={d.openClaims} tone={d.openClaims ? "amber" : "green"} hint="returns / warranty" to="/dashboard/admin/customer-care" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-[1.3fr_1fr_1fr]">
            <Panel className="lg:col-span-2 2xl:col-span-1" title="Sales overview" subtitle="Order value per month, last 6 months (cancelled orders excluded)">
              <LineChart data={d.salesByMonth} format={money} name="Sales" />
            </Panel>
            <Panel title="Orders status" subtitle="All orders">
              <div className="pt-3"><DonutChart segments={orderSegments(d.ordersByStatus)} centerLabel="Total orders" /></div>
            </Panel>
            <Panel title="Top selling categories" subtitle="Units sold">
              <div className="pt-3"><BarList data={d.topCategories} empty="No sales yet." /></div>
            </Panel>
          </div>

          <div className="grid gap-5 2xl:grid-cols-[1.15fr_1fr]">
            <Panel title="Recent orders" to="/dashboard/admin/sales">
              <MiniTable columns={orderColumns} rows={d.recentOrders} empty="No orders yet." />
            </Panel>
            <Panel title="Low stock items" to="/dashboard/admin/inventory">
              <MiniTable columns={stockColumns()} rows={d.lowStockItems} empty="All parts are above their reorder level." />
            </Panel>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_1fr]">
            <Panel title="Recent reviews" to="/dashboard/admin/customer-care">
              {d.recentReviews.length === 0 ? <Empty>No reviews yet.</Empty> : (
                <div className="divide-y divide-line">{d.recentReviews.map((r) => <ReviewRow key={r.id} review={r} />)}</div>
              )}
            </Panel>
            <Panel title="Stock movement summary" subtitle="Units in and out, last 4 weeks">
              <StockInOut weeks={d.stockMovements} />
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

export function StockInOut({ weeks }) {
  return (
    <ColumnChart
      labels={weeks.map((w) => w.label)}
      series={[
        { name: "Stock in", color: SERIES.primary, values: weeks.map((w) => w.in) },
        { name: "Stock out", color: SERIES.secondary, values: weeks.map((w) => w.out) },
      ]}
      format={(v) => `${v} units`}
    />
  );
}
