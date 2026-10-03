import { useAuth } from "../../context/AuthContext";
import { ROLE_LABELS } from "../../utils/format";
import HeroBanner from "./HeroBanner";

/** Greeting on the left, hero banner on the right - the top row of every dashboard home page. */
export default function DashboardHeader({ subtitle = "Here is what is happening in the store today.", banner }) {
  const { user } = useAuth();
  return (
    <div className="mb-6 grid items-center gap-5 lg:grid-cols-[1fr_minmax(0,560px)]">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-accent">{ROLE_LABELS[user.role]}</p>
        <h1 className="font-display text-3xl font-bold text-ink">Good day, {user.firstName}</h1>
        <p className="mt-1 text-muted">{subtitle}</p>
      </div>
      <HeroBanner {...banner} />
    </div>
  );
}
