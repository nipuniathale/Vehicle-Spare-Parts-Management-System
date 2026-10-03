import { MessageSquareReply } from "lucide-react";
import { useState } from "react";
import { reviewApi } from "../../../api/endpoints";
import Avatar from "../../../components/ui/Avatar";
import Button from "../../../components/ui/Button";
import ConfirmDialog from "../../../components/ui/ConfirmDialog";
import DataTable from "../../../components/ui/DataTable";
import Field, { Textarea } from "../../../components/ui/Field";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import RowActions from "../../../components/ui/RowActions";
import Stars from "../../../components/ui/Stars";
import { useAuth } from "../../../context/AuthContext";
import { runAction, useApi } from "../../../hooks/useApi";
import { useConfirm } from "../../../hooks/useConfirm";
import { date } from "../../../utils/format";

export default function Reviews() {
  const { data, loading, error, reload } = useApi(reviewApi.list);
  const { hasRole } = useAuth();
  const canReply = hasRole("SALES_STAFF");
  const [replying, setReplying] = useState(null);
  const confirm = useConfirm();

  const askDelete = (row) =>
    confirm.ask({
      title: "Delete review",
      message: `Delete ${row.customerName}'s review of ${row.sparePartName}?`,
      action: async () => (await runAction(() => reviewApi.remove(row.id), "Review deleted")) && reload(),
    });

  const columns = [
    { key: "sparePartName", header: "Product", render: (r) => <div><p className="font-semibold">{r.sparePartName}</p><p className="text-xs text-muted">Order #{r.orderId}</p></div> },
    {
      key: "customerName", header: "Customer",
      render: (r) => (
        <div className="flex items-center gap-2.5 text-xs">
          <Avatar src={r.customerImageUrl} name={r.customerName} size="sm" />
          <div><p className="font-semibold">{r.customerName}</p><p className="text-muted">{date(r.createdAt)}</p></div>
        </div>
      ),
    },
    { key: "rating", header: "Rating", render: (r) => <Stars value={r.rating} size={14} /> },
    {
      key: "comment", header: "Comment & reply",
      render: (r) => (
        <div className="max-w-sm text-xs">
          <p>{r.comment || "—"}</p>
          {r.staffReply && (
            <p className="mt-1.5 border-l-2 border-accent pl-2 text-muted">
              <span className="font-semibold text-accent">Reply:</span> {r.staffReply}
              <span className="block text-[10px]">{r.repliedBy} · {date(r.repliedAt)}</span>
            </p>
          )}
        </div>
      ),
    },
    {
      key: "actions", header: "", className: "text-right",
      render: (r) => (
        <RowActions onDelete={() => askDelete(r)}>
          {canReply && (
            <button type="button" onClick={() => setReplying(r)} title={r.staffReply ? "Edit reply" : "Reply"}
              className="rounded-lg p-2 text-muted transition hover:bg-accent/10 hover:text-accent">
              <MessageSquareReply className="h-4 w-4" />
            </button>
          )}
        </RowActions>
      ),
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Customer care" title="Product Reviews"
        subtitle="Customers review parts after delivery. Reviews appear on the product page straight away. Reply to thank customers or answer a question - the reply is shown under the review." />
      <DataTable columns={columns} rows={data} loading={loading} error={error} />
      {replying && <ReplyModal review={replying} onClose={() => setReplying(null)} onSaved={reload} />}
      <ConfirmDialog {...confirm.props} />
    </>
  );
}

function ReplyModal({ review, onClose, onSaved }) {
  const [reply, setReply] = useState(review.staffReply || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (text, removing = false) => {
    if (!removing && !text.trim()) return setError("Please write a reply");
    if (text.length > 1000) return setError("Reply can have at most 1000 characters");
    setSaving(true);
    const ok = await runAction(() => reviewApi.reply(review.id, removing ? "" : text.trim()), removing ? "Reply removed" : "Reply published");
    setSaving(false);
    if (ok) {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal open title={review.staffReply ? "Edit reply" : "Reply to review"} subtitle={`${review.customerName} on ${review.sparePartName}`} onClose={onClose}
      footer={
        <>
          {review.staffReply && <Button variant="secondary" className="mr-auto" onClick={() => save("", true)} disabled={saving}>Remove reply</Button>}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save(reply)} loading={saving}>Publish reply</Button>
        </>
      }>
      <div className="mb-4 rounded-lg bg-surface p-3 text-sm">
        <Stars value={review.rating} size={13} />
        <p className="mt-1">{review.comment || "—"}</p>
      </div>
      <Field label="Your reply" error={error} required hint={`${reply.length}/1000 · shown publicly under the review`}>
        <Textarea rows={4} value={reply} error={error} onChange={(e) => { setReply(e.target.value); setError(""); }} placeholder="Thank you for your review…" />
      </Field>
    </Modal>
  );
}
