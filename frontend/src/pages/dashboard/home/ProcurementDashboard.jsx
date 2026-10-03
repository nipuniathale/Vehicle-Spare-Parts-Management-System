import { CheckCircle2, ClipboardList, DollarSign, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { dashboardApi } from "../../../api/endpoints";
import BarList from "../../../components/charts/BarList";
import ColumnChart from "../../../components/charts/ColumnChart";
import { compact, SERIES } from "../../../components/charts/palette";
import Button from "../../../components/ui/Button";
import DashboardHeader from "../../../components/ui/DashboardHeader";
import MiniTable from "../../../components/ui/MiniTable";
import Panel from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { label, moneyShort } from "../../../utils/format";
import { Loading } from "./shared";
import { purchaseOrderColumns, requestColumns } from "./columns";



/** Procurement officer home. */
export default function ProcurementDashboard() {
  const { data: d, error } = useApi(dashboardApi.procurement, null);
  const navigate = useNavigate();

  return (
    <>
      <DashboardHeader subtitle="Suppliers, requests and purchase orders at a glance." banner={{ to: "/dashboard/purchase-orders", action: "Purchase orders" }} />
      {!d ? <Loading error={error} /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={Truck} label="Suppliers" value={d.suppliers} tone="dark" hint={`${d.activeSuppliers} active`} to="/dashboard/suppliers" />
            <StatCard icon={ClipboardList} label="Waiting for approval" value={d.pendingRequests} tone="amber" hint="inventory manager decides" to="/dashboard/purchase-requests" />
            <StatCard icon={CheckCircle2} label="Ready for PO" value={d.approvedAwaitingOrder} tone={d.approvedAwaitingOrder ? "red" : "green"} hint="approved requests without an order" to="/dashboard/purchase-requests" />
            <StatCard icon={DollarSign} label="Spend this month" value={moneyShort(d.spendThisMonth)} tone="blue" hint={`${d.openOrders} open · ${d.receivedOrders} received`} />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Panel title="Purchase spend" subtitle="Value of purchase orders per month (cancelled / declined excluded)">
              <ColumnChart
                labels={d.spendByMonth.map((p) => p.label)}
                series={[{ name: "Spend", color: SERIES.primary, values: d.spendByMonth.map((p) => p.value) }]}
                format={(v) => `Rs. ${compact(v)}`}
              />
            </Panel>
            <Panel title="Purchase orders by status" to="/dashboard/purchase-orders">
              <div className="pt-3">
                <BarList data={Object.entries(d.ordersByStatus).map(([k, v]) => ({ label: label(k), value: v }))} color={SERIES.secondary} empty="No purchase orders yet." />
              </div>
            </Panel>
          </div>

          <div className="grid gap-5 2xl:grid-cols-2">
            <Panel title="Approved – ready for a purchase order" to="/dashboard/purchase-requests">
              <MiniTable
                columns={[
                  ...requestColumns.slice(0, 4),
                  { header: "", className: "text-right", render: (r) => <Button size="sm" icon={ShoppingBag} onClick={() => navigate(`/dashboard/purchase-orders?fromRequest=${r.id}`)}>Create PO</Button> },
                ]}
                rows={d.approvedRequestList}
                empty="No approved requests waiting."
              />
            </Panel>
            <Panel title="Open purchase orders" to="/dashboard/purchase-orders">
              <MiniTable columns={purchaseOrderColumns} rows={d.openOrderList} empty="No open purchase orders." />
            </Panel>
          </div>

          <Panel title="Waiting for the inventory manager" subtitle="Requests you raised that are not decided yet" to="/dashboard/purchase-requests">
            <MiniTable columns={requestColumns} rows={d.pendingRequestList} empty="No requests are waiting." />
          </Panel>
          <p className="flex items-center gap-2 text-xs text-muted"><PackageCheck className="h-4 w-4" /> Record deliveries on the Goods Receipts page - received goods increase stock automatically.</p>
        </div>
      )}
    </>
  );
}
