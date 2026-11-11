import type { CsvResult } from "./analyze";
import type { CsvContext, CsvKind } from "./schemas";

/** Message protocol between the page and the CSV worker (typed on both sides). */
export interface CsvWorkerRequest {
  type: "analyze";
  id: number;
  file: File;
  kind: CsvKind;
  context: CsvContext;
}

export type CsvWorkerMessage =
  | { type: "progress"; id: number; rows: number; fraction: number }
  | { type: "result"; id: number; result: CsvResult }
  | { type: "error"; id: number; message: string };
