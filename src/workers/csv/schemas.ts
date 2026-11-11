/**
 * Rules of each CSV kind. They mirror the backend's (services/csv_import.py and the pharmacy
 * reports service): checking them in the browser shows the errors BEFORE uploading the file. The
 * backend applies them again (the client is never trusted on its own).
 *
 * Headers and enum values are English. Files that still use the Spanish headers and values of the
 * original templates are accepted too, exactly as the backend does: they are translated on the way in.
 */
export type CsvKind = "cases" | "weather" | "events" | "trends" | "pharmacy";

export interface CsvContext {
  municipalities: string[]; // valid DIVIPOLA codes
  diseases: string[]; // disease codes (IRA, EDA…)
  categories: string[]; // pharmacy categories
}

type Row = Record<string, string>;
export type NormalizedRow = Record<string, string | number | null>;
export class InvalidRowError extends Error {}

export const LEGACY_HEADERS: Record<string, string> = {
  cod_divipola: "divipola_code", enfermedad: "disease", anio: "year", semana_epi: "epi_week", casos: "cases",
  fecha: "date", temp_media_c: "temp_mean_c", precipitacion_mm: "precipitation_mm",
  humedad_relativa_pct: "relative_humidity_pct", tipo: "event_type", nivel_actividad: "activity_level",
  fecha_inicio: "start_date", intensidad_ceniza: "ash_intensity", so2_ton_dia: "so2_tons_per_day",
  descripcion: "description", termino: "term", fecha_semana: "week_start", indice: "interest",
  categoria: "category", unidades: "units", farmacia_id: "pharmacy_id",
};

const LEGACY_VALUES: Record<string, string> = {
  BOLETIN: "BULLETIN", CAIDA_CENIZA: "ASH_FALL", EMISION_GASES: "GAS_EMISSION", SISMO: "EARTHQUAKE",
  VERDE: "GREEN", AMARILLO: "YELLOW", NARANJA: "ORANGE", ROJO: "RED",
  ANTIGRIPALES: "COLD_FLU", ANTIPIRETICOS: "ANTIPYRETICS", SALES_REHIDRATACION: "ORAL_REHYDRATION",
  INHALADORES: "INHALERS", TAPABOCAS: "FACE_MASKS", REPELENTES: "REPELLENTS",
};
const enumValue = (v: string) => {
  const upper = v.trim().toUpperCase();
  return LEGACY_VALUES[upper] ?? upper;
};

const DAY_MS = 86_400_000;
/** Epidemiological weeks of a year (MMWR/CDC system, the same as the backend's epiweeks library). */
export function weeksInYear(year: number): number {
  const start = (y: number) => { const d = Date.UTC(y, 0, 4); return d - new Date(d).getUTCDay() * DAY_MS; };
  return Math.round((start(year + 1) - start(year)) / (7 * DAY_MS));
}

function integer(v: string, field: string, min?: number, max?: number): number {
  const n = Number(v.trim().replace(",", "."));
  if (v.trim() === "" || !Number.isFinite(n)) throw new InvalidRowError(`«${field}» debe ser un número entero (llegó «${v}»)`);
  const whole = Math.trunc(n);
  if ((min !== undefined && whole < min) || (max !== undefined && whole > max)) {
    throw new InvalidRowError(`«${field}» fuera de rango (${whole})`);
  }
  return whole;
}
function decimal(v: string | undefined, field: string): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v.trim().replace(",", "."));
  if (!Number.isFinite(n)) throw new InvalidRowError(`«${field}» debe ser numérico (llegó «${v}»)`);
  return n;
}
function isoDate(v: string, field: string): string {
  const t = v.trim();
  const d = new Date(`${t}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== t) {
    throw new InvalidRowError(`«${field}» debe tener formato AAAA-MM-DD (llegó «${v}»)`);
  }
  return t;
}
function municipality(v: string | undefined, ctx: CsvContext): string {
  const code = (v ?? "").trim();
  if (!ctx.municipalities.includes(code)) throw new InvalidRowError(`Municipio «${code}» no existe (código DIVIPOLA)`);
  return code;
}
function week(row: Row): { year: number; epi_week: number } {
  const year = integer(row.year, "year", 2000, 2100);
  return { year, epi_week: integer(row.epi_week, "epi_week", 1, weeksInYear(year)) };
}

export interface CsvSchema {
  /** Spanish name shown to the user. */
  name: string;
  columns: string[];
  optional: string[];
  /** The row's week or date, for the summary. */
  period: (n: NormalizedRow) => string;
  total?: { column: string; label: string };
  group?: { column: string; label: string };
  convert: (row: Row, ctx: CsvContext) => NormalizedRow;
}

const weekLabel = (n: NormalizedRow) => `${n.year}-S${String(n.epi_week).padStart(2, "0")}`;
const WEATHER_MEASURES = ["temp_max_c", "temp_min_c", "temp_mean_c", "precipitation_mm", "relative_humidity_pct"];

export const CSV_SCHEMAS: Record<CsvKind, CsvSchema> = {
  cases: {
    name: "Casos oficiales", columns: ["divipola_code", "disease", "year", "epi_week", "cases"], optional: [],
    period: weekLabel, total: { column: "cases", label: "casos" }, group: { column: "disease", label: "Por enfermedad" },
    convert: (row, ctx) => {
      const disease = row.disease.trim().toUpperCase();
      if (!ctx.diseases.includes(disease)) throw new InvalidRowError(`Enfermedad «${row.disease}» no existe`);
      return { divipola_code: municipality(row.divipola_code, ctx), disease, ...week(row), cases: integer(row.cases, "cases", 0) };
    },
  },
  weather: {
    name: "Clima diario", columns: ["divipola_code", "date", ...WEATHER_MEASURES], optional: WEATHER_MEASURES,
    period: (n) => String(n.date), total: { column: "precipitation_mm", label: "mm de lluvia" },
    convert: (row, ctx) => {
      const n: NormalizedRow = { divipola_code: municipality(row.divipola_code, ctx), date: isoDate(row.date, "date") };
      for (const c of WEATHER_MEASURES) n[c] = decimal(row[c], c);
      const humidity = n.relative_humidity_pct as number | null;
      if (humidity !== null && (humidity < 0 || humidity > 100)) throw new InvalidRowError("La humedad debe estar entre 0 y 100");
      return n;
    },
  },
  events: {
    name: "Eventos volcánicos",
    columns: ["event_type", "activity_level", "start_date", "divipola_code", "ash_intensity", "so2_tons_per_day", "description"],
    optional: ["divipola_code", "ash_intensity", "so2_tons_per_day", "description"],
    period: (n) => String(n.start_date), group: { column: "event_type", label: "Por tipo" },
    convert: (row, ctx) => {
      const eventType = enumValue(row.event_type);
      const level = enumValue(row.activity_level);
      if (!["BULLETIN", "ASH_FALL", "GAS_EMISSION", "EARTHQUAKE"].includes(eventType)) {
        throw new InvalidRowError(`Tipo «${row.event_type}» no válido (BULLETIN, ASH_FALL, GAS_EMISSION o EARTHQUAKE)`);
      }
      if (!["GREEN", "YELLOW", "ORANGE", "RED"].includes(level)) {
        throw new InvalidRowError(`Nivel «${row.activity_level}» no válido (GREEN, YELLOW, ORANGE o RED)`);
      }
      const code = (row.divipola_code ?? "").trim();
      const intensity = integer(row.ash_intensity?.trim() ? row.ash_intensity : "0", "ash_intensity", 0, 3);
      if (eventType === "ASH_FALL" && (!code || intensity === 0)) {
        throw new InvalidRowError("Una caída de ceniza necesita municipio e intensidad entre 1 y 3");
      }
      return {
        event_type: eventType, activity_level: level, start_date: isoDate(row.start_date, "start_date"),
        divipola_code: code ? municipality(code, ctx) : null, ash_intensity: intensity,
        so2_tons_per_day: decimal(row.so2_tons_per_day, "so2_tons_per_day"),
      };
    },
  },
  trends: {
    name: "Búsquedas (Google Trends)", columns: ["term", "week_start", "interest"], optional: [],
    period: (n) => String(n.week_start), group: { column: "term", label: "Por término" },
    convert: (row) => {
      const term = row.term.trim().toLowerCase();
      if (!term) throw new InvalidRowError("Falta el término");
      const interest = decimal(row.interest, "interest");
      if (interest === null || interest < 0 || interest > 100) throw new InvalidRowError("El índice debe estar entre 0 y 100");
      return { term, week_start: isoDate(row.week_start, "week_start"), interest };
    },
  },
  pharmacy: {
    name: "Reportes de farmacia", columns: ["year", "epi_week", "category", "units", "pharmacy_id"], optional: ["pharmacy_id"],
    period: weekLabel, total: { column: "units", label: "unidades" }, group: { column: "category", label: "Por categoría" },
    convert: (row, ctx) => {
      const category = enumValue(row.category);
      if (!ctx.categories.includes(category)) {
        throw new InvalidRowError(`Categoría «${row.category}» no existe (${ctx.categories.join(", ")})`);
      }
      return {
        ...week(row), category, units: integer(row.units, "units", 0, 100_000),
        pharmacy_id: row.pharmacy_id?.trim() ? integer(row.pharmacy_id, "pharmacy_id", 1) : null,
      };
    },
  },
};
