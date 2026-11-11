"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import type { HubMessage } from "@/api/types";
import { useRealtimeMessage } from "@/lib/realtime";

/** Events arriving within this window are answered with a single refresh. */
const COALESCE_MS = 2_000;
/** Random extra delay so every open tab does not hit the server in the same instant. */
const JITTER_MS = 3_000;

/**
 * Refreshes the server-rendered data of the current page when the backend announces new data over
 * the realtime hub (`system` events: data updated, model trained, alerts evaluated). By then the
 * backend has already revalidated the ISR pages, so `router.refresh()` brings the new version
 * without a full reload and without losing client state. A daily update emits several events in a
 * row: they are coalesced into one refresh, delayed by a random jitter.
 */
export default function LiveRefresh() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useRealtimeMessage("system", useCallback((_: Extract<HubMessage, { type: "system" }>) => {
    if (timer.current) return; // a refresh is already scheduled
    timer.current = setTimeout(() => {
      timer.current = undefined;
      router.refresh();
    }, COALESCE_MS + Math.random() * JITTER_MS);
  }, [router]));

  useEffect(() => () => clearTimeout(timer.current), []);

  return null;
}
