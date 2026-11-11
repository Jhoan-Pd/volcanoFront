"use client";

import { CircleCheck, CloudOff, LoaderCircle, RotateCw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { reportNetworkFailure, useServerStatus, watchServer } from "@/lib/serverStatus";

const TYPICAL_DURATION_S = 60;
const STEPS = [
  { until: 15, text: "Render recibe la petición y asigna la instancia" },
  { until: 35, text: "Arrancan la base de datos, las migraciones y el motor gRPC" },
  { until: 60, text: "La API carga los modelos y queda lista" },
  { until: Infinity, text: "Casi listo: algunos arranques tardan un poco más" },
];

/**
 * Global notice while the backend (Render, free plan) wakes up. It shows how long it has been, which
 * start-up step is running and, when the API answers, confirms and disappears. The views that failed
 * because of the start-up reload by themselves on the `server-ready` event.
 */
export default function ServerStatusNotice() {
  const { phase, since } = useServerStatus();
  const [now, setNow] = useState(() => Date.now());
  const [showReady, setShowReady] = useState(false);

  useEffect(() => { void watchServer(); }, []);

  useEffect(() => {
    if (phase !== "waking") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  // After waking up, «Servidor listo» stays on screen for a few seconds
  const [wasAsleep, setWasAsleep] = useState(false);
  useEffect(() => {
    if (phase === "waking") setWasAsleep(true);
    if (phase === "ready" && wasAsleep) {
      setShowReady(true);
      const id = setTimeout(() => { setShowReady(false); setWasAsleep(false); }, 3_500);
      return () => clearTimeout(id);
    }
  }, [phase, wasAsleep]);

  if (phase === "ready" && showReady) {
    return (
      <Container tone="ok">
        <CircleCheck size={18} className="shrink-0" aria-hidden />
        <p className="text-sm font-medium">Servidor listo · los datos se están actualizando</p>
      </Container>
    );
  }

  if (phase === "down") {
    return (
      <Container tone="error">
        <CloudOff size={18} className="shrink-0" aria-hidden />
        <p className="flex-1 text-sm">
          <span className="font-medium">El servidor no respondió en 3 minutos.</span>{" "}
          Las páginas guardadas siguen disponibles; los datos en vivo volverán cuando la API responda.
        </p>
        <button type="button" onClick={reportNetworkFailure}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-current/30 px-3 py-1.5 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10">
          <RotateCw size={14} aria-hidden /> Reintentar
        </button>
      </Container>
    );
  }

  if (phase !== "waking") return null;

  const seconds = Math.max(0, Math.round((now - since) / 1000));
  // Estimated progress: fast at first and asymptotic at the end (it never reaches 100 % too early)
  const progress = Math.min(96, 100 * (1 - Math.exp(-seconds / (TYPICAL_DURATION_S / 2.2))));
  const step = STEPS.find((s) => seconds < s.until) ?? STEPS[STEPS.length - 1];

  return (
    <Container tone="info">
      <LoaderCircle size={18} className="shrink-0 animate-spin" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <p className="text-sm font-medium text-ink">
            Despertando el servidor <span className="tabular-nums text-muted">· {seconds} s</span>
          </p>
          <p className="text-xs text-muted">El plan gratuito de Render se duerme tras 15 min sin uso; tarda ~1 minuto.</p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0}
          aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Arranque del servidor">
          <div className="h-full rounded-full bg-ink transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-ink-2">{step.text}</p>
      </div>
    </Container>
  );
}

function Container({ tone, children }: { tone: "info" | "ok" | "error"; children: ReactNode }) {
  const styles = {
    info: "bg-surface text-ink",
    ok: "bg-[color-mix(in_srgb,var(--st-green)_10%,var(--surface))] text-[var(--st-green-ink)]",
    error: "bg-[color-mix(in_srgb,var(--st-red)_8%,var(--surface))] text-[var(--st-red-ink)]",
  }[tone];
  return (
    <div className={`enter-top border-b border-line ${styles}`} role="status" aria-live="polite">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">{children}</div>
    </div>
  );
}
