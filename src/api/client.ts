import axios, { AxiosError } from "axios";

/** Base URL of the backend's edge proxy (next.config.ts derives it from NEXT_PUBLIC_API_URL). */
export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:10000").replace(/\/$/, "");
export const API_V1 = `${API_BASE}/api/v1`;

/** WebSocket of the realtime hub. Same host as the API behind the edge proxy; overridable for local runs. */
export const REALTIME_URL = `${(process.env.NEXT_PUBLIC_REALTIME_URL ?? API_BASE).replace(/\/$/, "").replace(/^http/, "ws")}/ws`;

export const api = axios.create({
  baseURL: API_V1,
  timeout: 60_000, // Render's free plan can take ~50 s to wake up
});

const TOKEN_KEY = "token";
export const SESSION_EXPIRED_EVENT = "session-expired";

export function saveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// When the token expired, clear the session and tell the app
api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    if (error.response?.status === 401 && readToken()) {
      saveToken(null);
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  },
);

/** Error body of the API: `code` is stable English, `message` is already Spanish for the user. */
export interface ApiErrorBody {
  error?: { code: string; message: string; details?: { field: string; message: string }[] | null };
}

/** Turn any Axios error into a readable Spanish message. */
export function errorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as ApiErrorBody | undefined;
    if (data?.error) {
      const details = data.error.details;
      if (Array.isArray(details) && details.length) {
        return details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message)).join(" · ");
      }
      return data.error.message;
    }
    if (e.code === "ECONNABORTED") return "El servidor tardó demasiado en responder. Intenta de nuevo.";
    if (!e.response) return "No se pudo conectar con el servidor. Revisa tu conexión o la URL de la API.";
    return `Error ${e.response.status}`;
  }
  return e instanceof Error ? e.message : "Error desconocido";
}
