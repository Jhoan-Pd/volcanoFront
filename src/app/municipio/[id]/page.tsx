// ============================================================================
// A MUNICIPALITY'S DASHBOARD — ISR (Incremental Static Regeneration)
// ----------------------------------------------------------------------------
// - generateStaticParams: at build time one HTML is generated per active municipality.
// - revalidate: the cached version lasts at most 1 hour; the next visit after that gets the old
//   version and triggers a regeneration in the background.
// - On-demand revalidation: the backend calls /api/revalidate when the daily update or a
//   retraining finishes, so the dashboard regenerates as soon as there is new data.
// - dynamicParams: a municipality created after the build is generated on its first visit.
// ============================================================================
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RenderPanel } from "@/components/render/RenderPanel";
import { activeMunicipalities, loadDashboard, MAX_WEEKS } from "@/lib/dashboard";
import { fetchApi } from "@/lib/serverFetch";
import MunicipalityDashboard from "@/views/MunicipalityDashboard";

export const revalidate = 3600; // = DASHBOARD_REVALIDATE_S (Next.js requires a literal here)
export const dynamicParams = true;

type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  try {
    // The list may come from the data cache of a previous build (Vercel keeps it): before promising
    // one HTML per municipality, confirm that the API answers right now.
    await fetchApi("/municipalities", { limit: 1 }, { cache: "no-store", timeoutMs: 15_000 });
    return (await activeMunicipalities()).map((m) => ({ id: String(m.id) }));
  } catch {
    // The API (Render, free plan) may be asleep during the build: then each dashboard is generated
    // on its first visit and stays cached from there on.
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const municipality = (await activeMunicipalities().catch(() => [])).find((m) => String(m.id) === id);
  return {
    title: municipality ? `Riesgo de brotes en ${municipality.name}` : "Tablero municipal",
    description: municipality
      ? `Semáforo epidemiológico, predicción a 4 semanas y clima de ${municipality.name} (zona del Volcán Galeras).`
      : undefined,
  };
}

export default async function MunicipalityPage({ params }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const data = await loadDashboard(Number(id));
  if (!data) notFound();

  return (
    <div className="space-y-5">
      <RenderPanel pattern="ISR" generatedAt={data.generatedAt} path={`/municipio/${id}`}
        details={[
          { label: "Peticiones a la API al generar", value: `${data.requests} (en paralelo)` },
          { label: "Datos incluidos en el HTML", value: `${data.summary.risks.length} enfermedades × ${MAX_WEEKS} semanas` },
        ]} />
      <MunicipalityDashboard data={data} />
    </div>
  );
}
