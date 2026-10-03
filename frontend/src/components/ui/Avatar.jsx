import { useState } from "react";
import { assetUrl } from "../../api/client";

const SIZES = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-base", xl: "h-24 w-24 text-2xl" };

/** Profile picture, or the person's initials when there is none (or it fails to load). */
export default function Avatar({ src, name = "", size = "md", className = "" }) {
  const url = assetUrl(src);
  const [failed, setFailed] = useState(null);
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?";
  const showImage = url && failed !== url;

  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/15 font-bold text-accent ring-2 ring-white ${SIZES[size]} ${className}`}>
      {showImage ? (
        <img src={url} alt={name} referrerPolicy="no-referrer" onError={() => setFailed(url)} className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
