import { AlertTriangle, Boxes, Car, DollarSign, LayoutGrid, Link2, PackageX, Wrench } from "lucide-react";
import { dashboardApi } from "../../../api/endpoints";
import MiniTable from "../../../components/ui/MiniTable";
import Panel from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { moneyShort } from "../../../utils/format";
import { Loading } from "../home/shared";
import AdminSummary from "./AdminSummary";
import { movementColumns, stockColumns } from "../home/columns";

export default function AdminInventory() {
  const { data: d, error } = useApi(dashboardApi.inventory, null);
  return (
    <AdminSummary title="Inventory" subtitle="Catalogue, stock levels and stock movements." owner="Inventory Manager">
      {!d ? <Loading error={error} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={Wrench} label="Spare parts" value={d.spareParts} hint={`${d.activeParts} active in the shop`} />
            <StatCard icon={LayoutGrid} label="Categories" value={d.categories} tone="dark" />
            <StatCard icon={Car} label="Vehicles" value={d.vehicles} tone="dark" />
            <StatCard icon={Link2} label="Fitments" value={d.fitments} tone="dark" hint="part ↔ vehicle links" />
            <StatCard icon={Boxes} label="Units in stock" value={d.unitsInStock} tone="blue" />
            <StatCard icon={DollarSign} label="Stock value" value={moneyShort(d.stockValue)} tone="green" hint="at selling price" />
            <StatCard icon={AlertTriangle} label="Low stock" value={d.lowStock} tone={d.lowStock ? "red" : "green"} hint="at or below reorder level" />
            <StatCard icon={PackageX} label="Out of stock" value={d.outOfStock} tone={d.outOfStock ? "red" : "green"} />
          </div>
          <Panel title="Needs attention: low stock" subtitle="The inventory manager raises purchase requests for these; you approve them under Approvals.">
            <MiniTable columns={stockColumns()} rows={d.lowStockItems} empty="All parts are above their reorder level." />
          </Panel>
          <Panel title="Latest stock movements">
            <MiniTable columns={movementColumns} rows={d.recentMovements} empty="No stock movements yet." />
          </Panel>
        </>
      )}
    </AdminSummary>
  );
}
