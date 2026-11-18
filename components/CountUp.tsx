"use client";
// A number that counts smoothly to its new value (instantly for reduced-motion users).
import { useEffect, useRef, useState } from "react";

export function CountUp({ value, duration = 700 }: { value: number | null | undefined; duration?: number }) {
  const [shown, setShown] = useState(value ?? 0);
  const from = useRef(value ?? 0);

  useEffect(() => {
    if (value == null) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;
    if (reduce || start === value) {
      setShown(value);
      from.current = value;
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  if (value == null) return <>—</>;
  return (
    <span aria-label={String(value)}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
