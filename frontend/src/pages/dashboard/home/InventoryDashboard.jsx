import { AlertTriangle, Boxes, Car, Check, LayoutGrid, Link2, PackageX, ShoppingBag, Wrench, X } from "lucide-react";
import { useState } from "react";
import { dashboardApi, purchaseRequestApi } from "../../../api/endpoints";
import BarList from "../../../components/charts/BarList";
import Button from "../../../components/ui/Button";
import DashboardHeader from "../../../components/ui/DashboardHeader";
import MiniTable from "../../../components/ui/MiniTable";
import Panel from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { money, moneyShort } from "../../../utils/format";
import { StockInOut } from "./AdminDashboard";
import { Loading } from "./shared";
import { DecisionForm } from "../procurement/PurchaseRequests";
import { movementColumns, requestColumns, stockColumns } from "./columns";


/** Inventory manager home. */
export default function InventoryDashboard() {
  const { data: d, error } = useApi(dashboardApi.inventory, null);
  const requests = useApi(purchaseRequestApi.list);
  const pending = requests.data.filter((r) => r.status === "PENDING");
  const [deciding, setDeciding] = useState(null);

  return (
    <>
      <DashboardHeader subtitle="Stock, catalogue and movements at a glance." banner={{ to: "/dashboard/spare-parts", action: "Manage spare parts" }} />
      {!d ? <Loading error={error} /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={Wrench} label="Spare parts" value={d.spareParts} hint={`${d.activeParts} active in the shop`} to="/dashboard/spare-parts" />
            <StatCard icon={Boxes} label="Units in stock" value={d.unitsInStock} tone="blue" hint={`stock value ${money(d.stockValue)}`} to="/dashboard/inventory" />
            <StatCard icon={AlertTriangle} label="Low stock" value={d.lowStock} tone={d.lowStock ? "red" : "green"} hint="at or below reorder level" to="/dashboard/inventory" />
            <StatCard icon={PackageX} label="Out of stock" value={d.outOfStock} tone={d.outOfStock ? "red" : "green"} hint="cannot be sold" />
            <StatCard icon={LayoutGrid} label="Categories" value={d.categories} tone="dark" to="/dashboard/categories" />
            <StatCard icon={Car} label="Vehicles" value={d.vehicles} tone="dark" to="/dashboard/vehicles" />
            <StatCard icon={Link2} label="Fitments" value={d.fitments} tone="dark" hint="part ↔ vehicle links" to="/dashboard/fitments" />
            <StatCard icon={ShoppingBag} label="Stock value" value={moneyShort(d.stockValue)} tone="green" hint="at selling price" />
          </div>

          <Panel title="Purchase requests waiting for your approval" subtitle="Raised by procurement - approve so the purchase order can be created, or reject with a reason" to="/dashboard/purchase-requests">
            <MiniTable
              columns={[
                ...requestColumns,
                {
                  header: "Decision",
                  className: "text-right",
                  render: (r) => (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="success" icon={Check} onClick={() => setDeciding({ row: r, approve: true })}>Approve</Button>
                      <Button size="sm" variant="secondary" icon={X} onClick={() => setDeciding({ row: r, approve: false })}>Reject</Button>
                    </div>
                  ),
                },
              ]}
              rows={pending}
              empty="No requests are waiting for your approval."
            />
          </Panel>

          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="Stock movement summary" subtitle="Units in and out, last 4 weeks" to="/dashboard/stock-movements">
              <StockInOut weeks={d.stockMovements} />
            </Panel>
            <Panel title="Units in stock by category">
              <div className="pt-3"><BarList data={d.unitsByCategory} empty="No stock yet." /></div>
            </Panel>
          </div>

          <div className="grid gap-5 2xl:grid-cols-2">
            <Panel title="Low stock items" subtitle="Procurement is notified automatically and raises a purchase request" to="/dashboard/inventory">
              <MiniTable columns={stockColumns()} rows={d.lowStockItems} empty="All parts are above their reorder level." />
            </Panel>
            <Panel title="Recent stock movements" to="/dashboard/stock-movements">
              <MiniTable columns={movementColumns} rows={d.recentMovements} empty="No stock movements yet." />
            </Panel>
          </div>
        </div>
      )}
      {deciding && <DecisionForm {...deciding} onClose={() => setDeciding(null)} onSaved={requests.reload} />}
    </>
  );
}
