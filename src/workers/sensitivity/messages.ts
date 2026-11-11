import type { RiskLevel, Scenario } from "@/api/types";

export type ScenarioField = "temperature_delta_c" | "rain_change_pct" | "search_change_pct" | "pharmacy_change_pct";

export interface Axis {
  field: ScenarioField;
  values: number[];
}

/** Protocol between the simulator page and the sensitivity-matrix worker. */
export interface MatrixRequest {
  type: "compute";
  id: number;
  /** WebSocket URL of the realtime hub. */
  url: string;
  base: Omit<Scenario, "id">;
  xAxis: Axis;
  yAxis: Axis;
}

export interface MatrixCell {
  total: number;
  level: RiskLevel | null;
  changePct: number;
}

export interface MatrixResult {
  cells: MatrixCell[][]; // [row (Y axis)][column (X axis)]
  min: number;
  max: number;
  baselineTotal: number;
  scenarios: number;
  durationMs: number;
  engineMs: number; // total computation time inside the engine
}

export type MatrixMessage =
  | { type: "progress"; id: number; received: number; total: number }
  | { type: "result"; id: number; result: MatrixResult }
  | { type: "error"; id: number; message: string };
