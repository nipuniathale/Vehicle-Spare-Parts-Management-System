import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({ open, title, subtitle, onClose, size = "md", children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const width = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-primary/50 p-4 backdrop-blur-sm sm:items-center">
      <div className={`card my-8 w-full ${width} shadow-2xl`} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line bg-surface/60 px-6 py-3">{footer}</div>}
      </div>
    </div>
  );
}
