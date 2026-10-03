import { Info } from "lucide-react";
import PageHeader from "../../../components/ui/PageHeader";

/** Header used by the admin's read-only function summaries. */
export default function AdminSummary({ title, subtitle, owner, children }) {
  return (
    <>
      <PageHeader eyebrow="Business functions" title={title} subtitle={subtitle} />
      <p className="-mt-3 mb-5 flex items-center gap-2 text-xs text-muted">
        <Info className="h-4 w-4 text-info" /> Read-only summary. Day-to-day changes are made by the {owner}.
      </p>
      <div className="space-y-5">{children}</div>
    </>
  );
}
