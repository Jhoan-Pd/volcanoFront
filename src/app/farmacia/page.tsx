// PHARMACY — CSR: private panel of the PHARMACY role (token in the browser). The bulk upload of
// reports checks the CSV in a Web Worker and sends it to the engine over gRPC client streaming.
import type { Metadata } from "next";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CsrPanel } from "@/components/render/CsrPanel";
import PharmacyView from "@/views/PharmacyPage";

export const metadata: Metadata = { title: "Panel de farmacia", robots: { index: false } };

export default function PharmacyPage() {
  return (
    <div className="space-y-5">
      <CsrPanel why="Cada farmacia ve solo sus reportes: los datos dependen del usuario que inició sesión y se piden desde el navegador." />
      <ProtectedRoute roles={["PHARMACY", "ADMIN"]}><PharmacyView /></ProtectedRoute>
    </div>
  );
}
