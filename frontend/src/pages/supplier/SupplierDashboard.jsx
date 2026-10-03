import { CheckCircle2, Clock, PackageCheck, Truck } from "lucide-react";
import { purchaseOrderApi } from "../../api/endpoints";
import BarList from "../../components/charts/BarList";
import ColumnChart from "../../components/charts/ColumnChart";
import { compact, SERIES } from "../../components/charts/palette";
import DashboardHeader from "../../components/ui/DashboardHeader";
import MiniTable from "../../components/ui/MiniTable";
import Panel from "../../components/ui/Panel";
import StatCard from "../../components/ui/StatCard";
import { useApi } from "../../hooks/useApi";
import { label } from "../../utils/format";
import { Loading } from "../dashboard/home/shared";
import { purchaseOrderColumns } from "../dashboard/home/columns";

/** Order value per month for the last six months (declined / cancelled orders left out). */
function valueByMonth(orders) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }), value: 0 });
  }
  orders
    .filter((o) => !["DECLINED", "CANCELLED"].includes(o.status))
    .forEach((o) => {
      const d = new Date(o.createdAt);
      const month = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (month) month.value += Number(o.totalAmount);
    });
  return months;
}

/** Supplier home: the orders sent to this supplier, with charts. */
export default function SupplierDashboard() {
  const { data: orders, loading, error } = useApi(purchaseOrderApi.mine);
  const count = (...statuses) => orders.filter((o) => statuses.includes(o.status)).length;
  const months = valueByMonth(orders);
  const byStatus = ["PENDING", "CONFIRMED", "SHIPPED", "PARTIALLY_RECEIVED", "RECEIVED", "DECLINED", "CANCELLED"]
    .map((s) => ({ label: label(s), value: count(s) }));

  return (
    <>
      <DashboardHeader subtitle="Purchase orders AutoHub Lanka has sent to your company." banner={{ title: "Your orders", highlight: "delivered on time", to: "/supplier/orders", action: "Open purchase orders" }} />
      {loading ? <Loading error={error} /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={Clock} label="Waiting for your reply" value={count("PENDING")} tone={count("PENDING") ? "red" : "green"} to="/supplier/orders" />
            <StatCard icon={CheckCircle2} label="Confirmed" value={count("CONFIRMED")} tone="amber" hint="to be shipped" />
            <StatCard icon={Truck} label="Shipped" value={count("SHIPPED", "PARTIALLY_RECEIVED")} tone="blue" />
            <StatCard icon={PackageCheck} label="Completed" value={count("RECEIVED")} tone="green" />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Panel title="Order value" subtitle="Per month, last 6 months">
              <ColumnChart labels={months.map((m) => m.label)} series={[{ name: "Order value", color: SERIES.primary, values: months.map((m) => m.value) }]} format={(v) => `Rs. ${compact(v)}`} />
            </Panel>
            <Panel title="Orders by status">
              <div className="pt-3"><BarList data={byStatus} color={SERIES.secondary} empty="No purchase orders yet." /></div>
            </Panel>
          </div>
          <Panel title="Waiting for your reply" to="/supplier/orders">
            <MiniTable columns={purchaseOrderColumns.filter((c) => c.header !== "Supplier")} rows={orders.filter((o) => o.status === "PENDING")} empty="No new orders – you are all caught up." />
          </Panel>
        </div>
      )}
    </>
  );
}
