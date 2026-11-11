"use client";

import { useEffect, useState } from "react";
import { RenderPanel, type PanelDetail } from "./RenderPanel";

/**
 * Panel for CSR pages: the "generation time" is the moment the browser mounted the page and started
 * requesting its data (it is empty in the server's HTML).
 */
export function CsrPanel({ why, details }: { why?: string; details?: PanelDetail[] }) {
  const [mountedAt, setMountedAt] = useState<string | null>(null);
  useEffect(() => setMountedAt(new Date().toISOString()), []);
  return <RenderPanel pattern="CSR" generatedAt={mountedAt} why={why} details={details} />;
}
