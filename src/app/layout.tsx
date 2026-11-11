/**
 * Root layout (a SERVER component). It renders once and wraps every page. The interactive parts
 * (header with the session, live alert banner) are client components hydrated inside this HTML.
 */
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
// Open fonts (OFL) served from the site itself, with no dependency on Google Fonts
import "@fontsource-variable/bricolage-grotesque/standard.css"; // titles (weight and width axes)
import "@fontsource-variable/hanken-grotesk"; // text
import "@fontsource-variable/geist"; // large figures
import "./globals.css";
import AlertBanner from "@/components/AlertBanner";
import Header from "@/components/Header";
import LiveRefresh from "@/components/LiveRefresh";
import ServerStatusNotice from "@/components/ServerStatusNotice";
import { THEME_KEY } from "@/lib/theme";
import Providers from "./providers";

export const metadata: Metadata = {
  title: { default: "Predictor de Brotes · Nariño", template: "%s · Predictor de Brotes" },
  description: "Predictor de brotes de enfermedades para Pasto y la zona del Volcán Galeras (Nariño) con datos públicos y búsquedas locales.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Applies the theme before the first paint to avoid a light/dark flash
const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Providers>
          <div className="flex min-h-screen flex-col">
            <Header />
            <ServerStatusNotice />
            <AlertBanner />
            <LiveRefresh />
            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
            <footer className="border-t border-line">
              <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:px-6 md:flex-row md:justify-between">
                <p>
                  Proyecto académico · Programación Orientada a la Web · Nariño, Colombia ·{" "}
                  <Link href="/metodologia" className="underline-grow text-ink-2">Metodología</Link> ·{" "}
                  <Link href="/patrones" className="underline-grow text-ink-2">Patrones de rendering</Link>
                </p>
                <p>Fuentes: Open-Meteo · Google Trends · Servicio Geológico Colombiano · INS/SIVIGILA (datos.gov.co) · farmacias participantes</p>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
