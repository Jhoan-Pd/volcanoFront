"use client";

/**
 * Client of the realtime hub (WS /ws): ONE WebSocket per browser tab, shared by every component.
 *
 * The hub multiplexes live alerts, the scenario simulator, presence and system events over a single
 * socket, so a page with an alert banner, a map and the simulator still opens one connection.
 *
 * - Lazy: the socket opens when the first listener subscribes and closes when the last one leaves.
 * - Resilient: reconnects with exponential back-off plus jitter; reconnects at once when the API
 *   finishes waking up (SERVER_READY_EVENT); a watchdog closes a socket that went silent for longer
 *   than 2.5 heartbeats (the hub pings every ~25 s), which TCP alone would take minutes to notice.
 * - Stateful across reconnections: active subscriptions are replayed when the socket reopens.
 * - Observable: `useRealtimeStatus()` exposes connection state, presence and upstream health through
 *   useSyncExternalStore, the same minimal-store pattern as lib/serverStatus.ts.
 */
import { useEffect, useSyncExternalStore } from "react";
import { REALTIME_URL } from "@/api/client";
import type { ClientMessage, HubMessage, UpstreamStatus } from "@/api/types";
import { SERVER_READY_EVENT } from "./serverStatus";

export type ConnectionState = "idle" | "connecting" | "open" | "closed";

export interface RealtimeStatus {
  state: ConnectionState;
  online: number | null;
  upstream: UpstreamStatus | null;
  /** Reconnection attempts since the last successful open. */
  attempts: number;
}

type MessageType = HubMessage["type"];
type Handler<K extends MessageType> = (message: Extract<HubMessage, { type: K }>) => void;
/** How handlers are stored: the map key guarantees each one only receives messages of its own type. */
type StoredHandler = (message: HubMessage) => void;

const MAX_BACKOFF_MS = 15_000;
const DEFAULT_HEARTBEAT_S = 25;

/** Wait before attempt n: exponential back-off with jitter so tabs do not reconnect in lockstep. */
const backoff = (n: number) => Math.min(MAX_BACKOFF_MS, 1000 * 2 ** n) * (0.75 + Math.random() * 0.5);

class RealtimeConnection {
  private socket: WebSocket | null = null;
  private handlers = new Map<MessageType, Set<StoredHandler>>();
  private listeners = new Set<() => void>();
  private subscriptions = new Map<string, ClientMessage>();
  private users = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private heartbeatMs = DEFAULT_HEARTBEAT_S * 1000;
  status: RealtimeStatus = { state: "idle", online: null, upstream: null, attempts: 0 };

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener(SERVER_READY_EVENT, () => this.reconnectNow());
    }
  }

  // ── observable status ─────────────────────────────────────────────────────
  subscribeStatus = (listener: () => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  private setStatus(patch: Partial<RealtimeStatus>) {
    this.status = { ...this.status, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ── message handlers ──────────────────────────────────────────────────────
  on<K extends MessageType>(type: K, handler: Handler<K>): () => void {
    const stored = handler as unknown as StoredHandler;
    const set = this.handlers.get(type) ?? new Set<StoredHandler>();
    set.add(stored);
    this.handlers.set(type, set);
    return () => { set.delete(stored); };
  }

  /** Keep the socket open while at least one component uses it. */
  retain(): () => void {
    this.users += 1;
    if (this.users === 1) this.open();
    return () => {
      this.users -= 1;
      if (this.users === 0) this.close();
    };
  }

  send(message: ClientMessage): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }

  /** A subscription survives reconnections: it is sent now (if open) and again on every reopen. */
  subscribe(key: string, message: ClientMessage, unsubscribe: ClientMessage): () => void {
    this.subscriptions.set(key, message);
    this.send(message);
    return () => {
      this.subscriptions.delete(key);
      this.send(unsubscribe);
    };
  }

  // ── connection lifecycle ──────────────────────────────────────────────────
  private open() {
    clearTimeout(this.retryTimer);
    this.setStatus({ state: "connecting" });
    const socket = new WebSocket(REALTIME_URL);
    this.socket = socket;
    socket.onopen = () => {
      this.setStatus({ state: "open", attempts: 0 });
      this.subscriptions.forEach((m) => this.send(m));
      this.armWatchdog();
    };
    socket.onmessage = (e) => {
      this.armWatchdog();
      let message: HubMessage;
      try {
        message = JSON.parse(e.data as string) as HubMessage;
      } catch {
        return;
      }
      if (message.type === "welcome") this.heartbeatMs = message.heartbeat_s * 1000;
      if (message.type === "presence") this.setStatus({ online: message.online });
      if (message.type === "upstream") this.setStatus({ upstream: message.status });
      if (message.type === "alerts.snapshot") this.setStatus({ upstream: message.upstream });
      this.handlers.get(message.type)?.forEach((h) => h(message));
    };
    socket.onclose = () => {
      clearTimeout(this.watchdog);
      if (this.socket !== socket) return; // an older socket closing after a reconnect
      this.socket = null;
      this.setStatus({ state: "closed", online: null });
      if (this.users > 0) {
        const attempts = this.status.attempts;
        this.retryTimer = setTimeout(() => this.open(), backoff(attempts));
        this.setStatus({ attempts: attempts + 1 });
      }
    };
  }

  private close() {
    clearTimeout(this.retryTimer);
    clearTimeout(this.watchdog);
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.setStatus({ state: "idle", online: null, upstream: null, attempts: 0 });
  }

  private reconnectNow() {
    if (this.users === 0 || this.status.state === "open") return;
    this.setStatus({ attempts: 0 });
    this.socket?.close();
    this.open();
  }

  private armWatchdog() {
    clearTimeout(this.watchdog);
    // No message (not even a ping) for 2.5 heartbeats: the connection is dead even if TCP has not noticed
    this.watchdog = setTimeout(() => this.socket?.close(), this.heartbeatMs * 2.5);
  }
}

let connection: RealtimeConnection | null = null;

/** The tab's shared connection (created on first use, in the browser only). */
export function realtime(): RealtimeConnection {
  connection ??= new RealtimeConnection();
  return connection;
}

const IDLE: RealtimeStatus = { state: "idle", online: null, upstream: null, attempts: 0 };

/** Connection state, presence and upstream health; also keeps the socket open while mounted. */
export function useRealtimeStatus(): RealtimeStatus {
  useEffect(() => realtime().retain(), []);
  return useSyncExternalStore(
    (l) => realtime().subscribeStatus(l),
    () => realtime().status,
    () => IDLE,
  );
}

/** Run `handler` for every message of one type while the component is mounted. */
export function useRealtimeMessage<K extends MessageType>(type: K, handler: Handler<K>) {
  useEffect(() => {
    const release = realtime().retain();
    const off = realtime().on(type, handler);
    return () => { off(); release(); };
  }, [type, handler]);
}
