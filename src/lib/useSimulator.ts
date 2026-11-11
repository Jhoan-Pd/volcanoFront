"use client";

import { useCallback, useRef, useState } from "react";
import type { HubMessage, Scenario, ScenarioResult } from "@/api/types";
import { realtime, useRealtimeMessage, useRealtimeStatus } from "./realtime";

export type SocketState = "connecting" | "open" | "closed";

/**
 * Conversation with the simulator over the realtime hub's WebSocket. Behind the hub it is a
 * BIDIRECTIONAL gRPC stream (SimulateScenarios) kept open for the whole visit, so the engine computes
 * the baseline once and every change of a control only pays for the modified prediction. There is
 * no need to wait for an answer before sending the next scenario: each round trip is measured and
 * stale answers are ignored.
 *
 * Reconnection is handled by the shared realtime client; when the socket reopens the view sends the
 * current scenario again.
 */
export function useSimulator() {
  const sentAt = useRef(new Map<string, number>());
  const lastId = useRef<string | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [receivedAt, setReceivedAt] = useState<string | null>(null);
  const [roundTripMs, setRoundTripMs] = useState<number | null>(null);
  const [counts, setCounts] = useState({ sent: 0, received: 0 });
  const [error, setError] = useState<string | null>(null);
  const status = useRealtimeStatus();

  useRealtimeMessage("simulation.result", useCallback(({ result: r }: Extract<HubMessage, { type: "simulation.result" }>) => {
    setCounts((c) => ({ ...c, received: c.received + 1 }));
    const sent = sentAt.current.get(r.id);
    sentAt.current.delete(r.id);
    if (r.id !== lastId.current) return; // the answer to a scenario that was already replaced
    if (sent) setRoundTripMs(Math.round(performance.now() - sent));
    setError(null);
    setResult(r);
    setReceivedAt(new Date().toISOString());
  }, []));

  useRealtimeMessage("error", useCallback((m: Extract<HubMessage, { type: "error" }>) => {
    setError(m.message);
  }, []));

  const send = useCallback((scenario: Omit<Scenario, "id">) => {
    const id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    if (!realtime().send({ type: "simulate", scenario: { ...scenario, id } })) return false;
    lastId.current = id;
    sentAt.current.set(id, performance.now());
    setCounts((c) => ({ ...c, sent: c.sent + 1 }));
    return true;
  }, []);

  const state: SocketState = status.state === "open" ? "open" : status.state === "closed" ? "closed" : "connecting";
  return { state, result, receivedAt, roundTripMs, counts, error, send, attempts: status.attempts };
}
