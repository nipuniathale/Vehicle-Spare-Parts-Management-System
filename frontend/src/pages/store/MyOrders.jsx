import { Ban, Building2, CreditCard, MessageSquarePlus, Pencil, Plus, RotateCcw, Star, Trash2, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { feedbackApi, orderApi, reviewApi, rmaApi } from "../../api/endpoints";
import { InvoiceButton } from "../../components/sales/InvoiceView";
import Badge, { StatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Field, { Input, Select, Textarea } from "../../components/ui/Field";
import ImageInput from "../../components/ui/ImageInput";
import Modal from "../../components/ui/Modal";
import PartImage from "../../components/ui/PartImage";
import Spinner from "../../components/ui/Spinner";
import Stars from "../../components/ui/Stars";
import { runAction, useApi } from "../../hooks/useApi";
import { useConfirm } from "../../hooks/useConfirm";
import { toNumber, toText, useForm } from "../../hooks/useForm";
import { date, dateTime, label, money } from "../../utils/format";
import { DeliveryForm } from "../dashboard/sales/Orders";
import { usePublicSettings } from "../../hooks/usePublicSettings";

const TABS = ["Orders", "Returns & warranty", "Reviews", "Feedback"];

export default function MyOrders() {
  const [tab, setTab] = useState("Orders");
  const orders = useApi(orderApi.mine);
  const reviews = useApi(reviewApi.mine);
  const claims = useApi(rmaApi.mine);
  const feedback = useApi(feedbackApi.mine);
  const confirm = useConfirm();
  const [modal, setModal] = useState(null);

  const reloadAll = () => [orders, reviews, claims, feedback].forEach((x) => x.reload());
  const close = () => setModal(null);

  const counts = { Orders: orders.data.length, "Returns & warranty": claims.data.length, Reviews: reviews.data.length, Feedback: feedback.data.length };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">My account</p>
      <h1 className="font-display text-3xl font-bold">My orders</h1>

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-line">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${tab === t ? "border-accent text-accent" : "border-transparent text-muted hover:text-ink"}`}>
            {t} <span className="ml-1 rounded-full bg-surface px-1.5 text-xs">{counts[t]}</span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Orders" && <OrdersTab state={orders} reviews={reviews.data} claims={claims.data} confirm={confirm} setModal={setModal} reloadAll={reloadAll} />}
        {tab === "Returns & warranty" && <ClaimsTab state={claims} confirm={confirm} setModal={setModal} />}
        {tab === "Reviews" && <ReviewsTab state={reviews} confirm={confirm} setModal={setModal} />}
        {tab === "Feedback" && <FeedbackTab state={feedback} orders={orders.data} confirm={confirm} setModal={setModal} />}
      </div>

      {modal?.type === "delivery" && <DeliveryForm order={modal.order} onClose={close} onSaved={orders.reload} />}
      {modal?.type === "review" && <ReviewForm {...modal} onClose={close} onSaved={reloadAll} />}
      {modal?.type === "claim" && <ClaimForm {...modal} onClose={close} onSaved={reloadAll} />}
      {modal?.type === "feedback" && <FeedbackForm {...modal} orders={orders.data} onClose={close} onSaved={feedback.reload} />}
      <ConfirmDialog {...confirm.props} />
    </div>
  );
}

// ------------------------------------------------------------------ orders

function OrdersTab({ state, reviews, claims, confirm, setModal, reloadAll }) {
  if (state.loading && !state.data.length) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!state.data.length) return <Empty text="You have not placed any orders yet." action={<Link to="/shop" className="font-semibold text-accent">Start shopping →</Link>} />;

  const cancel = (order) =>
    confirm.ask({
      title: `Cancel order #${order.id}?`,
      message: "The items go back into stock. A card payment will be refunded.",
      confirmLabel: "Cancel order",
      action: async () => (await runAction(() => orderApi.cancel(order.id), "Order cancelled")) && reloadAll(),
    });

  return (
    <div className="space-y-5">
      {state.data.map((order) => (
        <article key={order.id} className="card overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/60 px-5 py-3">
            <div>
              <p className="font-display font-bold">Order #{order.id}</p>
              <p className="text-xs text-muted">{dateTime(order.createdAt)} · {label(order.paymentMethod)}{order.placedBy ? " · placed by our sales team" : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              <StatusBadge status={order.paymentStatus} />
            </div>
          </header>

          <div className="divide-y divide-line">
            {order.items.map((item) => {
              const review = reviews.find((r) => r.orderItemId === item.id);
              const itemClaims = claims.filter((c) => c.orderItemId === item.id);
              return (
                <div key={item.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                  <PartImage src={item.imageUrl} alt={item.name} className="h-14 w-14 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <Link to={`/parts/${item.sparePartId}`} className="font-semibold hover:text-accent">{item.name}</Link>
                    <p className="text-xs text-muted">{item.quantity} × {money(item.unitPrice)} · {item.warrantyMonths ? `${item.warrantyMonths}-month warranty` : "no warranty"}</p>
                    {itemClaims.map((c) => <span key={c.id} className="mr-1 mt-1 inline-block"><Badge tone="navy">{label(c.type)} RMA-{c.id}: {label(c.status)}</Badge></span>)}
                  </div>
                  <p className="font-semibold">{money(item.subtotal)}</p>
                  {order.status === "DELIVERED" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" icon={Star} onClick={() => setModal({ type: "review", item, review })}>{review ? "Edit review" : "Review"}</Button>
                      <Button size="sm" variant="secondary" icon={RotateCcw} onClick={() => setModal({ type: "claim", item })}>Return / warranty</Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
            <div className="text-sm">
              <span className="text-muted">Deliver to:</span> {order.deliveryAddress}
              {order.couponCode && <span className="ml-2 text-xs text-success">coupon {order.couponCode} −{money(order.discountAmount)}</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 font-display text-lg font-bold">{money(order.totalAmount)}</span>
              {order.paymentMethod === "CARD" && order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && (
                <Link to={`/orders/${order.id}/pay`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white"><CreditCard className="h-4 w-4" /> Pay now</Link>
              )}
              {order.paymentMethod === "BANK_TRANSFER" && order.paymentStatus === "PENDING" && order.status !== "CANCELLED" && (
                <Link to={`/orders/${order.id}/pay`} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white"><Building2 className="h-4 w-4" /> Bank slip</Link>
              )}
              {order.status === "PLACED" && (
                <>
                  <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setModal({ type: "delivery", order })}>Edit delivery</Button>
                  <Button size="sm" variant="secondary" icon={Ban} onClick={() => cancel(order)}>Cancel</Button>
                </>
              )}
              <InvoiceButton order={order} />
              <Button size="sm" variant="ghost" icon={MessageSquarePlus} onClick={() => setModal({ type: "feedback", feedback: { orderId: order.id } })}>Feedback</Button>
            </div>
          </footer>
        </article>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ claims

function ClaimsTab({ state, confirm, setModal }) {
  if (state.loading && !state.data.length) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!state.data.length) return <Empty text="No return or warranty claims. Open a delivered order to start one." />;

  const remove = (claim) =>
    confirm.ask({
      title: `Delete claim RMA-${claim.id}?`,
      message: "The claim will be removed permanently.",
      action: async () => (await runAction(() => rmaApi.remove(claim.id), "Claim deleted")) && state.reload(),
    });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {state.data.map((c) => (
        <div key={c.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-xs font-bold">RMA-{c.id} · {label(c.type)}</p>
              <p className="mt-1 font-semibold">{c.sparePartName}</p>
              <p className="text-xs text-muted">Order #{c.orderId} · qty {c.quantity} · {label(c.reason)} · {date(c.createdAt)}</p>
            </div>
            <StatusBadge status={c.status} />
          </div>
          <p className="mt-3 text-sm text-muted">{c.description}</p>
          {c.imageUrls.length > 0 && <div className="mt-2 flex gap-2">{c.imageUrls.map((u) => <img key={u} src={u} alt="" className="h-12 w-12 rounded-lg object-cover" />)}</div>}
          {c.staffNote && <p className="mt-3 rounded-lg bg-surface p-3 text-xs"><span className="font-bold text-accent">AutoHub:</span> {c.staffNote}</p>}
          {c.refundAmount && <p className="mt-2 text-xs font-semibold text-success">Refunded {money(c.refundAmount)}</p>}
          <div className="mt-4 flex gap-2">
            {c.status === "REQUESTED" && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setModal({ type: "claim", claim: c, item: { id: c.orderItemId, name: c.sparePartName, quantity: c.purchasedQuantity } })}>Edit</Button>}
            {["REQUESTED", "REJECTED"].includes(c.status) && <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(c)}>Delete</Button>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ reviews

function ReviewsTab({ state, confirm, setModal }) {
  if (state.loading && !state.data.length) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!state.data.length) return <Empty text="You have not reviewed anything yet. You can review items from delivered orders." />;

  const remove = (review) =>
    confirm.ask({
      title: "Delete review?",
      message: `Delete your review of ${review.sparePartName}?`,
      action: async () => (await runAction(() => reviewApi.remove(review.id), "Review deleted")) && state.reload(),
    });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {state.data.map((r) => (
        <div key={r.id} className="card p-5">
          <div className="flex items-start justify-between">
            <div><p className="font-semibold">{r.sparePartName}</p><p className="text-xs text-muted">Order #{r.orderId} · {date(r.createdAt)}</p></div>
            <Link to={`/parts/${r.sparePartId}`} className="text-xs font-semibold text-accent">View on product page</Link>
          </div>
          <div className="mt-2"><Stars value={r.rating} size={15} /></div>
          <p className="mt-2 text-sm text-muted">{r.comment || "—"}</p>
          {r.staffReply && (
            <div className="mt-3 rounded-lg border-l-4 border-accent bg-surface px-3 py-2 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-wide text-accent">Reply from AutoHub Lanka · {date(r.repliedAt)}</p>
              <p className="mt-1">{r.staffReply}</p>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setModal({ type: "review", review: r, item: { id: r.orderItemId, name: r.sparePartName } })}>Edit</Button>
            <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(r)}>Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ feedback

function FeedbackTab({ state, confirm, setModal }) {
  const remove = (f) =>
    confirm.ask({
      title: "Delete feedback?",
      message: `Delete "${f.subject}"?`,
      action: async () => (await runAction(() => feedbackApi.remove(f.id), "Feedback deleted")) && state.reload(),
    });

  return (
    <>
      <div className="mb-4 flex justify-end"><Button icon={Plus} onClick={() => setModal({ type: "feedback", feedback: {} })}>Write feedback</Button></div>
      {state.loading && !state.data.length ? <div className="flex justify-center py-16"><Spinner /></div> : !state.data.length ? (
        <Empty text="Tell us how we did - your feedback appears on our home page." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {state.data.map((f) => (
            <div key={f.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div><p className="font-semibold">{f.subject}</p><p className="text-xs text-muted">{date(f.createdAt)}{f.orderId ? ` · order #${f.orderId}` : ""}</p></div>
              </div>
              <div className="mt-2"><Stars value={f.rating} size={15} /></div>
              <p className="mt-2 text-sm text-muted">{f.message}</p>
              <div className="mt-4 flex gap-2">
                <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setModal({ type: "feedback", feedback: f })}>Edit</Button>
                <Button size="sm" variant="ghost" icon={Trash2} onClick={() => remove(f)}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------------ forms

function ReviewForm({ item, review, onClose, onSaved }) {
  const form = useForm({ rating: review?.rating || 5, comment: review?.comment || "" });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = { orderItemId: item.id, rating: v.rating, comment: toText(v.comment) };
    await (review ? reviewApi.update(review.id, body) : reviewApi.create(body));
    onSaved();
    onClose();
  }, review ? "Review updated" : "Thanks for your review! It is now on the product page.");

  return (
    <Modal open title={review ? "Edit review" : "Write a review"} subtitle={item.name} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="review-form" loading={form.saving}>Submit</Button></>}>
      <form id="review-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Your rating" error={e.rating} required><Stars value={form.values.rating} size={28} onChange={(v) => form.set("rating", v)} /></Field>
        <Field label="Comment" error={e.comment}><Textarea rows={4} {...form.bind("comment")} error={e.comment} placeholder="How was the fit and quality?" /></Field>
      </form>
    </Modal>
  );
}

const REASONS = ["DEFECTIVE", "DAMAGED_IN_DELIVERY", "WRONG_ITEM", "NOT_AS_DESCRIBED", "DOES_NOT_FIT", "CHANGED_MIND", "OTHER"];

function ClaimForm({ item, claim, onClose, onSaved }) {
  const { returnWindowDays } = usePublicSettings();
  const form = useForm({
    type: claim?.type || "RETURN",
    reason: claim?.reason || "DEFECTIVE",
    quantity: claim?.quantity || 1,
    description: claim?.description || "",
  });
  const [images, setImages] = useState(claim?.imageUrls || []);
  const [newImage, setNewImage] = useState("");
  const e = form.errors;
  const reasons = form.values.type === "WARRANTY" ? ["DEFECTIVE", "OTHER"] : REASONS;

  const addImage = (url) => {
    if (url && images.length < 5) setImages((list) => [...list, url]);
    setNewImage("");
  };

  const onSubmit = form.submit(async (v) => {
    const body = { orderItemId: item.id, type: v.type, reason: v.reason, quantity: toNumber(v.quantity), description: v.description, imageUrls: images };
    await (claim ? rmaApi.update(claim.id, body) : rmaApi.create(body));
    onSaved();
    onClose();
  }, claim ? "Claim updated" : "Claim submitted - we will review it shortly");

  return (
    <Modal open title={claim ? `Edit claim RMA-${claim.id}` : "Return or warranty claim"} subtitle={item.name} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="claim-form" loading={form.saving}>Submit</Button></>}>
      <form id="claim-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Claim type" error={e.type} required hint={form.values.type === "RETURN" ? `Within ${returnWindowDays} days of delivery` : "Within the part's warranty period"}>
          <Select value={form.values.type} onChange={(ev) => { form.set("type", ev.target.value); if (ev.target.value === "WARRANTY") form.set("reason", "DEFECTIVE"); }}
            options={[{ value: "RETURN", label: "Return" }, { value: "WARRANTY", label: "Warranty claim" }]} />
        </Field>
        <Field label="Reason" error={e.reason} required><Select {...form.bind("reason")} error={e.reason} options={reasons.map((r) => ({ value: r, label: label(r) }))} /></Field>
        <Field label="Quantity" error={e.quantity} required hint={item.quantity ? `You bought ${item.quantity}` : ""}><Input type="number" min="1" max={item.quantity} {...form.bind("quantity")} error={e.quantity} /></Field>
        <div />
        <Field label="What is the problem?" error={e.description} required className="sm:col-span-2"><Textarea rows={3} {...form.bind("description")} error={e.description} placeholder="At least 10 characters" /></Field>
        <div className="sm:col-span-2">
          <p className="mb-1.5 text-xs font-semibold">Photos ({images.length}/5)</p>
          <div className="mb-2 flex flex-wrap gap-2">
            {images.map((url) => (
              <div key={url} className="relative">
                <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-line" />
                <button type="button" onClick={() => setImages((l) => l.filter((u) => u !== url))} className="absolute -right-1.5 -top-1.5 rounded-full bg-danger p-0.5 text-white"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
          {images.length < 5 && <ImageInput value={newImage} onChange={(url) => (url.startsWith("http") && url.length > 12 ? addImage(url) : setNewImage(url))} folder="autohub/claims" />}
        </div>
      </form>
    </Modal>
  );
}

function FeedbackForm({ feedback, orders, onClose, onSaved }) {
  const isNew = !feedback.id;
  const form = useForm({ orderId: feedback.orderId ?? "", subject: feedback.subject || "", message: feedback.message || "", rating: feedback.rating || 5 });
  const e = form.errors;

  const onSubmit = form.submit(async (v) => {
    const body = { orderId: toNumber(v.orderId), subject: v.subject, message: v.message, rating: v.rating };
    await (isNew ? feedbackApi.create(body) : feedbackApi.update(feedback.id, body));
    onSaved();
    onClose();
  }, isNew ? "Thank you for your feedback!" : "Feedback updated");

  return (
    <Modal open title={isNew ? "Share your feedback" : "Edit feedback"} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" form="fb-form" loading={form.saving}>Submit</Button></>}>
      <form id="fb-form" onSubmit={onSubmit} className="space-y-4">
        <Field label="Rating" required><Stars value={form.values.rating} size={28} onChange={(v) => form.set("rating", v)} /></Field>
        <Field label="About order" hint="Optional">
          <Select {...form.bind("orderId")} placeholder="General feedback" options={orders.map((o) => ({ value: o.id, label: `Order #${o.id} · ${date(o.createdAt)}` }))} />
        </Field>
        <Field label="Subject" error={e.subject} required><Input {...form.bind("subject")} error={e.subject} /></Field>
        <Field label="Message" error={e.message} required><Textarea rows={4} {...form.bind("message")} error={e.message} /></Field>
      </form>
    </Modal>
  );
}

function Empty({ text, action }) {
  return (
    <div className="card p-12 text-center text-sm text-muted">
      <p>{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
