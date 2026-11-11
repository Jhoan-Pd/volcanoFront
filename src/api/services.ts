import { readSse } from "../lib/sse";
import { api, API_V1, readToken } from "./client";
import type {
  Alert, Category, CurrentWeather, DailyWeather, DashboardSummary, Disease, DiseasePrediction, DiseaseSeries,
  EngineForecast, EngineStatus, EvaluationResult, ImportKind, ImportResult, Municipality, MunicipalityRisk,
  MyPharmacy, Page, Pharmacy, PharmacyUploadRow, PharmacyUploadSummary, PredictionExplanation, SivigilaSyncResult,
  SourceStatus, TrainedModel, TrainingProgress, TrainingStatus, TrendSyncResult, User, WeeklyReport,
} from "./types";

export const authApi = {
  async login(email: string, password: string) {
    const form = new URLSearchParams({ username: email, password });
    const { data } = await api.post<{ access_token: string; user: User }>("/auth/login", form);
    return data;
  },
  async me() {
    return (await api.get<User>("/auth/me")).data;
  },
  async signup(data: { name: string; email: string; password: string; municipality_id?: number | null }) {
    return (await api.post<User>("/auth/signup", data)).data;
  },
};

export const dashboardApi = {
  summary: async (municipalityId?: number) =>
    (await api.get<DashboardSummary>("/dashboard/summary", { params: { municipality_id: municipalityId } })).data,
  series: async (municipalityId: number, diseaseId: number, weeks = 104) =>
    (await api.get<DiseaseSeries>("/dashboard/series", {
      params: { municipality_id: municipalityId, disease_id: diseaseId, weeks },
    })).data,
  municipalityRisk: async () => (await api.get<MunicipalityRisk[]>("/dashboard/municipality-risk")).data,
  prediction: async (municipalityId: number, diseaseId: number) =>
    (await api.get<DiseasePrediction>("/dashboard/prediction", {
      params: { municipality_id: municipalityId, disease_id: diseaseId },
    })).data,
  explanation: async (municipalityId: number, diseaseId: number, horizon?: number) =>
    (await api.get<PredictionExplanation>("/dashboard/explanation", {
      params: { municipality_id: municipalityId, disease_id: diseaseId, horizon },
    })).data,
};

/** Predictive model: retraining and status are ADMIN only; the history is public. Runs in the engine. */
export const modelApi = {
  retrain: async (diseaseId?: number) =>
    (await api.post<TrainingStatus>("/model/retrain", null, { params: { disease_id: diseaseId } })).data,
  status: async () => (await api.get<TrainingStatus>("/model/status")).data,
  predict: async () => (await api.post<{ predictions: number }>("/model/predict")).data,
  history: async (diseaseId?: number, limit = 50) =>
    (await api.get<TrainedModel[]>("/model/history", { params: { disease_id: diseaseId, limit } })).data,
};

export const weatherApi = {
  current: async (municipalityId: number) => (await api.get<CurrentWeather>(`/weather/${municipalityId}/current`)).data,
  forecast: async (municipalityId: number) =>
    (await api.get<DailyWeather[]>(`/weather/${municipalityId}/forecast`)).data,
  sync: async () =>
    (await api.post<{ municipalities: number; saved_rows: number; errors: string[] }>("/weather/sync")).data,
};

export const catalogApi = {
  municipalities: async () =>
    (await api.get<Page<Municipality>>("/municipalities", { params: { limit: 500 } })).data.items,
  diseases: async () => (await api.get<Page<Disease>>("/diseases", { params: { limit: 500 } })).data.items,
};

/** Generic CRUD for the admin panel */
export const crudApi = {
  list: async <T,>(resource: string, offset = 0, limit = 20) =>
    (await api.get<Page<T>>(`/${resource}`, { params: { offset, limit } })).data,
  create: async <T,>(resource: string, data: unknown) => (await api.post<T>(`/${resource}`, data)).data,
  update: async <T,>(resource: string, id: number, data: unknown) =>
    (await api.patch<T>(`/${resource}/${id}`, data)).data,
  remove: async (resource: string, id: number) => {
    await api.delete(`/${resource}/${id}`);
  },
};

type ReportItems = { category: Category; units: number }[];

/** Pharmacy panel. `pharmacyId` is only used by the ADMIN. */
export const pharmacyApi = {
  me: async (pharmacyId?: number) =>
    (await api.get<MyPharmacy>("/pharmacy/me", { params: { pharmacy_id: pharmacyId } })).data,
  history: async (pharmacyId?: number, weeks = 26) =>
    (await api.get<WeeklyReport[]>("/pharmacy/reports", { params: { pharmacy_id: pharmacyId, weeks } })).data,
  create: async (data: { year: number; epi_week: number; items: ReportItems }, pharmacyId?: number) =>
    (await api.post<WeeklyReport>("/pharmacy/reports", { ...data, pharmacy_id: pharmacyId })).data,
  update: async (year: number, week: number, items: ReportItems, pharmacyId?: number) =>
    (await api.put<WeeklyReport>(`/pharmacy/reports/${year}/${week}`, { items },
      { params: { pharmacy_id: pharmacyId } })).data,
  remove: async (year: number, week: number, pharmacyId?: number) => {
    await api.delete(`/pharmacy/reports/${year}/${week}`, { params: { pharmacy_id: pharmacyId } });
  },
  pharmacies: async () => (await api.get<Page<Pharmacy>>("/pharmacies", { params: { limit: 500 } })).data.items,
};

/** Data sources: synchronization and imports, ADMIN only. */
export const dataApi = {
  status: async () => (await api.get<{ sources: SourceStatus[] }>("/data/status")).data.sources,
  syncTrends: async (force = false) =>
    (await api.post<TrendSyncResult>("/data/trends/sync", null, { params: { force }, timeout: 180_000 })).data,
  syncSivigila: async (sinceYear = 2020) =>
    (await api.post<SivigilaSyncResult>("/data/sivigila/sync", null, {
      params: { since_year: sinceYear }, timeout: 180_000, // datos.gov.co pages through thousands of rows
    })).data,
  importCsv: async (kind: ImportKind, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return (await api.post<ImportResult>(`/data/import/${kind}`, form)).data;
  },
};

/** Early alerts: the active ones are public; managing them is ADMIN only. */
export const alertApi = {
  active: async () => (await api.get<Alert[]>("/alerts/active")).data,
  list: async (active?: boolean, offset = 0, limit = 20) =>
    (await api.get<Page<Alert>>("/alerts", { params: { active, offset, limit } })).data,
  evaluate: async (sendEmail = true) =>
    (await api.post<EvaluationResult>("/alerts/evaluate", null, { params: { send_email: sendEmail } })).data,
  close: async (id: number) => (await api.patch<Alert>(`/alerts/${id}/close`)).data,
};

/** Reports: download as a file through a temporary link. The server picks the (Spanish) file name. */
async function download(path: string, params: Record<string, unknown>, fallbackName: string) {
  const r = await api.get<Blob>(path, { params, responseType: "blob", timeout: 120_000 });
  const disposition = String(r.headers["content-disposition"] ?? "");
  const name = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(r.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const reportApi = {
  municipalityPdf: (municipalityId: number) =>
    download("/reports/summary.pdf", { municipality_id: municipalityId }, "reporte.pdf"),
  casesCsv: (municipalityId?: number, diseaseId?: number) =>
    download("/reports/cases.csv", { municipality_id: municipalityId, disease_id: diseaseId }, "casos.csv"),
  predictionsCsv: (municipalityId?: number) =>
    download("/reports/predictions.csv", { municipality_id: municipalityId }, "predicciones.csv"),
  alertsCsv: (activeOnly = false) => download("/reports/alerts.csv", { active_only: activeOnly }, "alertas.csv"),
};

/**
 * gRPC prediction engine through the gateway:
 *   unary → JSON · server streaming → SSE · client streaming → POST of rows.
 * The WebSocket transports (live alerts, bidirectional simulator) go through the realtime hub (lib/realtime.ts).
 */
export const engineApi = {
  status: async () => (await api.get<EngineStatus>("/engine/status")).data,
  forecast: async (municipalityId: number, diseaseId: number) =>
    (await api.get<EngineForecast>("/engine/forecast", {
      params: { municipality_id: municipalityId, disease_id: diseaseId },
    })).data,
  /** Server streaming: every training step arrives as an SSE "progress" event. */
  train: (diseaseId?: number, signal?: AbortSignal) =>
    readSse<TrainingProgress>(`${API_V1}/engine/training${diseaseId ? `?disease_id=${diseaseId}` : ""}`, {
      method: "POST", signal, headers: { Authorization: `Bearer ${readToken() ?? ""}` },
    }),
  /** Client streaming: the gateway forwards the rows to the engine as a stream. */
  uploadPharmacyReports: async (rows: PharmacyUploadRow[]) =>
    (await api.post<PharmacyUploadSummary>("/engine/pharmacy-upload", { rows }, { timeout: 180_000 })).data,
};
