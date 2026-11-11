"use client";

import { Gauge } from "lucide-react";
import { useState } from "react";
import { Button, Card, CardHeader } from "@/components/ui";
import { PATTERN_ORDER, type Pattern } from "@/lib/renderPatterns";

/** One representative page of each pattern. */
const ROUTES: Record<Pattern, string> = {
  SSG: "/enfermedades/ira",
  ISR: "/",
  SSR: "/alertas?estado=todas",
  CSR: "/mapa",
};

const ROUNDS = 3;
const PAUSE_MS = 2000;

interface Measurement {
  ttfb: number;
  total: number;
  kb: number;
  generatedAt: string | null;
  records: number;
  cache: string | null;
}

type Results = Record<Pattern, Measurement[]>;
const emptyResults = (): Results => ({ SSG: [], ISR: [], SSR: [], CSR: [] });
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const clockTime = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const average = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const patternColor = (pattern: Pattern) => `var(--pat-${pattern.toLowerCase()})`;

/** Request the page as a visitor would and analyse the HTML the server returns. */
async function measure(route: string): Promise<Measurement> {
  const start = performance.now();
  const response = await fetch(route, { cache: "no-store" }); // bypasses the browser cache, not the CDN's
  const ttfb = performance.now() - start;
  const html = await response.text();
  const total = performance.now() - start;
  return {
    ttfb: Math.round(ttfb),
    total: Math.round(total),
    kb: new Blob([html]).size / 1024,
    generatedAt: html.match(/data-render-generated="([^"]+)"/)?.[1] ?? null,
    // Elements with data already inside the HTML (municipalities, fact sheets, alerts)
    records: (html.match(/data-record="/g) ?? []).length,
    cache: response.headers.get("x-vercel-cache") ?? response.headers.get("x-nextjs-cache")
      ?? (response.headers.get("x-nextjs-prerender") ? "PRERENDER" : null),
  };
}

function conclusion(pattern: Pattern, measurements: Measurement[]) {
  if (measurements.length === 0) return "";
  const times = measurements.map((m) => m.generatedAt);
  if (times.every((t) => t === null)) return "El HTML llega sin datos: los pide el navegador después.";
  const distinct = new Set(times).size;
  if (distinct === 1) return "Misma hora en todas las rondas: se sirvió una versión ya generada.";
  if (distinct === measurements.length) return "Hora distinta en cada ronda: el servidor generó un HTML nuevo por petición.";
  return pattern === "ISR" ? "Cambió entre rondas: la versión se regeneró." : "La hora cambió en algunas rondas.";
}

export function PatternMeter() {
  const [results, setResults] = useState<Results>(emptyResults);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setResults(emptyResults());
    setError(null);
    try {
      for (let round = 1; round <= ROUNDS; round++) {
        for (const pattern of PATTERN_ORDER) {
          setProgress(`Ronda ${round} de ${ROUNDS}: pidiendo ${ROUTES[pattern]} (${pattern})…`);
          const measurement = await measure(ROUTES[pattern]);
          setResults((previous) => ({ ...previous, [pattern]: [...previous[pattern], measurement] }));
        }
        if (round < ROUNDS) {
          setProgress(`Esperando ${PAUSE_MS / 1000} s antes de la ronda ${round + 1}…`);
          await wait(PAUSE_MS);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setProgress(null);
    }
  }

  const hasResults = PATTERN_ORDER.some((pattern) => results[pattern].length > 0);
  const averages = PATTERN_ORDER.map((pattern) => ({ pattern, ms: average(results[pattern].map((m) => m.ttfb)) }));
  const slowest = Math.max(1, ...averages.map((a) => a.ms));

  return (
    <Card>
      <CardHeader title="Medición en vivo" icon={<Gauge size={17} />}
        subtitle={`${ROUNDS} rondas con ${PAUSE_MS / 1000} s de pausa. Tu navegador pide una página de cada patrón y analiza el HTML que llega.`}
        action={<Button onClick={run} loading={progress !== null}>{hasResults ? "Medir de nuevo" : "Medir los 4 patrones"}</Button>} />
      <div className="space-y-4 px-5 pb-5 text-sm">
        {process.env.NODE_ENV === "development" && (
          <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-ink-2">
            Modo desarrollo: todo se renderiza por petición, así que SSG e ISR se verán como SSR. Mide sobre
            {" "}<code>npm run build && npm start</code> o la versión desplegada.
          </p>
        )}
        {progress && <p role="status" className="text-xs text-muted">{progress}</p>}
        {error && <p className="text-xs text-[var(--st-red-ink)]">No se pudo completar la medición: {error}</p>}
        {hasResults && (
          <>
            <figure>
              <figcaption className="text-xs text-muted">Tiempo hasta el primer byte (≈TTFB), promedio en ms · menos es mejor</figcaption>
              <ul className="mt-2 space-y-2">
                {averages.map(({ pattern, ms }) => (
                  <li key={pattern} className="grid grid-cols-[3.5rem_1fr_4.5rem] items-center gap-3"
                    aria-label={`${pattern}: ${ms} ms en promedio`}>
                    <span className="font-mono text-xs font-bold" style={{ color: patternColor(pattern) }}>{pattern}</span>
                    <span className="h-3 rounded-full bg-surface-2">
                      <span className="block h-3 rounded-full" style={{ width: `${Math.max(2, (ms / slowest) * 100)}%`, background: patternColor(pattern) }} />
                    </span>
                    <span className="tabular text-right text-xs">{ms} ms</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">Ojo con CSR: su HTML llega rápido porque viene vacío; los datos aparecen después, cuando el
                navegador ejecuta el JavaScript y llama a la API. SSR tarda más en responder pero entrega la página completa.</p>
            </figure>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="border-b border-line text-muted">
                  <tr><th className="py-2 pr-3">Patrón</th><th className="pr-3">≈TTFB por ronda</th><th className="pr-3">HTML</th>
                    <th className="pr-3">Datos en el HTML</th><th className="pr-3">Hora escrita en el HTML</th><th className="pr-3">Caché</th><th>Conclusión</th></tr>
                </thead>
                <tbody>
                  {PATTERN_ORDER.map((pattern) => {
                    const measurements = results[pattern];
                    const last = measurements[measurements.length - 1];
                    return (
                      <tr key={pattern} className="border-b border-line align-top">
                        <td className="py-2 pr-3"><b className="font-mono" style={{ color: patternColor(pattern) }}>{pattern}</b><br /><span className="text-muted">{ROUTES[pattern]}</span></td>
                        <td className="py-2 pr-3 tabular">{measurements.map((m) => `${m.ttfb} ms`).join(" · ") || "—"}</td>
                        <td className="py-2 pr-3 tabular">{last ? `${last.kb.toFixed(1)} KB` : "—"}</td>
                        <td className="py-2 pr-3">{last ? (last.records > 0 ? `Sí (${last.records})` : "No: solo el esqueleto") : "—"}</td>
                        <td className="py-2 pr-3 tabular">{measurements.map((m) => (m.generatedAt ? clockTime(m.generatedAt) : "—")).join(" · ") || "—"}</td>
                        <td className="py-2 pr-3">{measurements.map((m) => m.cache ?? "—").join(" · ") || "—"}</td>
                        <td className="py-2">{conclusion(pattern, measurements)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
