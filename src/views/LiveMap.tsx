"use client";

import { Radio, Users, WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { catalogApi, dashboardApi } from "@/api/services";
import type { AlertEvent } from "@/api/types";
import DynamicMap from "@/components/dashboard/DynamicMap";
import type { MapMode } from "@/components/dashboard/mapTypes";
import { MunicipalityRiskTable } from "@/components/dashboard/Panels";
import { RenderPanel } from "@/components/render/RenderPanel";
import { Card, CardHeader, LevelChip, Notice, Segmented, Spinner } from "@/components/ui";
import { useData } from "@/lib/useData";
import { useLiveAlerts, type ConnectionMode } from "@/lib/useLiveAlerts";

const MODES = [
  { value: "current", label: "Semana actual" },
  { value: "predicted", label: "Próximas 4 semanas" },
] as const satisfies readonly { value: MapMode; label: string }[];

const CONNECTION_LABELS: Record<ConnectionMode, string> = {
  connecting: "Conectando con el servicio de tiempo real…",
  live: "En vivo · WebSocket ← gRPC WatchAlerts",
  reconnecting: "Reconectando…",
  polling: "Sin tiempo real: consulta cada 5 min",
};

const CHANGE_LABELS: Record<AlertEvent["kind"], string> = { CREATED: "Nueva", UPDATED: "Actualizada", CLOSED: "Cerrada" };

const clockTime = (iso: string) => new Date(iso).toLocaleTimeString("es-CO");

/**
 * Risk map rendered 100 % in the browser (CSR): map libraries, data by fetch and alerts over the
 * realtime hub's WebSocket. When the hub reports a change in the alerts, the risk per municipality
 * is fetched again.
 */
export default function LiveMap({ header }: { header?: ReactNode }) {
  const router = useRouter();
  const [mode, setMode] = useState<MapMode>("current");
  const [diseaseCode, setDiseaseCode] = useState("");
  const { alerts, mode: connection, changes, updatedAt, online } = useLiveAlerts();
  const risk = useData(() => dashboardApi.municipalityRisk(), []);
  const diseases = useData(() => catalogApi.diseases(), []);
  const [receivedAt, setReceivedAt] = useState<string | null>(null);

  useEffect(() => { if (risk.data) setReceivedAt(new Date().toISOString()); }, [risk.data]);
  const lastChange = changes[0]?.at;
  const { reload } = risk;
  useEffect(() => { if (lastChange) reload(); }, [lastChange, reload]);

  const diseaseList = (diseases.data ?? []).filter((d) => d.active).map((d) => ({ code: d.code, name: d.name }));
  const openDashboard = (municipalityId: number) => router.push(`/municipio/${municipalityId}`);

  return (
    <div className="space-y-5">
      <RenderPanel pattern="CSR" generatedAt={receivedAt}
        details={[
          { label: "Alertas", value: CONNECTION_LABELS[connection] },
          { label: "Último evento recibido", value: updatedAt ? clockTime(updatedAt) : "—" },
          { label: "Personas conectadas ahora", value: online == null ? "—" : String(online) },
        ]} />
      {header}

      {risk.error && <Notice kind="error">{risk.error}</Notice>}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title="Mapa de riesgo" subtitle="Haz clic en un municipio para abrir su tablero."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <select className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs text-ink focus:border-accent focus:outline-none"
                  value={diseaseCode} onChange={(e) => setDiseaseCode(e.target.value)} aria-label="Enfermedad del mapa">
                  <option value="">Todas (la de mayor riesgo)</option>
                  {diseaseList.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
                </select>
                <Segmented label="Periodo del mapa" options={MODES} value={mode} onChange={setMode} />
              </div>
            } />
          <div className="px-5 pb-5">
            {!risk.data ? <Spinner text="Pidiendo el riesgo por municipio…" /> : (
              <DynamicMap rows={risk.data} mode={mode} diseaseCode={diseaseCode} selectedId={null} diseases={diseaseList}
                onSelect={openDashboard} />
            )}
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title={`Alertas activas (${alerts.length})`}
              action={
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted" role="status">
                  {connection === "live"
                    ? <><Radio size={13} className="animate-pulse text-[var(--st-green)]" aria-hidden /> en vivo</>
                    : <><WifiOff size={13} aria-hidden /> {connection === "connecting" ? "conectando" : "sin tiempo real"}</>}
                  {online != null && <span className="ml-1 inline-flex items-center gap-1" title="Personas conectadas ahora"><Users size={12} aria-hidden />{online}</span>}
                </span>
              } />
            <ul className="max-h-80 space-y-2 overflow-y-auto px-5 pb-5">
              {alerts.length === 0 && <li className="text-sm text-muted">Sin alertas activas.</li>}
              {alerts.map((alert) => (
                <li key={alert.id} className="rounded-lg border border-line p-2.5 text-xs">
                  <div className="flex items-center gap-2"><LevelChip level={alert.level} /><b className="font-medium">{alert.municipality}</b>
                    <span className="text-muted">{alert.disease}</span></div>
                  <p className="mt-1 text-ink-2">{alert.message}</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Cambios recibidos" subtitle="Eventos que el servidor empujó desde que abriste la página" />
            <ul className="space-y-1.5 px-5 pb-5 text-xs">
              {changes.length === 0 && (
                <li className="text-muted">
                  Todavía ninguno. Cuando la actualización diaria o un reentrenamiento cambien una alerta aparecerá aquí sin recargar.
                </li>
              )}
              {changes.map((change, i) => (
                <li key={`${change.at}-${i}`} className="enter flex items-center gap-2">
                  <span className="tabular text-muted">{clockTime(change.at)}</span>
                  <b className="font-medium">{CHANGE_LABELS[change.kind]}</b> {change.alert.municipality} · {change.alert.disease}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {risk.data && (
        <Card className="min-w-0">
          <CardHeader title="Riesgo por municipio" />
          <MunicipalityRiskTable rows={risk.data} diseases={diseaseList} selectedId={null}
            predicted={mode === "predicted"} onSelect={openDashboard} />
        </Card>
      )}
    </div>
  );
}
