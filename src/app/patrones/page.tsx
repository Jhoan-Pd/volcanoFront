// ============================================================================
// PATTERN COMPARISON — SSG + a client island
// ----------------------------------------------------------------------------
// The theory is static (generated at build time) and <PatternMeter /> is a client component that
// runs in the browser and measures the four representative pages.
// ============================================================================
import type { Metadata } from "next";
import { RenderPanel } from "@/components/render/RenderPanel";
import RevealedTitle from "@/components/RevealedTitle";
import { Card, CardHeader } from "@/components/ui";
import { PATTERN_ORDER, PATTERNS, type PatternInfo } from "@/lib/renderPatterns";
import { PatternMeter } from "./PatternMeter";

export const dynamic = "force-static";
export const metadata: Metadata = { title: "Patrones de rendering", description: "SSG, ISR, SSR y CSR en el predictor de brotes, medidos en vivo." };

const GENERATED_AT = new Date().toISOString();

const CRITERIA: { label: string; field: keyof Pick<PatternInfo, "where" | "when" | "seo" | "freshness" | "cost"> }[] = [
  { label: "¿Dónde se genera el HTML?", field: "where" },
  { label: "¿Cuándo?", field: "when" },
  { label: "SEO", field: "seo" },
  { label: "Frescura de los datos", field: "freshness" },
  { label: "Costo en el servidor", field: "cost" },
];

export default function PatternsPage() {
  return (
    <div className="space-y-6">
      <RenderPanel pattern="SSG" generatedAt={GENERATED_AT}
        why="La explicación no cambia con los datos: se genera en el build. Solo el medidor de abajo se ejecuta en tu navegador." />
      <header>
        <p className="section-title text-[13px] text-muted">Programación orientada a la web</p>
        <RevealedTitle className="display-title mt-2 text-5xl sm:text-6xl" text="Patrones de rendering" />
        <p className="mt-3 max-w-3xl text-ink-2">Cada sección del predictor usa el patrón que mejor se ajusta a qué tan seguido cambian sus
          datos, si necesita SEO y si depende del usuario. Arriba de cada página hay un panel que muestra cómo se generó.</p>
      </header>

      <PatternMeter />

      <Card>
        <CardHeader title="Resumen" />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-line">
              <tr>
                <th className="py-2 pr-3 text-xs text-muted">Criterio</th>
                {PATTERN_ORDER.map((pattern) => (
                  <th key={pattern} className="py-2 pr-3">
                    <span className="font-mono font-bold" style={{ color: `var(--pat-${pattern.toLowerCase()})` }}>{pattern}</span>
                    <span className="block text-xs font-normal text-muted">{PATTERNS[pattern].name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRITERIA.map((criterion) => (
                <tr key={criterion.field} className="border-b border-line align-top">
                  <th className="py-2 pr-3 text-xs font-medium text-ink-2">{criterion.label}</th>
                  {PATTERN_ORDER.map((pattern) => <td key={pattern} className="py-2 pr-3 text-ink-2">{PATTERNS[pattern][criterion.field]}</td>)}
                </tr>
              ))}
              <tr className="align-top">
                <th className="py-2 pr-3 text-xs font-medium text-ink-2">En el predictor</th>
                {PATTERN_ORDER.map((pattern) => (
                  <td key={pattern} className="py-2 pr-3 text-ink-2">{PATTERNS[pattern].pages.map((page) => page.name).join(", ")}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {PATTERN_ORDER.map((pattern) => (
          <Card key={pattern}>
            <CardHeader title={`¿Por qué ${pattern}?`} />
            <p className="px-5 pb-5 text-sm text-ink-2">{PATTERNS[pattern].why}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
