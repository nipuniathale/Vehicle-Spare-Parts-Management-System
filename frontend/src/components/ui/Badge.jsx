import { label } from "../../utils/format";

const TONES = {
  green: "bg-success/10 text-success ring-success/25",
  amber: "bg-warning/15 text-[#9a5b00] ring-warning/40",
  red: "bg-danger/10 text-danger ring-danger/25",
  blue: "bg-info/10 text-info ring-info/25",
  gray: "bg-surface text-muted ring-line",
  navy: "bg-primary/10 text-primary ring-primary/20",
};

const STATUS_TONES = {
  ACTIVE: "green", APPROVED: "green", PAID: "green", DELIVERED: "green", RECEIVED: "green", CONFIRMED: "green",
  REFUNDED: "blue", REPLACED: "blue", SHIPPED: "blue", PROCESSING: "blue", ORDERED: "blue", PARTIALLY_RECEIVED: "blue",
  PENDING: "amber", PLACED: "amber", REQUESTED: "amber", SCHEDULED: "amber",
  REJECTED: "red", CANCELLED: "red", FAILED: "red", DECLINED: "red", EXPIRED: "gray", INACTIVE: "gray",
};

export default function Badge({ tone = "gray", children }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONES[status] || "gray"}>{label(status)}</Badge>;
}
