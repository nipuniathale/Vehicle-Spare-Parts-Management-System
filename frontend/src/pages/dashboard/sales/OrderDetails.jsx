import { StatusBadge } from "../../../components/ui/Badge";
import PartImage from "../../../components/ui/PartImage";
import { dateTime, label, money } from "../../../utils/format";

/** Read-only order summary shared by the staff order page, My Orders and invoices. */
export default function OrderSummary({ order }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 text-sm sm:grid-cols-3">
        <div><p className="text-xs text-muted">Customer</p><p className="font-semibold">{order.customerName}</p><p className="text-xs text-muted">{order.customerEmail}</p></div>
        <div><p className="text-xs text-muted">Deliver to</p><p className="font-semibold">{order.deliveryAddress}</p><p className="text-xs text-muted">{order.contactPhone}</p></div>
        <div className="space-y-1">
          <p className="text-xs text-muted">Status</p>
          <div className="flex flex-wrap gap-1"><StatusBadge status={order.status} /><StatusBadge status={order.paymentStatus} /></div>
          <p className="text-xs text-muted">{label(order.paymentMethod)} · placed {dateTime(order.createdAt)}</p>
          {order.placedBy && <p className="text-xs text-muted">created by {order.placedBy} (sales)</p>}
        </div>
      </div>
      <div className="divide-y divide-line rounded-xl border border-line">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 p-3">
            <PartImage src={item.imageUrl} alt={item.name} className="h-12 w-12 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{item.name}</p>
              <p className="text-xs text-muted">{item.sku} · {item.quantity} × {money(item.unitPrice)}{item.unitPrice !== item.listPrice && <span className="ml-1 line-through">{money(item.listPrice)}</span>}</p>
            </div>
            <p className="font-semibold">{money(item.subtotal)}</p>
          </div>
        ))}
      </div>
      <div className="ml-auto max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{money(order.subtotal)}</span></div>
        {Number(order.discountAmount) > 0 && (
          <div className="flex justify-between text-success"><span>Coupon {order.couponCode}</span><span>−{money(order.discountAmount)}</span></div>
        )}
        <div className="flex justify-between border-t border-line pt-1 font-display text-lg font-bold"><span>Total</span><span>{money(order.totalAmount)}</span></div>
      </div>
      {order.note && <p className="rounded-xl bg-surface p-3 text-sm"><span className="font-semibold">Customer note:</span> {order.note}</p>}
    </div>
  );
}
