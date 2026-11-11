"use client";

import { useEffect, useState } from "react";

/**
 * Frames per second of the main thread, measured with requestAnimationFrame. It proves that a Web
 * Worker works without freezing the page: if the computation ran here, the fps would drop to almost
 * zero while it lasts.
 */
export function useFps(active: boolean) {
  const [fps, setFps] = useState<number | null>(null);
  useEffect(() => {
    if (!active) { setFps(null); return; }
    let frames = 0;
    let start = performance.now();
    let id = requestAnimationFrame(function step(now) {
      frames++;
      if (now - start >= 500) {
        setFps(Math.round((frames * 1000) / (now - start)));
        frames = 0;
        start = now;
      }
      id = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(id);
  }, [active]);
  return fps;
}
