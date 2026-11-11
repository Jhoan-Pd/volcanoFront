// ============================================================================
// ONE DISEASE'S FACT SHEET — SSG with data fetched at build time
// ----------------------------------------------------------------------------
// - generateStaticParams: one HTML per disease, generated in `next build`.
// - dynamicParams = false: any other code answers 404 (nothing is generated on demand).
// - At build time the configured thresholds and search terms are also fetched from the API
//   (cache: "force-cache"); when the API does not answer, the sheet is generated with the
//   editorial content only.
// ============================================================================
import { AlertTriangle, ShieldCheck, Stethoscope, Users, Waves } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Disease, Page } from "@/api/types";
import { RenderPanel } from "@/components/render/RenderPanel";
import RevealedTitle from "@/components/RevealedTitle";
import { Card, CardHeader } from "@/components/ui";
import { DISEASE_CODES, DISEASE_SHEETS } from "@/lib/diseaseSheets";
import { fetchOptional } from "@/lib/serverFetch";

export const dynamic = "force-static";
export const dynamicParams = false;

type Props = { params: Promise<{ code: string }> };

export function generateStaticParams() {
  return DISEASE_CODES.map((code) => ({ code: code.toLowerCase() }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const sheet = DISEASE_SHEETS[(await params).code.toUpperCase()];
  return sheet ? { title: sheet.name, description: sheet.summary } : {};
}

async function diseaseSettings(code: string): Promise<Disease | null> {
  const page = await fetchOptional<Page<Disease>>("/diseases", { limit: 100 }, { cache: "force-cache", timeoutMs: 20_000 });
  return page?.items.find((d) => d.code === code) ?? null;
}

function BulletList({ items }: { items: string[] }) {
  return <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

export default async function DiseaseSheetPage({ params }: Props) {
  const sheet = DISEASE_SHEETS[(await params).code.toUpperCase()];
  if (!sheet) notFound();
  const settings = await diseaseSettings(sheet.code);
  const generatedAt = new Date().toISOString();

  return (
    <div className="space-y-6" data-record="sheet">
      <RenderPanel pattern="SSG" generatedAt={generatedAt}
        details={[{ label: "Configuración de la API en el build", value: settings ? "Incluida" : "No disponible (solo contenido editorial)" }]} />
      <header>
        <Link href="/enfermedades" className="underline-grow text-xs text-muted">← Enfermedades vigiladas</Link>
        <RevealedTitle className="display-title mt-2 text-4xl sm:text-6xl" text={sheet.name} />
        <p className="mt-3 max-w-3xl text-ink-2">{sheet.summary}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardHeader title="Síntomas" icon={<Stethoscope size={17} />} /><div className="px-5 pb-5"><BulletList items={sheet.symptoms} /></div></Card>
        <Card>
          <CardHeader title="Transmisión y grupos de riesgo" icon={<Users size={17} />} />
          <div className="space-y-3 px-5 pb-5"><p className="text-sm text-ink-2">{sheet.transmission}</p><BulletList items={sheet.riskGroups} /></div>
        </Card>
        <Card><CardHeader title="Prevención" icon={<ShieldCheck size={17} />} /><div className="px-5 pb-5"><BulletList items={sheet.prevention} /></div></Card>
        <Card><CardHeader title="Cuándo consultar de inmediato" icon={<AlertTriangle size={17} />} /><div className="px-5 pb-5"><BulletList items={sheet.seekCare} /></div></Card>
      </div>

      <Card>
        <CardHeader title="Cómo la anticipa el predictor" icon={<Waves size={17} />} subtitle={sheet.context} />
        <div className="grid gap-3 px-5 pb-5 md:grid-cols-2">
          {sheet.signals.map((signal) => (
            <div key={signal.group} className="rounded-lg border border-line p-3 text-sm">
              <p className="font-medium">{signal.group}</p>
              <p className="mt-1 text-ink-2">{signal.detail}</p>
            </div>
          ))}
        </div>
        {settings && (
          <dl className="grid gap-3 border-t border-line px-5 py-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted">Umbrales del semáforo</dt>
              <dd className="tabular">P{settings.yellow_threshold_pct} · P{settings.orange_threshold_pct} · P{settings.red_threshold_pct}</dd></div>
            <div><dt className="text-xs text-muted">Términos de búsqueda vigilados</dt><dd>{settings.search_terms || "—"}</dd></div>
            <div><dt className="text-xs text-muted">Código CIE-10</dt><dd>{settings.icd10_code || "—"}</dd></div>
          </dl>
        )}
      </Card>
      <p className="text-xs text-muted">Información general de salud pública. Ante síntomas graves acude al servicio de urgencias más cercano.</p>
    </div>
  );
}
