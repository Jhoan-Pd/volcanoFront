"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button, Notice } from "@/components/ui";
import { reportNetworkFailure, SERVER_READY_EVENT } from "@/lib/serverStatus";

/**
 * Next.js error boundary: when a page could not get its data this is shown instead of breaking the
 * site. If the cause was the API being asleep, the page is requested again by itself once it wakes up.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();

  useEffect(() => {
    reportNetworkFailure();
    const retry = () => { router.refresh(); reset(); };
    window.addEventListener(SERVER_READY_EVENT, retry);
    return () => window.removeEventListener(SERVER_READY_EVENT, retry);
  }, [router, reset]);

  return (
    <div className="mx-auto max-w-xl space-y-3 py-10">
      <Notice kind="error">
        <p className="font-medium">No se pudo cargar esta página</p>
        <p className="mt-1">{error.digest ? "La API no respondió a tiempo." : error.message || "La API no respondió."}</p>
        <p className="mt-2 text-xs opacity-80">Si el servidor estaba dormido, esta página se recarga sola cuando responda.</p>
      </Notice>
      <Button onClick={() => { router.refresh(); reset(); }}>Intentar de nuevo</Button>
    </div>
  );
}
