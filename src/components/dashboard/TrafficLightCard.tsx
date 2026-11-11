"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { DiseaseRisk } from "@/api/types";
import { formatNumber, LEVELS } from "@/lib/format";
import { useCounter } from "@/lib/useCounter";
import { useVisible } from "../Reveal";
import { LevelChip } from "../ui";

/** Endemic-channel bar: shows where the current week falls relative to the thresholds. */
function ChannelBar({ risk }: { risk: DiseaseRisk }) {
  const { yellow, orange, red } = risk.thresholds;
  const top = Math.max(red * 1.35, risk.cases * 1.1, 1);
  const pct = (v: number) => `${Math.min(100, (v / top) * 100)}%`;
  const zones = [
    { from: 0, to: yellow, color: LEVELS.GREEN.color },
    { from: yellow, to: orange, color: LEVELS.YELLOW.color },
    { from: orange, to: red, color: LEVELS.ORANGE.color },
    { from: red, to: top, color: LEVELS.RED.color },
  ];
  return (
    <div className="mt-4" aria-hidden>
      <div className="relative h-2">
        <div className="absolute inset-0 flex gap-[2px] overflow-hidden rounded-full">
          {zones.map((zone, i) => (
            <div key={i} style={{ width: pct(Math.max(0, zone.to - zone.from)), background: zone.color, opacity: 0.35 }} />
          ))}
        </div>
        <div className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-ink ring-2 ring-surface" style={{ left: pct(risk.cases) }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted tabular">
        <span>0</span>
        <span>P50 {formatNumber(yellow, yellow < 10 ? 1 : 0)}</span>
        <span>P90 {formatNumber(red, red < 10 ? 1 : 0)}</span>
      </div>
    </div>
  );
}

export default function TrafficLightCard({ risk, active, onClick }: { risk: DiseaseRisk; active: boolean; onClick: () => void }) {
  const change = risk.change_pct;
  const TrendIcon = change == null || Math.abs(change) < 5 ? Minus : change > 0 ? TrendingUp : TrendingDown;
  const { ref, visible } = useVisible<HTMLButtonElement>();
  const cases = useCounter(risk.cases, visible);
  const prediction = risk.prediction;
  return (
    <button ref={ref} onClick={onClick} aria-pressed={active}
      className={`group relative flex w-full flex-col overflow-hidden rounded-lg border bg-surface p-4 text-left transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-reveal)] hover:-translate-y-1 hover:shadow-md ${
        active ? "border-ink/40 shadow-md" : "border-line"}`}>
      <span className="absolute inset-x-0 top-0 h-1" style={{ background: LEVELS[risk.level].color }} />
      <div className="flex items-start justify-between gap-2">
        <p className="section-title text-[15px] leading-tight">{risk.name}</p>
        <LevelChip level={risk.level} />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="figure text-5xl" aria-label={`${formatNumber(risk.cases)} casos`}>{formatNumber(Math.round(cases))}</span>
        <span className="pb-0.5 text-xs text-muted">casos · S{risk.epi_week}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-3 text-xs text-ink-2">
        <span className="inline-flex items-center gap-1">
          <TrendIcon size={14} aria-hidden />
          {change != null
            ? `${change > 0 ? "+" : ""}${formatNumber(change, 1)} % vs. semana anterior`
            : risk.previous_week_cases != null ? `${formatNumber(risk.previous_week_cases)} casos la semana anterior` : "sin dato previo"}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-muted">{formatNumber(risk.rate_per_100k, 1)} por 100.000 hab.</p>
      <ChannelBar risk={risk} />
      <div className="mt-4 border-t border-line pt-3">
        {prediction ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="small-label text-muted">Próximas 4 semanas</span>
              <LevelChip level={prediction.max_level} />
            </div>
            <p className="mt-1 text-xs text-ink-2 tabular">
              S{risk.epi_week + 1 > 53 ? 1 : risk.epi_week + 1}: {formatNumber(prediction.expected_cases_h1, prediction.expected_cases_h1 < 10 ? 1 : 0)} casos
              <span className="text-muted"> ({formatNumber(prediction.lower_bound_h1, 0)}–{formatNumber(prediction.upper_bound_h1, 0)})</span>
              {prediction.max_level !== "GREEN" && <> · pico {prediction.peak_week.replace(/^\d+-/, "")}</>}
            </p>
          </>
        ) : (
          <p className="text-[11px] text-muted">Predicción pendiente: el modelo aún no se ha entrenado.</p>
        )}
      </div>
    </button>
  );
}
