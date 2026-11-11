"use client";

import { CloudSun, Database, FileUp, RefreshCw, Search, Stethoscope } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { errorMessage } from "@/api/client";
import { dataApi, weatherApi } from "@/api/services";
import type { ImportKind, ImportResult } from "@/api/types";
import { formatDate, formatNumber } from "@/lib/format";
import { useData } from "@/lib/useData";
import type { CsvResult } from "@/workers/csv/analyze";
import CsvReview from "../CsvReview";
import { Button, Field, inputClass, Notice, Spinner, tableHeaderClass } from "../ui";

type Feedback = { kind: "ok" | "error"; text: string } | null;

/** Run one action of the panel and turn its outcome into a notice. */
function useAction() {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const run = useCallback(async (action: () => Promise<string>, onDone?: () => void) => {
    setLoading(true); setFeedback(null);
    try {
      setFeedback({ kind: "ok", text: await action() });
      onDone?.();
    } catch (e) {
      setFeedback({ kind: "error", text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, []);
  return { loading, feedback, run };
}

function Source({ icon, title, description, children, feedback }: {
  icon: ReactNode; title: string; description: string; children: ReactNode; feedback: Feedback;
}) {
  return (
    <div className="flex flex-col rounded-lg border border-line p-4">
      <p className="flex items-center gap-2 font-medium"><span className="text-muted">{icon}</span>{title}</p>
      <p className="mt-1 flex-1 text-sm text-ink-2">{description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>
      {feedback && <div className="mt-3"><Notice kind={feedback.kind}>{feedback.text}</Notice></div>}
    </div>
  );
}

const IMPORT_KINDS: Record<ImportKind, string> = {
  cases: "Casos semanales", weather: "Clima diario", events: "Eventos volcánicos", trends: "Búsquedas (Trends)",
};

export default function DataPanel() {
  const { data: sources, error: sourcesError, reload: reloadSources } = useData(() => dataApi.status(), []);
  const weather = useAction();
  const trends = useAction();
  const sivigila = useAction();
  const [sinceYear, setSinceYear] = useState(2020);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title text-2xl">Fuentes de datos</h2>
        <p className="text-xs text-muted">
          GitHub Actions ejecuta estas sincronizaciones una vez al día. Aquí puedes lanzarlas a mano o cargar archivos.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Source icon={<CloudSun size={16} />} title="Clima · Open-Meteo" feedback={weather.feedback}
          description="Pronóstico de 16 días y últimos 14 días observados de cada municipio. Sin API key.">
          <Button loading={weather.loading} onClick={() => weather.run(async () => {
            const r = await weatherApi.sync();
            return `${formatNumber(r.saved_rows)} días guardados para ${r.municipalities} municipios.` +
              (r.errors.length ? ` Errores: ${r.errors.join("; ")}` : "");
          }, reloadSources)}><RefreshCw size={15} /> Sincronizar clima</Button>
        </Source>
        <Source icon={<Search size={16} />} title="Búsquedas · Google Trends" feedback={trends.feedback}
          description="Índice semanal de búsquedas de síntomas en Nariño (CO-NAR). Si pytrends falla se usa la caché en BD o el CSV de respaldo.">
          <Button loading={trends.loading} onClick={() => trends.run(async () => {
            const r = await dataApi.syncTrends();
            return `Fuente: ${r.source}. ${formatNumber(r.saved_rows)} semanas guardadas` +
              (r.from_cache.length ? `; al día en caché: ${r.from_cache.join(", ")}` : "") +
              (r.errors.length ? `. Avisos: ${r.errors.join("; ")}` : ".");
          }, reloadSources)}><RefreshCw size={15} /> Sincronizar búsquedas</Button>
        </Source>
        <Source icon={<Stethoscope size={16} />} title="Casos · SIVIGILA (datos.gov.co)" feedback={sivigila.feedback}
          description="Casos oficiales del INS por semana epidemiológica. Reemplazan a los simulados de las mismas semanas.">
          <label className="flex items-center gap-1.5 text-xs text-ink-2">
            Desde
            <input type="number" min={2007} max={2100} value={sinceYear} onChange={(e) => setSinceYear(Number(e.target.value))}
              className="w-20 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none" aria-label="Año inicial" />
          </label>
          <Button loading={sivigila.loading} onClick={() => sivigila.run(async () => {
            const r = await dataApi.syncSivigila(sinceYear);
            return r.saved_rows
              ? `${formatNumber(r.saved_rows)} semanas guardadas (${r.diseases.join(", ")}; años ${r.years_covered.join(", ")}).`
              : `No se encontraron registros nuevos.${r.errors.length ? ` ${r.errors.join("; ")}` : ""}`;
          }, reloadSources)}><RefreshCw size={15} /> Sincronizar casos</Button>
        </Source>
      </div>

      <CsvImport onDone={reloadSources} />

      <div>
        <h3 className="section-title mb-2 flex items-center gap-2 text-[15px]"><Database size={15} className="text-muted" /> Estado de las tablas</h3>
        {sourcesError ? <Notice kind="error">{sourcesError}</Notice> : !sources ? <Spinner /> : (
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="px-3 py-2 font-medium">Fuente</th>
                  <th className="px-3 py-2 text-right font-medium">Registros</th>
                  <th className="px-3 py-2 text-right font-medium">Simulados</th>
                  <th className="px-3 py-2 font-medium">Última semana</th>
                  <th className="px-3 py-2 font-medium">Actualizado</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.table} className="border-b border-line/70 last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium">{s.source}</p>
                      <p className="text-[11px] text-muted">{s.table}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular">{formatNumber(s.rows)}</td>
                    <td className="px-3 py-2 text-right tabular">
                      {s.rows ? `${formatNumber((100 * s.simulated) / s.rows, 0)} %` : "—"}
                    </td>
                    <td className="px-3 py-2 tabular">{s.latest_week?.replace("-S", " · S") ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-ink-2">
                      {s.last_updated ? formatDate(s.last_updated, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CsvImport({ onDone }: { onDone: () => void }) {
  const [kind, setKind] = useState<ImportKind>("cases");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  /** Upload the original file or, when it had errors, a clean CSV the worker built with the valid rows. */
  async function upload(review: CsvResult, file: File, validOnly: boolean) {
    setUploading(true); setResult(null); setError(null);
    try {
      const payload = validOnly
        ? new File([review.validCsv], file.name.replace(/\.csv$/i, "") + "-validas.csv", { type: "text/csv" }) : file;
      setResult(await dataApi.importCsv(kind, payload));
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-line p-4">
      <p className="flex items-center gap-2 font-medium"><FileUp size={16} className="text-muted" /> Carga de CSV</p>
      <p className="mt-1 text-sm text-ink-2">
        El archivo se revisa primero en tu navegador con un Web Worker (columnas, tipos, municipios y enfermedades) y solo
        después se sube. Inserta o actualiza registros: subir el mismo archivo dos veces no duplica. Máximo 5 MB.
      </p>
      <div className="mt-3 max-w-xs">
        <Field label="Tipo de archivo">
          <select className={inputClass} value={kind} onChange={(e) => { setKind(e.target.value as ImportKind); setResult(null); }}>
            {Object.entries(IMPORT_KINDS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-3">
        <CsvReview key={kind} kind={kind} action={(review, file) => (
          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
            <Button onClick={() => upload(review, file, false)} loading={uploading} disabled={review.validRows === 0}>
              <FileUp size={15} /> Importar el archivo
            </Button>
            {review.validRows > 0 && review.validRows < review.rowsRead && (
              <Button variant="secondary" onClick={() => upload(review, file, true)} loading={uploading}>
                Importar solo las {formatNumber(review.validRows)} filas válidas
              </Button>
            )}
          </div>
        )} />
      </div>
      {error && <div className="mt-3"><Notice kind="error">{error}</Notice></div>}
      {result && (
        <div className="mt-3 space-y-2">
          <Notice kind={result.errors.length ? "info" : "ok"}>
            Servidor: {formatNumber(result.rows_read)} filas leídas · {formatNumber(result.inserted)} nuevas · {formatNumber(result.updated)} actualizadas
            {result.errors.length > 0 && ` · ${result.errors.length} con errores`}
          </Notice>
          {result.errors.length > 0 && (
            <ul className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-2">
              {result.errors.map((e) => <li key={e.row}><b className="tabular">Fila {e.row}:</b> {e.message}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
