import { FileText, Printer } from "lucide-react";
import { useState } from "react";
import { invoiceApi } from "../../api/endpoints";
import OrderSummary from "../../pages/dashboard/sales/OrderDetails";
import { runAction } from "../../hooks/useApi";
import { date, dateTime, label } from "../../utils/format";
import { LogoMark } from "../layout/Logo";
import { StatusBadge } from "../ui/Badge";
import Button from "../ui/Button";
import Modal from "../ui/Modal";

/**
 * Read-only invoice. Invoices are generated automatically when an order is paid,
 * so they are opened from the order (My Orders / Orders) - there is no separate invoice page.
 */
export function InvoiceView({ invoice, onClose }) {
  const store = invoice.store || {};
  return (
    <Modal open size="lg" title={invoice.invoiceNumber} subtitle={`Order #${invoice.orderId}`} onClose={onClose}
      footer={<Button icon={Printer} onClick={() => window.print()}>Print</Button>}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary"><LogoMark size={32} /></span>
          <div>
            <p className="font-display text-lg font-bold">{store.storeName || "AutoHub Lanka"}</p>
            <p className="text-xs text-muted">{store.storeAddress}</p>
            <p className="text-xs text-muted">{[store.storePhone, store.storeEmail].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <div className="text-right text-sm">
          <p className="font-display text-xl font-bold">INVOICE</p>
          <p className="font-mono text-xs">{invoice.invoiceNumber}</p>
          <p className="text-xs text-muted">Issued {date(invoice.issueDate)}</p>
        </div>
      </div>
      <OrderSummary order={invoice.order} />
      <div className="mt-4 grid gap-3 rounded-xl bg-surface p-4 text-sm sm:grid-cols-3">
        <div><p className="text-xs text-muted">Payment</p><StatusBadge status={invoice.paymentStatus} /></div>
        <div><p className="text-xs text-muted">Method</p><p className="font-semibold">{label(invoice.paymentMethod)}</p></div>
        <div><p className="text-xs text-muted">Paid</p><p className="font-semibold">{invoice.paidAt ? dateTime(invoice.paidAt) : "—"}</p>
          {invoice.transactionId && <p className="font-mono text-[11px] text-muted">{invoice.transactionId}</p>}</div>
      </div>
      <p className="mt-4 text-center text-xs text-muted">This invoice was generated automatically when the payment was received. Thank you for shopping with us.</p>
    </Modal>
  );
}

/** "Invoice" button for an order: loads and shows the invoice; explains when it is not there yet. */
export function InvoiceButton({ order, size = "sm" }) {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!order.invoiceNumber) {
    return order.status === "CANCELLED" ? null : (
      <span className="text-[11px] text-muted" title="The invoice is created automatically once the order is paid">Invoice after payment</span>
    );
  }

  const open = async () => {
    setLoading(true);
    await runAction(async () => setInvoice(await invoiceApi.forOrder(order.id)));
    setLoading(false);
  };

  return (
    <>
      <Button size={size} variant="secondary" icon={FileText} loading={loading} onClick={open}>Invoice</Button>
      {invoice && <InvoiceView invoice={invoice} onClose={() => setInvoice(null)} />}
    </>
  );
}
