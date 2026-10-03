import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/** Dark banner with the garage photo, used at the top of every dashboard home page. */
export default function HeroBanner({ title = "Quality parts", highlight = "for a smoother ride", to = "/shop", action = "View products" }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-primary px-6 py-5 text-white"
      style={{
        backgroundImage: "linear-gradient(90deg, #0b0b0d 0%, rgba(11,11,13,0.92) 38%, rgba(11,11,13,0.25) 100%), url(/bglogin.png)",
        backgroundSize: "cover",
        backgroundPosition: "center 62%",
      }}
    >
      <p className="font-display text-lg font-bold uppercase leading-tight sm:text-xl">{title}</p>
      <p className="font-display text-xl font-extrabold uppercase leading-tight text-accent sm:text-2xl">{highlight}</p>
      <Link to={to} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-accent px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent">
        {action} <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
