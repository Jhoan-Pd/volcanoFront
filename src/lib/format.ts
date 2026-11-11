/**
 * Formatting helpers and the Spanish text shown for the API's English enum values.
 * Code and data are English; everything a user reads is Spanish and comes from here.
 */
import type { AlertOrigin, Category, RiskLevel, Role, VolcanicEventType } from "@/api/types";

const LOCALE = "es-CO";

export const formatNumber = (n: number | null | undefined, decimals = 0) =>
  n == null ? "—" : n.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const formatDate = (iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString(LOCALE, options) : "—";

export const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(LOCALE, { weekday: "short", day: "numeric" });

/** Levels from lowest to highest risk; the index is used to sort and compare. */
export const LEVEL_ORDER: readonly RiskLevel[] = ["GREEN", "YELLOW", "ORANGE", "RED"];
export const levelRank = (level: RiskLevel) => LEVEL_ORDER.indexOf(level);

export interface LevelInfo { label: string; description: string; color: string; ink: string }

export const LEVELS: Record<RiskLevel, LevelInfo> = {
  GREEN: { label: "Bajo", description: "Dentro de lo esperado", color: "var(--st-green)", ink: "var(--st-green-ink)" },
  YELLOW: { label: "Moderado", description: "Por encima de la mediana histórica", color: "var(--st-yellow)", ink: "var(--st-yellow-ink)" },
  ORANGE: { label: "Alto", description: "Zona de epidemia (> percentil 75)", color: "var(--st-orange)", ink: "var(--st-orange-ink)" },
  RED: { label: "Muy alto", description: "Brote probable (> percentil 90)", color: "var(--st-red)", ink: "var(--st-red-ink)" },
};

/** The level's name as a color, for sentences such as «nivel Naranja». */
export const LEVEL_NAMES: Record<RiskLevel, string> = {
  GREEN: "Verde", YELLOW: "Amarillo", ORANGE: "Naranja", RED: "Rojo",
};

export const VOLCANO_LEVELS: Record<RiskLevel, { label: string; description: string }> = {
  GREEN: { label: "Alerta Verde", description: "Volcán activo con comportamiento estable" },
  YELLOW: { label: "Alerta Amarilla", description: "Cambios en el comportamiento de la actividad volcánica" },
  ORANGE: { label: "Alerta Naranja", description: "Erupción probable en días o semanas" },
  RED: { label: "Alerta Roja", description: "Erupción inminente o en curso" },
};

export const CATEGORIES: Record<Category, { label: string; hint: string }> = {
  COLD_FLU: { label: "Antigripales", hint: "Gripa, congestión, tos" },
  ANTIPYRETICS: { label: "Antipiréticos", hint: "Acetaminofén y similares para la fiebre" },
  ORAL_REHYDRATION: { label: "Sales de rehidratación", hint: "Sobres o soluciones de SRO" },
  INHALERS: { label: "Inhaladores", hint: "Salbutamol, beclometasona…" },
  FACE_MASKS: { label: "Tapabocas", hint: "Quirúrgicos y N95 (unidades)" },
  REPELLENTS: { label: "Repelentes", hint: "Repelentes de insectos" },
};
export const categoryLabel = (category: string) => CATEGORIES[category as Category]?.label ?? category;

export const ROLES: Record<Role, string> = { ADMIN: "Administrador", PHARMACY: "Farmacia", CITIZEN: "Ciudadano" };

export const ORIGINS: Record<AlertOrigin, string> = { OBSERVED: "Observada", PREDICTED: "Pronosticada" };

export const EVENT_TYPES: Record<VolcanicEventType, string> = {
  BULLETIN: "Boletín", ASH_FALL: "Caída de ceniza", GAS_EMISSION: "Emisión de gases", EARTHQUAKE: "Sismo",
};

/** Groups of model features (keys come from the engine; the factor of an explanation already carries its label). */
export const FEATURE_GROUPS: Record<string, string> = {
  recent_cases: "Casos recientes", seasonality: "Estacionalidad", weather: "Clima", searches: "Búsquedas en internet",
  pharmacy: "Ventas en farmacias", volcano: "Actividad volcánica", municipality: "Municipio",
};
export const featureGroupLabel = (group: string) => FEATURE_GROUPS[group] ?? group;
