"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MatrixMessage, MatrixRequest, MatrixResult } from "@/workers/sensitivity/messages";

/** Hook of the sensitivity-matrix worker (same pattern as useCsvAnalyzer). */
export function useSensitivityMatrix() {
  const worker = useRef<Worker | null>(null);
  const currentId = useRef(0);
  const [progress, setProgress] = useState<{ received: number; total: number } | null>(null);
  const [result, setResult] = useState<MatrixResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("../workers/sensitivity.worker.ts", import.meta.url),
      { type: "module", name: "sensitivity-matrix" });
    w.onmessage = (e: MessageEvent<MatrixMessage>) => {
      const m = e.data;
      if (m.id !== currentId.current) return;
      if (m.type === "progress") setProgress({ received: m.received, total: m.total });
      else if (m.type === "result") { setResult(m.result); setProgress(null); }
      else { setError(m.message); setProgress(null); }
    };
    worker.current = w;
    return () => w.terminate();
  }, []);

  const compute = useCallback((request: Omit<MatrixRequest, "type" | "id">) => {
    const id = ++currentId.current;
    setError(null);
    setResult(null);
    setProgress({ received: 0, total: request.xAxis.values.length * request.yAxis.values.length });
    worker.current?.postMessage({ ...request, type: "compute", id } satisfies MatrixRequest);
  }, []);

  return { compute, progress, result, error, computing: progress !== null };
}
