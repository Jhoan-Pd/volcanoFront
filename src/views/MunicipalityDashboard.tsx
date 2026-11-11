"use client";

import { Activity, CloudSun, Info, Map as MapIcon, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { DiseasePrediction } from "@/api/types";
import DynamicMap from "@/components/dashboard/DynamicMap";
import EndemicChannelChart from "@/components/dashboard/EndemicChannelChart";
import ExplanationPanel from "@/components/dashboard/ExplanationPanel";
import type { MapMode } from "@/components/dashboard/mapTypes";
import { CurrentWeatherCard, MunicipalityRiskTable, Recommendations, VolcanoCard } from "@/components/dashboard/Panels";
import ReportsMenu from "@/components/dashboard/ReportsMenu";
import TrafficLightCard from "@/components/dashboard/TrafficLightCard";
import WeatherForecast from "@/components/dashboard/WeatherForecast";
import Reveal from "@/components/Reveal";
import RevealedTitle from "@/components/RevealedTitle";
import { Card, CardHeader, inputClass, Segmented, SimulatedBadge } from "@/components/ui";
import type { DashboardData } from "@/lib/dashboard";
import { formatDate, formatNumber } from "@/lib/format";

const RANGES = [
  { value: 26, label: "6 meses" },
  { value: 52, label: "1 año" },
  { value: 104, label: "2 años" },
  { value: 260, label: "5 años" },
] as const;

const MAP_MODES = [
  { value: "current", label: "Semana actual" },
  { value: "predicted", label: "Próximas 4 semanas" },
] as const satisfies readonly { value: MapMode; label: string }[];

/**
 * A municipality's dashboard. The data arrives as props from the ISR page (it is already in the
 * HTML); this client component only adds the interaction: choosing a disease, a time range or the
 * map mode makes no request, and switching municipality navigates to ANOTHER static page
 * (/municipio/[id]) that Next.js prefetches.
 */
export default function MunicipalityDashboard({ data }: { data: DashboardData }) {
  const { municipality, municipalities, summary, series, predictions, explanations, weather, forecast, municipalityRisks } = data;
  const router = useRouter();
  const [diseaseId, setDiseaseId] = useState<number | null>(summary.risks[0]?.disease_id ?? null);
  const [weeks, setWeeks] = useState<number>(52);
  const [showBacktest, setShowBacktest] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>("current");
  const [mapDiseaseCode, setMapDiseaseCode] = useState("");

  const selected = summary.risks.find((r) => r.disease_id === diseaseId);
  const prediction = diseaseId != null ? predictions[diseaseId] ?? null : null;
  const points = useMemo(() => (diseaseId != null ? series[diseaseId]?.points.slice(-weeks) ?? [] : []),
    [series, diseaseId, weeks]);
  const diseases = summary.risks.map((r) => ({ code: r.code, name: r.name }));
  const openDashboard = (municipalityId: number) => router.push(`/municipio/${municipalityId}`, { scroll: true });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-title text-[13px] text-muted">Vigilancia epidemiológica temprana</p>
          <RevealedTitle className="display-title mt-2 text-[2.6rem] sm:text-6xl lg:text-7xl"
            text={`Riesgo de brotes en ${municipality.name}`} />
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-2">
            Semana epidemiológica <b className="tabular">{summary.reference_week.replace("-S", " · S")}</b>
            <span className="text-muted">· {formatNumber(municipality.population)} hab. · {formatNumber(municipality.altitude_m)} m s. n. m.</span>
            {summary.has_simulated_data && <SimulatedBadge />}
          </p>
        </div>
        <div className="flex w-full items-end gap-2 md:w-auto">
          <label className="min-w-0 flex-1 md:w-64 md:flex-none">
            <span className="mb-1 flex items-center gap-1 text-xs font-medium text-ink-2"><MapPin size={13} /> Municipio</span>
            <select className={inputClass} value={municipality.id} onChange={(e) => openDashboard(Number(e.target.value))}>
              {municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <ReportsMenu municipalityId={municipality.id} municipality={municipality.name} diseaseId={diseaseId} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.risks.map((risk, i) => (
          <Reveal key={risk.code} delay={i * 80} className="flex">
            <TrafficLightCard risk={risk} active={risk.disease_id === diseaseId} onClick={() => setDiseaseId(risk.disease_id)} />
          </Reveal>
        ))}
      </div>

      <Reveal>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="min-w-0 lg:col-span-2">
            <CardHeader title={`Histórico vs. predicción · ${selected?.name ?? ""}`} icon={<Activity size={17} />}
              subtitle="Casos semanales sobre el canal endémico (percentiles de los 5 años anteriores) y casos esperados de las próximas 4 semanas."
              action={
                <div className="flex flex-wrap items-center gap-2">
                  {prediction && prediction.backtest.length > 0 && (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-ink-2">
                      <input type="checkbox" className="accent-[var(--accent)]" checked={showBacktest}
                        onChange={(e) => setShowBacktest(e.target.checked)} />
                      Validación
                    </label>
                  )}
                  <Segmented label="Rango de tiempo" options={RANGES} value={weeks} onChange={setWeeks} />
                </div>
              } />
            <div className="px-3 pb-4 sm:px-5">
              {selected && (
                <EndemicChannelChart points={points} color={selected.color} prediction={prediction} showBacktest={showBacktest} />
              )}
              <ModelSummaryLine prediction={prediction} />
            </div>
          </Card>
          <div className="min-w-0 space-y-6">
            <VolcanoCard volcano={summary.volcano} />
            <CurrentWeatherCard weather={weather} municipality={municipality.name} />
          </div>
        </div>
      </Reveal>

      <Reveal>
        <div className="grid gap-6 lg:grid-cols-2">
          <ExplanationPanel explanation={diseaseId != null ? explanations[diseaseId] ?? null : null} />
          <Card className="min-w-0">
            <CardHeader title="Recomendaciones de prevención" subtitle="Ordenadas según el nivel de riesgo actual" />
            <Recommendations risks={summary.risks} />
          </Card>
        </div>
      </Reveal>

      <Reveal>
        <Card className="min-w-0">
          <CardHeader title="Mapa de riesgo · zona de influencia del Galeras" icon={<MapIcon size={17} />}
            subtitle="Haz clic en un municipio para abrir su tablero. El mapa con alertas en vivo está en «Mapa en vivo»."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <select className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                  value={mapDiseaseCode} onChange={(e) => setMapDiseaseCode(e.target.value)} aria-label="Enfermedad del mapa">
                  <option value="">Todas (la de mayor riesgo)</option>
                  {diseases.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
                <Segmented label="Periodo del mapa" options={MAP_MODES} value={mapMode} onChange={setMapMode} />
              </div>
            } />
          <div className="grid grid-cols-1 gap-4 px-5 pb-5 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <DynamicMap rows={municipalityRisks} mode={mapMode} diseaseCode={mapDiseaseCode} selectedId={municipality.id}
                diseases={diseases} onSelect={openDashboard} />
            </div>
            <div className="-mx-5 min-w-0 lg:col-span-2 lg:mx-0">
              <MunicipalityRiskTable rows={municipalityRisks} selectedId={municipality.id} predicted={mapMode === "predicted"}
                diseases={diseases} onSelect={openDashboard} />
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal>
        <Card>
          <CardHeader title="Pronóstico del clima · próximos 16 días" icon={<CloudSun size={17} />}
            subtitle={forecast.some((d) => d.is_simulated) ? "Clima simulado (Open-Meteo no estaba disponible al cargar la semilla)" : "Fuente: Open-Meteo"} />
          <div className="px-3 pb-5 sm:px-5">
            {forecast.length === 0
              ? <p className="py-6 text-center text-sm text-muted">Sin pronóstico disponible. Un administrador puede sincronizar el clima.</p>
              : <WeatherForecast days={forecast} />}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}

/** The model's metrics in one line: this way a citizen sees how reliable the prediction is. */
function ModelSummaryLine({ prediction }: { prediction: DiseasePrediction | null }) {
  const model = prediction?.model;
  if (!model) {
    return (
      <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
        <Info size={13} className="mt-0.5 shrink-0" />
        Aún no hay un modelo entrenado para esta enfermedad. Un administrador puede entrenarlo desde el panel.
      </p>
    );
  }
  const improvement = model.baseline_mae && model.model_mae != null ? (1 - model.model_mae / model.baseline_mae) * 100 : null;
  return (
    <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
      <Info size={13} className="mt-0.5 shrink-0" />
      <span>
        Modelo <b className="font-medium text-ink-2">{model.algorithm}</b> entrenado el {formatDate(model.trained_at)}.
        Error medio (MAE) <span className="tabular">{formatNumber(model.model_mae, 2)}</span> casos/semana frente a{" "}
        <span className="tabular">{formatNumber(model.baseline_mae, 2)}</span> del promedio móvil
        {improvement != null && <> ({improvement >= 0 ? "−" : "+"}{formatNumber(Math.abs(improvement), 0)} %)</>}.
        El intervalo cubre el 80 % de los errores observados en validación.
      </span>
    </p>
  );
}
