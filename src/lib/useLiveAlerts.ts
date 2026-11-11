"use client";

import { useCallback, useEffect, useState } from "react";
import { alertApi } from "@/api/services";
import type { Alert, AlertEvent, AlertOrigin, HubMessage, LiveAlert, RiskLevel } from "@/api/types";
import { realtime, useRealtimeMessage, useRealtimeStatus } from "./realtime";
import { SERVER_READY_EVENT } from "./serverStatus";

/** An alert in the shape both sources share (REST and the realtime hub). */
export interface AlertView {
  id: number;
  municipality_id: number;
  municipality: string;
  disease: string;
  week: string;
  level: RiskLevel;
  origin: AlertOrigin;
  message: string;
}

export type ConnectionMode = "connecting" | "live" | "reconnecting" | "polling";

export interface AlertChange {
  kind: AlertEvent["kind"];
  at: string;
  alert: AlertView;
}

const fromRest = (a: Alert): AlertView => ({
  id: a.id, municipality_id: a.municipality_id, municipality: a.municipality, disease: a.disease, week: a.label,
  level: a.risk_level, origin: a.origin, message: a.message,
});
const fromHub = (a: LiveAlert): AlertView => ({ ...a, level: a.level ?? "ORANGE" });

const POLL_MS = 5 * 60_000;
/** After this many failed reconnections the hook also polls REST, in case WebSockets are blocked. */
const POLL_AFTER_ATTEMPTS = 3;

/**
 * Active alerts that update themselves.
 *
 * 1. REST first (/alerts/active): the screen fills immediately, even before the socket opens.
 * 2. Then it subscribes to the "alerts" channel of the realtime hub. The hub relays the engine's
 *    gRPC `WatchAlerts` stream: a snapshot arrives at once and every CREATED, UPDATED or CLOSED
 *    alert right after it happens.
 * 3. While the socket cannot connect (or the hub lost the engine) it falls back to polling REST
 *    every 5 minutes; the realtime client keeps reconnecting in the background.
 */
export function useLiveAlerts(municipalityId?: number) {
  const [alerts, setAlerts] = useState<Map<number, AlertView>>(new Map());
  const [changes, setChanges] = useState<AlertChange[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const status = useRealtimeStatus();
  const matches = useCallback((a: { municipality_id: number }) =>
    municipalityId === undefined || a.municipality_id === municipalityId, [municipalityId]);

  const poll = useCallback(() => alertApi.active()
    .then((xs) => {
      setAlerts(new Map(xs.map(fromRest).filter(matches).map((a) => [a.id, a])));
      setUpdatedAt(new Date().toISOString());
    })
    .catch(() => undefined), [matches]);

  // REST first, and again when the API wakes up after sleeping
  useEffect(() => {
    void poll();
    window.addEventListener(SERVER_READY_EVENT, poll);
    return () => window.removeEventListener(SERVER_READY_EVENT, poll);
  }, [poll]);

  // Live channel (re-sent by the realtime client after every reconnection)
  useEffect(() => realtime().subscribe(
    `alerts:${municipalityId ?? "all"}`,
    { type: "subscribe", channel: "alerts", municipality_id: municipalityId ?? null },
    { type: "unsubscribe", channel: "alerts" },
  ), [municipalityId]);

  useRealtimeMessage("alerts.snapshot", useCallback((m: Extract<HubMessage, { type: "alerts.snapshot" }>) => {
    setAlerts(new Map(m.alerts.filter(matches).map((a) => [a.id, fromHub(a)])));
    setUpdatedAt(new Date().toISOString());
  }, [matches]));

  useRealtimeMessage("alert", useCallback(({ event }: Extract<HubMessage, { type: "alert" }>) => {
    if (!matches(event.alert)) return;
    const alert = fromHub(event.alert);
    setUpdatedAt(event.at || new Date().toISOString());
    setAlerts((previous) => {
      const next = new Map(previous);
      if (event.kind === "CLOSED") next.delete(alert.id);
      else next.set(alert.id, alert);
      return next;
    });
    setChanges((cs) => [{ kind: event.kind, at: event.at, alert }, ...cs].slice(0, 20));
  }, [matches]));

  const live = status.state === "open" && status.upstream !== "reconnecting";
  const polling = !live && (status.attempts >= POLL_AFTER_ATTEMPTS || status.upstream === "reconnecting");
  useEffect(() => {
    if (!polling) return;
    const timer = window.setInterval(poll, POLL_MS);
    return () => window.clearInterval(timer);
  }, [polling, poll]);

  const mode: ConnectionMode = live ? "live" : polling ? "polling"
    : status.state === "closed" ? "reconnecting" : "connecting";
  return { alerts: [...alerts.values()], mode, changes, updatedAt, online: status.online };
}
