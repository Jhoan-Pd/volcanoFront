"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useMemo } from "react";
import { Circle, CircleMarker, LayersControl, MapContainer, Marker, Popup, TileLayer, Tooltip } from "react-leaflet";
import { useTheme } from "@/context/ThemeContext";
import { LEVELS, levelRank } from "@/lib/format";
import { LevelsTable, MapLegend } from "./MapParts";
import { GALERAS, levelOf, REFERENCE_RADIUS_KM, type MapProps } from "./mapTypes";

const CRATER: [number, number] = [GALERAS.lat, GALERAS.lng];

const volcanoIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="24" viewBox="0 0 28 24" aria-hidden="true">
    <path d="M2 22 L11 6 L14 9 L17 5 L26 22 Z" fill="#b8692a" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="19" cy="3" r="1.6" fill="#a8a29e"/></svg>`,
  iconSize: [28, 24],
  iconAnchor: [14, 22],
});

/** Risk map on Leaflet (no API key needed): the fallback when Google Maps is not available. */
export default function RiskMap({ rows, mode, diseaseCode, diseases, selectedId, onSelect }: MapProps) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const bounds = useMemo(
    () => L.latLngBounds([...rows.map((r) => [r.latitude, r.longitude] as [number, number]), CRATER]).pad(0.25), [rows]);
  // Municipalities with more risk are drawn on top
  const sorted = [...rows].sort((a, b) => levelRank(levelOf(a, mode, diseaseCode)) - levelRank(levelOf(b, mode, diseaseCode)));

  return (
    <div className="relative isolate h-80 overflow-hidden rounded-lg border border-line sm:h-[26rem]">
      <MapContainer bounds={bounds} scrollWheelZoom={false} className="h-full w-full" style={{ background: "var(--surface-2)" }}
        attributionControl>
        {/* Keyless layers: the terrain shows the Galeras cone and the valleys of the municipalities */}
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Relieve">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri — Esri, HERE, Garmin, USGS, NGA" maxZoom={18} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satélite">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="Tiles &copy; Esri — Maxar, Earthstar Geographics" maxZoom={18} />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name={dark ? "Mapa oscuro" : "Mapa claro"}>
            <TileLayer key={theme}
              url={`https://{s}.basemaps.cartocdn.com/${dark ? "dark_all" : "light_all"}/{z}/{x}/{y}{r}.png`}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' />
          </LayersControl.BaseLayer>
        </LayersControl>
        <Circle center={CRATER} radius={REFERENCE_RADIUS_KM * 1000} interactive={false}
          pathOptions={{ color: "#b8692a", weight: 1, dashArray: "4 6", fillOpacity: 0.04 }} />
        <Marker position={CRATER} icon={volcanoIcon}>
          <Tooltip direction="top" offset={[0, -18]}>Volcán Galeras · radio de referencia de {REFERENCE_RADIUS_KM} km</Tooltip>
        </Marker>
        {sorted.map((row) => {
          const level = levelOf(row, mode, diseaseCode);
          const selected = row.municipality_id === selectedId;
          return (
            <CircleMarker key={`${row.municipality_id}-${mode}-${diseaseCode}-${theme}`} center={[row.latitude, row.longitude]}
              radius={selected ? 15 : 12}
              pathOptions={{ color: dark ? "#1a1918" : "#ffffff", weight: selected ? 3 : 2,
                             fillColor: LEVELS[level].color, fillOpacity: 0.92 }}
              eventHandlers={{ click: () => onSelect(row.municipality_id) }}>
              <Tooltip direction="right" offset={[12, 0]} permanent className="map-label">
                {row.municipality}
              </Tooltip>
              <Popup>
                <p className="mb-1 text-sm font-semibold">{row.municipality}</p>
                <LevelsTable row={row} diseases={diseases} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <MapLegend className="bottom-2 z-[1000]" />
    </div>
  );
}
