"use client";

import { ChevronDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore, useTransition } from "react";
import { revalidateNow } from "@/app/actions";
import { DASHBOARD_REVALIDATE_S, PATTERNS, type Pattern } from "@/lib/renderPatterns";

// ---------------------------------------------------------------------------
// Browser "stores": on the server they return null, so the initial HTML never
// depends on the client's clock (no hydration errors).
// ---------------------------------------------------------------------------
function subscribeClock(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}
const currentSecond = () => Math.floor(Date.now() / 1000) * 1000;
const noSubscription = () => () => {};

/** Time To First Byte of this document's load (ms), or -1 when the page was reached by client navigation. */
function readTtfb() {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return -1;
  const url = new URL(nav.name);
  return url.pathname + url.search === location.pathname + location.search ? Math.round(nav.responseStart) : -1;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const date = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86_400)} d`;
}

const GENERATED_LABEL: Record<Pattern, string> = {
  SSG: "HTML generado en el build",
  ISR: "HTML generado a las",
  SSR: "HTML generado a las",
  CSR: "Datos recibidos a las",
};

export interface PanelDetail { label: string; value: string }

interface Props {
  pattern: Pattern;
  /** When this view's data was generated (ISO). In CSR, when the response arrived. */
  generatedAt: string | null;
  /** ISR only: the path that can be revalidated on demand. */
  path?: string;
  details?: PanelDetail[];
  why?: string;
}

/**
 * Collapsible panel explaining how the page on screen was rendered. It exposes
 * `data-render-pattern` and `data-render-generated` so the /patrones page can measure them.
 */
export function RenderPanel({ pattern, generatedAt, path, details = [], why }: Props) {
  const info = PATTERNS[pattern];
  const [open, setOpen] = useState(false);
  const now = useSyncExternalStore(subscribeClock, currentSecond, () => null);
  const ttfb = useSyncExternalStore(noSubscription, readTtfb, () => null);
  const [revalidating, startRevalidation] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const generatedMs = generatedAt ? new Date(generatedAt).getTime() : null;
  const age = now !== null && generatedMs !== null ? now - generatedMs : null;
  const remaining = pattern === "ISR" && generatedMs !== null && now !== null
    ? generatedMs + DASHBOARD_REVALIDATE_S * 1000 - now : null;
  const color = `var(--pat-${pattern.toLowerCase()})`;
  const generatedText = generatedAt
    ? (pattern === "SSG" ? `${date(generatedAt)}, ${time(generatedAt)}` : time(generatedAt)) : "—";

  return (
    <aside data-render-pattern={pattern} data-render-generated={generatedAt ?? ""}
      className="rounded-lg print:hidden border bg-surface text-sm"
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, var(--line))` }}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-left">
        <span className="rounded-md px-2 py-0.5 font-mono text-xs font-bold text-white" style={{ background: color }}>{pattern}</span>
        <strong className="font-medium text-ink">{info.name}</strong>
        <span className="min-w-0 flex-1 truncate text-xs text-muted">
          {generatedAt ? `${GENERATED_LABEL[pattern]} ${pattern === "SSG" ? date(generatedAt) : time(generatedAt)}` : "Esperando datos…"}
          {age !== null && ` · ${ago(age)}`}
        </span>
        <ChevronDown size={15} className={`text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div className="enter border-t border-line px-4 py-3">
          {process.env.NODE_ENV === "development" && (
            <p className="mb-3 rounded-md bg-surface-2 px-3 py-2 text-xs text-ink-2">
              Modo desarrollo: Next.js renderiza todas las páginas en cada petición. Para ver SSG e ISR de verdad usa
              {" "}<code>npm run build && npm start</code> o la versión desplegada.
            </p>
          )}
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Detail label={GENERATED_LABEL[pattern]} value={generatedText} />
            <Detail label="Antigüedad del contenido" value={age !== null ? ago(age) : "—"} />
            {pattern === "ISR" && (
              <Detail label={`Ventana de ISR (${DASHBOARD_REVALIDATE_S / 60} min)`}
                value={remaining === null ? "—" : remaining > 0 ? `Vigente: vence en ${Math.ceil(remaining / 60_000)} min`
                  : "Vencida: la próxima visita la regenera"} />
            )}
            <Detail label="TTFB de esta carga" value={ttfb === null ? "—" : ttfb < 0 ? "Recarga para medir" : `${ttfb} ms`} />
            {details.map((d) => <Detail key={d.label} label={d.label} value={d.value} />)}
          </dl>
          <div className="mt-3 grid gap-1 text-xs text-ink-2 md:grid-cols-3">
            <p><b className="font-medium text-ink">Dónde:</b> {info.where}</p>
            <p><b className="font-medium text-ink">SEO:</b> {info.seo}</p>
            <p><b className="font-medium text-ink">Frescura:</b> {info.freshness}</p>
          </div>
          <p className="mt-2 text-xs text-ink-2"><b className="font-medium text-ink">¿Por qué {pattern} aquí?</b> {why ?? info.why}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-2">
              <RefreshCw size={13} aria-hidden /> Recargar
            </button>
            {pattern === "ISR" && path && (
              <button type="button" disabled={revalidating}
                onClick={() => startRevalidation(async () => {
                  const r = await revalidateNow(path);
                  setMessage(r.ok ? "Listo: recarga para ver la versión regenerada." : r.message);
                })}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-2 disabled:opacity-50">
                {revalidating ? "Revalidando…" : "Revalidar ahora (bajo demanda)"}
              </button>
            )}
            <span className="text-[11px] text-muted">{message ?? info.hint}</span>
            <Link href="/patrones" className="underline-grow ml-auto text-[11px] text-ink-2">Comparar los 4 patrones →</Link>
          </div>
        </div>
      )}
    </aside>
  );
}

function Detail({ label, value }: PanelDetail) {
  return (
    <div>
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className="tabular font-medium text-ink">{value}</dd>
    </div>
  );
}
