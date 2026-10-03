import { ORDER_STATUS_COLORS } from "../../../components/charts/palette";
import Badge, { StatusBadge } from "../../../components/ui/Badge";
import { date, dateTime, label, money } from "../../../utils/format";

/* Table columns and small helpers shared by the dashboards and the admin summaries. */

export const orderSegments = (byStatus) =>
  Object.entries(ORDER_STATUS_COLORS).map(([key, color]) => ({ key, label: label(key), value: byStatus?.[key] || 0, color }));

export const orderColumns = [
  { header: "#", render: (o) => <span className="font-mono text-xs font-semibold">#{o.id}</span> },
  { header: "Customer", render: (o) => <span className="text-ink">{o.customerName}</span> },
  { header: "Date", render: (o) => <span className="whitespace-nowrap text-muted">{date(o.createdAt)}</span> },
  { header: "Items", render: (o) => o.items.reduce((sum, i) => sum + i.quantity, 0) },
  { header: "Total", render: (o) => <span className="whitespace-nowrap font-semibold">{money(o.totalAmount)}</span> },
  { header: "Status", render: (o) => <StatusBadge status={o.status} /> },
];

export const stockColumns = (action) => [
  { header: "Product", render: (i) => <span className="font-medium text-ink">{i.sparePartName}</span> },
  { header: "SKU", render: (i) => <span className="text-xs text-muted">{i.sparePartSku}</span> },
  { header: "Current stock", render: (i) => <Badge tone={i.quantity === 0 ? "red" : "amber"}>{i.quantity}</Badge> },
  { header: "Reorder level", render: (i) => i.reorderLevel },
  ...(action ? [{ header: "Action", className: "text-right", render: action }] : []),
];

export const movementColumns = [
  { header: "Part", render: (m) => <span className="font-medium text-ink">{m.sparePartName}</span> },
  { header: "Type", render: (m) => <Badge tone={m.incoming ? "green" : "red"}>{label(m.type)}</Badge> },
  { header: "Qty", render: (m) => <span className="font-semibold">{m.incoming ? "+" : "−"}{m.quantity}</span> },
  { header: "Reference", render: (m) => <span className="text-xs text-muted">{m.reference || (m.manual ? "Manual" : "—")}</span> },
  { header: "When", render: (m) => <span className="whitespace-nowrap text-xs text-muted">{dateTime(m.createdAt)}</span> },
];

export const requestColumns = [
  { header: "Request", render: (r) => <span className="font-mono text-xs font-semibold">PR-{r.id}</span> },
  { header: "Spare part", render: (r) => <span className="font-medium text-ink">{r.sparePartName}</span> },
  { header: "Qty", render: (r) => r.quantity },
  { header: "Supplier", render: (r) => r.supplierName },
  { header: "Requested by", render: (r) => <span className="text-xs text-muted">{r.requestedBy || "—"} · {date(r.createdAt)}</span> },
];

export const purchaseOrderColumns = [
  { header: "PO", render: (o) => <span className="font-mono text-xs font-semibold">PO-{o.id}</span> },
  { header: "Supplier", render: (o) => <span className="font-medium text-ink">{o.supplierName}</span> },
  { header: "Value", render: (o) => <span className="whitespace-nowrap font-semibold">{money(o.totalAmount)}</span> },
  { header: "Needed by", render: (o) => <span className="whitespace-nowrap text-muted">{date(o.expectedDeliveryDate)}</span> },
  { header: "Status", render: (o) => <StatusBadge status={o.status} /> },
];

export const endingColumns = [
  { header: "Type", render: (e) => <Badge tone="gray">{e.kind}</Badge> },
  { header: "Name", render: (e) => <span className="font-medium text-ink">{e.name}</span> },
  { header: "Ends", render: (e) => <span className="whitespace-nowrap text-muted">{date(e.endDate)}</span> },
  { header: "Left", render: (e) => <Badge tone={e.daysLeft <= 2 ? "red" : "amber"}>{e.daysLeft === 0 ? "today" : `${e.daysLeft} day${e.daysLeft === 1 ? "" : "s"}`}</Badge> },
];

/** All running campaigns in one list. */
export function activeCampaigns(d) {
  return [
    ...d.activePromotions.map((p) => ({ id: `p${p.id}`, kind: "Promotion", name: p.title, detail: `${p.spareParts.length} part(s)`, endDate: p.endDate })),
    ...d.activeDiscounts.map((x) => ({ id: `d${x.id}`, kind: "Discount", name: x.name, detail: `${x.sparePartName}: ${money(x.discountedPrice)}`, endDate: x.endDate })),
    ...d.activeCoupons.map((c) => ({ id: `c${c.id}`, kind: "Coupon", name: c.code, detail: `used ${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ""}`, endDate: c.endDate })),
  ];
}

export const campaignColumns = [
  { header: "Type", render: (c) => <Badge tone="gray">{c.kind}</Badge> },
  { header: "Name", render: (c) => <span className="font-medium text-ink">{c.name}</span> },
  { header: "Details", render: (c) => <span className="text-xs text-muted">{c.detail}</span> },
  { header: "Ends", render: (c) => <span className="whitespace-nowrap text-muted">{c.endDate ? date(c.endDate) : "No end date"}</span> },
];
