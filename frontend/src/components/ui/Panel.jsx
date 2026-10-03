import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/** White card with a title row and an optional "View all →" link or controls. */
export default function Panel({ title, subtitle, to, linkText = "View all", actions, className = "", bodyClassName = "p-5 pt-3", children }) {
  return (
    <section className={`card flex min-w-0 flex-col ${className}`}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="font-display text-[17px] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {actions}
        {to && (
          <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-accent hover:text-accent-dark">
            {linkText} <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** Small "nothing here" line used inside panels. */
export function Empty({ children }) {
  return <p className="py-8 text-center text-sm text-muted">{children}</p>;
}
