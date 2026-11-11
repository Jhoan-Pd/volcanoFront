"use client";

import { BrainCircuit, History, Play, Radio } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { errorMessage } from "@/api/client";
import { catalogApi, engineApi, modelApi } from "@/api/services";
import type { Disease, TrainedModel, TrainingProgress, TrainingStage, TrainingStatus } from "@/api/types";
import { featureGroupLabel, formatDate, formatNumber } from "@/lib/format";
import { SseError } from "@/lib/sse";
import { Button, inputClass, Notice, Spinner, tableHeaderClass } from "../ui";

/** Keys of the candidates in `metrics.summary` (the chosen model's display name comes from the API). */
const ALGORITHM_NAMES: Record<string, string> = {
  moving_average: "Promedio móvil (línea base)",
  random_forest: "Random Forest",
  gradient_boosting: "Gradient Boosting",
};

const STAGE_LABELS: Record<TrainingStage, string> = {
  STARTED: "Inicio", DATASET: "Datos", CANDIDATE: "Candidato", MODEL_READY: "Modelo", PREDICTIONS: "Predicción",
  ALERTS: "Alertas", WARNING: "Aviso", FINISHED: "Fin", FAILED: "Error",
};

const STATUS_POLL_MS = 3000;
const formatDateTime = (iso: string) =>
  formatDate(iso, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function ModelPanel() {
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [history, setHistory] = useState<TrainedModel[] | null>(null);
  const [status, setStatus] = useState<TrainingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [target, setTarget] = useState<number | "">("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const pollTimer = useRef<number | null>(null);
  const [steps, setSteps] = useState<TrainingProgress[]>([]);
  const [streaming, setStreaming] = useState(false);
  const abort = useRef<AbortController | null>(null);

  const loadHistory = useCallback(() => {
    modelApi.history(undefined, 60).then(setHistory).catch((e) => setError(errorMessage(e)));
  }, []);

  const stopPolling = () => { if (pollTimer.current) window.clearInterval(pollTimer.current); pollTimer.current = null; };

  // The training runs in the background on the server: its status is polled every 3 s
  const pollStatus = useCallback(() => {
    stopPolling();
    pollTimer.current = window.setInterval(async () => {
      try {
        const current = await modelApi.status();
        setStatus(current);
        if (!current.running) { stopPolling(); loadHistory(); }
      } catch { stopPolling(); }
    }, STATUS_POLL_MS);
  }, [loadHistory]);

  useEffect(() => {
    catalogApi.diseases().then(setDiseases).catch(() => undefined);
    loadHistory();
    modelApi.status().then((current) => { setStatus(current); if (current.running) pollStatus(); }).catch(() => undefined);
    return () => { stopPolling(); abort.current?.abort(); };
  }, [loadHistory, pollStatus]);

  /**
   * Retrain over the engine's gRPC stream (Train → SSE): every candidate, the winning model, the
   * predictions and the alerts arrive live. When the engine is unavailable (503) the classic
   * background endpoint is used and the status is polled every 3 s.
   */
  async function retrain() {
    setError(null);
    setSteps([]);
    const diseaseId = target === "" ? undefined : target;
    abort.current = new AbortController();
    try {
      setStreaming(true);
      for await (const { data } of engineApi.train(diseaseId, abort.current.signal)) {
        setSteps((previous) => [...previous, data]);
        if (data.stage === "FAILED") setError(data.message);
      }
      loadHistory();
    } catch (e) {
      if (e instanceof SseError && e.status === 503) {
        try {
          setStatus(await modelApi.retrain(diseaseId));
          pollStatus();
        } catch (fallbackError) {
          setError(errorMessage(fallbackError));
        }
      } else if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : errorMessage(e));
      }
    } finally {
      setStreaming(false);
    }
  }
  const lastStep = steps[steps.length - 1];
  const training = status?.running || streaming;

  const activeModels = useMemo(() => (history ?? []).filter((m) => m.active), [history]);
  const selected = activeModels.find((m) => m.id === selectedId) ?? activeModels[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="section-title text-2xl">Modelo predictivo</h2>
          <p className="max-w-2xl text-xs text-muted">
            Para cada enfermedad se comparan la línea base (promedio móvil de 4 semanas), Random Forest y Gradient Boosting
            con validación temporal (últimas 52 semanas). Se guarda el de menor MAE con su fecha y métricas.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <div className="w-full sm:w-56">
            <select className={inputClass} value={target} aria-label="Enfermedad a reentrenar"
              onChange={(e) => setTarget(e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">Todas las enfermedades</option>
              {diseases.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <Button onClick={retrain} loading={training}>
            <Play size={15} /> {training ? "Entrenando…" : "Reentrenar modelo"}
          </Button>
        </div>
      </div>

      {error && <Notice kind="error">{error}</Notice>}
      {steps.length > 0 && (
        <div className="rounded-lg border border-line p-4" aria-live="polite">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Radio size={14} className={streaming ? "animate-pulse text-[var(--st-green)]" : "text-muted"} aria-hidden />
              {streaming ? "Entrenando · stream gRPC Train → SSE" : "Entrenamiento terminado"}
            </span>
            <span className="tabular text-muted">{formatNumber(lastStep?.percent, 0)} % · {steps.length} mensajes</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={100}
            aria-valuenow={Math.round(lastStep?.percent ?? 0)}>
            <div className="h-2 rounded-full bg-ink transition-[width] duration-500" style={{ width: `${lastStep?.percent ?? 0}%` }} />
          </div>
          <ol className="mt-3 max-h-48 space-y-1 overflow-y-auto text-xs">
            {[...steps].reverse().map((step, i) => (
              <li key={steps.length - i} className={`flex gap-2 ${i === 0 ? "text-ink" : "text-muted"}`}>
                <span className="w-24 shrink-0 font-mono text-[10px] uppercase">{STAGE_LABELS[step.stage] ?? step.stage}</span>
                <span>{step.disease && step.stage === "CANDIDATE" ? `${step.disease} · ` : ""}{step.message}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {status && (status.running || status.finished_at) && (
        <Notice kind={status.running ? "info" : status.errors.length ? "error" : "ok"}>
          {status.running
            ? `Entrenando desde ${formatDateTime(status.started_at ?? "")}. En el plan gratuito de Render puede tardar unos minutos; puedes seguir usando el panel.`
            : `${status.message} · terminó ${formatDateTime(status.finished_at ?? "")}`}
          {status.errors.length > 0 && <ul className="mt-1 list-disc pl-5">{status.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        </Notice>
      )}

      {history == null ? <Spinner /> : activeModels.length === 0 ? (
        <Notice>Aún no hay modelos entrenados. Pulsa «Reentrenar modelo».</Notice>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className={tableHeaderClass}>
                  <th className="px-3 py-2 font-medium">Enfermedad</th>
                  <th className="px-3 py-2 font-medium">Modelo elegido</th>
                  <th className="px-3 py-2 text-right font-medium">MAE base</th>
                  <th className="px-3 py-2 text-right font-medium">MAE modelo</th>
                  <th className="px-3 py-2 text-right font-medium">RMSE base</th>
                  <th className="px-3 py-2 text-right font-medium">RMSE modelo</th>
                  <th className="px-3 py-2 text-right font-medium">Mejora MAE</th>
                  <th className="px-3 py-2 font-medium">Entrenado</th>
                </tr>
              </thead>
              <tbody>
                {activeModels.map((m) => (
                  <tr key={m.id} onClick={() => setSelectedId(m.id)}
                    className={`cursor-pointer border-b border-line/70 last:border-0 hover:bg-surface-2 ${selected?.id === m.id ? "bg-surface-2" : ""}`}>
                    <td className="px-3 py-2 font-medium">{m.disease}</td>
                    <td className="px-3 py-2">{m.algorithm}</td>
                    <td className="px-3 py-2 text-right tabular">{formatNumber(m.baseline_mae, 3)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{formatNumber(m.model_mae, 3)}</td>
                    <td className="px-3 py-2 text-right tabular">{formatNumber(m.baseline_rmse, 3)}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{formatNumber(m.model_rmse, 3)}</td>
                    <td className="px-3 py-2 text-right tabular">
                      {m.mae_improvement_pct == null ? "—"
                        : `${m.mae_improvement_pct > 0 ? "−" : "+"}${formatNumber(Math.abs(m.mae_improvement_pct), 1)} %`}
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-2">{formatDateTime(m.trained_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="-mt-3 text-[11px] text-muted">
            MAE y RMSE en casos por semana y municipio, promedio de los horizontes de 1 a 4 semanas. «Mejora» = cuánto
            menos se equivoca el modelo que el promedio móvil. Haz clic en una fila para ver su detalle.
          </p>
          {selected && <ModelDetail model={selected} />}
        </>
      )}

      {history && history.length > 0 && (
        <div>
          <h3 className="section-title mb-2 flex items-center gap-2 text-[15px]"><History size={15} className="text-muted" /> Historial de entrenamientos</h3>
          <ul className="divide-y divide-line rounded-lg border border-line text-sm">
            {history.slice(0, 15).map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span><b className="font-medium">{m.disease}</b> · {m.algorithm} <span className="text-muted">v{m.version}</span></span>
                <span className="flex items-center gap-3 text-xs text-ink-2 tabular">
                  MAE {formatNumber(m.model_mae, 3)} (base {formatNumber(m.baseline_mae, 3)})
                  {m.active
                    ? <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent">ACTIVO</span>
                    : <span className="text-muted">{formatDateTime(m.trained_at)}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ModelDetail({ model }: { model: TrainedModel }) {
  const candidates = Object.entries(model.metrics?.summary ?? {});
  const groups = Object.entries(model.importances?.groups ?? {})
    .map(([group, value]) => ({ group: featureGroupLabel(group), value }));
  const bestMae = Math.min(...candidates.map(([, metrics]) => metrics.mae));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-line p-4">
        <p className="flex items-center gap-2 font-medium"><BrainCircuit size={16} className="text-muted" /> Comparación de algoritmos · {model.disease}</p>
        <p className="mt-0.5 text-xs text-muted">
          Validación con las últimas {model.metrics?.test_weeks ?? 52} semanas · {formatNumber(model.sample_count)} filas de entrenamiento
        </p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              <th className="py-1.5 font-medium">Algoritmo</th>
              <th className="py-1.5 text-right font-medium">MAE</th>
              <th className="py-1.5 text-right font-medium">RMSE</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map(([key, metrics]) => (
              <tr key={key} className="border-b border-line/60 last:border-0">
                <td className="py-1.5">
                  {ALGORITHM_NAMES[key] ?? key}
                  {metrics.mae === bestMae && <span className="ml-2 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">MEJOR</span>}
                </td>
                <td className="py-1.5 text-right tabular">{formatNumber(metrics.mae, 3)}</td>
                <td className="py-1.5 text-right tabular">{formatNumber(metrics.rmse, 3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="rounded-lg border border-line p-4">
        <p className="font-medium">Importancia de las variables</p>
        <p className="mt-0.5 text-xs text-muted">Permutación (aumento del MAE en validación) · porcentaje del total</p>
        {groups.length === 0 ? <p className="py-6 text-center text-sm text-muted">Sin datos.</p> : (
          <div className="mt-2 h-56">
            <ResponsiveContainer>
              <BarChart data={groups} layout="vertical" margin={{ top: 4, right: 36, left: 8, bottom: 0 }}>
                <CartesianGrid stroke="var(--line)" horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} unit=" %" domain={[0, "auto"]} />
                <YAxis type="category" dataKey="group" tickLine={false} axisLine={false} width={142} />
                <Tooltip cursor={{ fill: "var(--surface-2)" }} formatter={(v) => [`${formatNumber(Number(v), 1)} %`, "Importancia"]}
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" fill="var(--series-1)" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}
                  label={{ position: "right", fill: "var(--ink-2)", fontSize: 11, formatter: (v: unknown) => `${formatNumber(Number(v), 0)} %` }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
