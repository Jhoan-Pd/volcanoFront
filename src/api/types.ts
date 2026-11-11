// Types mirroring the backend's Pydantic schemas (repository volcano, /api/v1).
// Field names and enum values are English; the Spanish text shown to users lives in lib/format.ts.

export type Role = "ADMIN" | "PHARMACY" | "CITIZEN";
export type RiskLevel = "GREEN" | "YELLOW" | "ORANGE" | "RED";
export type AlertOrigin = "OBSERVED" | "PREDICTED";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  municipality_id: number | null;
  active: boolean;
  created_at: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface Municipality {
  id: number;
  divipola_code: string;
  name: string;
  department: string;
  latitude: number;
  longitude: number;
  altitude_m: number | null;
  population: number;
  crater_distance_km: number | null;
  active: boolean;
}

export interface Disease {
  id: number;
  code: string;
  name: string;
  description: string | null;
  icd10_code: string | null;
  recommendations: string | null;
  search_terms: string | null;
  sivigila_codes: string | null;
  pharmacy_categories: string | null;
  color: string;
  yellow_threshold_pct: number;
  orange_threshold_pct: number;
  red_threshold_pct: number;
  active: boolean;
}

export interface Thresholds { yellow: number; orange: number; red: number }

export interface DiseaseRisk {
  disease_id: number;
  code: string;
  name: string;
  color: string;
  year: number;
  epi_week: number;
  cases: number;
  previous_week_cases: number | null;
  change_pct: number | null;
  rate_per_100k: number;
  thresholds: Thresholds;
  level: RiskLevel;
  is_simulated: boolean;
  recommendations: string[];
  prediction: PredictionSummary | null;
}

export interface AshFall {
  date: string;
  municipality: string | null;
  intensity: number;
  description: string | null;
  is_simulated: boolean;
}

export interface VolcanoStatus {
  activity_level: RiskLevel | "NO_DATA";
  date: string | null;
  description: string | null;
  bulletin_url: string | null;
  is_simulated: boolean;
  so2_tons_per_day: number | null;
  recent_ash_falls: AshFall[];
}

export interface DashboardSummary {
  municipality_id: number;
  municipality: string;
  population: number;
  reference_week: string;
  risks: DiseaseRisk[];
  volcano: VolcanoStatus;
  has_simulated_data: boolean;
}

export interface SeriesPoint {
  year: number;
  epi_week: number;
  label: string;
  week_start: string;
  cases: number | null;
  p_yellow: number | null;
  p_orange: number | null;
  p_red: number | null;
}

export interface DiseaseSeries {
  municipality_id: number;
  disease_id: number;
  disease: string;
  points: SeriesPoint[];
}

export interface MunicipalityRisk {
  municipality_id: number;
  municipality: string;
  divipola_code: string;
  latitude: number;
  longitude: number;
  max_level: RiskLevel;
  levels: Record<string, RiskLevel>;
  max_predicted_level: RiskLevel | null;
  predicted_levels: Record<string, RiskLevel>;
}

export interface CurrentWeather {
  municipality_id: number;
  municipality: string;
  observed_at: string | null;
  temperature_c: number | null;
  relative_humidity_pct: number | null;
  precipitation_mm: number | null;
  wind_kmh: number | null;
  weather_code: number | null;
  description: string;
  source: string;
}

export interface DailyWeather {
  date: string;
  temp_max_c: number | null;
  temp_min_c: number | null;
  temp_mean_c: number | null;
  precipitation_mm: number | null;
  relative_humidity_pct: number | null;
  is_forecast: boolean;
  is_simulated: boolean;
  source: string;
}

export interface Pharmacy {
  id: number;
  name: string;
  tax_id: string;
  address: string | null;
  phone: string | null;
  municipality_id: number;
  user_id: number | null;
  latitude: number | null;
  longitude: number | null;
  active: boolean;
}

export type VolcanicEventType = "BULLETIN" | "ASH_FALL" | "GAS_EMISSION" | "EARTHQUAKE";

export interface VolcanicEvent {
  id: number;
  event_type: VolcanicEventType;
  activity_level: RiskLevel;
  start_date: string;
  end_date: string | null;
  municipality_id: number | null;
  ash_intensity: number;
  so2_tons_per_day: number | null;
  description: string | null;
  bulletin_url: string | null;
  is_simulated: boolean;
  created_at: string;
}

// ── pharmacies ───────────────────────────────────────────────────────────────
export type Category =
  | "COLD_FLU" | "ANTIPYRETICS" | "ORAL_REHYDRATION" | "INHALERS" | "FACE_MASKS" | "REPELLENTS";

export interface ReportableWeek {
  year: number;
  epi_week: number;
  label: string;
  start_date: string;
  end_date: string;
  reported: boolean;
}

export interface MyPharmacy {
  id: number;
  name: string;
  tax_id: string;
  address: string | null;
  municipality_id: number;
  municipality: string;
  active: boolean;
  reportable_weeks: ReportableWeek[];
  categories: Category[];
}

export interface WeeklyReport {
  pharmacy_id: number;
  pharmacy: string;
  year: number;
  epi_week: number;
  label: string;
  start_date: string;
  end_date: string;
  items: { category: Category; units: number }[];
  total_units: number;
  is_simulated: boolean;
  updated_at: string | null;
  reported_by: string | null;
  editable: boolean;
}

// ── predictive model ─────────────────────────────────────────────────────────
/** What the model says about the next 4 weeks (predictive traffic light). */
export interface PredictionSummary {
  max_level: RiskLevel;
  peak_week: string;
  expected_cases_h1: number;
  lower_bound_h1: number;
  upper_bound_h1: number;
  algorithm: string;
}

export interface PredictionPoint {
  year: number;
  epi_week: number;
  label: string;
  week_start: string;
  horizon: number;
  expected_cases: number;
  lower_bound: number;
  upper_bound: number;
  level: RiskLevel;
  thresholds: Thresholds | null;
}

export interface BacktestPoint {
  year: number;
  epi_week: number;
  label: string;
  observed: number;
  predicted: number;
}

export interface ModelSummary {
  id: number;
  algorithm: string;
  trained_at: string;
  baseline_mae: number | null;
  model_mae: number | null;
  baseline_rmse: number | null;
  model_rmse: number | null;
}

export interface DiseasePrediction {
  municipality_id: number;
  disease_id: number;
  disease: string;
  base_week: string | null;
  model: ModelSummary | null;
  max_level: RiskLevel | null;
  points: PredictionPoint[];
  backtest: BacktestPoint[];
}

export interface ModelImportances {
  method: string;
  groups: Record<string, number>;
  features: Record<string, { importance: number; group: string }>;
}

export interface ModelMetrics {
  summary: Record<string, { mae: number; rmse: number }>;
  by_horizon: Record<string, Record<string, { mae: number; rmse: number }>>;
  test_weeks: number;
}

export interface TrainedModel {
  id: number;
  disease_id: number;
  disease: string;
  algorithm: string;
  version: string;
  trained_at: string;
  baseline_mae: number | null;
  baseline_rmse: number | null;
  model_mae: number | null;
  model_rmse: number | null;
  mae_improvement_pct: number | null;
  sample_count: number | null;
  active: boolean;
  importances: ModelImportances | null;
  metrics: ModelMetrics | null;
}

export interface TrainingStatus {
  running: boolean;
  started_at: string | null;
  finished_at: string | null;
  message: string | null;
  errors: string[];
}

export interface ExplanationFactor {
  group: string;
  group_label: string;
  contribution: number;
  direction: "up" | "down" | "neutral";
  message: string | null;
}

export interface PredictionExplanation {
  municipality_id: number;
  municipality: string;
  disease_id: number;
  disease: string;
  label: string;
  horizon: number;
  level: RiskLevel;
  expected_cases: number;
  method: string;
  summary: string;
  factors: ExplanationFactor[];
  global_importance: ModelImportances | null;
}

// ── data sources ─────────────────────────────────────────────────────────────
export interface TrendSyncResult {
  source: string;
  terms: string[];
  saved_rows: number;
  from_cache: string[];
  errors: string[];
}

export interface SivigilaSyncResult {
  diseases: string[];
  years_covered: number[];
  saved_rows: number;
  weeks_with_cases: number;
  errors: string[];
}

export type ImportKind = "cases" | "weather" | "events" | "trends";

export interface ImportResult {
  kind: ImportKind;
  rows_read: number;
  inserted: number;
  updated: number;
  errors: { row: number; message: string }[];
}

export interface SourceStatus {
  source: string;
  table: string;
  rows: number;
  simulated: number;
  latest_week: string | null;
  last_updated: string | null;
}

// ── alerts ───────────────────────────────────────────────────────────────────
export interface Alert {
  id: number;
  municipality_id: number;
  municipality: string;
  disease_id: number;
  disease: string;
  disease_code: string;
  year: number;
  epi_week: number;
  label: string;
  risk_level: RiskLevel;
  origin: AlertOrigin;
  message: string;
  active: boolean;
  email_notified: boolean;
  created_at: string;
  closed_at: string | null;
}

export interface EvaluationResult {
  new: number;
  updated: number;
  closed: number;
  active: number;
  emails_sent: number;
}

// ── gRPC engine (through the gateway and the realtime hub) ───────────────────
export interface EngineStatus {
  available: boolean;
  version: string | null;
  models_in_memory: number;
  training: boolean;
  uptime_s: number | null;
  rpcs_served: number;
  latency_ms: number | null;
  message: string | null;
}

export interface EnginePoint {
  year: number;
  epi_week: number;
  label: string;
  horizon: number;
  expected_cases: number;
  lower_bound: number;
  upper_bound: number;
  level: RiskLevel | null;
  thresholds: Thresholds | null;
}

export interface EngineForecast {
  municipality_id: number;
  municipality: string;
  disease_id: number;
  disease: string;
  algorithm: string;
  model_id: number;
  base_week: string;
  max_level: RiskLevel | null;
  points: EnginePoint[];
  duration_ms: number;
  from_cache: boolean;
}

export type TrainingStage =
  | "STARTED" | "DATASET" | "CANDIDATE" | "MODEL_READY" | "PREDICTIONS" | "ALERTS" | "WARNING" | "FINISHED"
  | "FAILED";

export interface TrainingProgress {
  stage: TrainingStage;
  message: string;
  percent: number;
  disease: string | null;
  algorithm: string | null;
  mae: number | null;
  baseline_mae: number | null;
}

/** An alert as the realtime hub relays it from the engine's WatchAlerts stream. */
export interface LiveAlert {
  id: number;
  municipality_id: number;
  municipality: string;
  disease_id: number;
  disease: string;
  week: string;
  level: RiskLevel | null;
  origin: AlertOrigin;
  message: string;
}

export interface AlertEvent {
  kind: "CREATED" | "UPDATED" | "CLOSED";
  at: string;
  alert: LiveAlert;
}

export interface PharmacyUploadRow {
  row: number;
  pharmacy_id?: number | null;
  year: number;
  epi_week: number;
  category: string;
  units: number;
}

export interface PharmacyUploadSummary {
  rows_received: number;
  rows_rejected: number;
  weeks_created: number;
  weeks_updated: number;
  weeks_rejected: number;
  errors: { row: number; message: string }[];
  duration_ms: number;
}

export interface Scenario {
  id: string;
  municipality_id: number;
  disease_id: number;
  temperature_delta_c: number;
  rain_change_pct: number;
  search_change_pct: number;
  pharmacy_change_pct: number;
  ash_fall: boolean;
}

export interface ScenarioResult {
  id: string;
  municipality_id: number;
  disease_id: number;
  baseline: EnginePoint[];
  scenario: EnginePoint[];
  max_level: RiskLevel | null;
  change_pct: number;
  summary: string;
  duration_ms: number;
  error: string | null;
}

// ── realtime hub protocol (WS /ws) ───────────────────────────────────────────
export type UpstreamStatus = "connected" | "reconnecting";
export type SystemEventName = "data.updated" | "model.trained" | "alerts.evaluated";

export type HubMessage =
  | { type: "welcome"; client_id: string; protocol: number; heartbeat_s: number; server_time: string }
  | { type: "alerts.snapshot"; alerts: LiveAlert[]; upstream: UpstreamStatus }
  | { type: "alert"; event: AlertEvent }
  | { type: "simulation.result"; result: ScenarioResult }
  | { type: "presence"; online: number }
  | { type: "system"; event: SystemEventName; at: string; detail: Record<string, unknown> }
  | { type: "upstream"; status: UpstreamStatus }
  | { type: "ping" }
  | { type: "pong" }
  | { type: "error"; code: string; message: string };

export type ClientMessage =
  | { type: "subscribe"; channel: "alerts"; municipality_id?: number | null }
  | { type: "unsubscribe"; channel: "alerts" }
  | { type: "simulate"; scenario: Scenario }
  | { type: "ping" };
