import { Bell, CheckCheck } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useClickOutside } from "../../hooks/useClickOutside";
import { useNotifications } from "../../hooks/useNotifications";
import { dateTime } from "../../utils/format";

/**
 * Bell icon with two parts:
 *  - "Needs your attention": live counters for the user's role (orders to process, requests to approve ...)
 *  - "Notifications": messages sent by the system (payment received, order shipped, request approved ...)
 */
export default function NotificationBell({ attention = [], dark = false }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(close);
  const navigate = useNavigate();
  const { items, unread, markRead, markAllRead } = useNotifications();
  const total = unread + attention.reduce((sum, a) => sum + a.count, 0);

  const openItem = (n) => {
    setOpen(false);
    if (!n.seen) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label="Notifications"
        className={`relative rounded-full p-2 ${dark ? "text-white hover:text-accent" : "text-ink hover:bg-surface"}`}>
        <Bell className="h-5 w-5" />
        {total > 0 && (
          <span className={`absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] font-bold leading-5 text-white ring-2 ${dark ? "ring-primary" : "ring-white"}`}>
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-white text-ink shadow-xl">
          {attention.length > 0 && (
            <>
              <p className="border-b border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted">Needs your attention</p>
              {attention.map((a) => (
                <Link key={a.key} to={a.to} onClick={() => setOpen(false)} className="flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-surface">
                  <span className="mt-0.5 min-w-6 rounded-full bg-accent/10 px-1.5 text-center text-xs font-bold leading-6 text-accent">{a.count}</span>
                  <span>{a.text}</span>
                </Link>
              ))}
            </>
          )}
          <div className="flex items-center justify-between border-y border-line px-4 py-2.5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Notifications</p>
            {unread > 0 && (
              <button type="button" onClick={markAllRead} className="flex items-center gap-1 text-xs font-semibold text-accent">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <button key={n.id} type="button" onClick={() => openItem(n)}
                  className={`flex w-full gap-3 px-4 py-3 text-left text-sm hover:bg-surface ${n.seen ? "" : "bg-accent/[0.04]"}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.seen ? "bg-transparent" : "bg-accent"}`} />
                  <span className="min-w-0">
                    <span className="block font-semibold">{n.title}</span>
                    <span className="block text-xs text-muted">{n.message}</span>
                    <span className="mt-0.5 block text-[11px] text-muted">{dateTime(n.createdAt)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
