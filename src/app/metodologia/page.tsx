// ============================================================================
// METHODOLOGY — SSG (Static Site Generation)
// ----------------------------------------------------------------------------
// Text that only changes when the code changes: generated once, at build time.
// ============================================================================
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RenderPanel } from "@/components/render/RenderPanel";
import RevealedTitle from "@/components/RevealedTitle";
import { Card, CardHeader } from "@/components/ui";
import { PATTERN_ORDER, PATTERNS } from "@/lib/renderPatterns";

export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Metodología y arquitectura",
  description: "Cómo se construye el dataset, cómo se entrena y valida el modelo y cómo está armada la aplicación web.",
};

const GENERATED_AT = new Date().toISOString();

const RPCS = [
  { kind: "Unary", method: "GetStatus, Predict", bridge: "API → GET JSON", use: "Pronóstico calculado al momento con el modelo en memoria" },
  { kind: "Server streaming", method: "Train", bridge: "API → SSE", use: "Avance del entrenamiento, paso a paso" },
  { kind: "Server streaming", method: "WatchAlerts", bridge: "Tiempo real → WebSocket", use: "Alertas en vivo para todos los navegadores" },
  { kind: "Client streaming", method: "UploadPharmacyReports", bridge: "API → POST de filas", use: "Carga masiva del histórico de una farmacia" },
  { kind: "Bidireccional", method: "SimulateScenarios", bridge: "Tiempo real → WebSocket", use: "Simulador «¿qué pasa si…?»" },
];

const SERVICES = [
  { name: "API de entrada", detail: "FastAPI. Autenticación, catálogos, tablero, reportes y cargas. Es el único que escribe por HTTP." },
  { name: "Motor de predicción", detail: "Servidor gRPC con los modelos en memoria: entrena, predice, simula y emite las alertas." },
  { name: "Tiempo real", detail: "Un WebSocket por pestaña que reparte alertas, simulaciones, presencia y avisos de datos nuevos." },
];

const ARCHITECTURE = `Navegador ──HTML (SSG/ISR/SSR)──► Next.js (Vercel) ──fetch en el servidor──┐
    │                                                                    ▼
    ├── JSON · SSE ────────────────────────────► ┌──────── un contenedor (Render) ────────┐
    ├── WebSocket /ws ─────────────────────────► │ proxy ─┬─► API de entrada (FastAPI)    │
    │                                            │        └─► Tiempo real (WebSocket)     │
    └── Web Workers (CSV, matriz)                │              │ gRPC (HTTP/2, interno)  │
                                                 │              ▼                         │
                                                 │        Motor de predicción (gRPC)      │
                                                 └──────────────┬─────────────────────────┘
                                                                ▼
                                                        PostgreSQL (Neon)`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} />
      <div className="space-y-3 px-5 pb-5 text-sm leading-relaxed text-ink-2">{children}</div>
    </Card>
  );
}

export default function MethodologyPage() {
  return (
    <div className="space-y-6">
      <RenderPanel pattern="SSG" generatedAt={GENERATED_AT} />
      <header>
        <p className="section-title text-[13px] text-muted">Cómo funciona</p>
        <RevealedTitle className="display-title mt-2 text-5xl sm:text-6xl" text="Metodología y arquitectura" />
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="1. Datos">
          <p>Para cada municipio y semana epidemiológica se reúnen: casos oficiales (SIVIGILA, datos.gov.co), clima observado y
            pronosticado (Open-Meteo), índice de búsquedas de síntomas en Nariño (Google Trends), ventas semanales de farmacias
            participantes por categoría y boletines del Servicio Geológico Colombiano (SO₂ y caída de ceniza).</p>
          <p>Una tarea programada de GitHub Actions actualiza todo cada día a las 6 a. m. y al terminar pide al frontend regenerar los tableros (ISR).</p>
        </Section>
        <Section title="2. Dataset sin fuga de datos">
          <p>Cada fila es «lo que se sabe al cerrar la semana t». Todas las variables usan información de t o anterior; los objetivos
            son los casos de t+1 a t+4. Una prueba automática verifica que cambiar casos futuros no cambia las variables de hoy.</p>
        </Section>
        <Section title="3. Modelos y validación">
          <p>Se comparan la línea base (promedio móvil de 4 semanas), Random Forest y Gradient Boosting, uno por horizonte, con
            validación temporal sobre las últimas 52 semanas (nunca se mezcla futuro con pasado). Gana el de menor MAE y se reentrena
            con todos los datos. El intervalo del 80 % sale de los cuantiles 10 y 90 de los residuos.</p>
        </Section>
        <Section title="4. Semáforo y alertas">
          <p>El canal endémico usa los percentiles 50, 75 y 90 de las semanas S−1, S y S+1 de los 5 años anteriores. Hay alerta cuando
            el nivel observado o el predicho llega a naranja o rojo (con un mínimo de 3 casos). Las alertas se envían por correo y llegan
            en vivo al navegador por el servicio de tiempo real.</p>
        </Section>
      </div>

      <Card>
        <CardHeader title="5. Arquitectura web" subtitle="Next.js en Vercel · tres microservicios en un contenedor de Render · PostgreSQL en Neon" />
        <div className="space-y-5 px-5 pb-5 text-sm">
          <pre className="overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-[12px] leading-relaxed text-ink-2">{ARCHITECTURE}</pre>

          <div>
            <h3 className="section-title text-base">Microservicios</h3>
            <p className="mt-1 text-ink-2">Tres procesos independientes comparten un solo contenedor: un supervisor los mantiene vivos (si uno
              cae, lo reinicia sin tumbar a los demás) y un proxy publica un único puerto y reparte el tráfico.</p>
            <dl className="mt-2 grid gap-3 md:grid-cols-3">
              {SERVICES.map((service) => (
                <div key={service.name} className="rounded-lg border border-line p-3">
                  <dt className="font-medium text-ink">{service.name}</dt>
                  <dd className="mt-1 text-ink-2">{service.detail}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="section-title text-base">Patrones de rendering</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line text-xs text-muted"><tr><th className="py-2 pr-3">Patrón</th><th className="pr-3">Dónde se genera</th><th className="pr-3">Páginas</th></tr></thead>
                <tbody>
                  {PATTERN_ORDER.map((pattern) => (
                    <tr key={pattern} className="border-b border-line align-top">
                      <td className="py-2 pr-3 font-mono font-bold" style={{ color: `var(--pat-${pattern.toLowerCase()})` }}>{pattern}</td>
                      <td className="py-2 pr-3 text-ink-2">{PATTERNS[pattern].where}</td>
                      <td className="py-2 pr-3 text-ink-2">{PATTERNS[pattern].pages.map((page) => page.name).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="section-title text-base">Motor gRPC: los cuatro tipos de RPC</h3>
            <p className="mt-1 text-ink-2">El navegador no habla gRPC (no expone HTTP/2 con trailers). Por eso el motor solo escucha dentro del
              contenedor y los otros dos servicios son sus clientes: traducen cada tipo de RPC al mecanismo web equivalente.</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line text-xs text-muted"><tr><th className="py-2 pr-3">Tipo</th><th className="pr-3">RPC</th><th className="pr-3">Puente web</th><th>Para qué</th></tr></thead>
                <tbody>
                  {RPCS.map((rpc) => (
                    <tr key={rpc.method} className="border-b border-line align-top">
                      <td className="py-2 pr-3 font-medium">{rpc.kind}</td><td className="py-2 pr-3 font-mono text-xs">{rpc.method}</td>
                      <td className="py-2 pr-3 text-ink-2">{rpc.bridge}</td><td className="py-2 text-ink-2">{rpc.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="section-title text-base">Tiempo real</h3>
            <p className="mt-1 text-ink-2">Cada pestaña abre un único WebSocket que comparten el banner de alertas, el mapa y el simulador. El
              servicio mantiene una sola suscripción al motor y la reparte a todos los navegadores; si la conexión se cae, el cliente
              reconecta con espera creciente y, mientras tanto, consulta las alertas cada 5 minutos.</p>
          </div>

          <div>
            <h3 className="section-title text-base">Web Workers</h3>
            <p className="mt-1 text-ink-2">Dos tareas pesadas corren en hilos aparte del navegador para que la interfaz no se congele:
              leer y validar CSV de miles de filas antes de subirlos (panel de administración y de farmacia) y armar la matriz de
              sensibilidad del simulador, que envía decenas de escenarios por su propio WebSocket y agrega los resultados.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
