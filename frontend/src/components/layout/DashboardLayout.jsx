import { ChevronDown, ExternalLink, LogOut, Menu, Search, UserRound, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useAttention } from "../../hooks/useAttention";
import { useClickOutside } from "../../hooks/useClickOutside";
import { ROLE_LABELS } from "../../utils/format";
import Avatar from "../ui/Avatar";
import Logo from "./Logo";
import NotificationBell from "./NotificationBell";

/** Staff / supplier shell: dark sidebar (menu per role) + top bar with page search, notifications and account menu. */
export default function DashboardLayout({ menu, base = "/dashboard" }) {
  const { user } = useAuth();
  const { counts, notifications } = useAttention(user);
  const badgeOf = (item) => (typeof item.badge === "object" ? item.badge[user.role] : item.badge);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const sections = menu
    .map((section) => ({ ...section, items: section.items.filter((item) => item.roles.includes(user.role)) }))
    .filter((section) => section.items.length > 0);

  const toggleMenu = () => (window.innerWidth >= 1024 ? setCollapsed((v) => !v) : setMobileOpen((v) => !v));

  return (
    <div className="min-h-screen bg-surface">
      <aside className={`fixed inset-y-0 left-0 z-40 hidden w-64 lg:block ${collapsed ? "lg:hidden" : ""}`}>
        <Sidebar sections={sections} counts={counts} badgeOf={badgeOf} onNavigate={() => {}} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64">
            <Sidebar sections={sections} counts={counts} badgeOf={badgeOf} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className={collapsed ? "" : "lg:pl-64"}>
        <TopBar sections={sections} notifications={notifications} base={base} onMenu={toggleMenu} menuOpen={mobileOpen} />
        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar({ sections, counts, badgeOf, onNavigate }) {
  return (
    <div
      className="flex h-full flex-col bg-primary text-white"
      style={{
        backgroundImage: "linear-gradient(180deg, #0b0b0d 0%, #0b0b0d 58%, rgba(11,11,13,0.78) 100%), url(/bglogin.png)",
        backgroundSize: "auto, 820px auto",
        backgroundPosition: "center, 38% 100%",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="px-5 pb-4 pt-5">
        <Logo to="/" dark />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/45">{section.title}</p>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group relative mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition ${
                    isActive
                      ? "bg-gradient-to-r from-accent to-accent-dark text-white shadow-lg shadow-accent/25"
                      : "text-white/75 hover:bg-white/[0.06] hover:text-white"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="h-[18px] w-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {badgeOf(item) && counts[badgeOf(item)] > 0 && (
                      <span aria-hidden="true" className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold leading-5 ${isActive ? "bg-white text-accent" : "bg-accent text-white"}`}>
                        {counts[badgeOf(item)]}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="p-4">
        <Link to="/" className="flex items-center justify-between rounded-xl border border-white/20 bg-black/40 px-4 py-3 text-sm font-medium text-white/85 backdrop-blur transition hover:border-white/40 hover:text-white">
          View storefront <ExternalLink className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function TopBar({ sections, notifications, base, onMenu, menuOpen }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button type="button" onClick={onMenu} aria-label="Toggle menu" className="rounded-lg p-2 text-ink hover:bg-surface">
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      <PageSearch sections={sections} />
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <NotificationBell attention={notifications} />
        <AccountMenu base={base} />
      </div>
    </header>
  );
}

/** Quick search over the pages in the user's menu. */
function PageSearch({ sections }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const close = useCallback(() => setText(""), []);
  const ref = useClickOutside(close);

  const pages = sections.flatMap((s) => s.items.map((i) => ({ ...i, section: s.title })));
  const query = text.trim().toLowerCase();
  const matches = query ? pages.filter((p) => `${p.label} ${p.section}`.toLowerCase().includes(query)).slice(0, 6) : [];

  const go = (to) => {
    setText("");
    navigate(to);
  };

  return (
    <div ref={ref} className="relative hidden w-full max-w-sm sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && matches[0] && go(matches[0].to)}
        placeholder="Search pages…"
        className="input h-10 rounded-xl bg-surface/60 pl-9"
      />
      {query && (
        <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-line bg-white shadow-xl">
          {matches.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No page called “{text}”.</p>
          ) : (
            matches.map((p) => (
              <button key={p.to} type="button" onClick={() => go(p.to)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface">
                <p.icon className="h-4 w-4 text-accent" />
                <span className="font-medium">{p.label}</span>
                <span className="ml-auto text-xs text-muted">{p.section}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function AccountMenu({ base }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useClickOutside(close);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 hover:bg-surface">
        <Avatar src={user.profileImageUrl} name={user.fullName} className="!bg-primary !text-white !ring-accent/70" />
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-semibold text-ink">{user.fullName}</span>
          <span className="block text-xs text-muted">{ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronDown className="hidden h-4 w-4 text-muted md:block" />
      </button>
      {open && (
        <div className="absolute right-0 top-14 w-56 overflow-hidden rounded-xl border border-line bg-white py-1 shadow-xl">
          <Link to={`${base}/profile`} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
            <UserRound className="h-4 w-4 text-muted" /> My profile
          </Link>
          <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
            <ExternalLink className="h-4 w-4 text-muted" /> View storefront
          </Link>
          <button type="button" onClick={() => { logout(); navigate("/login"); }} className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-left text-sm text-accent hover:bg-surface">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
