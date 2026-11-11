/**
 * Shown while a server page (SSR or an ISR regeneration) waits for the API. A skeleton shaped like
 * the page avoids layout shift and makes it clear something is loading; the global notice under the
 * header explains whether the server is waking up.
 */
function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Cargando la página">
      <Block className="h-12 w-full" />
      <div className="space-y-3">
        <Block className="h-3 w-48" />
        <Block className="h-12 w-3/4 max-w-2xl" />
        <Block className="h-4 w-full max-w-3xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <Block key={i} className="h-36" />)}
      </div>
      <Block className="h-72 w-full" />
      <span className="sr-only">Consultando la API…</span>
    </div>
  );
}
