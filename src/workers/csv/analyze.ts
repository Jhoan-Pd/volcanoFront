/**
 * Full analysis of a CSV: columns, row-by-row validation, preview, summary and a clean CSV with
 * only the valid rows. It is a pure function (it does not know it runs in a worker): it takes the
 * text and a progress callback.
 */
import { cell, csvRows, detectDelimiter } from "./reader";
import { CSV_SCHEMAS, InvalidRowError, LEGACY_HEADERS, type CsvContext, type CsvKind, type NormalizedRow } from "./schemas";

export const MAX_ERRORS = 200;
const PREVIEW_ROWS = 8;

export interface CsvResult {
  kind: CsvKind;
  schemaName: string;
  delimiter: string;
  encoding: string;
  columns: string[];
  missing: string[];
  unexpected: string[];
  rowsRead: number;
  validRows: number;
  errors: { row: number; message: string }[];
  omittedErrors: number;
  preview: Record<string, string>[];
  period: { from: string; to: string } | null;
  total: { label: string; value: number } | null;
  groups: { label: string; values: [string, number][] } | null;
  duplicates: number;
  /** Valid rows already converted (the pharmacy client-streaming upload sends them). */
  normalized: (NormalizedRow & { row: number })[];
  /** CSV with a header and only the valid rows, ready to upload. */
  validCsv: string;
  durationMs: number;
}

export function analyzeCsv(text: string, encoding: string, kind: CsvKind, ctx: CsvContext,
  onProgress: (rows: number, fraction: number) => void = () => {}): CsvResult {
  const start = performance.now();
  const schema = CSV_SCHEMAS[kind];
  const delimiter = detectDelimiter(text.slice(0, text.search(/\r?\n|$/)));
  const rows = csvRows(text, delimiter);
  const header = rows.next();
  const empty = header.done;
  // Headers of the original Spanish templates are translated to the current English ones
  const columns = empty ? [] : header.value.fields.map((c) => c.trim().toLowerCase()).map((c) => LEGACY_HEADERS[c] ?? c);
  const missing = schema.columns.filter((c) => !columns.includes(c) && !schema.optional.includes(c));
  const unexpected = columns.filter((c) => c && !schema.columns.includes(c));

  const r: CsvResult = {
    kind, schemaName: schema.name, delimiter, encoding, columns, missing, unexpected, rowsRead: 0, validRows: 0,
    errors: [], omittedErrors: 0, preview: [], period: null, total: null, groups: null, duplicates: 0,
    normalized: [], validCsv: "", durationMs: 0,
  };
  if (empty || missing.length) {
    r.durationMs = performance.now() - start;
    return r;
  }

  const validLines = [columns.map(cell).join(",")];
  const groups = new Map<string, number>();
  const seen = new Set<string>();
  let total = 0;
  let from: string | null = null;
  let to: string | null = null;
  let number = 1; // the header is row 1
  for (const { fields, end } of rows) {
    number++;
    r.rowsRead++;
    const row: Record<string, string> = {};
    columns.forEach((c, i) => { if (c) row[c] = fields[i] ?? ""; });
    if (r.preview.length < PREVIEW_ROWS) r.preview.push(row);
    try {
      const n = schema.convert(row, ctx);
      const key = JSON.stringify(n);
      if (seen.has(key)) r.duplicates++;
      seen.add(key);
      r.validRows++;
      r.normalized.push({ ...n, row: number });
      validLines.push(columns.map((c) => cell(row[c] ?? "")).join(","));
      const p = schema.period(n);
      if (from === null || p < from) from = p;
      if (to === null || p > to) to = p;
      if (schema.total) total += Number(n[schema.total.column] ?? 0);
      if (schema.group) { const g = String(n[schema.group.column]); groups.set(g, (groups.get(g) ?? 0) + 1); }
    } catch (e) {
      if (!(e instanceof InvalidRowError)) throw e;
      if (r.errors.length < MAX_ERRORS) r.errors.push({ row: number, message: e.message });
      else r.omittedErrors++;
    }
    if (r.rowsRead % 2000 === 0) onProgress(r.rowsRead, end / text.length);
  }
  onProgress(r.rowsRead, 1);
  r.period = from && to ? { from, to } : null;
  r.total = schema.total ? { label: schema.total.label, value: Math.round(total * 10) / 10 } : null;
  r.groups = schema.group ? { label: schema.group.label, values: [...groups].sort((a, b) => b[1] - a[1]) } : null;
  r.validCsv = validLines.join("\n") + "\n";
  r.durationMs = performance.now() - start;
  return r;
}
