/** Helpers for SSR pages: read URL parameters and per-request data. */
import { headers } from "next/headers";

export type SearchParams = Record<string, string | string[] | undefined>;

export const text = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
export const integer = (v: string | string[] | undefined) => {
  const n = Number.parseInt(text(v), 10);
  return Number.isFinite(n) ? n : undefined;
};

function browserName(ua: string) {
  if (/edg\//i.test(ua)) return "Edge";
  if (/chrome\//i.test(ua)) return "Chrome";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua)) return "Safari";
  return ua ? "Otro" : "Desconocido";
}

/** Data that only exists at request time: proof that the page is server-rendered (SSR). */
export async function requestInfo() {
  const h = await headers();
  return {
    browser: browserName(h.get("user-agent") ?? ""),
    language: (h.get("accept-language") ?? "").split(",")[0] || "—",
    region: h.get("x-vercel-ip-country-region") ?? h.get("x-vercel-ip-country") ?? "local",
  };
}
