"use client";

import {
  APILoadingStatus, APIProvider, Circle, InfoWindow, Map as GoogleMap, Marker, useApiLoadingStatus, useMap,
} from "@vis.gl/react-google-maps";
import { useEffect, useMemo, useState } from "react";
import type { MunicipalityRisk, RiskLevel } from "@/api/types";
import { useTheme } from "@/context/ThemeContext";
import { LEVELS, levelRank } from "@/lib/format";
import { LevelsTable, MapLegend } from "./MapParts";
import { GALERAS, levelOf, REFERENCE_RADIUS_KM, type MapProps } from "./mapTypes";

const LOAD_TIMEOUT_MS = 10_000;

// Fixed traffic-light colors (Google Maps cannot read CSS variables)
const LEVEL_COLORS: Record<RiskLevel, string> = { GREEN: "#0ca30c", YELLOW: "#fab219", ORANGE: "#ec835a", RED: "#d03b3b" };

const VOLCANO_ICON = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="29" viewBox="0 0 28 24"><path d="M2 22 L11 6 L14 9 L17 5 L26 22 Z" fill="#b8692a" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><circle cx="19" cy="3" r="1.6" fill="#a8a29e"/></svg>`)}`;

// Night style (dark theme only); with a mapId, client-side styles would not be allowed
const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a0a0a0" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#121212" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1a26" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];
const LIGHT_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

type Props = MapProps & { onFailure: () => void };

/**
 * Risk map on Google Maps: terrain by default (the Galeras cone and the valleys of the
 * municipalities are visible), switchable to road map or satellite. When the key fails (domain
 * restriction, API not enabled or no billing) `onFailure` is called and the Leaflet map takes over.
 */
export default function GoogleRiskMap({ apiKey, ...props }: Props & { apiKey: string }) {
  return (
    <APIProvider apiKey={apiKey} language="es" region="CO">
      <MapContent {...props} />
    </APIProvider>
  );
}

function MapContent({ rows, mode, diseaseCode, diseases, selectedId, onSelect, onFailure }: Props) {
  const status = useApiLoadingStatus();
  const { theme } = useTheme();
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    if (status === APILoadingStatus.FAILED || status === APILoadingStatus.AUTH_FAILURE) onFailure();
  }, [status, onFailure]);

  // When Google does not finish loading in time (slow or blocked network), fall back to Leaflet
  useEffect(() => {
    if (status === APILoadingStatus.LOADED) return;
    const id = setTimeout(onFailure, LOAD_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [status, onFailure]);

  // Municipalities with more risk are drawn on top
  const sorted = useMemo(() => [...rows].sort((a, b) =>
    levelRank(levelOf(a, mode, diseaseCode)) - levelRank(levelOf(b, mode, diseaseCode))), [rows, mode, diseaseCode]);
  const openRow = rows.find((r) => r.municipality_id === openId);

  // `google.maps` (Size, Point, SymbolPath) only exists once the script finished loading
  if (status !== APILoadingStatus.LOADED) {
    return <div className="flex h-80 items-center justify-center rounded-lg border border-line text-sm text-muted sm:h-[26rem]">Cargando Google Maps…</div>;
  }

  return (
    <div className="relative isolate h-80 overflow-hidden rounded-lg border border-line sm:h-[26rem]">
      <GoogleMap className="h-full w-full" defaultCenter={GALERAS} defaultZoom={10} mapTypeId="terrain"
        styles={theme === "dark" ? DARK_STYLE : LIGHT_STYLE} gestureHandling="cooperative"
        mapTypeControl mapTypeControlOptions={{ mapTypeIds: ["roadmap", "terrain", "hybrid"] }}
        streetViewControl={false} fullscreenControl clickableIcons={false} backgroundColor="var(--surface-2)">
        <FitBounds rows={rows} />
        <Circle center={GALERAS} radius={REFERENCE_RADIUS_KM * 1000} clickable={false}
          strokeColor="#b8692a" strokeOpacity={0.8} strokeWeight={1.5} fillColor="#b8692a" fillOpacity={0.06} />
        <Marker position={GALERAS} title={`Volcán Galeras · radio de referencia de ${REFERENCE_RADIUS_KM} km`} zIndex={1}
          icon={{ url: VOLCANO_ICON, scaledSize: new google.maps.Size(34, 29), anchor: new google.maps.Point(17, 27) }} />
        {sorted.map((row, i) => {
          const level = levelOf(row, mode, diseaseCode);
          const selected = row.municipality_id === selectedId;
          return (
            <Marker key={row.municipality_id} position={{ lat: row.latitude, lng: row.longitude }} zIndex={10 + i}
              title={`${row.municipality}: riesgo ${LEVELS[level].label.toLowerCase()}`}
              onClick={() => { setOpenId(row.municipality_id); onSelect(row.municipality_id); }}
              icon={{ path: google.maps.SymbolPath.CIRCLE, scale: selected ? 13 : 10, fillColor: LEVEL_COLORS[level],
                      fillOpacity: 0.95, strokeColor: "#ffffff", strokeWeight: selected ? 3 : 2,
                      labelOrigin: new google.maps.Point(0, -2.4) }}
              label={{ text: row.municipality, fontSize: "12px", fontWeight: "600",
                       color: theme === "dark" ? "#ffffff" : "#1a1a1a", className: "google-map-label" }} />
          );
        })}
        {openRow && (
          <InfoWindow position={{ lat: openRow.latitude, lng: openRow.longitude }}
            pixelOffset={[0, -14]} onCloseClick={() => setOpenId(null)} headerContent={
              <p className="text-sm font-semibold text-neutral-900">{openRow.municipality}</p>}>
            <LevelsTable row={openRow} diseases={diseases} className="text-neutral-800" />
          </InfoWindow>
        )}
      </GoogleMap>
      <MapLegend className="bottom-6 z-[1]" />
    </div>
  );
}

/** Fits the view so every municipality and the volcano are visible (once per set of municipalities). */
function FitBounds({ rows }: { rows: MunicipalityRisk[] }) {
  const map = useMap();
  const key = rows.map((r) => r.municipality_id).join(",");
  useEffect(() => {
    if (!map || !rows.length) return;
    const bounds = new google.maps.LatLngBounds(GALERAS);
    rows.forEach((r) => bounds.extend({ lat: r.latitude, lng: r.longitude }));
    map.fitBounds(bounds, 48);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the set of municipalities changes
  }, [map, key]);
  return null;
}
