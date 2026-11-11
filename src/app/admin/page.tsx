// ============================================================================
// ADMINISTRATION — CSR (Client-Side Rendering)
// ----------------------------------------------------------------------------
// The server only delivers the shell: the administrator's token lives in localStorage, so the data
// can only be requested from the browser. Here the model is trained over the gRPC stream (SSE) and
// CSV files are checked by a Web Worker before they are uploaded.
// ============================================================================
import type { Metadata } from "next";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CsrPanel } from "@/components/render/CsrPanel";
import AdminView from "@/views/AdminPage";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

export default function AdminPage() {
  return (
    <div className="space-y-5">
      <CsrPanel why="Es un panel privado: depende del token del administrador (que el servidor no ve) y es muy interactivo. No necesita SEO." />
      <ProtectedRoute roles={["ADMIN"]}><AdminView /></ProtectedRoute>
    </div>
  );
}
