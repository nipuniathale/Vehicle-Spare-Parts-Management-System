import { CheckCircle2, ClipboardList, DollarSign, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { dashboardApi } from "../../../api/endpoints";
import MiniTable from "../../../components/ui/MiniTable";
import Panel from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { moneyShort } from "../../../utils/format";
import { Loading } from "../home/shared";
import AdminSummary from "./AdminSummary";
import { purchaseOrderColumns, requestColumns } from "../home/columns";

export default function AdminProcurement() {
  const { data: d, error } = useApi(dashboardApi.procurement, null);

  return (
    <AdminSummary title="Procurement" subtitle="Suppliers, purchase requests and purchase orders." owner="Procurement Officer">
      {!d ? <Loading error={error} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={Truck} label="Suppliers" value={d.suppliers} tone="dark" hint={`${d.activeSuppliers} active`} />
            <StatCard icon={ClipboardList} label="Waiting for approval" value={d.pendingRequests} tone={d.pendingRequests ? "amber" : "green"} hint="decided by the inventory manager" />
            <StatCard icon={CheckCircle2} label="Approved, no PO yet" value={d.approvedAwaitingOrder} tone="amber" />
            <StatCard icon={ShoppingBag} label="Open purchase orders" value={d.openOrders} tone="blue" />
            <StatCard icon={PackageCheck} label="Received orders" value={d.receivedOrders} tone="green" />
            <StatCard icon={DollarSign} label="Spend this month" value={moneyShort(d.spendThisMonth)} tone="dark" />
          </div>

          <Panel title="Waiting for approval" subtitle="Purchase requests raised by procurement - the inventory manager approves or rejects them.">
            <MiniTable columns={requestColumns} rows={d.pendingRequestList} empty="No requests are waiting for approval." />
          </Panel>

          <div className="grid gap-5 2xl:grid-cols-2">
            <Panel title="Approved – waiting for a purchase order">
              <MiniTable columns={requestColumns} rows={d.approvedRequestList} empty="Nothing waiting." />
            </Panel>
            <Panel title="Open purchase orders">
              <MiniTable columns={purchaseOrderColumns} rows={d.openOrderList} empty="No open purchase orders." />
            </Panel>
          </div>
        </>
      )}
    </AdminSummary>
  );
}
