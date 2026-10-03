import { ArrowRight, BadgeCheck, Car, Headphones, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { categoryApi, feedbackApi, promotionApi, sparePartApi, vehicleApi } from "../../api/endpoints";
import Avatar from "../../components/ui/Avatar";
import PartImage from "../../components/ui/PartImage";
import Spinner from "../../components/ui/Spinner";
import Stars from "../../components/ui/Stars";
import { useApi } from "../../hooks/useApi";
import { date, paymentMethodsText } from "../../utils/format";
import ProductCard from "./ProductCard";
import { usePublicSettings } from "../../hooks/usePublicSettings";

const activeCategories = () => categoryApi.list({ activeOnly: true });
const activeParts = () => sparePartApi.list({ activeOnly: true });

export default function Home() {
  const settings = usePublicSettings();
  const { data: promotions } = useApi(promotionApi.active);
  const { data: categories } = useApi(activeCategories);
  const { data: parts, loading } = useApi(activeParts);
  const { data: vehicles } = useApi(vehicleApi.list);
  const { data: feedback } = useApi(feedbackApi.public);
  const [showAllFeedback, setShowAllFeedback] = useState(false);
  const promo = promotions[0];
  const makes = groupByMake(vehicles);

  return (
    <>
      {/* HERO - promotion picture on the left, fading into the dark background; text and buttons on the right */}
      <section className="relative isolate overflow-hidden bg-primary text-white">
        <img src={promo?.imageUrl || "/bglogin.png"} alt=""
          className="absolute inset-y-0 left-0 -z-10 h-full w-full object-cover object-center opacity-60 lg:w-[68%] lg:opacity-100 lg:[mask-image:linear-gradient(to_right,black_45%,transparent_100%)]" />
        {/* darken towards the text side (and everywhere on small screens) */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-l from-primary via-primary/80 to-primary/20 lg:via-primary/40 lg:to-transparent" />
        {/* diagonal red accent at the right edge */}
        <div className="pointer-events-none absolute -right-24 top-0 -z-10 hidden h-full w-72 skew-x-[-24deg] bg-gradient-to-b from-accent/25 via-accent/10 to-transparent lg:block" />
        <div className="pointer-events-none absolute -right-4 top-0 -z-10 hidden h-full w-6 skew-x-[-24deg] bg-accent/30 lg:block" />

        <div className="mx-auto grid min-h-[22rem] max-w-7xl items-center px-4 py-14 sm:px-6 lg:min-h-[26rem] lg:grid-cols-2 lg:py-20">
          <div className="lg:col-start-2 lg:pl-10" data-testid="hero-text">
            <p className="mb-4 inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white ring-1 ring-accent/60">
              {promo ? `Promotion · until ${date(promo.endDate)}` : "Genuine parts guarantee"}
            </p>
            {promo ? (
              <h1 className="font-display text-4xl font-extrabold uppercase leading-[1.05] sm:text-6xl"><AccentLastWord text={promo.title} /></h1>
            ) : (
              <h1 className="font-display text-4xl font-extrabold uppercase leading-[1.05] sm:text-6xl">
                Drive better.<br /><span className="text-accent">Drive further.</span>
              </h1>
            )}
            <p className="mt-4 max-w-xl text-lg text-white/80 sm:text-xl">{promo?.description || "High-quality automotive parts for every make and model."}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="inline-flex items-center gap-2 rounded-lg bg-accent px-7 py-3.5 text-sm font-bold uppercase tracking-wide shadow-lg shadow-accent/30 hover:bg-accent-dark">
                Shop parts <ArrowRight className="h-4 w-4" />
              </Link>
              {promo?.spareParts.length > 0 && (
                <Link to={`/parts/${promo.spareParts[0].id}`} className="rounded-lg bg-black/40 px-7 py-3.5 text-sm font-bold uppercase tracking-wide ring-1 ring-white/30 hover:bg-white/10">View offer</Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="carbon border-t border-white/10 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-5">
          {[
            [BadgeCheck, "Genuine brands", "OEM & trusted aftermarket"],
            [Truck, "Fast delivery", "Island-wide"],
            [ShieldCheck, "Secure payment", paymentMethodsText(settings)],
            [RotateCcw, "Easy returns", `${settings.returnWindowDays} days after delivery`],
            [Headphones, "Expert support", "We help you pick the part"],
          ].map(([Icon, title, text]) => (
            <div key={title} className="flex items-center gap-3">
              <Icon className="h-7 w-7 shrink-0 text-white/85" strokeWidth={1.5} />
              <div>
                <p className="text-xs font-bold uppercase tracking-wide">{title}</p>
                <p className="text-xs text-white/60">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-14 px-4 py-12 sm:px-6">
        {/* CATEGORIES */}
        {categories.length > 0 && (
          <section>
            <SectionTitle title="Shop by category" link="/shop" />
            <div className="grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-8">
              {categories.map((c) => (
                <Link key={c.id} to={`/shop?categoryId=${c.id}`} className="group text-center">
                  <span className="mx-auto block aspect-square w-full max-w-28 overflow-hidden rounded-full bg-surface ring-1 ring-line transition group-hover:ring-2 group-hover:ring-accent">
                    <PartImage src={c.imageUrl} alt={c.name} className="h-full w-full transition group-hover:scale-105" />
                  </span>
                  <p className="mt-3 text-sm font-bold uppercase">{c.name}</p>
                  <p className="text-xs text-muted">{c.partCount} parts · Shop now</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* VEHICLES - one card per make; opens the shop with every part that fits that make */}
        {makes.length > 0 && (
          <section>
            <SectionTitle title="Find by vehicle" link="/shop" />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" data-testid="vehicle-makes">
              {makes.map((m) => (
                <Link key={m.make} to={`/shop?make=${encodeURIComponent(m.make)}`}
                  className="card group flex items-center gap-3 overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-2 hover:ring-accent">
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-xl font-extrabold uppercase leading-tight tracking-wide">{m.make}</p>
                    <p className="mt-1 text-xs text-muted">{m.models} model{m.models === 1 ? "" : "s"}</p>
                    <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-accent">Shop now <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" /></p>
                  </div>
                  <div className="h-20 w-32 shrink-0 xl:w-36">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.make} className="h-full w-full object-contain transition group-hover:scale-105" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center rounded-lg bg-surface"><Car className="h-10 w-10 text-muted" strokeWidth={1.25} /></span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* PARTS */}
        <section>
          <SectionTitle title="New arrivals" link="/shop" />
          {loading ? <div className="flex justify-center py-10"><Spinner /></div> : parts.length === 0 ? (
            <p className="card p-10 text-center text-sm text-muted">No spare parts yet.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{parts.slice(0, 8).map((p) => <ProductCard key={p.id} part={p} />)}</div>
          )}
        </section>

        {/* FEEDBACK */}
        <section>
          <SectionTitle title="Customer feedback" />
          {feedback.length === 0 ? (
            <p className="card p-10 text-center text-sm text-muted">No feedback yet. Share yours from My Orders.</p>
          ) : (
            <>
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {(showAllFeedback ? feedback : feedback.slice(0, 6)).map((f) => (
                  <article key={f.id} className="card flex flex-col p-6">
                    <Stars value={f.rating} size={15} />
                    <h3 className="mt-3 font-display font-bold">{f.subject}</h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-muted">“{f.message}”</p>
                    <div className="mt-5 flex items-center gap-3 border-t border-line pt-4" data-testid="feedback-author">
                      <Avatar src={f.customerImageUrl} name={f.customerName} size="md" />
                      <div className="text-xs leading-tight">
                        <p className="font-semibold text-ink">{f.customerName}</p>
                        <p className="mt-0.5 text-muted">{date(f.createdAt)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {feedback.length > 6 && (
                <div className="mt-6 text-center">
                  <button type="button" onClick={() => setShowAllFeedback((v) => !v)} className="rounded-xl px-5 py-2.5 text-sm font-bold text-accent ring-1 ring-accent hover:bg-accent hover:text-white">
                    {showAllFeedback ? "Show less" : `Show all ${feedback.length}`}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
}

function SectionTitle({ title, link }) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <h2 className="font-display text-2xl font-bold uppercase tracking-tight">{title}</h2>
      {link && (
        <Link to={link} className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-ink hover:text-accent">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

/** Highlights the last word of a promotion title in red, e.g. "BRAKE-WEEK" -> BRAKE-<red>WEEK</red>. */
function AccentLastWord({ text }) {
  const match = text.match(/^(.*[\s-])(\S+)$/);
  if (!match) return <span>{text}</span>;
  return <>{match[1]}<span className="text-accent">{match[2]}</span></>;
}

/** Vehicles grouped by make (case-insensitive), with the first picture available for that make. */
function groupByMake(vehicles) {
  const byMake = new Map();
  vehicles.forEach((v) => {
    const key = v.make.trim().toLowerCase();
    const group = byMake.get(key) || { make: v.make.trim(), modelNames: new Set(), imageUrl: null };
    group.modelNames.add(v.model.trim().toLowerCase());
    group.imageUrl ||= v.imageUrl;
    byMake.set(key, group);
  });
  return [...byMake.values()]
    .map((g) => ({ make: g.make, models: g.modelNames.size, imageUrl: g.imageUrl }))
    .sort((a, b) => a.make.localeCompare(b.make));
}
