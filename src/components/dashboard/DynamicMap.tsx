"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Spinner } from "../ui";
import type { MapProps } from "./mapTypes";

/**
 * The maps need `window` and are heavy: they download separately and ONLY in the browser.
 * `ssr: false` is how Next.js says «this component is 100 % CSR».
 *
 * Progressive enhancement: with a Google Maps key (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) Google Maps is
 * used, with terrain and satellite; without a key, or when Google rejects it, Leaflet is used, which
 * needs no key. That way the map is never blank.
 */
const loading = () => <Spinner text="Cargando mapa…" />;
const LeafletMap = dynamic(() => import("./RiskMap"), { ssr: false, loading });
const GoogleMap = dynamic(() => import("./GoogleRiskMap"), { ssr: false, loading });

const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function DynamicMap(props: MapProps) {
  const [googleFailed, setGoogleFailed] = useState(false);
  const onFailure = useCallback(() => setGoogleFailed(true), []);
  if (GOOGLE_KEY && !googleFailed) return <GoogleMap {...props} apiKey={GOOGLE_KEY} onFailure={onFailure} />;
  return <LeafletMap {...props} />;
}
