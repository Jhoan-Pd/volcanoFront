// ============================================================================
// LIVE MAP — CSR (Client-Side Rendering)
// ----------------------------------------------------------------------------
// The server only delivers the shell. <LiveMap /> runs in the browser: it loads the map library
// with next/dynamic (ssr: false), fetches the risk and listens to the alerts over the realtime
// hub's WebSocket, which relays the engine's gRPC WatchAlerts stream.
// ============================================================================
import type { Metadata } from "next";
import LiveMap from "@/views/LiveMap";

export const metadata: Metadata = { title: "Mapa de riesgo en vivo" };

export default function MapPage() {
  return (
    <LiveMap header={
      <header>
        <p className="section-title text-[13px] text-muted">Zona de influencia del Volcán Galeras</p>
        <h1 className="display-title mt-2 text-5xl sm:text-6xl">Mapa en vivo</h1>
        <p className="mt-2 max-w-2xl text-ink-2">Todo lo que ves abajo lo dibuja tu navegador. Las alertas llegan solas, sin recargar.</p>
      </header>
    } />
  );
}
