/**
 * Theme storage key, shared by the inline script in app/layout.tsx (a server component) and the
 * client-side ThemeProvider. It lives in a plain module: a constant exported from a "use client"
 * file reaches server components as a client reference, not as its value.
 */
export const THEME_KEY = "theme";
