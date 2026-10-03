import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-accent text-white hover:bg-accent-dark shadow-sm shadow-accent/20",
  secondary: "bg-white text-ink ring-1 ring-inset ring-line hover:bg-surface",
  danger: "bg-danger text-white hover:brightness-95",
  ghost: "text-muted hover:bg-surface hover:text-ink",
  success: "bg-success text-white hover:brightness-95",
};

const SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-sm gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  className = "",
  children,
  disabled,
  ...props
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
