"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyWeather } from "@/api/types";
import { formatDate, formatDay, formatNumber } from "@/lib/format";

/** Two separate charts (temperature and rain): never two Y scales in the same chart. */
export default function WeatherForecast({ days }: { days: DailyWeather[] }) {
  const rows = days.map((d) => ({ ...d, day: formatDay(d.date) }));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-ink-2">Temperatura (°C)</p>
          <ul className="flex gap-3 text-[11px] text-ink-2">
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[var(--series-2)]" />Máxima</li>
            <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-[var(--series-1)]" />Mínima</li>
          </ul>
        </div>
        <div className="h-48">
          <ResponsiveContainer>
            <LineChart data={rows} margin={{ top: 8, right: 34, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: "var(--axis)" }} minTickGap={18} />
              <YAxis tickLine={false} axisLine={false} domain={["dataMin - 2", "dataMax + 2"]} allowDecimals={false} />
              <Tooltip cursor={{ stroke: "var(--axis)" }} content={<TemperatureTooltip />} />
              <Line dataKey="temp_max_c" stroke="var(--series-2)" strokeWidth={2} dot={false} isAnimationActive={false}
                activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                label={(p: LabelProps) => <EndLabel {...p} total={rows.length} />} />
              <Line dataKey="temp_min_c" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false}
                activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
                label={(p: LabelProps) => <EndLabel {...p} total={rows.length} />} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-ink-2">Precipitación diaria (mm)</p>
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={rows} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap={3}>
              <CartesianGrid stroke="var(--line)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: "var(--axis)" }} minTickGap={18} />
              <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "var(--surface-2)" }} content={<RainTooltip />} />
              <Bar dataKey="precipitation_mm" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface LabelProps { index?: number; x?: number | string; y?: number | string; value?: unknown }

/** Direct label on the last point of each line only (identity without relying on color). */
function EndLabel({ index, x, y, value, total }: LabelProps & { total: number }) {
  if (index !== total - 1 || typeof value !== "number") return <g />;
  return <text x={Number(x ?? 0) + 6} y={Number(y ?? 0) + 4} fontSize={11} fill="var(--ink-2)">{formatNumber(value, 0)}°</text>;
}

interface TooltipProps { active?: boolean; payload?: { payload: DailyWeather }[] }
const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };

function TemperatureTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg tabular">
      <p className="font-semibold">{formatDate(day.date, LONG_DATE)}</p>
      <p className="mt-1 text-ink-2">Máx. <b className="text-ink">{formatNumber(day.temp_max_c, 1)} °C</b> · Mín. <b className="text-ink">{formatNumber(day.temp_min_c, 1)} °C</b></p>
      <p className="text-ink-2">Humedad {formatNumber(day.relative_humidity_pct, 0)} %</p>
    </div>
  );
}
function RainTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const day = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg tabular">
      <p className="font-semibold">{formatDate(day.date, LONG_DATE)}</p>
      <p className="mt-1 text-ink-2">Lluvia <b className="text-ink">{formatNumber(day.precipitation_mm, 1)} mm</b></p>
    </div>
  );
}
