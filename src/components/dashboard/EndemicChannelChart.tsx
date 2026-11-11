"use client";

import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DiseasePrediction, SeriesPoint } from "@/api/types";
import { formatDate, formatNumber, LEVEL_ORDER, LEVELS } from "@/lib/format";

interface ChartRow {
  label: string;
  week_start: string;
  cases: number | null;
  p_yellow: number | null;
  p_orange: number | null;
  p_red: number | null;
  z1: number; z2: number; z3: number; z4: number;
  expected?: number | null;
  band?: [number, number] | null;
  backtest?: number | null;
  future?: boolean;
}

/**
 * History vs. prediction over the endemic channel.
 * - Bands: risk zones (percentiles of the previous 5 years for each week).
 * - Solid line: observed cases.
 * - Dashed line + band in the series color: expected cases of the next 4 weeks with their 80 % interval.
 * - Dotted grey line (optional): what the model would have predicted 1 week ahead during the
 *   validation period, to compare with what was observed.
 * A single Y scale (cases).
 */
export default function EndemicChannelChart({ points, color, prediction, showBacktest = false }: {
  points: SeriesPoint[]; color: string; prediction?: DiseasePrediction | null; showBacktest?: boolean;
}) {
  const future = prediction?.points ?? [];
  const backtest = new Map((showBacktest ? prediction?.backtest ?? [] : []).map((b) => [b.label, b.predicted]));
  const maxCases = Math.max(1, ...points.map((p) => Math.max(p.cases ?? 0, p.p_red ?? 0)),
    ...future.map((f) => Math.max(f.upper_bound, f.thresholds?.red ?? 0)));
  const top = Math.ceil(maxCases * 1.15);
  const zones = (yellow: number, orange: number, red: number) =>
    ({ z1: yellow, z2: Math.max(0, orange - yellow), z3: Math.max(0, red - orange), z4: Math.max(0, top - red) });

  const rows: ChartRow[] = points.map((p) => {
    const yellow = p.p_yellow ?? 0, orange = p.p_orange ?? yellow, red = p.p_red ?? orange;
    return { ...p, ...zones(yellow, orange, red), backtest: backtest.get(p.label) ?? null };
  });
  // The last observed point anchors the prediction line so it does not "float"
  const last = [...rows].reverse().find((r) => r.cases != null);
  if (future.length && last) {
    last.expected = last.cases;
    last.band = [last.cases ?? 0, last.cases ?? 0];
  }
  for (const f of future) {
    const t = f.thresholds;
    rows.push({
      label: f.label, week_start: f.week_start, cases: null, future: true,
      p_yellow: t?.yellow ?? null, p_orange: t?.orange ?? null, p_red: t?.red ?? null,
      ...zones(t?.yellow ?? 0, t?.orange ?? 0, t?.red ?? 0),
      expected: f.expected_cases, band: [f.lower_bound, f.upper_bound],
    });
  }
  const futureStart = future[0]?.label;

  return (
    <div>
      <div className="h-72 w-full sm:h-[22rem]">
        <ResponsiveContainer>
          <ComposedChart data={rows} margin={{ top: 22, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} minTickGap={36}
              tickFormatter={(label: string) => label.replace("-S", " · S")} />
            <YAxis tickLine={false} axisLine={false} width={44} domain={[0, top]} allowDecimals={false} />
            {(["z1", "z2", "z3", "z4"] as const).map((zone, i) => (
              <Area key={zone} dataKey={zone} stackId="channel" type="stepAfter" stroke="none" isAnimationActive={false}
                fill={LEVELS[LEVEL_ORDER[i]].color}
                fillOpacity={0.16} activeDot={false} />
            ))}
            {futureStart && (
              <ReferenceLine x={futureStart} stroke="var(--axis)" strokeDasharray="2 3"
                label={{ value: "Predicción →", position: "top", fill: "var(--muted)", fontSize: 11 }} />
            )}
            {future.length > 0 && (
              <Area dataKey="band" type="monotone" stroke="none" fill={color} fillOpacity={0.22}
                isAnimationActive={false} activeDot={false} connectNulls />
            )}
            {showBacktest && (
              <Line dataKey="backtest" type="monotone" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="1 3"
                dot={false} activeDot={false} isAnimationActive={false} connectNulls />
            )}
            <Line dataKey="cases" type="monotone" stroke={color} strokeWidth={2} dot={false}
              activeDot={{ r: 4.5, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} connectNulls />
            {future.length > 0 && (
              <Line dataKey="expected" type="monotone" stroke={color} strokeWidth={2} strokeDasharray="6 4"
                dot={{ r: 3.5, fill: color, stroke: "var(--surface)", strokeWidth: 2 }}
                activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }} isAnimationActive={false} connectNulls />
            )}
            <Tooltip cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} content={<ChartTooltip />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-2" aria-label="Leyenda">
        <li className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded" style={{ background: color }} />Casos observados</li>
        {future.length > 0 && (
          <li className="flex items-center gap-1.5">
            <span className="relative h-3 w-5 rounded-sm" style={{ background: color, opacity: 0.35 }} />
            Predicción e intervalo 80 %
          </li>
        )}
        {showBacktest && (
          <li className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dotted border-muted" />Predicho en validación</li>
        )}
        {LEVEL_ORDER.map((level) => (
          <li key={level} className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: LEVELS[level].color, opacity: 0.45 }} />
            {LEVELS[level].label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: ChartRow }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{row.label.replace("-S", " · Semana ")}{row.future ? " · predicción" : ""}</p>
      <p className="text-muted">desde {formatDate(row.week_start)}</p>
      {row.future ? (
        <>
          <p className="mt-1.5 text-sm font-semibold text-ink tabular">{formatNumber(row.expected, 1)} casos esperados</p>
          {row.band && <p className="text-ink-2 tabular">Intervalo 80 %: {formatNumber(row.band[0], 0)} – {formatNumber(row.band[1], 0)}</p>}
        </>
      ) : (
        <>
          <p className="mt-1.5 text-sm font-semibold text-ink tabular">{formatNumber(row.cases)} casos</p>
          {row.backtest != null && <p className="text-ink-2 tabular">El modelo predijo {formatNumber(row.backtest, 1)}</p>}
        </>
      )}
      {row.p_red != null && (
        <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 text-ink-2 tabular">
          <dt>Mediana (P50)</dt><dd className="text-right">{formatNumber(row.p_yellow, 1)}</dd>
          <dt>P75</dt><dd className="text-right">{formatNumber(row.p_orange, 1)}</dd>
          <dt>P90</dt><dd className="text-right">{formatNumber(row.p_red, 1)}</dd>
        </dl>
      )}
    </div>
  );
}
