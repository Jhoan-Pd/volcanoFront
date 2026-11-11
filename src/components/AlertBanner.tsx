"use client";

import { ChevronDown, Radio, X } from "lucide-react";
import { useState } from "react";
import { LEVELS, ORIGINS } from "@/lib/format";
import { useLiveAlerts } from "@/lib/useLiveAlerts";
import { LevelChip } from "./ui";

const STORAGE_KEY = "dismissed-alerts";

function readDismissed(): string {
  try { return sessionStorage.getItem(STORAGE_KEY) ?? ""; } catch { return ""; }
}

/**
 * Early-alert banner: shown on every page while there is high or very high risk (observed or
 * predicted). It updates live through the realtime hub (WebSocket). It can be dismissed for the
 * session; when the alerts change it comes back.
 */
export default function AlertBanner() {
  const { alerts, mode } = useLiveAlerts();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);

  const signature = [...alerts].sort((a, b) => a.id - b.id).map((a) => `${a.id}:${a.level}`).join(",");
  if (!alerts.length || (dismissed ?? readDismissed()) === signature) return null;

  const hasRed = alerts.some((a) => a.level === "RED");
  const level = hasRed ? "RED" : "ORANGE";
  const municipalities = [...new Set(alerts.map((a) => a.municipality))];
  const plural = alerts.length > 1 ? "s" : "";

  function dismiss() {
    try { sessionStorage.setItem(STORAGE_KEY, signature); } catch { /* no storage: it is only hidden for now */ }
    setDismissed(signature);
  }

  return (
    <div role="alert" className="enter-top border-b"
      style={{ borderColor: `color-mix(in srgb, ${LEVELS[level].color} 35%, transparent)`,
               background: `color-mix(in srgb, ${LEVELS[level].color} 9%, var(--page))` }}>
      <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex">
            <LevelChip level={level} text={hasRed ? "Alerta: riesgo muy alto" : "Alerta: riesgo alto"} />
          </span>
          <span className="sm:hidden"><LevelChip level={level} text={hasRed ? "Muy alto" : "Alto"} /></span>
          <p className="min-w-0 flex-1 truncate text-sm text-ink">
            {mode === "live" && (
              <Radio size={13} className="mr-1.5 inline text-muted" aria-label="Actualización en vivo" />
            )}
            <b className="font-semibold">{alerts.length} alerta{plural} temprana{plural}</b>
            <span className="text-ink-2"> en {municipalities.join(", ")}</span>
          </p>
          <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-ink-2 hover:bg-surface-2">
            <span className="hidden sm:inline">{open ? "Ocultar detalle" : "Ver detalle"}</span>
            <span className="sm:hidden">{open ? "Ocultar" : "Ver"}</span>
            <ChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
          </button>
          <button onClick={dismiss} className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-2" aria-label="Ocultar alertas">
            <X size={16} />
          </button>
        </div>
        {open && (
          <ul className="mt-2 space-y-1.5 pb-1">
            {alerts.map((a, i) => (
              <li key={a.id} style={{ animationDelay: `${i * 60}ms` }} className="enter flex flex-col gap-1 rounded-lg bg-surface/70 px-3 py-2 text-[13px] sm:flex-row sm:items-center sm:gap-3">
                <span className="flex shrink-0 items-center gap-2">
                  <LevelChip level={a.level} />
                  <span className="rounded-full border border-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    {ORIGINS[a.origin]}
                  </span>
                </span>
                <span className="text-ink-2">{a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
