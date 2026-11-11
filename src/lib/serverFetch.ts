/**
 * API requests made by the Next.js SERVER (server components, build and ISR).
 *
 * Each page picks its caching strategy, and that choice is precisely the rendering pattern:
 *   - SSG  → `{ cache: "force-cache" }`        fetched once, at build time
 *   - ISR  → `{ revalidate: 3600, tags }`      cached and fetched again at most once an hour
 *   - SSR  → `{ cache: "no-store" }`           fetched on every visit
 * In CSR the browser makes the request (axios in api/services.ts), not this module.
 */
import { API_V1 } from "@/api/client";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

interface Options {
  /** ISR seconds. `false` = never fetch again (build-time content). */
  revalidate?: number | false;
  cache?: RequestCache;
  tags?: string[];
  /** Render's free plan takes up to ~50 s to wake up. */
  timeoutMs?: number;
}

type Params = Record<string, string | number | boolean | undefined | null>;

export async function fetchApi<T>(path: string, params: Params = {},
  { revalidate, cache, tags, timeoutMs = 55_000 }: Options = {}): Promise<T> {
  const url = new URL(`${API_V1}${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  const next = revalidate !== undefined || tags ? { revalidate, tags } : undefined;
  const r = await fetch(url, { cache, next, signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "application/json" } });
  if (!r.ok) {
    let message = `Error ${r.status} en ${path}`;
    try {
      const body = await r.json();
      message = body?.error?.message ?? message;
    } catch { /* empty body */ }
    throw new ApiError(r.status, message);
  }
  return r.json() as Promise<T>;
}

/** Same as `fetchApi`, but returns `null` instead of throwing (for optional data). */
export async function fetchOptional<T>(...args: Parameters<typeof fetchApi>): Promise<T | null> {
  try {
    return await fetchApi<T>(...args);
  } catch {
    return null;
  }
}

/** The exact moment the server generated the HTML (the pattern panel shows it). */
export const nowIso = () => new Date().toISOString();
