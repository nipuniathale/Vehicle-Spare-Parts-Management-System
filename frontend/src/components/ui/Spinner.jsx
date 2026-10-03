import { Loader2 } from "lucide-react";

export default function Spinner({ className = "h-6 w-6" }) {
  return <Loader2 className={`animate-spin text-accent ${className}`} />;
}
