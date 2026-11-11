import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="display-title text-5xl">404</p>
      <p className="mt-2 text-ink-2">Página no encontrada.</p>
      <Link href="/" className="underline-grow mt-4 inline-block text-sm font-medium">Volver al inicio</Link>
    </div>
  );
}
