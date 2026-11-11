// ============================================================================
// «WHAT IF…?» SIMULATOR — CSR (Client-Side Rendering)
// ----------------------------------------------------------------------------
// A live conversation with the engine: the browser talks to the realtime hub over a WebSocket and
// the hub bridges it to the BIDIRECTIONAL gRPC stream SimulateScenarios. The sensitivity matrix is
// computed by a Web Worker over its own WebSocket. It also shows a unary call (Predict).
// ============================================================================
import type { Metadata } from "next";
import Simulator from "@/views/Simulator";

export const metadata: Metadata = { title: "Simulador de escenarios", description: "¿Qué pasa si llueve más o suben las búsquedas? El modelo responde en vivo." };

export default function SimulatorPage() {
  return <Simulator />;
}
