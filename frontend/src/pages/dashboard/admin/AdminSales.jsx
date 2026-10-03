import { CheckCircle2, DollarSign, FileText, ShoppingCart, Truck, Users, Wallet, XCircle } from "lucide-react";
import { dashboardApi } from "../../../api/endpoints";
import { StatusBadge } from "../../../components/ui/Badge";
import MiniTable from "../../../components/ui/MiniTable";
import Panel from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { date, label, money, moneyShort } from "../../../utils/format";
import { Loading } from "../home/shared";
import AdminSummary from "./AdminSummary";
import { orderColumns } from "../home/columns";

const paymentColumns = [
  { header: "Order", render: (p) => <span className="font-mono text-xs font-semibold">#{p.orderId}</span> },
  { header: "Customer", render: (p) => p.customerName },
  { header: "Method", render: (p) => (p.method ? label(p.method) : "Not chosen yet") },
  { header: "Amount", render: (p) => <span className="font-semibold">{money(p.amount)}</span> },
  { header: "Since", render: (p) => <span className="text-muted">{date(p.createdAt)}</span> },
  { header: "Status", render: (p) => <StatusBadge status={p.status} /> },
];

export default function AdminSales() {
  const { data: d, error } = useApi(dashboardApi.sales, null);
  return (
    <AdminSummary title="Sales & Orders" subtitle="Customer orders and payments (invoices are created automatically when an order is paid)." owner="Sales Staff">
      {!d ? <Loading error={error} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={DollarSign} label="Revenue (paid)" value={moneyShort(d.revenue)} trend={d.revenueTrend} trendLabel="sales vs last month" />
            <StatCard icon={ShoppingCart} label="Orders" value={d.orders} tone="dark" hint={`${d.placed} new · ${d.processing} processing`} />
            <StatCard icon={Truck} label="Shipped" value={d.shipped} tone="blue" hint="on the way" />
            <StatCard icon={CheckCircle2} label="Delivered" value={d.delivered} tone="green" />
            <StatCard icon={XCircle} label="Cancelled" value={d.cancelled} tone="red" />
            <StatCard icon={Wallet} label="Unpaid payments" value={d.pendingPayments} tone="amber" hint={money(d.pendingPaymentAmount)} />
            <StatCard icon={FileText} label="Invoices" value={d.invoices} tone="dark" hint="generated on payment" />
            <StatCard icon={Users} label="Customers" value={d.customers} tone="blue" />
          </div>
          <Panel title="Needs attention: orders not processed yet" subtitle="Oldest first">
            <MiniTable columns={orderColumns} rows={d.ordersToProcess} empty="Every order has been processed." />
          </Panel>
          <div className="grid gap-5 2xl:grid-cols-2">
            <Panel title="Unpaid payments">
              <MiniTable columns={paymentColumns} rows={d.unpaidPayments} empty="No unpaid payments." />
            </Panel>
            <Panel title="Latest orders">
              <MiniTable columns={orderColumns} rows={d.recentOrders} empty="No orders yet." />
            </Panel>
          </div>
        </>
      )}
    </AdminSummary>
  );
}
