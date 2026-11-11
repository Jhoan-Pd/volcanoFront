import type { MunicipalityRisk, RiskLevel } from "@/api/types";

// Kept apart from RiskMap.tsx: Leaflet touches `window` when imported, so that module only loads in
// the browser (next/dynamic with ssr: false); this one is safe on the server.
export type MapMode = "current" | "predicted";

/** The level painted for a municipality given the mode and the chosen disease ("" = the worst one). */
export function levelOf(row: MunicipalityRisk, mode: MapMode, diseaseCode: string): RiskLevel {
  const levels = mode === "current" ? row.levels : row.predicted_levels;
  if (diseaseCode) return levels[diseaseCode] ?? "GREEN";
  if (mode === "predicted") return row.max_predicted_level ?? "GREEN";
  return row.max_level;
}

/** Props shared by the two maps (Google Maps and Leaflet). */
export interface MapProps {
  rows: MunicipalityRisk[];
  mode: MapMode;
  diseaseCode: string;
  diseases: { code: string; name: string }[];
  selectedId: number | null;
  onSelect: (municipalityId: number) => void;
}

/** Galeras volcano crater (Servicio Geológico Colombiano). */
export const GALERAS = { lat: 1.2208, lng: -77.3592 };
export const REFERENCE_RADIUS_KM = 15;
