import { MessageSquare, RotateCcw, Star, StarHalf } from "lucide-react";
import { dashboardApi } from "../../../api/endpoints";
import Avatar from "../../../components/ui/Avatar";
import { StatusBadge } from "../../../components/ui/Badge";
import MiniTable from "../../../components/ui/MiniTable";
import Panel, { Empty } from "../../../components/ui/Panel";
import StatCard from "../../../components/ui/StatCard";
import { useApi } from "../../../hooks/useApi";
import { date, label } from "../../../utils/format";
import { Loading, ReviewRow } from "../home/shared";
import AdminSummary from "./AdminSummary";

const claimColumns = [
  { header: "Claim", render: (r) => <span className="font-mono text-xs font-semibold">RMA-{r.id}</span> },
  { header: "Customer", render: (r) => r.customerName },
  { header: "Part", render: (r) => <span className="font-medium text-ink">{r.sparePartName}</span> },
  { header: "Type", render: (r) => `${label(r.type)} · ${label(r.reason)}` },
  { header: "Since", render: (r) => <span className="text-muted">{date(r.createdAt)}</span> },
  { header: "Status", render: (r) => <StatusBadge status={r.status} /> },
];

const feedbackColumns = [
  { header: "Customer", render: (f) => <span className="flex items-center gap-2"><Avatar src={f.customerImageUrl} name={f.customerName} size="xs" />{f.customerName}</span> },
  { header: "Subject", render: (f) => <span className="font-medium text-ink">{f.subject}</span> },
  { header: "Rating", render: (f) => `${f.rating} / 5` },
  { header: "Date", render: (f) => <span className="text-muted">{date(f.createdAt)}</span> },
];

export default function AdminCustomerCare() {
  const { data: d, error } = useApi(dashboardApi.customerCare, null);
  return (
    <AdminSummary title="Customer Care" subtitle="Product reviews, customer feedback and return / warranty claims (read-only)." owner="Sales Staff">
      {!d ? <Loading error={error} /> : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard icon={Star} label="Reviews" value={d.totalReviews} tone="dark" hint={`${d.reviewsThisMonth} this month`} />
            <StatCard icon={MessageSquare} label="Feedback messages" value={d.totalFeedback} tone="blue" />
            <StatCard icon={RotateCcw} label="Open claims" value={d.openClaims} tone={d.openClaims ? "red" : "green"} hint="returns / warranty" />
            <StatCard icon={StarHalf} label="Average rating" value={d.averageRating ? d.averageRating.toFixed(1) : "—"} tone="blue" hint="all published reviews" />
          </div>
          <Panel title="Needs attention: open return & warranty claims">
            <MiniTable columns={claimColumns} rows={d.openClaimList} empty="No open claims." />
          </Panel>
          <div className="grid gap-5 2xl:grid-cols-2">
            <Panel title="Latest reviews" subtitle="Published straight away - no approval step">
              {d.recentReviews.length === 0 ? <Empty>No reviews yet.</Empty> : (
                <div className="divide-y divide-line">{d.recentReviews.map((r) => <ReviewRow key={r.id} review={r} />)}</div>
              )}
            </Panel>
            <Panel title="Latest feedback">
              <MiniTable columns={feedbackColumns} rows={d.recentFeedback} empty="No feedback yet." />
            </Panel>
          </div>
        </>
      )}
    </AdminSummary>
  );
}
