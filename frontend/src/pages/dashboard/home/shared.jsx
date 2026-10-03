import { AlertTriangle } from "lucide-react";
import Avatar from "../../../components/ui/Avatar";
import { StatusBadge } from "../../../components/ui/Badge";
import Spinner from "../../../components/ui/Spinner";
import Stars from "../../../components/ui/Stars";
import { date } from "../../../utils/format";

/** Loading / error state for a dashboard page. */
export function Loading({ error }) {
  if (error) {
    return (
      <div className="card flex items-center gap-3 p-6 text-sm text-accent">
        <AlertTriangle className="h-5 w-5" /> {error}
      </div>
    );
  }
  return (
    <div className="flex justify-center py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}




export function ReviewRow({ review }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <Avatar src={review.customerImageUrl} name={review.customerName} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-semibold text-ink">{review.customerName}</span>
          <Stars value={review.rating} size={14} />
          <span className="text-xs text-muted">{review.sparePartName}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-muted">{review.comment || "(no comment)"}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-xs text-muted">{date(review.createdAt)}</span>
        <StatusBadge status={review.status} />
      </div>
    </div>
  );
}
