"use client";

import { useEffect, useRef, useState } from "react";

const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

/** Animate a number from its previous value (or 0) to `value` while `active` is true. */
export function useCounter(value: number, active = true, durationMs = 900): number {
  const [current, setCurrent] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (!active) return;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) { setCurrent(value); from.current = value; return; }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (t: number) => {
      const progress = Math.min(1, (t - start) / durationMs);
      setCurrent(origin + (value - origin) * easeOutQuint(progress));
      if (progress < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, active, durationMs]);
  return current;
}
