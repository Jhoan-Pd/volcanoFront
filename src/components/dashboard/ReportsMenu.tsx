"use client";

import { Download, FileSpreadsheet, FileText, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { errorMessage } from "@/api/client";
import { reportApi } from "@/api/services";

/** "Descargar" button with the municipality's PDF and the data CSVs. */
export default function ReportsMenu({ municipalityId, municipality, diseaseId }: {
  municipalityId: number; municipality: string; diseaseId: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onOutsideClick = (e: MouseEvent) => { if (!container.current?.contains(e.target as Node)) setOpen(false); };
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  async function download(id: string, run: () => Promise<void>) {
    setDownloading(id); setError(null);
    try {
      await run();
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setDownloading(null);
    }
  }

  const options = [
    { id: "pdf", icon: <FileText size={15} />, title: `Reporte PDF de ${municipality}`, detail: "Semáforo, predicción, alertas, volcán y modelos",
      run: () => reportApi.municipalityPdf(municipalityId) },
    { id: "cases", icon: <FileSpreadsheet size={15} />, title: "Casos semanales (CSV)", detail: `${municipality}, enfermedad seleccionada`,
      run: () => reportApi.casesCsv(municipalityId, diseaseId ?? undefined) },
    { id: "predictions", icon: <FileSpreadsheet size={15} />, title: "Predicciones (CSV)", detail: "Próximas 4 semanas, todos los municipios",
      run: () => reportApi.predictionsCsv() },
    { id: "alerts", icon: <FileSpreadsheet size={15} />, title: "Alertas (CSV)", detail: "Historial completo",
      run: () => reportApi.alertsCsv() },
  ];

  return (
    <div className="relative" ref={container}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu"
        className="inline-flex h-[38px] items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink hover:bg-surface-2">
        <Download size={15} /> Descargar
      </button>
      {open && (
        <div role="menu" className="enter absolute right-0 z-50 mt-1.5 w-72 rounded-lg border border-line bg-surface p-1.5 shadow-xl">
          {options.map((o) => (
            <button key={o.id} role="menuitem" onClick={() => download(o.id, o.run)} disabled={downloading != null}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-surface-2 disabled:opacity-60">
              <span className="mt-0.5 text-muted">{downloading === o.id ? <LoaderCircle size={15} className="animate-spin" /> : o.icon}</span>
              <span>
                <span className="block text-sm font-medium text-ink">{o.title}</span>
                <span className="block text-[11px] text-muted">{o.detail}</span>
              </span>
            </button>
          ))}
          {error && <p className="px-2.5 pb-1 pt-1 text-xs text-[var(--st-red-ink)]">{error}</p>}
        </div>
      )}
    </div>
  );
}
