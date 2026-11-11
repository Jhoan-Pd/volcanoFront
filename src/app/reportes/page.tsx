// ============================================================================
// REPORTS — SSR (Server-Side Rendering)
// ----------------------------------------------------------------------------
// The report preview is built on the server on every request from the URL parameters
// (?municipio=&semanas=). The download links point straight to the API (PDF and CSV): the page
// works fully without JavaScript and can be printed or shared as is.
// ============================================================================
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import type { Metadata } from "next";
import { API_V1 } from "@/api/client";
import type { DashboardSummary, DiseasePrediction, DiseaseSeries, Municipality, Page } from "@/api/types";
import { RenderPanel } from "@/components/render/RenderPanel";
import { Card, CardHeader, inputClass, LevelChip } from "@/components/ui";
import { formatNumber } from "@/lib/format";
import { integer, requestInfo, type SearchParams } from "@/lib/searchParams";
import { fetchApi, fetchOptional, nowIso } from "@/lib/serverFetch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata: Metadata = { title: "Reportes", description: "Vista previa e impresión del reporte de riesgo por municipio; descargas en PDF y CSV." };

const WEEK_RANGES = [8, 12, 26, 52];
const DEFAULT_WEEKS = 12;
const HORIZONS = [1, 2, 3, 4];
const fresh = { cache: "no-store" } as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const [municipalities, request] = await Promise.all([
    fetchApi<Page<Municipality>>("/municipalities", { limit: 500 }, { revalidate: 3600 }).then((p) => p.items.filter((m) => m.active)),
    requestInfo(),
  ]);
  const municipality = municipalities.find((m) => m.id === integer(params.municipio)) ?? municipalities[0];
  const requestedWeeks = integer(params.semanas);
  const weeks = requestedWeeks !== undefined && WEEK_RANGES.includes(requestedWeeks) ? requestedWeeks : DEFAULT_WEEKS;

  const summary = await fetchApi<DashboardSummary>("/dashboard/summary", { municipality_id: municipality.id }, fresh);
  const ids = summary.risks.map((r) => r.disease_id);
  const query = (diseaseId: number) => ({ municipality_id: municipality.id, disease_id: diseaseId });
  const [series, predictions] = await Promise.all([
    Promise.all(ids.map((id) => fetchApi<DiseaseSeries>("/dashboard/series", { ...query(id), weeks: Math.max(8, weeks) }, fresh))),
    Promise.all(ids.map((id) => fetchOptional<DiseasePrediction>("/dashboard/prediction", query(id), fresh))),
  ]);
  const weekLabels = series[0]?.points.slice(-weeks).map((p) => p.label) ?? [];
  const downloads = [
    { href: `${API_V1}/reports/summary.pdf?municipality_id=${municipality.id}`, text: "Reporte PDF del municipio", icon: FileText },
    { href: `${API_V1}/reports/cases.csv?municipality_id=${municipality.id}`, text: "Casos semanales (CSV)", icon: FileSpreadsheet },
    { href: `${API_V1}/reports/predictions.csv?municipality_id=${municipality.id}`, text: "Predicciones (CSV)", icon: FileSpreadsheet },
    { href: `${API_V1}/reports/alerts.csv`, text: "Historial de alertas (CSV)", icon: FileSpreadsheet },
  ];

  return (
    <div className="space-y-5">
      <RenderPanel pattern="SSR" generatedAt={nowIso()}
        why="El reporte combina el municipio y el rango que elige cada persona y debe reflejar la base de datos en ese instante, listo para imprimir."
        details={[
          { label: "Peticiones a la API en esta visita", value: String(2 + ids.length * 2) },
          { label: "Renderizado para", value: `${request.browser} · ${request.language}` },
        ]} />

      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-title text-[13px] text-muted">Reporte de riesgo · semana {summary.reference_week}</p>
          <h1 className="display-title mt-2 text-5xl sm:text-6xl">{municipality.name}</h1>
        </div>
        <form method="get" action="/reportes" className="flex flex-wrap items-end gap-2 print:hidden">
          <label><span className="mb-1 block text-xs font-medium text-ink-2">Municipio</span>
            <select name="municipio" defaultValue={municipality.id} className={inputClass}>
              {municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select></label>
          <label><span className="mb-1 block text-xs font-medium text-ink-2">Semanas</span>
            <select name="semanas" defaultValue={weeks} className={inputClass}>
              {WEEK_RANGES.map((range) => <option key={range} value={range}>{range}</option>)}
            </select></label>
          <button className="rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-page hover:opacity-90">Generar</button>
        </form>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.risks.map((risk, i) => {
          const predictedLevel = predictions[i]?.max_level;
          return (
            <Card key={risk.code} className="p-4">
              <p className="text-xs text-muted">{risk.name}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="figure text-3xl tabular">{formatNumber(risk.cases)}</p>
                <LevelChip level={risk.level} />
              </div>
              <p className="mt-1 text-xs text-muted">casos esta semana · {formatNumber(risk.rate_per_100k, 1)} por 100 mil</p>
              {predictedLevel && <p className="mt-2 text-xs text-ink-2">Próximas 4 semanas: <LevelChip level={predictedLevel} /></p>}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title={`Casos de las últimas ${weeks} semanas`} subtitle="Número de casos semanales por enfermedad" />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[640px] text-right text-xs tabular">
            <thead className="border-b border-line text-muted">
              <tr><th className="py-2 pr-3 text-left">Semana</th>{summary.risks.map((r) => <th key={r.code} className="pr-3">{r.code}</th>)}</tr>
            </thead>
            <tbody>
              {weekLabels.map((label, row) => (
                <tr key={label} className="border-b border-line">
                  <td className="py-1.5 pr-3 text-left">{label}</td>
                  {series.map((s) => {
                    const point = s.points.slice(-weeks)[row];
                    const high = point?.cases != null && point.p_orange != null && point.cases > point.p_orange;
                    return <td key={s.disease_id} className={`pr-3 ${high ? "font-semibold text-[var(--st-orange-ink)]" : ""}`}>{formatNumber(point?.cases)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-muted">En naranja, las semanas por encima del percentil 75 del canal endémico.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Predicción de las próximas 4 semanas" subtitle="Casos esperados (intervalo del 80 %)" />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="py-2 pr-3">Enfermedad</th><th className="pr-3">Modelo</th>
                {HORIZONS.map((h) => <th key={h} className="pr-3">t+{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {summary.risks.map((risk, i) => {
                const prediction = predictions[i];
                return (
                  <tr key={risk.code} className="border-b border-line align-top">
                    <td className="py-2 pr-3 font-medium">{risk.name}</td>
                    <td className="py-2 pr-3 text-xs text-ink-2">{prediction?.model?.algorithm ?? "Sin modelo"}</td>
                    {HORIZONS.map((h) => {
                      const point = prediction?.points[h - 1];
                      return (
                        <td key={h} className="py-2 pr-3 tabular text-xs">
                          {point ? <>{formatNumber(point.expected_cases, 1)} <span className="text-muted">({formatNumber(point.lower_bound, 0)}–{formatNumber(point.upper_bound, 0)})</span></> : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="print:hidden">
        <CardHeader title="Descargas" icon={<Download size={17} />} subtitle="Archivos generados por la API en el momento de la descarga" />
        <ul className="grid gap-2 px-5 pb-5 sm:grid-cols-2">
          {downloads.map((d) => (
            <li key={d.href}>
              <a href={d.href} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm hover:bg-surface-2">
                <d.icon size={16} className="text-muted" aria-hidden /> {d.text}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
