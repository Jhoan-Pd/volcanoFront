// ============================================================================
// DISEASE FACT SHEETS (index) — SSG (Static Site Generation)
// ----------------------------------------------------------------------------
// force-static: the page is generated once, in `next build`, and served as a file.
// ============================================================================
import type { Metadata } from "next";
import Link from "next/link";
import { RenderPanel } from "@/components/render/RenderPanel";
import RevealedTitle from "@/components/RevealedTitle";
import { DISEASE_SHEETS } from "@/lib/diseaseSheets";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Enfermedades vigiladas",
  description: "IRA, EDA, dengue y afecciones por ceniza volcánica: síntomas, transmisión, prevención y señales que usa el predictor.",
};

const GENERATED_AT = new Date().toISOString(); // evaluated once, at build time

export default function DiseasesPage() {
  return (
    <div className="space-y-6">
      <RenderPanel pattern="SSG" generatedAt={GENERATED_AT} />
      <header>
        <p className="section-title text-[13px] text-muted">Fichas informativas</p>
        <RevealedTitle className="display-title mt-2 text-5xl sm:text-6xl" text="Enfermedades vigiladas" />
        <p className="mt-3 max-w-2xl text-ink-2">
          Qué son, cómo se previenen y qué señales usa el modelo para anticipar cada una. La información es general y no
          reemplaza la consulta médica.
        </p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        {Object.values(DISEASE_SHEETS).map((sheet) => (
          <Link key={sheet.code} href={`/enfermedades/${sheet.code.toLowerCase()}`} data-record="sheet"
            className="rounded-lg border border-line bg-surface p-5 transition-colors duration-[520ms] hover:bg-surface-2">
            <p className="font-mono text-xs text-muted">{sheet.code}</p>
            <h2 className="section-title mt-1 text-xl">{sheet.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm text-ink-2">{sheet.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
