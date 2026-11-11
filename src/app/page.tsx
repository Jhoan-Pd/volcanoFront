// ============================================================================
// HOME — ISR (Incremental Static Regeneration)
// ----------------------------------------------------------------------------
// The most visited page, and its data changes once a day: it is served as static HTML from the CDN
// and regenerated at most once an hour or when the backend says so (/api/revalidate).
// This whole file is a SERVER component: it ships no JavaScript of its own to the browser.
// ============================================================================
import { ArrowRight, CalendarDays, Cpu, Radio, Siren, TrendingUp, Users, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import Link from "next/link";
import type { RiskLevel } from "@/api/types";
import { VolcanoCard } from "@/components/dashboard/Panels";
import { AutoRevalidate } from "@/components/render/AutoRevalidate";
import { RenderPanel } from "@/components/render/RenderPanel";
import RevealedTitle from "@/components/RevealedTitle";
import { Card, CardHeader, LevelChip } from "@/components/ui";
import { loadHome, type HomeData } from "@/lib/dashboard";
import { formatNumber, levelRank, LEVELS } from "@/lib/format";
import { PATTERN_ORDER, PATTERNS } from "@/lib/renderPatterns";
import { nowIso } from "@/lib/serverFetch";

export const revalidate = 3600;

/** Short name of each disease for the municipality cards. */
const SHORT_DISEASE_NAMES: Record<string, string> = { IRA: "IRA", EDA: "EDA", DENGUE: "Dengue", RESP_CENIZA: "Ceniza" };
const isHigh = (level: RiskLevel | null | undefined) => level != null && levelRank(level) >= 2;

function Indicator({ icon, value, label, detail, highlighted = false }: {
  icon: ReactNode; value: string; label: string; detail?: string; highlighted?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlighted ? "border-[color-mix(in_srgb,var(--st-orange)_45%,transparent)] bg-[color-mix(in_srgb,var(--st-orange)_7%,var(--surface))]" : "border-line bg-surface"}`}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted">{icon}{label}</p>
      <p className="figure mt-1.5 text-3xl leading-none text-ink">{value}</p>
      {detail && <p className="mt-1.5 text-xs text-ink-2">{detail}</p>}
    </div>
  );
}

export default async function HomePage() {
  let data: HomeData;
  try {
    data = await loadHome();
  } catch (e) {
    // During a regeneration (ISR) an error keeps the previous cached version: rethrow it.
    // Only at build time (Render asleep) a fallback version is generated, and it revalidates itself.
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw e;
    return (
      <div className="space-y-6">
        <RenderPanel pattern="ISR" generatedAt={nowIso()} path="/" details={[{ label: "Versión", value: "Respaldo: la API no respondió" }]} />
        <AutoRevalidate path="/" />
        <h1 className="display-title text-5xl sm:text-6xl">Riesgo de brotes en la zona del Galeras</h1>
        <p className="max-w-2xl text-ink-2">Los datos se están actualizando. Recarga en unos segundos o abre el{" "}
          <Link href="/mapa" className="underline-grow font-medium">mapa en vivo</Link>.</p>
      </div>
    );
  }
  const { municipalities, municipalityRisks, volcano, alerts, referenceWeek, generatedAt } = data;
  const population = new Map(municipalities.map((m) => [m.id, m.population]));
  const rows = [...municipalityRisks].sort((a, b) => levelRank(b.max_level) - levelRank(a.max_level)
    || (population.get(b.municipality_id) ?? 0) - (population.get(a.municipality_id) ?? 0));
  const onAlert = rows.filter((r) => isHigh(r.max_level) || isHigh(r.max_predicted_level));
  const highToday = rows.filter((r) => isHigh(r.max_level));
  const highPredicted = rows.filter((r) => isHigh(r.max_predicted_level));
  const totalPopulation = municipalities.reduce((sum, m) => sum + m.population, 0);

  return (
    <div className="space-y-8">
      <RenderPanel pattern="ISR" generatedAt={generatedAt} path="/"
        details={[{ label: "Municipios en el HTML", value: String(rows.length) }]} />

      <section>
        <p className="section-title text-[13px] text-muted">Vigilancia epidemiológica temprana</p>
        <RevealedTitle className="display-title mt-2 text-[2.6rem] sm:text-6xl lg:text-7xl"
          text="Riesgo de brotes en la zona del Galeras" />
        <p className="mt-3 max-w-3xl text-ink-2">
          Cruzamos casos oficiales (SIVIGILA), clima (Open-Meteo), búsquedas de síntomas en internet, ventas de farmacias
          y la actividad del volcán para anticipar brotes de IRA, EDA, dengue y enfermedades respiratorias por ceniza.
          {onAlert.length > 0
            ? ` Hoy hay ${onAlert.length} municipio${onAlert.length > 1 ? "s" : ""} con riesgo alto o muy alto (observado o predicho).`
            : " Hoy ningún municipio tiene riesgo alto."}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumen de la semana">
        <Indicator icon={<CalendarDays size={14} aria-hidden />} label="Semana epidemiológica"
          value={referenceWeek ? referenceWeek.replace("-S", " · S") : "—"} detail="Última semana con casos" />
        <Indicator icon={<Users size={14} aria-hidden />} label="Municipios vigilados" value={String(rows.length)}
          detail={`${formatNumber(totalPopulation)} habitantes`} />
        <Indicator icon={<Siren size={14} aria-hidden />} label="Alertas activas" value={String(alerts.length)}
          detail={highToday.length ? `Riesgo alto hoy en ${highToday.map((r) => r.municipality).join(", ")}` : "Ningún municipio en riesgo alto hoy"}
          highlighted={alerts.length > 0} />
        <Indicator icon={<TrendingUp size={14} aria-hidden />} label="Próximas 4 semanas" value={String(highPredicted.length)}
          detail={highPredicted.length ? "municipio(s) con riesgo alto predicho" : "Sin riesgo alto predicho"}
          highlighted={highPredicted.length > 0} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="grid gap-4 sm:grid-cols-2 lg:col-span-2" aria-label="Municipios">
          {rows.map((row) => (
            <Link key={row.municipality_id} href={`/municipio/${row.municipality_id}`} data-record="municipality"
              className="group rounded-lg border border-line bg-surface p-4 transition-colors duration-[520ms] hover:bg-surface-2"
              style={{ borderLeft: `4px solid ${LEVELS[row.max_level].color}` }}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="section-title text-lg">{row.municipality}</h2>
                  <p className="text-xs text-muted">{formatNumber(population.get(row.municipality_id))} hab.</p>
                </div>
                <ArrowRight size={16} className="mt-1 text-muted transition group-hover:translate-x-0.5" aria-hidden />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="text-muted">Esta semana</span> <LevelChip level={row.max_level} />
                {row.max_predicted_level && <><span className="text-muted">· 4 semanas</span> <LevelChip level={row.max_predicted_level} /></>}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-2.5 text-[11px] text-ink-2" aria-label="Riesgo por enfermedad esta semana">
                {Object.entries(row.levels).map(([code, level]) => (
                  <li key={code} className="inline-flex items-center gap-1" title={`${code}: ${LEVELS[level].label}`}>
                    <span className="h-2 w-2 rounded-full" style={{ background: LEVELS[level].color }} aria-hidden />
                    {SHORT_DISEASE_NAMES[code] ?? code}
                    <span className="sr-only">: {LEVELS[level].label}</span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </section>
        <VolcanoCard volcano={volcano} />
      </div>

      <Card>
        <CardHeader title="Cómo está construido" subtitle="Cada sección usa la técnica web que mejor le sirve; el panel de arriba de cada página lo explica." />
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2 xl:grid-cols-4">
          {PATTERN_ORDER.map((pattern) => (
            <div key={pattern} className="rounded-lg border border-line p-4">
              <span className="rounded-md px-2 py-0.5 font-mono text-xs font-bold text-white" style={{ background: `var(--pat-${pattern.toLowerCase()})` }}>{pattern}</span>
              <p className="mt-2 text-sm font-medium">{PATTERNS[pattern].name}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {PATTERNS[pattern].pages.map((page) => (
                  <li key={page.route}>
                    {page.route.includes("[") ? <span className="text-ink-2">{page.name}</span>
                      : <Link href={page.route} className="underline-grow text-ink-2">{page.name}</Link>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="grid gap-4 border-t border-line px-5 py-4 text-sm text-ink-2 md:grid-cols-3">
          <p className="flex gap-2"><Cpu size={16} className="mt-0.5 shrink-0 text-muted" />
            <span><b className="font-medium text-ink">Microservicios.</b> Una API de entrada, un motor de predicción gRPC con el modelo en memoria (los 4 tipos de RPC) y un servicio de tiempo real.</span></p>
          <p className="flex gap-2"><Radio size={16} className="mt-0.5 shrink-0 text-muted" />
            <span><b className="font-medium text-ink">Tiempo real.</b> Alertas y simulador viajan por un único WebSocket; el entrenamiento llega por SSE.</span></p>
          <p className="flex gap-2"><Workflow size={16} className="mt-0.5 shrink-0 text-muted" />
            <span><b className="font-medium text-ink">Web Workers.</b> Los CSV grandes y la matriz de sensibilidad se procesan fuera del hilo principal.</span></p>
        </div>
        <p className="px-5 pb-5 text-sm"><Link href="/metodologia" className="underline-grow font-medium">Ver la metodología y la arquitectura →</Link></p>
      </Card>
    </div>
  );
}
