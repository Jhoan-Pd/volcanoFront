/**
 * The four rendering patterns and where the predictor uses each one. Read by the panel shown on
 * every page (RenderPanel) and by the /patrones page. The text is Spanish because users read it.
 */
export type Pattern = "SSG" | "ISR" | "SSR" | "CSR";

export interface PatternInfo {
  acronym: Pattern;
  name: string;
  where: string;
  when: string;
  seo: string;
  freshness: string;
  cost: string;
  pages: { route: string; name: string }[];
  why: string;
  hint: string;
}

export const PATTERNS: Record<Pattern, PatternInfo> = {
  SSG: {
    acronym: "SSG",
    name: "Static Site Generation",
    where: "En el build de Vercel, una sola vez",
    when: "Al ejecutar next build",
    seo: "Excelente: el HTML trae todo el contenido",
    freshness: "Congelada hasta el próximo despliegue",
    cost: "Casi cero: un archivo servido desde la CDN",
    pages: [
      { route: "/enfermedades", name: "Fichas de enfermedades" },
      { route: "/metodologia", name: "Metodología" },
      { route: "/patrones", name: "Comparativa de patrones" },
    ],
    why: "Las fichas de cada enfermedad (síntomas, transmisión, prevención) no cambian con los datos semanales. "
      + "Generarlas en el build las hace instantáneas, indexables por buscadores y no gastan la API.",
    hint: "Recarga cuantas veces quieras: la hora no cambia hasta el próximo despliegue.",
  },
  ISR: {
    acronym: "ISR",
    name: "Incremental Static Regeneration",
    where: "En el servidor, y luego se cachea en la CDN",
    when: "En el build y después como máximo cada hora, o al instante cuando el cron avisa",
    seo: "Excelente: el HTML trae todo el contenido",
    freshness: "Casi fresca: se regenera al llegar datos nuevos",
    cost: "Bajo: una regeneración por actualización, no por visita",
    pages: [
      { route: "/", name: "Inicio" },
      { route: "/municipio/[id]", name: "Tablero de cada municipio" },
    ],
    why: "El riesgo cambia una vez al día (cron de las 6 a. m.) o cuando se reentrena el modelo, pero lo consulta mucha gente. "
      + "ISR sirve el tablero como página estática y el backend pide regenerarlo (revalidación bajo demanda) justo cuando hay datos nuevos.",
    hint: "Recarga varias veces: la hora solo cambia cuando hay datos nuevos o vence la hora de ISR.",
  },
  SSR: {
    acronym: "SSR",
    name: "Server-Side Rendering",
    where: "En el servidor, en cada petición",
    when: "Cada vez que alguien abre la página o cambia un filtro",
    seo: "Excelente: el HTML trae los resultados",
    freshness: "Totalmente fresca: refleja la base de datos en ese instante",
    cost: "Alto: el servidor trabaja y consulta la API en cada visita",
    pages: [
      { route: "/alertas", name: "Búsqueda de alertas" },
      { route: "/reportes", name: "Reportes" },
    ],
    why: "Los resultados dependen de lo que escribe el usuario (?q=, municipio, nivel…). Hay demasiadas combinaciones para "
      + "precalcularlas y cada URL se puede compartir con sus resultados ya renderizados.",
    hint: "Cada recarga o cambio de filtro genera un HTML nuevo: la hora cambia siempre.",
  },
  CSR: {
    acronym: "CSR",
    name: "Client-Side Rendering",
    where: "En el navegador (JavaScript)",
    when: "Después de cargar la página: fetch, SSE o WebSocket hacia la API",
    seo: "Pobre: el HTML inicial llega sin datos (no importa en paneles privados)",
    freshness: "En tiempo real (WebSocket del servicio de tiempo real y SSE)",
    cost: "Bajo en el servidor; el trabajo lo hace el dispositivo",
    pages: [
      { route: "/mapa", name: "Mapa de riesgo en vivo" },
      { route: "/simulador", name: "Simulador ¿qué pasa si…?" },
      { route: "/admin", name: "Administración" },
      { route: "/farmacia", name: "Panel de farmacia" },
    ],
    why: "Son páginas muy interactivas o privadas: el mapa de Leaflet necesita el navegador, el simulador conversa con el motor "
      + "por WebSocket y los paneles dependen del token del usuario. No necesitan SEO.",
    hint: "Los datos se piden desde tu navegador y llegan en vivo por SSE o WebSocket.",
  },
};

export const PATTERN_ORDER: Pattern[] = ["SSG", "ISR", "SSR", "CSR"];

/** Seconds of the dashboards' ISR window (when the backend does not ask for a revalidation sooner). */
export const DASHBOARD_REVALIDATE_S = 3600;
