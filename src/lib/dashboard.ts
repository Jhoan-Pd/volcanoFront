/**
 * Data of a municipality's dashboard, fetched by the Next.js SERVER (ISR).
 *
 * Every disease and the longest range are fetched at once: the dashboard is generated as a static
 * page and the browser only filters what it already has (switching disease or range makes no
 * request). The requests go out in parallel with Promise.all.
 */
import type {
  Alert, CurrentWeather, DailyWeather, DashboardSummary, DiseasePrediction, DiseaseSeries, Municipality,
  MunicipalityRisk, Page, PredictionExplanation, VolcanoStatus,
} from "@/api/types";
import { DASHBOARD_REVALIDATE_S } from "./renderPatterns";
import { ApiError, fetchApi, fetchOptional, nowIso } from "./serverFetch";

export const MAX_WEEKS = 260;
/** Cache tag shared by every dashboard page: the backend revalidates it when new data arrives. */
export const DASHBOARDS_TAG = "dashboards";

const isr = (...tags: string[]) => ({ revalidate: DASHBOARD_REVALIDATE_S, tags: [DASHBOARDS_TAG, ...tags] });

export async function activeMunicipalities(): Promise<Municipality[]> {
  const page = await fetchApi<Page<Municipality>>("/municipalities", { limit: 500 }, isr("municipalities"));
  return page.items.filter((m) => m.active);
}

export interface DashboardData {
  municipality: Municipality;
  municipalities: Municipality[];
  summary: DashboardSummary;
  series: Record<number, DiseaseSeries>;
  predictions: Record<number, DiseasePrediction | null>;
  explanations: Record<number, PredictionExplanation | null>;
  weather: CurrentWeather | null;
  forecast: DailyWeather[];
  municipalityRisks: MunicipalityRisk[];
  generatedAt: string;
  requests: number;
}

export async function loadDashboard(municipalityId: number): Promise<DashboardData | null> {
  const tag = `municipality-${municipalityId}`;
  let summary: DashboardSummary;
  try {
    summary = await fetchApi<DashboardSummary>("/dashboard/summary", { municipality_id: municipalityId }, isr(tag));
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e; // ISR: when the API fails during a regeneration, Next.js keeps serving the previous version
  }
  const ids = summary.risks.map((r) => r.disease_id);
  const params = (diseaseId: number) => ({ municipality_id: municipalityId, disease_id: diseaseId });
  const [municipalities, municipalityRisks, weather, forecast, series, predictions, explanations] = await Promise.all([
    activeMunicipalities(),
    fetchApi<MunicipalityRisk[]>("/dashboard/municipality-risk", {}, isr()),
    fetchOptional<CurrentWeather>(`/weather/${municipalityId}/current`, {}, isr(tag)),
    fetchOptional<DailyWeather[]>(`/weather/${municipalityId}/forecast`, {}, isr(tag)),
    Promise.all(ids.map((id) =>
      fetchApi<DiseaseSeries>("/dashboard/series", { ...params(id), weeks: MAX_WEEKS }, isr(tag)))),
    Promise.all(ids.map((id) => fetchOptional<DiseasePrediction>("/dashboard/prediction", params(id), isr(tag)))),
    Promise.all(ids.map((id) => fetchOptional<PredictionExplanation>("/dashboard/explanation", params(id), isr(tag)))),
  ]);
  const municipality = municipalities.find((m) => m.id === municipalityId);
  if (!municipality) return null;
  const byId = <T,>(xs: T[]) => Object.fromEntries(ids.map((id, i) => [id, xs[i]]));
  return {
    municipality, municipalities, summary, municipalityRisks, weather, forecast: forecast ?? [],
    series: byId(series), predictions: byId(predictions), explanations: byId(explanations),
    generatedAt: nowIso(), requests: 5 + ids.length * 3,
  };
}

export interface HomeData {
  municipalities: Municipality[];
  municipalityRisks: MunicipalityRisk[];
  volcano: VolcanoStatus;
  alerts: Alert[];
  referenceWeek: string | null;
  generatedAt: string;
}

export async function loadHome(): Promise<HomeData> {
  const [municipalities, municipalityRisks, volcano, alerts, summary] = await Promise.all([
    activeMunicipalities(),
    fetchApi<MunicipalityRisk[]>("/dashboard/municipality-risk", {}, isr()),
    fetchApi<VolcanoStatus>("/dashboard/volcano", {}, isr()),
    fetchOptional<Alert[]>("/alerts/active", {}, isr()),
    fetchOptional<DashboardSummary>("/dashboard/summary", {}, isr()),
  ]);
  return {
    municipalities, municipalityRisks, volcano, alerts: alerts ?? [], referenceWeek: summary?.reference_week ?? null,
    generatedAt: nowIso(),
  };
}
