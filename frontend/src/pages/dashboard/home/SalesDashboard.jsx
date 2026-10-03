import { DollarSign, MessageSquare, RotateCcw, ShoppingCart, Star, Wallet } from "lucide-react";
import { useCallback } from "react";
import { dashboardApi } from "../../../api/endpoints";
import BarList from "../../../components/charts/BarList";
import DonutChart from "../../../components/charts/DonutChart";
import LineChart from "../../../components/charts/LineChart";
import DashboardHeader from "../../../components/ui/DashboardHeader";
import MiniTable from "../../../components/ui/MiniTable";
import Panel, { Empty } from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { money, moneyShort } from "../../../utils/format";
import { Loading, ReviewRow } from "./shared";
import { orderColumns, orderSegments } from "./columns";

/** Sales staff home: orders, payments and customer care. */
export default function SalesDashboard() {
  const loader = useCallback(async () => {
    const [sales, care] = await Promise.all([dashboardApi.sales(), dashboardApi.customerCare()]);
    return { sales, care };
  }, []);
  const { data, error } = useApi(loader, null);

  return (
    <>
      <DashboardHeader subtitle="Orders, payments and customer care at a glance." banner={{ to: "/dashboard/orders", action: "Manage orders" }} />
      {!data ? <Loading error={error} /> : <Content s={data.sales} c={data.care} />}
    </>
  );
}

function Content({ s, c }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={DollarSign} label="Revenue (paid)" value={moneyShort(s.revenue)} trend={s.revenueTrend} trendLabel="sales vs last month" />
        <StatCard icon={ShoppingCart} label="Orders to process" value={s.placed + s.processing} tone={s.placed ? "red" : "green"} hint={`${s.placed} new · ${s.processing} processing`} to="/dashboard/orders" />
        <StatCard icon={Wallet} label="Unpaid payments" value={s.pendingPayments} tone="amber" hint={money(s.pendingPaymentAmount)} to="/dashboard/payments" />
        <StatCard icon={RotateCcw} label="Open claims" value={c.openClaims} tone={c.openClaims ? "amber" : "green"} hint="returns / warranty" to="/dashboard/returns" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-[1.3fr_1fr_1fr]">
        <Panel className="lg:col-span-2 2xl:col-span-1" title="Sales overview" subtitle="Order value per month, last 6 months">
          <LineChart data={s.salesByMonth} format={money} name="Sales" />
        </Panel>
        <Panel title="Orders status">
          <div className="pt-3"><DonutChart segments={orderSegments(s.ordersByStatus)} centerLabel="Total orders" /></div>
        </Panel>
        <Panel title="Top selling categories" subtitle="Units sold">
          <div className="pt-3"><BarList data={s.topCategories} empty="No sales yet." /></div>
        </Panel>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.2fr_1fr]">
        <Panel title="Orders to process" subtitle="Oldest first" to="/dashboard/orders">
          <MiniTable columns={orderColumns} rows={s.ordersToProcess} empty="Every order has been processed." />
        </Panel>
        <Panel title="Latest reviews" to="/dashboard/reviews" linkText="Reviews">
          <div className="mb-2 flex gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1"><Star className="h-3.5 w-3.5 text-warning" /> {c.totalReviews} reviews</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1"><MessageSquare className="h-3.5 w-3.5 text-info" /> {c.totalFeedback} feedback</span>
          </div>
          {c.recentReviews.length === 0 ? <Empty>No reviews yet.</Empty> : (
            <div className="divide-y divide-line">{c.recentReviews.slice(0, 4).map((r) => <ReviewRow key={r.id} review={r} />)}</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
