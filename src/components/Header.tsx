"use client";

import {
  BookOpen, FileText, FlaskConical, Home, Layers, LogIn, LogOut, Map as MapIcon, Moon, Pill, Settings, Siren, Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ROLES } from "@/lib/format";

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--ink)" />
      <path d="M4 25 L13 11 L16 14 L19 10 L28 25 Z" fill="#D4873A" />
      <path d="M13 11 L16 14 L19 10 L17.5 8 L14.5 8 Z" fill="#f2c08a" />
      <circle cx="21" cy="6" r="1.6" fill="#a8a29e" />
      <circle cx="24" cy="4" r="1.1" fill="#a8a29e" />
    </svg>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: ReactNode; children: string }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" || path.startsWith("/municipio") : path.startsWith(href);
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-[520ms] ease-[var(--ease-surface)] ${
        active ? "bg-surface-2 text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink"}`}>
      {icon}
      <span className="roll inline-block"><span data-text={children}>{children}</span></span>
    </Link>
  );
}

/** Main navigation. A client component because it depends on the session and the current route. */
export default function Header() {
  const { user, logout, hasRole } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur print:static">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Logo />
          <div className="leading-tight">
            <p className="section-title text-[15px]">Predictor de Brotes</p>
            <p className="text-[11px] text-muted">Pasto · Zona Volcán Galeras</p>
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={toggle} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2"
            aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            title={theme === "dark" ? "Modo claro" : "Modo oscuro"}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {user ? (
            <div className="ml-1 flex items-center gap-2 border-l border-line pl-3">
              <div className="hidden text-right leading-tight md:block">
                <p className="text-xs font-medium">{user.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-muted">{ROLES[user.role]}</p>
              </div>
              <button onClick={() => { logout(); router.push("/"); }}
                className="rounded-lg p-2 text-ink-2 hover:bg-surface-2" aria-label="Cerrar sesión" title="Cerrar sesión">
                <LogOut size={17} />
              </button>
            </div>
          ) : (
            <NavLink href="/login" icon={<LogIn size={16} />}>Ingresar</NavLink>
          )}
        </div>
      </div>
      <nav aria-label="Principal" className="mx-auto max-w-7xl overflow-x-auto px-2 pb-2 sm:px-4 print:hidden">
        <div className="flex w-max items-center gap-1">
          <NavLink href="/" icon={<Home size={16} />}>Inicio</NavLink>
          <NavLink href="/mapa" icon={<MapIcon size={16} />}>Mapa en vivo</NavLink>
          <NavLink href="/alertas" icon={<Siren size={16} />}>Alertas</NavLink>
          <NavLink href="/simulador" icon={<FlaskConical size={16} />}>Simulador</NavLink>
          <NavLink href="/reportes" icon={<FileText size={16} />}>Reportes</NavLink>
          <NavLink href="/enfermedades" icon={<BookOpen size={16} />}>Enfermedades</NavLink>
          <NavLink href="/patrones" icon={<Layers size={16} />}>Patrones</NavLink>
          {hasRole("PHARMACY", "ADMIN") && <NavLink href="/farmacia" icon={<Pill size={16} />}>Farmacia</NavLink>}
          {hasRole("ADMIN") && <NavLink href="/admin" icon={<Settings size={16} />}>Administración</NavLink>}
        </div>
      </nav>
    </header>
  );
}
