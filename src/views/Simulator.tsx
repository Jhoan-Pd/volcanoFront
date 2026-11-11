"use client";

import { Cpu, FlaskConical, Grid3x3, RotateCcw, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, ErrorBar, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { errorMessage, REALTIME_URL } from "@/api/client";
import { catalogApi, engineApi } from "@/api/services";
import type { EngineForecast, Scenario } from "@/api/types";
import { RenderPanel } from "@/components/render/RenderPanel";
import { Button, Card, CardHeader, Field, inputClass, LevelChip, Notice, Spinner } from "@/components/ui";
import { formatNumber, LEVELS } from "@/lib/format";
import { useData } from "@/lib/useData";
import { useFps } from "@/lib/useFps";
import { useSensitivityMatrix } from "@/lib/useSensitivityMatrix";
import { useSimulator, type SocketState } from "@/lib/useSimulator";
import type { ScenarioField } from "@/workers/sensitivity/messages";

type Adjustments = Omit<Scenario, "id" | "municipality_id" | "disease_id">;
const NO_CHANGES: Adjustments = {
  temperature_delta_c: 0, rain_change_pct: 0, search_change_pct: 0, pharmacy_change_pct: 0, ash_fall: false,
};

interface Control { field: ScenarioField; label: string; min: number; max: number; step: number; unit: string; grid: number[] }

const CONTROLS: Control[] = [
  { field: "temperature_delta_c", label: "Temperatura", min: -5, max: 5, step: 0.5, unit: " °C", grid: [-3, -2, -1, 0, 1, 2, 3] },
  { field: "rain_change_pct", label: "Lluvia", min: -100, max: 200, step: 10, unit: " %", grid: [-80, -40, 0, 40, 80, 120, 160] },
  { field: "search_change_pct", label: "Búsquedas de síntomas", min: -100, max: 300, step: 10, unit: " %", grid: [-60, -30, 0, 50, 100, 150, 200] },
  { field: "pharmacy_change_pct", label: "Ventas en farmacias", min: -100, max: 300, step: 10, unit: " %", grid: [-60, -30, 0, 50, 100, 150, 200] },
];
const controlOf = (field: ScenarioField) => CONTROLS.find((c) => c.field === field)!;
const signed = (v: number, unit: string) => `${v > 0 ? "+" : ""}${formatNumber(v, Number.isInteger(v) ? 0 : 1)}${unit}`;

const SOCKET_LABELS: Record<SocketState, string> = { connecting: "Conectando…", open: "Abierto", closed: "Reconectando…" };
/** Pause before sending a scenario, so dragging a slider does not flood the socket. */
const SEND_DEBOUNCE_MS = 120;

export default function Simulator() {
  const municipalities = useData(() => catalogApi.municipalities().then((all) => all.filter((m) => m.active)), []);
  const diseases = useData(() => catalogApi.diseases().then((all) => all.filter((d) => d.active)), []);
  const [municipalityId, setMunicipalityId] = useState<number | null>(null);
  const [diseaseId, setDiseaseId] = useState<number | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustments>(NO_CHANGES);
  const simulator = useSimulator();

  useEffect(() => {
    if (municipalityId == null && municipalities.data?.length) setMunicipalityId(municipalities.data[0].id);
  }, [municipalities.data, municipalityId]);
  useEffect(() => {
    if (diseaseId == null && diseases.data?.length) setDiseaseId(diseases.data[0].id);
  }, [diseases.data, diseaseId]);

  // Every change sends a scenario over the WebSocket; `state` is a dependency so the current
  // scenario is sent again when the socket reopens after a reconnection
  const { send, state } = simulator;
  useEffect(() => {
    if (municipalityId == null || diseaseId == null || state !== "open") return;
    const timer = setTimeout(
      () => send({ municipality_id: municipalityId, disease_id: diseaseId, ...adjustments }), SEND_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [municipalityId, diseaseId, adjustments, state, send]);

  const result = simulator.result;
  const chartRows = useMemo(() => (result?.scenario ?? []).map((point, i) => ({
    week: point.label.replace(/^\d+-/, ""), baseline: result?.baseline[i]?.expected_cases ?? 0, scenario: point.expected_cases,
    error: [point.expected_cases - point.lower_bound, point.upper_bound - point.expected_cases],
  })), [result]);

  return (
    <div className="space-y-5">
      <RenderPanel pattern="CSR" generatedAt={simulator.receivedAt}
        why="El simulador es una conversación en tiempo real con el motor: cada control envía un mensaje por WebSocket y la respuesta se pinta al llegar. No tiene sentido renderizarlo en el servidor."
        details={[
          { label: "WebSocket ↔ gRPC bidireccional", value: SOCKET_LABELS[simulator.state] },
          { label: "Mensajes enviados / recibidos", value: `${simulator.counts.sent} / ${simulator.counts.received}` },
        ]} />

      <header>
        <p className="section-title text-[13px] text-muted">¿Qué pasa si…?</p>
        <h1 className="display-title mt-2 text-5xl sm:text-6xl">Simulador de escenarios</h1>
        <p className="mt-2 max-w-3xl text-ink-2">Cambia las señales de la última semana y mira cómo responde el modelo. No es un pronóstico del clima:
          sirve para entender a qué es sensible la predicción. El modelo no se reentrena; se vuelve a aplicar con los valores modificados.</p>
      </header>

      {simulator.error && <Notice kind="error">{simulator.error}</Notice>}
      {simulator.state === "closed" && simulator.attempts > 1 && (
        <Notice>Se perdió la conexión con el servidor. Reconectando automáticamente (intento {simulator.attempts})…</Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title="Escenario" icon={<FlaskConical size={17} />}
            action={<Button variant="ghost" onClick={() => setAdjustments(NO_CHANGES)}><RotateCcw size={14} /> Sin cambios</Button>} />
          <div className="space-y-4 px-5 pb-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Municipio">
                <select className={inputClass} value={municipalityId ?? ""} onChange={(e) => setMunicipalityId(Number(e.target.value))}>
                  {municipalities.data?.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </Field>
              <Field label="Enfermedad">
                <select className={inputClass} value={diseaseId ?? ""} onChange={(e) => setDiseaseId(Number(e.target.value))}>
                  {diseases.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
            </div>
            {CONTROLS.map((control) => (
              <label key={control.field} className="block">
                <span className="flex items-baseline justify-between text-xs">
                  <span className="font-medium text-ink-2">{control.label}</span>
                  <span className="tabular font-medium">{signed(adjustments[control.field], control.unit)}</span>
                </span>
                <input type="range" min={control.min} max={control.max} step={control.step} value={adjustments[control.field]}
                  onChange={(e) => setAdjustments((a) => ({ ...a, [control.field]: Number(e.target.value) }))}
                  className="mt-1 w-full accent-[var(--accent)]" />
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={adjustments.ash_fall} className="accent-[var(--accent)]"
                onChange={(e) => setAdjustments((a) => ({ ...a, ash_fall: e.target.checked }))} />
              Caída de ceniza esta semana
            </label>
          </div>
        </Card>

        <Card className="min-w-0 lg:col-span-3">
          <CardHeader title="Resultado" icon={<Zap size={17} />}
            subtitle={result
              ? `Motor: ${formatNumber(result.duration_ms, 1)} ms · ida y vuelta: ${simulator.roundTripMs ?? "—"} ms`
              : "Esperando la primera respuesta…"}
            action={result?.max_level && <LevelChip level={result.max_level} />} />
          <div className="px-5 pb-5">
            {!result ? <Spinner text={simulator.state === "open" ? "Calculando…" : "Conectando con el simulador…"} /> : result.error ? (
              <Notice kind="error">{result.error}</Notice>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
                  <div>
                    <p className="text-xs text-muted">Variación en 4 semanas</p>
                    <p className="figure text-4xl tabular">{signed(result.change_pct, " %")}</p>
                  </div>
                  <p className="min-w-0 flex-1 text-sm text-ink-2">{result.summary}</p>
                </div>
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartRows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="var(--line)" vertical={false} />
                      <XAxis dataKey="week" tickLine={false} axisLine={{ stroke: "var(--axis)" }} />
                      <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => formatNumber(Number(v), 1)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="baseline" name="Sin cambios" fill="var(--axis)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="scenario" name="Escenario" fill="var(--series-2)" radius={[4, 4, 0, 0]}>
                        <ErrorBar dataKey="error" width={4} stroke="var(--ink-2)" />
                      </Bar>
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1 text-[11px] text-muted">Casos esperados por semana; la línea es el intervalo del 80 % del escenario.</p>
              </>
            )}
          </div>
        </Card>
      </div>

      {municipalityId != null && diseaseId != null && (
        <div className="grid gap-6 lg:grid-cols-5">
          <UnaryForecast municipalityId={municipalityId} diseaseId={diseaseId} />
          <SensitivityMatrix base={{ municipality_id: municipalityId, disease_id: diseaseId, ...adjustments }} />
        </div>
      )}
    </div>
  );
}

/** Unary call to the engine: a forecast computed on the spot with the model held in memory. */
function UnaryForecast({ municipalityId, diseaseId }: { municipalityId: number; diseaseId: number }) {
  const [forecast, setForecast] = useState<EngineForecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => { setForecast(null); setError(null); }, [municipalityId, diseaseId]);

  async function request() {
    setLoading(true); setError(null);
    try {
      setForecast(await engineApi.forecast(municipalityId, diseaseId));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="min-w-0 lg:col-span-2">
      <CardHeader title="Pronóstico al momento" icon={<Cpu size={17} />} subtitle="RPC unary Predict: una petición, una respuesta"
        action={<Button variant="secondary" onClick={request} loading={loading}>Pedir</Button>} />
      <div className="px-5 pb-5 text-sm">
        {error && <Notice kind="error">{error}</Notice>}
        {!forecast && !error && <p className="text-xs text-muted">Pide dos veces: la segunda el modelo ya está en la caché del motor y responde más rápido.</p>}
        {forecast && (
          <>
            <p className="text-xs text-muted">{forecast.algorithm} · base {forecast.base_week} · {formatNumber(forecast.duration_ms, 1)} ms en el motor
              {forecast.from_cache ? " · modelo en memoria" : " · modelo cargado ahora"}</p>
            <table className="mt-2 w-full text-xs tabular">
              <thead className="text-muted">
                <tr>
                  <th className="text-left font-medium">Semana</th><th className="text-right font-medium">Casos</th>
                  <th className="text-right font-medium">80 %</th><th className="text-right font-medium">Nivel</th>
                </tr>
              </thead>
              <tbody>
                {forecast.points.map((point) => (
                  <tr key={point.horizon} className="border-t border-line">
                    <td className="py-1">{point.label}</td><td className="text-right">{formatNumber(point.expected_cases, 1)}</td>
                    <td className="text-right text-muted">{formatNumber(point.lower_bound, 0)}–{formatNumber(point.upper_bound, 0)}</td>
                    <td className="text-right">{point.level && <LevelChip level={point.level} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </Card>
  );
}

/** Sensitivity matrix computed by a Web Worker over its own WebSocket. */
function SensitivityMatrix({ base }: { base: Omit<Scenario, "id"> }) {
  const [xField, setXField] = useState<ScenarioField>("rain_change_pct");
  const [yField, setYField] = useState<ScenarioField>("search_change_pct");
  const { compute, progress, result, error, computing } = useSensitivityMatrix();
  const fps = useFps(computing);
  const x = controlOf(xField);
  const y = controlOf(yField);

  return (
    <Card className="min-w-0 lg:col-span-3">
      <CardHeader title="Matriz de sensibilidad" icon={<Grid3x3 size={17} />}
        subtitle={`Un Web Worker envía ${x.grid.length * y.grid.length} escenarios por su propio WebSocket y arma la matriz sin bloquear la página.`} />
      <div className="space-y-3 px-5 pb-5">
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Eje horizontal">
            <select className={inputClass} value={xField} onChange={(e) => setXField(e.target.value as ScenarioField)}>
              {CONTROLS.filter((c) => c.field !== yField).map((c) => <option key={c.field} value={c.field}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Eje vertical">
            <select className={inputClass} value={yField} onChange={(e) => setYField(e.target.value as ScenarioField)}>
              {CONTROLS.filter((c) => c.field !== xField).map((c) => <option key={c.field} value={c.field}>{c.label}</option>)}
            </select>
          </Field>
          <Button loading={computing} onClick={() => compute({
            url: REALTIME_URL, base, xAxis: { field: xField, values: x.grid }, yAxis: { field: yField, values: y.grid },
          })}>
            Calcular
          </Button>
        </div>
        {progress && (
          <div className="text-xs" aria-live="polite">
            <div className="flex justify-between">
              <span>{progress.received} de {progress.total} escenarios</span>
              <span className="tabular text-muted">Hilo principal: {fps ?? "—"} fps</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-surface-2">
              <div className="h-1.5 rounded-full bg-ink" style={{ width: `${(progress.received / progress.total) * 100}%` }} />
            </div>
          </div>
        )}
        {error && <Notice kind="error">{error}</Notice>}
        {result && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0.5 text-center text-[11px] tabular">
                <thead>
                  <tr><th className="p-1 text-left font-medium text-muted">{y.label} ↓ · {x.label} →</th>
                    {x.grid.map((v) => <th key={v} className="p-1 font-medium text-muted">{signed(v, x.unit)}</th>)}</tr>
                </thead>
                <tbody>
                  {result.cells.map((row, i) => (
                    <tr key={y.grid[i]}>
                      <th className="p-1 text-left font-medium text-muted">{signed(y.grid[i], y.unit)}</th>
                      {row.map((cell, j) => {
                        const color = LEVELS[cell.level ?? "GREEN"].color;
                        const weight = result.max > result.min ? (cell.total - result.min) / (result.max - result.min) : 0;
                        return (
                          <td key={x.grid[j]} title={`${formatNumber(cell.total, 1)} casos (${signed(cell.changePct, " %")})`}
                            className="rounded p-1.5" style={{ background: `color-mix(in srgb, ${color} ${Math.round(18 + weight * 50)}%, transparent)` }}>
                            {formatNumber(cell.total, 0)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted">
              Casos esperados en 4 semanas (sin cambios: {formatNumber(result.baselineTotal, 0)}). El color es el nivel de riesgo máximo.
              {" "}{result.scenarios} escenarios en {formatNumber(result.durationMs, 0)} ms ({formatNumber(result.engineMs, 0)} ms de cálculo en el motor).
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
