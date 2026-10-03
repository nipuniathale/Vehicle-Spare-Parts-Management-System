import { Link } from "react-router-dom";

/** Angular "A" mark in brand red. */
export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 50 40" aria-hidden="true">
      <path d="M22 2h9l17 36h-10l-3.3-7.2H18.4l3.4-7.2h9.6L26.5 13 15 38H4Z" fill="#e3161f" />
      <path d="M0 26h17l-3 6H0Z" fill="#e3161f" opacity=".85" />
      <path d="M2 18h19l-2.6 5.4H2Z" fill="#e3161f" opacity=".55" />
    </svg>
  );
}

export default function Logo({ to = "/", dark = false }) {
  return (
    <Link to={to} className="flex items-center gap-2">
      <LogoMark />
      <span className="leading-none">
        <span className={`block font-display text-xl font-extrabold tracking-tight ${dark ? "text-white" : "text-ink"}`}>
          AUTO<span className="text-accent">HUB</span>
        </span>
        <span className={`mt-0.5 block text-[8.5px] font-semibold uppercase tracking-[0.2em] ${dark ? "text-white/60" : "text-muted"}`}>
          Genuine spare parts
        </span>
      </span>
    </Link>
  );
}
