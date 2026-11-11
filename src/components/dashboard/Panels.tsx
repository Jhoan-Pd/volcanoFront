"use client";

import type { ReactNode } from "react";
import { CloudRain, Droplets, ExternalLink, Lightbulb, Mountain, Thermometer, Wind } from "lucide-react";
import type { CurrentWeather, DiseaseRisk, MunicipalityRisk, VolcanoStatus } from "@/api/types";
import { formatDate, formatNumber, levelRank, VOLCANO_LEVELS } from "@/lib/format";
import { Card, CardHeader, LevelChip, SimulatedBadge, Spinner } from "../ui";

const ASH_INTENSITY = ["", "leve", "moderada", "fuerte"];

export function VolcanoCard({ volcano }: { volcano: VolcanoStatus }) {
  const level = volcano.activity_level === "NO_DATA" ? null : volcano.activity_level;
  const info = level ? VOLCANO_LEVELS[level] : null;
  return (
    <Card>
      <CardHeader title="Volcán Galeras" icon={<Mountain size={17} />}
        subtitle={volcano.date ? `Boletín SGC del ${formatDate(volcano.date)}` : "Sin boletín registrado"}
        action={level && info && <LevelChip level={level} text={info.label} />} />
      <div className="space-y-3 px-5 pb-5 text-sm">
        {info && <p className="font-medium">{info.description}</p>}
        {volcano.description && <p className="text-ink-2">{volcano.description}</p>}
        <div className="flex flex-wrap items-center gap-2">
          {volcano.bulletin_url && (
            <a href={volcano.bulletin_url} target="_blank" rel="noreferrer"
              className="underline-grow inline-flex items-center gap-1 text-xs font-medium text-accent">
              Ver boletín oficial <ExternalLink size={12} />
            </a>
          )}
          {volcano.is_simulated && <SimulatedBadge />}
        </div>
        <div className="border-t border-line pt-3">
          <p className="mb-1.5 text-xs font-medium text-ink-2">Caída de ceniza (últimos 12 meses)</p>
          {volcano.recent_ash_falls.length === 0 ? (
            <p className="text-xs text-muted">Sin reportes.</p>
          ) : (
            <ul className="space-y-1">
              {volcano.recent_ash_falls.map((ash, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-xs">
                  <span>{ash.municipality ?? "—"} · {ASH_INTENSITY[ash.intensity]}</span>
                  <span className="text-muted tabular">{formatDate(ash.date)}{ash.is_simulated ? " · simulado" : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}

function Measure({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] text-muted">{icon}{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular">{value}</p>
    </div>
  );
}

export function CurrentWeatherCard({ weather, municipality }: { weather: CurrentWeather | null; municipality: string }) {
  return (
    <Card>
      <CardHeader title={`Clima ahora en ${municipality}`} icon={<Thermometer size={17} />}
        subtitle={weather
          ? (weather.source === "open-meteo" ? `Open-Meteo en vivo · ${weather.description}` : weather.description)
          : undefined} />
      {!weather ? <Spinner /> : (
        <div className="grid grid-cols-2 gap-2 px-5 pb-5">
          <Measure icon={<Thermometer size={12} />} label="Temperatura" value={`${formatNumber(weather.temperature_c, 1)} °C`} />
          <Measure icon={<Droplets size={12} />} label="Humedad" value={`${formatNumber(weather.relative_humidity_pct, 0)} %`} />
          <Measure icon={<CloudRain size={12} />} label="Lluvia" value={`${formatNumber(weather.precipitation_mm, 1)} mm`} />
          <Measure icon={<Wind size={12} />} label="Viento" value={weather.wind_kmh == null ? "—" : `${formatNumber(weather.wind_kmh, 0)} km/h`} />
        </div>
      )}
    </Card>
  );
}

const SHORT_NAMES: Record<string, string> = { IRA: "IRA", EDA: "EDA", DENGUE: "Dengue", RESP_CENIZA: "Ceniza" };

export function MunicipalityRiskTable({ rows, diseases, onSelect, selectedId, predicted = false }: {
  rows: MunicipalityRisk[]; diseases: { code: string; name: string }[];
  onSelect: (municipalityId: number) => void; selectedId: number | null; predicted?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-muted">
            <th className="px-4 py-2 font-medium">Municipio</th>
            {diseases.map((d) => <th key={d.code} className="px-1.5 py-2 font-medium" title={d.name}>{SHORT_NAMES[d.code] ?? d.code}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.municipality_id} onClick={() => onSelect(row.municipality_id)}
              className={`cursor-pointer border-b border-line/70 last:border-0 hover:bg-surface-2 ${selectedId === row.municipality_id ? "bg-surface-2" : ""}`}>
              <td className="px-4 py-2.5 font-medium">{row.municipality}</td>
              {diseases.map((d) => (
                <td key={d.code} className="px-1.5 py-2.5">
                  <LevelChip level={(predicted ? row.predicted_levels : row.levels)[d.code] ?? "GREEN"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Recommendations({ risks }: { risks: DiseaseRisk[] }) {
  // Diseases with the highest risk first
  const sorted = [...risks].sort((a, b) => levelRank(b.level) - levelRank(a.level));
  return (
    <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      {sorted.map((risk) => (
        <div key={risk.code} className="rounded-lg border border-line p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb size={15} className="text-muted" aria-hidden />{risk.name}
            </p>
            <LevelChip level={risk.level} />
          </div>
          <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink-2 marker:text-muted">
            {risk.recommendations.slice(0, risk.level === "GREEN" ? 3 : 5).map((text, i) => <li key={i}>{text}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
