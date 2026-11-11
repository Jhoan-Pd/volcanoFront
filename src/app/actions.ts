"use server";

import { revalidatePath } from "next/cache";

/**
 * Server Action: on-demand revalidation (on-demand ISR) from the panel's button.
 * It invalidates the cache of one ISR page so the next visit gets a new version, without waiting
 * for the `revalidate` window to expire.
 */
export async function revalidateNow(path: string): Promise<{ ok: boolean; message: string }> {
  if (path !== "/" && !/^\/municipio\/\d+$/.test(path)) {
    return { ok: false, message: "Ruta no permitida para revalidación" };
  }
  revalidatePath(path);
  return { ok: true, message: `Revalidada ${path}` };
}
