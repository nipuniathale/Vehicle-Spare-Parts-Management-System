import { Star } from "lucide-react";

export default function Stars({ value = 0, size = 16, onChange }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} star`}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= Math.round(value) ? "fill-warning text-warning" : "text-line"}
          />
        </button>
      ))}
    </div>
  );
}
