"use client";

/**
 * API status shared by the whole app (minimal observable + useSyncExternalStore).
 *
 * The backend runs on Render's free plan: after 15 minutes without traffic it sleeps and the first
 * request takes about a minute to wake it up. A single poll of /health (not one per component)
 * detects the start-up, the UI shows it and, when the API answers, the `server-ready` event tells the
 * views that failed to fetch their data again by themselves.
 */
import { useSyncExternalStore } from "react";
import { API_BASE } from "@/api/client";

export type Phase = "checking" | "waking" | "ready" | "down";
export interface ServerStatus { phase: Phase; since: number; attempts: number }

export const SERVER_READY_EVENT = "server-ready";
const WAKING_NOTICE_AFTER_MS = 2_500; // when /health does not answer within this time, say it is waking up
const TIMEOUT_MS = 8_000;             // each /health attempt
const PAUSE_MS = 4_000;               // between attempts
const GIVE_UP_MS = 180_000;           // after 3 minutes it is considered down (with a retry button)

let status: ServerStatus = { phase: "checking", since: Date.now(), attempts: 0 };
const listeners = new Set<() => void>();
let polling = false;

function publish(patch: Partial<ServerStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

async function healthy(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/health`, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
    return r.ok; // Render's "Application loading" page answers 503 (and without CORS)
  } catch {
    return false;
  }
}

/** Poll /health until it answers. Idempotent: several calls share the same poll. */
export async function watchServer(): Promise<void> {
  if (polling || status.phase === "ready") return;
  polling = true;
  const start = Date.now();
  publish({ phase: "checking", since: start, attempts: 0 });
  const notice = setTimeout(() => { if (status.phase === "checking") publish({ phase: "waking" }); },
    WAKING_NOTICE_AFTER_MS);
  try {
    for (let attempt = 1; Date.now() - start < GIVE_UP_MS; attempt++) {
      publish({ attempts: attempt });
      if (await healthy()) {
        const wasAsleep = status.phase === "waking";
        publish({ phase: "ready" });
        if (wasAsleep) window.dispatchEvent(new Event(SERVER_READY_EVENT));
        return;
      }
      if (status.phase === "checking") publish({ phase: "waking" });
      await new Promise((r) => setTimeout(r, PAUSE_MS));
    }
    publish({ phase: "down" });
  } finally {
    clearTimeout(notice);
    polling = false;
  }
}

/** A request failed without a response (network or timeout): the API may have gone to sleep. */
export function reportNetworkFailure() {
  if (status.phase === "ready") status = { ...status, phase: "checking" };
  void watchServer();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const INITIAL: ServerStatus = { phase: "checking", since: 0, attempts: 0 };

export function useServerStatus(): ServerStatus {
  return useSyncExternalStore(subscribe, () => status, () => INITIAL);
}
