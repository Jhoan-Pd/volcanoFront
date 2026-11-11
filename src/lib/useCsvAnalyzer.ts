"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CsvResult } from "@/workers/csv/analyze";
import type { CsvContext, CsvKind } from "@/workers/csv/schemas";
import type { CsvWorkerRequest, CsvWorkerMessage } from "@/workers/csv/messages";

export interface CsvProgress {
  rows: number;
  fraction: number;
}

/**
 * Hook that wraps the CSV Web Worker: creates it on mount, terminates it on unmount and turns its
 * message protocol into a promise (`analyze(file)`), with the progress in state. `cancel()` kills
 * the worker (there is no faster way to stop a computation in another thread) and creates a new one.
 */
export function useCsvAnalyzer() {
  const worker = useRef<Worker | null>(null);
  const pending = useRef<{ id: number; resolve: (r: CsvResult) => void; reject: (e: Error) => void } | null>(null);
  const nextId = useRef(1);
  const [progress, setProgress] = useState<CsvProgress | null>(null);

  const create = useCallback(() => {
    // `new URL(..., import.meta.url)` tells Next.js to bundle the worker as a separate file
    const w = new Worker(new URL("../workers/csv.worker.ts", import.meta.url), { type: "module", name: "csv-analyzer" });
    w.onmessage = (e: MessageEvent<CsvWorkerMessage>) => {
      const m = e.data;
      const p = pending.current;
      if (!p || m.id !== p.id) return; // the answer to an analysis that was already cancelled
      if (m.type === "progress") setProgress({ rows: m.rows, fraction: m.fraction });
      else {
        pending.current = null;
        setProgress(null);
        if (m.type === "result") p.resolve(m.result);
        else p.reject(new Error(m.message));
      }
    };
    w.onerror = (e) => {
      pending.current?.reject(new Error(e.message || "El worker falló"));
      pending.current = null;
      setProgress(null);
    };
    worker.current = w;
  }, []);

  useEffect(() => {
    create();
    return () => worker.current?.terminate();
  }, [create]);

  const analyze = useCallback((file: File, kind: CsvKind, context: CsvContext) =>
    new Promise<CsvResult>((resolve, reject) => {
      if (!worker.current) return reject(new Error("El navegador no pudo iniciar el worker"));
      const id = nextId.current++;
      pending.current = { id, resolve, reject };
      setProgress({ rows: 0, fraction: 0 });
      const request: CsvWorkerRequest = { type: "analyze", id, file, kind, context };
      worker.current.postMessage(request);
    }), []);

  const cancel = useCallback(() => {
    worker.current?.terminate();
    pending.current?.reject(new Error("Análisis cancelado"));
    pending.current = null;
    setProgress(null);
    create();
  }, [create]);

  return { analyze, cancel, progress, analyzing: progress !== null };
}
