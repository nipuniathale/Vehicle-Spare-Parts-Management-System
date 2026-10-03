import { Wrench } from "lucide-react";
import { useState } from "react";

/** Product image with a neutral placeholder when missing or broken. */
export default function PartImage({ src, alt, className = "" }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-surface to-line/60 text-muted ${className}`}>
        <Wrench className="h-1/3 w-1/3 max-h-12 max-w-12 opacity-60" />
      </div>
    );
  }
  return <img src={src} alt={alt} onError={() => setBroken(true)} className={`object-cover ${className}`} />;
}
