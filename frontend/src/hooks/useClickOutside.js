import { useEffect, useRef } from "react";

/** Calls onOutside when the user clicks outside the returned ref (used for dropdowns). */
export function useClickOutside(onOutside) {
  const ref = useRef(null);
  useEffect(() => {
    const handle = (event) => {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onOutside]);
  return ref;
}
