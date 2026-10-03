import { AlertTriangle, Boxes, DollarSign, Download, PackageCheck, Percent, Printer, Receipt, ShoppingBag, ShoppingCart, Truck, UserPlus, Users, XCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { reportApi } from "../../../api/endpoints";
import BarList from "../../../components/charts/BarList";
import ColumnChart from "../../../components/charts/ColumnChart";
import DonutChart from "../../../components/charts/DonutChart";
import LineChart from "../../../components/charts/LineChart";
import { compact, SERIES } from "../../../components/charts/palette";
import Badge, { StatusBadge } from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import MiniTable from "../../../components/ui/MiniTable";
import PageHeader from "../../../components/ui/PageHeader";
import Panel from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { downloadCsv } from "../../../utils/csv";
import { addDays, date, label, money, moneyShort, today } from "../../../utils/format";
import { Loading } from "../home/shared";
import { orderSegments } from "../home/columns";

const TABS = [
  ["sales", "Sales, orders & payments"],
  ["inventory", "Inventory"],
  ["purchases", "Purchasing & suppliers"],
];

const RANGES = [
  ["Last 7 days", 6],
  ["Last 30 days", 29],
  ["Last 90 days", 89],
  ["Last 12 months", 364],
];

/** Admin reports with a date range, charts, tables and CSV export. */
export default function Reports() {
  const [tab, setTab] = useState("sales");
  const [range, setRange] = useState({ from: addDays(-29), to: today() });
  const [applied, setApplied] = useState(range);

  // the result remembers its tab, so a tab never renders the previous tab's numbers while loading
  const loader = useCallback(
    () => reportApi[tab]({ from: applied.from, to: applied.to }).then((report) => ({ tab, report })),
    [tab, applied]
  );
  const { data: result, error, loading } = useApi(loader, null);
  const data = result?.tab === tab ? result.report : null;

  const quick = (days) => {
    const next = { from: addDays(-days), to: today() };
    setRange(next);
    setApplied(next);
  };

  return (
    <>
      <PageHeader eyebrow="Administration" title="Reports" subtitle="Business figures for any period. Use the tables' CSV buttons to export the numbers."
        actions={<Button variant="secondary" icon={Printer} onClick={() => window.print()}>Print</Button>} />

      <div className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        <label className="text-xs font-semibold">From
          <input type="date" className="input mt-1 w-40" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
        </label>
        <label className="text-xs font-semibold">To
          <input type="date" className="input mt-1 w-40" value={range.to} min={range.from} max={today()} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
        </label>
        <Button onClick={() => setApplied(range)} disabled={!range.from || !range.to}>Apply</Button>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {RANGES.map(([text, days]) => (
            <button key={text} type="button" onClick={() => quick(days)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-line hover:bg-surface ${applied.from === addDays(-days) && applied.to === today() ? "bg-primary text-white ring-primary hover:bg-primary" : ""}`}>
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map(([key, text]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === key ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"}`}>
            {text}
          </button>
        ))}
      </div>

      {!data || loading ? <Loading error={error} /> : (
        <div className="space-y-5">
          <p className="text-xs text-muted">Period: {date(data.period.from)} – {date(data.period.to)}</p>
          {tab === "sales" && <SalesReport r={data} />}
          {tab === "inventory" && <InventoryReport r={data} />}
          {tab === "purchases" && <PurchaseReport r={data} />}
        </div>
      )}
    </>
  );
}

function CsvButton({ name, columns, rows }) {
  return (
    <button type="button" disabled={!rows.length} onClick={() => downloadCsv(`${name}-${today()}.csv`, columns, rows)}
      className="flex items-center gap-1 text-xs font-semibold text-accent disabled:opacity-40">
      <Download className="h-3.5 w-3.5" /> CSV
    </button>
  );
}

// ------------------------------------------------------------------ sales

function SalesReport({ r }) {
  const paymentCols = [
    { header: "Method", render: (p) => label(p.method), value: (p) => p.method },
    { header: "Status", render: (p) => <StatusBadge status={p.status} />, value: (p) => p.status },
    { header: "Payments", render: (p) => p.count, value: (p) => p.count },
    { header: "Amount", className: "text-right", render: (p) => <span className="font-semibold">{money(p.amount)}</span>, value: (p) => p.amount },
  ];
  const partCols = [
    { header: "Spare part", render: (p) => <div><p className="font-medium text-ink">{p.name}</p><p className="text-xs text-muted">{p.sku}</p></div>, value: (p) => p.name },
    { header: "SKU", render: () => null, value: (p) => p.sku },
    { header: "Units", render: (p) => p.units, value: (p) => p.units },
    { header: "Revenue", className: "text-right", render: (p) => <span className="font-semibold">{money(p.revenue)}</span>, value: (p) => p.revenue },
  ];
  const customerCols = [
    { header: "Customer", render: (c) => <div><p className="font-medium text-ink">{c.name}</p><p className="text-xs text-muted">{c.email}</p></div>, value: (c) => c.name },
    { header: "Email", render: () => null, value: (c) => c.email },
    { header: "Orders", render: (c) => c.orders, value: (c) => c.orders },
    { header: "Spent", className: "text-right", render: (c) => <span className="font-semibold">{money(c.spent)}</span>, value: (c) => c.spent },
  ];
  const visible = (cols) => cols.filter((c) => c.header !== "SKU" && c.header !== "Email");

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={ShoppingCart} label="Orders" value={r.orders} tone="dark" hint={`${r.staffCreatedOrders} created by sales staff`} />
        <StatCard icon={DollarSign} label="Gross sales" value={moneyShort(r.grossSales)} hint="orders not cancelled" />
        <StatCard icon={Receipt} label="Paid revenue" value={moneyShort(r.paidRevenue)} tone="green" />
        <StatCard icon={ShoppingBag} label="Average order" value={moneyShort(r.averageOrderValue)} tone="blue" hint={`${r.unitsSold} units sold`} />
        <StatCard icon={Percent} label="Coupon discounts" value={moneyShort(r.discountGiven)} tone="amber" />
        <StatCard icon={XCircle} label="Cancelled orders" value={r.cancelledOrders} tone={r.cancelledOrders ? "red" : "green"} />
        <StatCard icon={UserPlus} label="New customers" value={r.newCustomers} tone="blue" />
        <StatCard icon={Users} label="Ordering customers" value={r.orderingCustomers} tone="dark" hint="placed at least one order" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Sales over time" subtitle="Value of orders that were not cancelled">
          <LineChart data={r.salesOverTime} format={money} name="Sales" />
        </Panel>
        <Panel title="Orders by status">
          <div className="pt-3"><DonutChart segments={orderSegments(r.ordersByStatus)} centerLabel="Orders" /></div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Payments" subtitle="By method and status" actions={<CsvButton name="payments" columns={paymentCols} rows={r.payments} />}>
          <MiniTable columns={paymentCols} rows={r.payments.map((p, i) => ({ ...p, id: i }))} empty="No payments in this period." />
        </Panel>
        <Panel title="Sales by category" subtitle="Revenue">
          <div className="pt-3"><BarList data={r.salesByCategory.map((c) => ({ label: c.category, value: c.revenue }))} format={(v) => `Rs. ${compact(v)}`} empty="No sales in this period." /></div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Best-selling parts" subtitle="Top 10 by revenue" actions={<CsvButton name="top-parts" columns={partCols} rows={r.topParts} />}>
          <MiniTable columns={visible(partCols)} rows={r.topParts.map((p, i) => ({ ...p, id: i }))} empty="No sales in this period." />
        </Panel>
        <Panel title="Top customers" subtitle="Top 10 by amount spent" actions={<CsvButton name="top-customers" columns={customerCols} rows={r.topCustomers} />}>
          <MiniTable columns={visible(customerCols)} rows={r.topCustomers.map((c, i) => ({ ...c, id: i }))} empty="No orders in this period." />
        </Panel>
      </div>
    </>
  );
}

// ------------------------------------------------------------------ inventory

function InventoryReport({ r }) {
  const categoryCols = [
    { header: "Category", render: (c) => <span className="font-medium text-ink">{c.category}</span>, value: (c) => c.category },
    { header: "Parts", render: (c) => c.parts, value: (c) => c.parts },
    { header: "Units", render: (c) => c.units, value: (c) => c.units },
    { header: "Value", className: "text-right", render: (c) => <span className="font-semibold">{money(c.value)}</span>, value: (c) => c.value },
  ];
  const movementCols = [
    { header: "Movement", render: (m) => <Badge tone={m.incoming ? "green" : "red"}>{label(m.type)}</Badge>, value: (m) => m.type },
    { header: "Direction", render: (m) => (m.incoming ? "In" : "Out"), value: (m) => (m.incoming ? "IN" : "OUT") },
    { header: "Movements", render: (m) => m.count, value: (m) => m.count },
    { header: "Units", className: "text-right", render: (m) => <span className="font-semibold">{m.incoming ? "+" : "−"}{m.units}</span>, value: (m) => m.units },
  ];
  const lowCols = [
    { header: "Spare part", render: (i) => <div><p className="font-medium text-ink">{i.sparePartName}</p><p className="text-xs text-muted">{i.sparePartSku}</p></div>, value: (i) => i.sparePartName },
    { header: "In stock", render: (i) => <Badge tone={i.quantity === 0 ? "red" : "amber"}>{i.quantity}</Badge>, value: (i) => i.quantity },
    { header: "Reorder level", render: (i) => i.reorderLevel, value: (i) => i.reorderLevel },
    { header: "Location", render: (i) => i.location || "—", value: (i) => i.location },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={Boxes} label="Spare parts" value={r.spareParts} tone="dark" hint={`${r.unitsInStock} units in stock`} />
        <StatCard icon={DollarSign} label="Stock value" value={moneyShort(r.stockValue)} tone="green" hint="at selling price" />
        <StatCard icon={AlertTriangle} label="Low stock" value={r.lowStock} tone={r.lowStock ? "amber" : "green"} hint="at or below reorder level" />
        <StatCard icon={XCircle} label="Out of stock" value={r.outOfStock} tone={r.outOfStock ? "red" : "green"} />
      </div>
      <p className="text-xs text-muted">Stock figures are as of today; movements are for the selected period.</p>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Stock by category" actions={<CsvButton name="stock-by-category" columns={categoryCols} rows={r.stockByCategory} />}>
          <MiniTable columns={categoryCols} rows={r.stockByCategory.map((c, i) => ({ ...c, id: i }))} empty="No stock records." />
        </Panel>
        <Panel title="Stock movements in the period" actions={<CsvButton name="stock-movements" columns={movementCols} rows={r.movements} />}>
          <MiniTable columns={movementCols} rows={r.movements.map((m, i) => ({ ...m, id: i }))} empty="No stock movements in this period." />
        </Panel>
      </div>

      <Panel title="Low and out-of-stock parts" actions={<CsvButton name="low-stock" columns={lowCols} rows={r.lowStockItems} />}>
        <MiniTable columns={lowCols} rows={r.lowStockItems} empty="All parts are above their reorder level." />
      </Panel>
    </>
  );
}

// ------------------------------------------------------------------ purchasing

function PurchaseReport({ r }) {
  const supplierCols = [
    { header: "Supplier", render: (s) => <div><p className="font-medium text-ink">{s.supplier}</p>{!s.active && <p className="text-xs text-muted">inactive</p>}</div>, value: (s) => s.supplier },
    { header: "Orders", render: (s) => s.orders, value: (s) => s.orders },
    { header: "Units ordered", render: (s) => s.unitsOrdered, value: (s) => s.unitsOrdered },
    { header: "Units received", render: (s) => s.unitsReceived, value: (s) => s.unitsReceived },
    { header: "Declined", render: (s) => s.declined, value: (s) => s.declined },
    { header: "Cancelled", render: (s) => s.cancelled, value: (s) => s.cancelled },
    { header: "Spend", className: "text-right", render: (s) => <span className="font-semibold">{money(s.spend)}</span>, value: (s) => s.spend },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Purchase orders" value={r.purchaseOrders} tone="dark" />
        <StatCard icon={DollarSign} label="Spend" value={moneyShort(r.spend)} hint="cancelled / declined excluded" />
        <StatCard icon={Truck} label="Open orders" value={r.openOrders} tone="blue" />
        <StatCard icon={PackageCheck} label="Fully received" value={r.receivedOrders} tone="green" hint={`${r.unitsReceived} units received`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Purchase spend over time">
          <ColumnChart labels={r.spendOverTime.map((p) => p.label)} series={[{ name: "Spend", color: SERIES.primary, values: r.spendOverTime.map((p) => p.value) }]}
            format={(v) => `Rs. ${compact(v)}`} />
        </Panel>
        <div className="space-y-5">
          <Panel title="Purchase orders by status">
            <div className="pt-3"><BarList data={Object.entries(r.ordersByStatus).map(([k, v]) => ({ label: label(k), value: v }))} color={SERIES.secondary} empty="No purchase orders in this period." /></div>
          </Panel>
          <Panel title="Purchase requests by status">
            <div className="pt-3"><BarList data={Object.entries(r.requestsByStatus).map(([k, v]) => ({ label: label(k), value: v }))} empty="No purchase requests in this period." /></div>
          </Panel>
        </div>
      </div>

      <Panel title="Suppliers" subtitle="Orders placed with each supplier in the period" actions={<CsvButton name="suppliers" columns={supplierCols} rows={r.suppliers} />}>
        <MiniTable columns={supplierCols} rows={r.suppliers.map((s, i) => ({ ...s, id: i }))} empty="No suppliers yet." />
      </Panel>
    </>
  );
}
