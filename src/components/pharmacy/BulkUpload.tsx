"use client";

import { Send, UploadCloud } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { engineApi } from "@/api/services";
import type { PharmacyUploadRow, PharmacyUploadSummary } from "@/api/types";
import { formatNumber } from "@/lib/format";
import CsvReview from "../CsvReview";
import { Button, Card, CardHeader, Notice } from "../ui";

/**
 * Bulk upload of a pharmacy's history.
 * 1. Web Worker: the CSV is read and validated in another thread (categories, weeks, units).
 * 2. gRPC client streaming: the gateway forwards the valid rows to the engine as a stream; the
 *    engine validates each one on arrival, groups them by week and answers ONE summary at the end.
 * A PHARMACY user can only upload the last 8 weeks of its own pharmacy (the engine enforces it).
 */
export default function BulkUpload({ pharmacyId, onDone }: { pharmacyId?: number; onDone: () => void }) {
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<PharmacyUploadSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(rows: PharmacyUploadRow[]) {
    setSending(true); setSummary(null); setError(null);
    try {
      setSummary(await engineApi.uploadPharmacyReports(rows));
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Carga masiva desde CSV" icon={<UploadCloud size={17} />}
        subtitle="El archivo se revisa en tu navegador (Web Worker) y las filas válidas viajan al motor de predicción como un stream de gRPC." />
      <div className="space-y-3 px-5 pb-5">
        <CsvReview kind="pharmacy" action={(result) => {
          const rows: PharmacyUploadRow[] = result.normalized.map((n) => ({
            row: n.row, year: Number(n.year), epi_week: Number(n.epi_week), category: String(n.category),
            units: Number(n.units), pharmacy_id: n.pharmacy_id == null ? pharmacyId ?? null : Number(n.pharmacy_id),
          }));
          return (
            <div className="border-t border-line pt-3">
              <Button onClick={() => send(rows)} loading={sending} disabled={rows.length === 0}>
                <Send size={15} /> Enviar {formatNumber(rows.length)} filas por streaming
              </Button>
            </div>
          );
        }} />
        {error && <Notice kind="error">{error}</Notice>}
        {summary && (
          <Notice kind={summary.weeks_rejected || summary.rows_rejected ? "info" : "ok"}>
            <p>
              El motor recibió {formatNumber(summary.rows_received)} filas en {formatNumber(summary.duration_ms, 0)} ms:{" "}
              {formatNumber(summary.weeks_created)} semanas nuevas, {formatNumber(summary.weeks_updated)} reemplazadas y{" "}
              {formatNumber(summary.weeks_rejected)} rechazadas{summary.rows_rejected ? ` (${formatNumber(summary.rows_rejected)} filas inválidas)` : ""}.
            </p>
            {summary.errors.length > 0 && (
              <ul className="mt-2 max-h-40 list-disc space-y-0.5 overflow-y-auto pl-5 text-xs">
                {summary.errors.map((e, i) => <li key={`${e.row}-${i}`}>Fila {e.row}: {e.message}</li>)}
              </ul>
            )}
          </Notice>
        )}
      </div>
    </Card>
  );
}
