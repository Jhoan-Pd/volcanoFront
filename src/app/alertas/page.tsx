// ============================================================================
// ALERT SEARCH — SSR (Server-Side Rendering)
// ----------------------------------------------------------------------------
// force-dynamic: rendered on the server on EVERY request, with the filters in the URL
// (?q=&municipio=&nivel=…) and the request headers. The form is a plain <form method="get">: it
// works even without JavaScript and every search lives in a URL that can be shared.
// The URL is part of the UI, so its parameter names and values are Spanish; they are mapped to the
// API's English ones here.
// ============================================================================
import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { Alert, AlertOrigin, Disease, Municipality, Page, RiskLevel } from "@/api/types";
import { RenderPanel } from "@/components/render/RenderPanel";
import { Card, inputClass, LevelChip } from "@/components/ui";
import { formatDate, LEVELS, ORIGINS } from "@/lib/format";
import { integer, requestInfo, text, type SearchParams } from "@/lib/searchParams";
import { fetchApi, nowIso } from "@/lib/serverFetch";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel: give Render's backend time to wake up
export const metadata: Metadata = { title: "Buscar alertas", description: "Historial de alertas tempranas por municipio, enfermedad y nivel." };

const PAGE_SIZE = 20;
const CATALOG_REVALIDATE_S = 3600;
const STATES: Record<string, boolean | undefined> = { activas: true, cerradas: false, todas: undefined };
const LEVEL_PARAMS: Record<string, RiskLevel> = { alto: "ORANGE", "muy-alto": "RED" };
const ORIGIN_PARAMS: Record<string, AlertOrigin> = { observado: "OBSERVED", predicho: "PREDICTED" };

export default async function AlertSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  // Keys are the Spanish URL parameters; unknown values fall back to "no filter"
  const filters = {
    q: text(params.q), municipio: integer(params.municipio), enfermedad: integer(params.enfermedad),
    nivel: text(params.nivel) in LEVEL_PARAMS ? text(params.nivel) : "",
    origen: text(params.origen) in ORIGIN_PARAMS ? text(params.origen) : "",
    estado: text(params.estado) in STATES ? text(params.estado) : "activas",
    pagina: Math.max(1, integer(params.pagina) ?? 1),
  };

  const [result, municipalities, diseases, request] = await Promise.all([
    fetchApi<Page<Alert>>("/alerts/search", {
      q: filters.q, municipality_id: filters.municipio, disease_id: filters.enfermedad,
      level: LEVEL_PARAMS[filters.nivel], origin: ORIGIN_PARAMS[filters.origen], active: STATES[filters.estado],
      offset: (filters.pagina - 1) * PAGE_SIZE, limit: PAGE_SIZE,
    }, { cache: "no-store" }),
    // The catalogues hardly change: even though the page is SSR, these are cached for an hour
    fetchApi<Page<Municipality>>("/municipalities", { limit: 500 }, { revalidate: CATALOG_REVALIDATE_S }),
    fetchApi<Page<Disease>>("/diseases", { limit: 100 }, { revalidate: CATALOG_REVALIDATE_S }),
    requestInfo(),
  ]);
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const pageLink = (page: number) => {
    const query = new URLSearchParams(Object.entries({ ...filters, pagina: page })
      .filter(([, v]) => v !== "" && v !== undefined).map(([k, v]) => [k, String(v)]));
    return `/alertas?${query}`;
  };
  const activeFilters = Object.entries(filters).filter(([k, v]) => v && k !== "pagina").map(([k]) => k);

  return (
    <div className="space-y-5">
      <RenderPanel pattern="SSR" generatedAt={nowIso()}
        details={[
          { label: "Filtros leídos de la URL", value: activeFilters.join(", ") || "ninguno" },
          { label: "Renderizado para", value: `${request.browser} · ${request.language} · ${request.region}` },
        ]} />

      <header>
        <p className="section-title text-[13px] text-muted">Historial</p>
        <h1 className="display-title mt-2 text-5xl sm:text-6xl">Buscar alertas</h1>
      </header>

      <Card>
        <form method="get" action="/alertas" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
          <label className="lg:col-span-2">
            <span className="mb-1 block text-xs font-medium text-ink-2">Texto</span>
            <input name="q" defaultValue={filters.q} placeholder="dengue, Consacá, ceniza…" className={inputClass} />
          </label>
          <Select name="municipio" label="Municipio" value={filters.municipio}
            options={municipalities.items.map((m) => [String(m.id), m.name])} />
          <Select name="enfermedad" label="Enfermedad" value={filters.enfermedad}
            options={diseases.items.map((d) => [String(d.id), d.name])} />
          <Select name="nivel" label="Nivel" value={filters.nivel}
            options={Object.entries(LEVEL_PARAMS).map(([param, level]) => [param, LEVELS[level].label])} />
          <Select name="estado" label="Estado" value={filters.estado} required
            options={[["activas", "Activas"], ["cerradas", "Cerradas"], ["todas", "Todas"]]} />
          <Select name="origen" label="Origen" value={filters.origen}
            options={Object.entries(ORIGIN_PARAMS).map(([param, origin]) => [param, ORIGINS[origin]])} />
          <div className="flex items-end gap-2 lg:col-span-5">
            <button className="inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-page hover:opacity-90">
              <Search size={15} aria-hidden /> Buscar
            </button>
            <Link href="/alertas" className="rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2">Limpiar</Link>
          </div>
        </form>
      </Card>

      <p className="text-sm text-ink-2">{result.total} alerta{result.total === 1 ? "" : "s"} · página {filters.pagina} de {pages}</p>

      {result.items.length === 0 ? (
        <Card><p className="py-10 text-center text-sm text-muted">No hay alertas con esos filtros.</p></Card>
      ) : (
        <ul className="space-y-2">
          {result.items.map((alert) => (
            <li key={alert.id} data-record="alert" className="rounded-lg border border-line bg-surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <LevelChip level={alert.risk_level} />
                <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {ORIGINS[alert.origin]}</span>
                <Link href={`/municipio/${alert.municipality_id}`} className="underline-grow text-sm font-medium">{alert.municipality}</Link>
                <span className="text-sm text-ink-2">· {alert.disease} · semana {alert.label}</span>
                <span className="ml-auto text-xs text-muted">{alert.active ? "Activa" : `Cerrada ${formatDate(alert.closed_at)}`}</span>
              </div>
              <p className="mt-2 text-sm text-ink-2">{alert.message}</p>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-center gap-2 text-sm" aria-label="Paginación">
          {filters.pagina > 1 && <Link href={pageLink(filters.pagina - 1)} className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface-2">← Anterior</Link>}
          {filters.pagina < pages && <Link href={pageLink(filters.pagina + 1)} className="rounded-lg border border-line px-3 py-1.5 hover:bg-surface-2">Siguiente →</Link>}
        </nav>
      )}
    </div>
  );
}

function Select({ name, label, value, options, required = false }: {
  name: string; label: string; value: string | number | undefined; options: string[][]; required?: boolean;
}) {
  return (
    <label>
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      <select name={name} defaultValue={value === undefined ? "" : String(value)} className={inputClass}>
        {!required && <option value="">Todos</option>}
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}
