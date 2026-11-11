/// <reference lib="webworker" />
/**
 * Web Worker: the simulator's sensitivity matrix.
 *
 * For two variables (e.g. rain × searches) it builds a grid of scenarios, opens ITS OWN WebSocket to
 * the realtime hub (which bridges it to the engine's bidirectional gRPC stream), sends every
 * scenario at once and receives the results identified by their id. It places each answer in the
 * matrix and finally computes the minimum and maximum.
 *
 * All of that (dozens of messages, JSON.parse, aggregation) happens off the main thread: the page
 * only receives the progress and the finished matrix to paint it.
 */
import type { ClientMessage, HubMessage } from "@/api/types";
import type { MatrixCell, MatrixMessage, MatrixRequest } from "./sensitivity/messages";

const scope = self as unknown as DedicatedWorkerGlobalScope;
const post = (m: MatrixMessage) => scope.postMessage(m);
const TIMEOUT_MS = 90_000;
const sum = (points: { expected_cases: number }[]) => points.reduce((s, p) => s + p.expected_cases, 0);

scope.onmessage = (e: MessageEvent<MatrixRequest>) => {
  const { id, url, base, xAxis, yAxis } = e.data;
  const total = xAxis.values.length * yAxis.values.length;
  const cells: (MatrixCell | null)[][] = yAxis.values.map(() => xAxis.values.map(() => null));
  const start = performance.now();
  let received = 0;
  let engineMs = 0;
  let baselineTotal = 0;
  let finished = false;

  const socket = new WebSocket(url);
  const timer = setTimeout(() => fail("El motor tardó demasiado en responder"), TIMEOUT_MS);
  function fail(message: string) {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    socket.close();
    post({ type: "error", id, message });
  }
  const send = (m: ClientMessage) => socket.send(JSON.stringify(m));

  socket.onopen = () => {
    yAxis.values.forEach((y, row) => xAxis.values.forEach((x, column) => {
      send({ type: "simulate", scenario: { ...base, [xAxis.field]: x, [yAxis.field]: y, id: `m${id}:${row}:${column}` } });
    }));
  };
  socket.onerror = () => fail("No se pudo conectar con el simulador");
  socket.onclose = () => fail("La conexión con el simulador se cerró antes de terminar");
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data as string) as HubMessage;
    if (message.type === "error") return fail(message.message);
    if (message.type !== "simulation.result") return; // welcome, presence… are not for the matrix
    const r = message.result;
    const [, row, column] = r.id.split(":").map(Number);
    if (!Number.isInteger(row) || !Number.isInteger(column)) return;
    if (r.error) return fail(r.error);
    baselineTotal = sum(r.baseline);
    engineMs += r.duration_ms;
    cells[row][column] = { total: Math.round(sum(r.scenario) * 10) / 10, level: r.max_level, changePct: r.change_pct };
    received++;
    post({ type: "progress", id, received, total });
    if (received === total) {
      finished = true;
      clearTimeout(timer);
      socket.close();
      const totals = cells.flat().map((c) => c!.total);
      post({
        type: "result", id, result: {
          cells: cells as MatrixCell[][], min: Math.min(...totals), max: Math.max(...totals),
          baselineTotal: Math.round(baselineTotal * 10) / 10, scenarios: total, durationMs: performance.now() - start,
          engineMs: Math.round(engineMs),
        },
      });
    }
  };
};
