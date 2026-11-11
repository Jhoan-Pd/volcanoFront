"use client";

import { BellRing, ChevronLeft, ChevronRight, Download, MailCheck, RefreshCw } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/api/client";
import { alertApi, reportApi } from "@/api/services";
import type { Alert } from "@/api/types";
import { formatDate, ORIGINS } from "@/lib/format";
import { useData } from "@/lib/useData";
import { Button, LevelChip, Notice, Segmented, Spinner, tableHeaderClass } from "../ui";

const FILTERS = [
  { value: true, label: "Activas" },
  { value: false, label: "Cerradas" },
  { value: undefined, label: "Todas" },
] as const;
const PAGE_SIZE = 15;

export default function AlertsPanel() {
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [closingId, setClosingId] = useState<number | null>(null);

  const list = useData(() => alertApi.list(activeFilter, page * PAGE_SIZE, PAGE_SIZE), [activeFilter, page]);
  const { data, reload } = list;

  async function evaluate() {
    setEvaluating(true); setNotice(null); setError(null);
    try {
      const r = await alertApi.evaluate();
      setNotice(`${r.active} alerta(s) activa(s): ${r.new} nueva(s), ${r.updated} actualizada(s), ${r.closed} cerrada(s). ` +
        (r.emails_sent ? `Correo enviado con ${r.emails_sent} alerta(s).` : "Sin correos nuevos (o Resend no está configurado)."));
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setEvaluating(false);
    }
  }

  async function close(alert: Alert) {
    setClosingId(alert.id);
    try {
      await alertApi.close(alert.id);
      reload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setClosingId(null);
    }
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="section-title flex items-center gap-2 text-2xl"><BellRing size={18} className="text-muted" /> Alertas tempranas</h2>
          <p className="max-w-2xl text-xs text-muted">
            Se generan cuando el riesgo llega a <b>alto</b> o <b>muy alto</b>, por los casos observados o por la predicción de las
            próximas 4 semanas. Se evalúan tras cada reentrenamiento y en la actualización diaria. Una alerta cerrada a mano
            solo se reabre si el riesgo empeora.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented label="Filtrar alertas" options={FILTERS} value={activeFilter}
            onChange={(v) => { setActiveFilter(v); setPage(0); }} />
          <Button variant="secondary" onClick={() => reportApi.alertsCsv().catch((e) => setError(errorMessage(e)))}>
            <Download size={15} /> CSV
          </Button>
          <Button onClick={evaluate} loading={evaluating}><RefreshCw size={15} /> Evaluar ahora</Button>
        </div>
      </div>

      {notice && <Notice kind="ok">{notice}</Notice>}
      {(error ?? list.error) && <Notice kind="error">{error ?? list.error}</Notice>}

      {!data ? <Spinner /> : data.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">
          No hay alertas {activeFilter === true ? "activas" : activeFilter === false ? "cerradas" : ""}.
        </p>
      ) : (
        <div className="relative overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className={tableHeaderClass}>
                <th className="px-3 py-2 font-medium">Nivel</th>
                <th className="px-3 py-2 font-medium">Origen</th>
                <th className="px-3 py-2 font-medium">Semana</th>
                <th className="px-3 py-2 font-medium">Detalle</th>
                <th className="px-3 py-2 font-medium">Creada</th>
                <th className="px-3 py-2 font-medium"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((alert) => (
                <tr key={alert.id} className="border-b border-line/70 align-top last:border-0">
                  <td className="px-3 py-2.5"><LevelChip level={alert.risk_level} /></td>
                  <td className="px-3 py-2.5 text-xs font-medium uppercase tracking-wide text-ink-2">{ORIGINS[alert.origin]}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 tabular">{alert.label.replace("-S", " · S")}</td>
                  <td className="px-3 py-2.5">
                    <p className="font-medium">{alert.disease} · {alert.municipality}</p>
                    <p className="text-xs text-ink-2">{alert.message}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-ink-2">
                    {formatDate(alert.created_at)}
                    {alert.email_notified && <span className="mt-0.5 flex items-center gap-1 text-muted"><MailCheck size={12} /> correo enviado</span>}
                    {alert.closed_at && <span className="mt-0.5 block text-muted">cerrada {formatDate(alert.closed_at)}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    {alert.active && (
                      <Button variant="secondary" className="px-2.5 py-1 text-xs" loading={closingId === alert.id} onClick={() => close(alert)}>
                        Cerrar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 text-xs text-ink-2">
          <span className="tabular">Página {page + 1} de {pages}</span>
          <button className="rounded-md p-1 hover:bg-surface-2 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Anterior"><ChevronLeft size={16} /></button>
          <button className="rounded-md p-1 hover:bg-surface-2 disabled:opacity-40" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Siguiente"><ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
