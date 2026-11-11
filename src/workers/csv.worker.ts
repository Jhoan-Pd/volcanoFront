/// <reference lib="webworker" />
/**
 * Web Worker: reads and validates a CSV in a thread separate from the page.
 *
 * With a file of tens of thousands of rows, parsing and validating on the main thread would freeze
 * the page (clicks and animations would stop responding). Here the main thread only sends the File
 * and receives progress messages and the result.
 *
 *   page → worker  { type: "analyze", id, file, kind, context }
 *   worker → page  { type: "progress", id, rows, fraction } | { type: "result", id, result }
 *                  | { type: "error", id, message }
 */
import { analyzeCsv } from "./csv/analyze";
import { decode } from "./csv/reader";
import type { CsvWorkerMessage, CsvWorkerRequest } from "./csv/messages";

const MAX_BYTES = 20 * 1024 * 1024;
const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (m: CsvWorkerMessage) => scope.postMessage(m);

scope.onmessage = async (e: MessageEvent<CsvWorkerRequest>) => {
  const { id, file, kind, context } = e.data;
  try {
    if (file.size > MAX_BYTES) throw new Error("El archivo supera 20 MB");
    const { text, encoding } = decode(await file.arrayBuffer());
    const result = analyzeCsv(text, encoding, kind, context, (rows, fraction) => post({ type: "progress", id, rows, fraction }));
    post({ type: "result", id, result });
  } catch (err) {
    post({ type: "error", id, message: err instanceof Error ? err.message : "No se pudo leer el archivo" });
  }
};
