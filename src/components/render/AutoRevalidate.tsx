"use client";

import { useEffect } from "react";
import { revalidateNow } from "@/app/actions";

/**
 * Included only in the fallback version of an ISR page (when the API did not answer while it was
 * generated). On mount it asks to revalidate the path: the next visit already gets the version with data.
 */
export function AutoRevalidate({ path }: { path: string }) {
  useEffect(() => { void revalidateNow(path); }, [path]);
  return null;
}
