"use client";

import { Cpu, FileSearch, X } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { catalogApi } from "@/api/services";
import { CATEGORIES, formatNumber } from "@/lib/format";
import { useCsvAnalyzer } from "@/lib/useCsvAnalyzer";
import { useData } from "@/lib/useData";
import { useFps } from "@/lib/useFps";
import type { CsvResult } from "@/workers/csv/analyze";
import { CSV_SCHEMAS, type CsvContext, type CsvKind } from "@/workers/csv/schemas";
import { Notice, tableHeaderClass } from "./ui";

/**
 * Review of a CSV in the browser BEFORE uploading it, with a Web Worker.
 * It shows the progress, the main thread's fps (they stay high: the page does not freeze), the
 * errors per row, a preview and a summary. `action` receives the result so each screen decides what
 * to do with it (upload the clean file, send it by streaming…).
 */
export default function CsvReview({ kind, action }: {
  kind: CsvKind;
  action: (result: CsvResult, file: File) => ReactNode;
}) {
  const { analyze, cancel, progress, analyzing } = useCsvAnalyzer();
  const fps = useFps(analyzing);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CsvResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const context = useData<CsvContext>(async () => {
    const [municipalities, diseases] = await Promise.all([catalogApi.municipalities(), catalogApi.diseases()]);
    return {
      municipalities: municipalities.map((m) => m.divipola_code), diseases: diseases.map((d) => d.code),
      categories: Object.keys(CATEGORIES),
    };
  }, []);
  const schema = CSV_SCHEMAS[kind];

  async function review(selected: File) {
    setFile(selected); setResult(null); setError(null);
    if (!context.data) { setError("Aún no se cargan los catálogos; intenta de nuevo en un momento."); return; }
    try {
      setResult(await analyze(selected, kind, context.data));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo revisar el archivo");
    }
  }

  function clear() {
    if (analyzing) cancel();
    setFile(null); setResult(null); setError(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-2">
          <FileSearch size={15} aria-hidden /> {file ? "Elegir otro archivo" : "Elegir CSV"}
          <input ref={input} type="file" accept=".csv,text/csv" className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void review(f); }} />
        </label>
        {file && <span className="text-xs text-ink-2">{file.name} · {formatNumber(file.size / 1024, 0)} KB</span>}
        {file && <button type="button" onClick={clear} className="rounded-md p-1 text-muted hover:bg-surface-2" aria-label="Quitar archivo"><X size={15} /></button>}
      </div>
      <p className="text-[11px] text-muted">
        Columnas: {schema.columns.map((c) => schema.optional.includes(c) ? `${c} (opcional)` : c).join(", ")}. Separador «,» o «;».
        También se aceptan los encabezados en español de las plantillas anteriores.
      </p>

      {progress && (
        <div className="rounded-lg border border-line p-3 text-xs" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-medium"><Cpu size={14} aria-hidden /> Revisando en un Web Worker… {formatNumber(progress.rows)} filas</span>
            <span className="tabular text-muted">Hilo principal: {fps ?? "—"} fps</span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-surface-2">
            <div className="h-1.5 rounded-full bg-ink transition-[width]" style={{ width: `${Math.round(progress.fraction * 100)}%` }} />
          </div>
          <button type="button" onClick={clear} className="mt-2 text-[11px] text-ink-2 underline">Cancelar (termina el worker)</button>
        </div>
      )}
      {error && <Notice kind="error">{error}</Notice>}

      {result && file && (
        <div className="space-y-3 rounded-lg border border-line p-4 text-sm">
          {result.missing.length > 0 ? (
            <Notice kind="error">Faltan columnas: {result.missing.join(", ")}. Llegaron: {result.columns.join(", ") || "ninguna"}.</Notice>
          ) : (
            <>
              <dl className="grid gap-3 sm:grid-cols-4">
                <Stat label="Filas leídas" value={formatNumber(result.rowsRead)} />
                <Stat label="Válidas" value={formatNumber(result.validRows)} />
                <Stat label="Con error" value={formatNumber(result.rowsRead - result.validRows)} />
                <Stat label="Revisado en" value={`${formatNumber(result.durationMs, 0)} ms`} />
                {result.period && <Stat label="Periodo" value={`${result.period.from} → ${result.period.to}`} />}
                {result.total && <Stat label="Total" value={`${formatNumber(result.total.value)} ${result.total.label}`} />}
                <Stat label="Formato" value={`«${result.delimiter}» · ${result.encoding}`} />
                {result.duplicates > 0 && <Stat label="Repetidas" value={formatNumber(result.duplicates)} />}
              </dl>
              {result.groups && result.groups.values.length > 0 && (
                <p className="text-xs text-ink-2"><b className="font-medium">{result.groups.label}:</b>{" "}
                  {result.groups.values.slice(0, 8).map(([group, count]) => `${group} (${formatNumber(count)})`).join(" · ")}</p>
              )}
              {result.unexpected.length > 0 && <p className="text-xs text-muted">Columnas que se ignorarán: {result.unexpected.join(", ")}.</p>}
              {result.errors.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium text-[var(--st-red-ink)]">
                    {result.errors.length + result.omittedErrors} fila(s) con error — ver detalle
                  </summary>
                  <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
                    {result.errors.map((e) => <li key={e.row}>Fila {e.row}: {e.message}</li>)}
                    {result.omittedErrors > 0 && <li className="text-muted">… y {result.omittedErrors} más</li>}
                  </ul>
                </details>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className={tableHeaderClass}>{result.columns.map((c) => <th key={c} className="px-2 py-1.5 font-medium">{c}</th>)}</tr></thead>
                  <tbody>
                    {result.preview.map((row, i) => (
                      <tr key={i} className="border-b border-line">{result.columns.map((c) => <td key={c} className="px-2 py-1 tabular">{row[c]}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-[11px] text-muted">Vista previa de las primeras {result.preview.length} filas.</p>
              </div>
              {action(result, file)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-[11px] text-muted">{label}</dt><dd className="tabular font-medium">{value}</dd></div>;
}
