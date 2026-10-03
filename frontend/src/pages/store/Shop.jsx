import { Car, SlidersHorizontal, X } from "lucide-react";
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { categoryApi, sparePartApi, vehicleApi } from "../../api/endpoints";
import Spinner from "../../components/ui/Spinner";
import { useApi } from "../../hooks/useApi";
import ProductCard from "./ProductCard";

const activeCategories = () => categoryApi.list({ activeOnly: true });

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const categoryId = params.get("categoryId") || "";
  const vehicleId = params.get("vehicleId") || "";
  const make = params.get("make") || "";

  const loader = useCallback(
    () => sparePartApi.list({
      activeOnly: true, search: search || undefined, categoryId: categoryId || undefined,
      vehicleId: vehicleId || undefined, make: make || undefined,
    }),
    [search, categoryId, vehicleId, make]
  );
  const { data: parts, loading } = useApi(loader);
  const { data: categories } = useApi(activeCategories);
  const { data: vehicles } = useApi(vehicleApi.list);

  const sameMake = (v) => v.make.trim().toLowerCase() === make.trim().toLowerCase();
  const vehicleOptions = make ? vehicles.filter(sameMake) : vehicles;
  const selectedVehicle = vehicles.find((v) => String(v.id) === vehicleId);

  const update = (key, value, ...remove) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    remove.forEach((k) => next.delete(k));
    setParams(next);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Catalogue</p>
        <h1 className="font-display text-3xl font-bold">
          {selectedVehicle ? `Parts for ${selectedVehicle.displayName}` : make ? `Parts for ${make}` : "Spare parts"}
        </h1>
      </div>

      {make && (
        <div className="card mb-4 flex flex-wrap items-center gap-2 p-4" data-testid="make-filter">
          <span className="mr-1 flex items-center gap-2 text-sm font-semibold"><Car className="h-4 w-4 text-accent" /> {make} models:</span>
          <button type="button" onClick={() => update("vehicleId", "")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${!vehicleId ? "bg-accent text-white ring-accent" : "ring-line hover:bg-surface"}`}>
            All {make}
          </button>
          {vehicleOptions.map((v) => (
            <button key={v.id} type="button" onClick={() => update("vehicleId", String(v.id))}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${String(v.id) === vehicleId ? "bg-accent text-white ring-accent" : "ring-line hover:bg-surface"}`}>
              {v.model} {v.year}{v.variant ? ` ${v.variant}` : ""}
            </button>
          ))}
          <button type="button" onClick={() => update("make", "", "vehicleId")} className="ml-auto flex items-center gap-1 text-xs font-semibold text-muted hover:text-accent">
            <X className="h-3.5 w-3.5" /> All vehicles
          </button>
        </div>
      )}

      <div className="card mb-6 grid gap-3 p-4 sm:grid-cols-[auto_1fr_1fr_1fr] sm:items-center">
        <span className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4 text-accent" /> Filter</span>
        <input className="input" placeholder="Search name, brand, SKU" defaultValue={search} onKeyDown={(e) => e.key === "Enter" && update("search", e.target.value.trim())} onBlur={(e) => update("search", e.target.value.trim())} />
        <select className="input" value={categoryId} onChange={(e) => update("categoryId", e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input" value={vehicleId} onChange={(e) => update("vehicleId", e.target.value)}>
          <option value="">{make ? `All ${make} models` : "All vehicles"}</option>
          {vehicleOptions.map((v) => <option key={v.id} value={v.id}>{v.displayName}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>
      ) : parts.length === 0 ? (
        <div className="card p-16 text-center text-sm text-muted">No parts match these filters.</div>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted">{parts.length} part{parts.length === 1 ? "" : "s"} found</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{parts.map((p) => <ProductCard key={p.id} part={p} />)}</div>
        </>
      )}
    </div>
  );
}
