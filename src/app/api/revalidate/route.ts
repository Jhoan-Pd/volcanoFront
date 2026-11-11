/**
 * Route Handler: on-demand revalidation triggered by the BACKEND (the daily update and every model
 * retraining). Protected with a shared secret:
 *
 *   POST /api/revalidate   Authorization: Bearer <REVALIDATE_SECRET>
 *
 * It invalidates the home page and EVERY /municipio/[id] dashboard (revalidatePath with the dynamic
 * pattern and type "page"). Vercel regenerates them on the next visit.
 */
import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

const PATHS = ["/", "/municipio/[id]"] as const;

function authorized(received: string | null, secret: string | undefined): boolean {
  if (!secret || !received) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(received);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(request: NextRequest) {
  if (!authorized(request.headers.get("authorization"), process.env.REVALIDATE_SECRET)) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Secreto inválido" } }, { status: 401 });
  }
  revalidatePath("/");
  revalidatePath("/municipio/[id]", "page");
  return NextResponse.json({ paths: PATHS, revalidated_at: new Date().toISOString() });
}
