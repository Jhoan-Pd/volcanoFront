"use client";

import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";

/** True from the first time the element enters the viewport (and it stays that way). */
export function useVisible<T extends Element>(rootMargin = "0px 0px -8% 0px") {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin, threshold: 0.05 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin, visible]);
  return { ref, visible };
}

/**
 * Makes its content appear (it rises 24 px and becomes opaque) when it enters the viewport.
 * `delay` staggers several consecutive elements (e.g. the traffic-light cards).
 */
export default function Reveal({ children, delay = 0, as: Tag = "div", className = "" }: {
  children: ReactNode; delay?: number; as?: ElementType; className?: string;
}) {
  const { ref, visible } = useVisible<HTMLElement>();
  return (
    <Tag ref={ref} className={`reveal ${visible ? "visible" : ""} ${className}`}
      style={{ "--delay": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}
