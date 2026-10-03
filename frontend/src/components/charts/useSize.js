import { useEffect, useRef, useState } from "react";

/** Width of a container element (re-measured when it resizes) so SVG charts can draw at real pixel size. */
export function useWidth(initial = 320) {
  const ref = useRef(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.floor(entry.contentRect.width))));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
