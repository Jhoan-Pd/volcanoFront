"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { THEME_KEY } from "@/lib/theme";

type Theme = "light" | "dark";
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

/**
 * The <head> script (layout.tsx) sets the `dark` class before painting. The server does not know
 * which theme the user chose, so the state starts empty and is read from <html> on mount: that way
 * the server's HTML and the client's first render match (no hydration error).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* no storage: the theme only lasts for the session */
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme: theme ?? "light", toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
