"use client";

import { CircleAlert, CircleCheck, LoaderCircle, OctagonAlert, TriangleAlert, X } from "lucide-react";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import type { RiskLevel } from "@/api/types";
import { LEVELS } from "@/lib/format";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action, icon }: {
  title: string; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4 pb-2">
      <div className="flex items-start gap-2.5">
        {icon && <span className="mt-0.5 text-muted">{icon}</span>}
        <div>
          <h2 className="section-title text-[17px] text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </header>
  );
}

const LEVEL_ICONS: Record<RiskLevel, typeof CircleCheck> = {
  GREEN: CircleCheck, YELLOW: CircleAlert, ORANGE: TriangleAlert, RED: OctagonAlert,
};

/** Level indicator: ALWAYS icon + text, never color alone (accessibility). */
export function LevelChip({ level, text, large = false }: { level: RiskLevel; text?: string; large?: boolean }) {
  const info = LEVELS[level] ?? LEVELS.GREEN;
  const Icon = LEVEL_ICONS[level] ?? CircleCheck;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${large ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}
      style={{ color: info.ink, background: `color-mix(in srgb, ${info.color} 16%, transparent)` }}
    >
      <Icon size={large ? 16 : 13} strokeWidth={2.4} style={{ color: info.color }} aria-hidden />
      {text ?? info.label}
    </span>
  );
}

export function Spinner({ text = "Cargando…" }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted" role="status">
      <LoaderCircle className="animate-spin" size={18} aria-hidden /> {text}
    </div>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "error" | "ok"; children: ReactNode }) {
  const styles = {
    info: "border-line bg-surface-2 text-ink-2",
    error: "border-[color-mix(in_srgb,var(--st-red)_40%,transparent)] bg-[color-mix(in_srgb,var(--st-red)_8%,transparent)] text-[var(--st-red-ink)]",
    ok: "border-[color-mix(in_srgb,var(--st-green)_40%,transparent)] bg-[color-mix(in_srgb,var(--st-green)_8%,transparent)] text-[var(--st-green-ink)]",
  }[kind];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`} role={kind === "error" ? "alert" : "status"}>{children}</div>;
}

type Variant = "primary" | "secondary" | "danger" | "ghost";
export function Button({ variant = "primary", loading, children, className = "", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-[background-color,color,opacity,transform] duration-[520ms] ease-[var(--ease-surface)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
  const variantClass = {
    primary: "bg-ink text-page hover:opacity-90",
    secondary: "border border-line bg-surface text-ink hover:bg-surface-2",
    danger: "bg-[var(--st-red)] text-white hover:opacity-90",
    ghost: "text-ink-2 hover:bg-surface-2",
  }[variant];
  return (
    <button className={`${base} ${variantClass} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <LoaderCircle size={15} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Modal({ open, title, onClose, children, width = "max-w-lg" }: {
  open: boolean; title: string; onClose: () => void; children: ReactNode; width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fade fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`enter w-full ${width} rounded-lg border border-line bg-surface shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="section-title text-lg">{title}</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface-2" aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

export function SimulatedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2 py-0.5 text-[11px] font-medium text-muted"
      title="Datos de prueba generados por el seed. Se reemplazan al sincronizar SIVIGILA o cargar un CSV con datos oficiales.">
      Datos simulados
    </span>
  );
}

/** Mutually exclusive buttons (like small tabs): time range, filters, map mode. */
export function Segmented<T extends string | number | boolean | undefined>({ options, value, onChange, label }: {
  options: readonly { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="flex rounded-lg border border-line p-0.5 text-xs" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`rounded-md px-2.5 py-1 font-medium ${value === o.value ? "bg-surface-2 text-ink" : "text-muted hover:text-ink"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Classes of the header row of the admin tables. */
export const tableHeaderClass = "border-b border-line bg-surface-2 text-left text-xs text-muted";
