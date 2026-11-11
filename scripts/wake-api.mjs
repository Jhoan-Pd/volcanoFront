// Before `next build`: wake up the backend on Render (free plan, it sleeps after 15 minutes).
// The build generates the SSG and ISR pages by fetching data from the API; if it were asleep, the
// home page would come out without data. It never fails the build: when the API does not answer,
// the pages use their fallback version and regenerate by themselves as soon as the API is back.
const base = (process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL ?? "").replace(/\/$/, "");
const isLocal = /localhost|127\.0\.0\.1/.test(base);
if (!base || (isLocal && !process.env.WAKE_LOCAL_API)) {
  console.log("[wake-api] No remote API configured: skipped.");
  process.exit(0);
}

const GIVE_UP_MS = 150_000;
const ATTEMPT_TIMEOUT_MS = 20_000;
const PAUSE_MS = 10_000;

const deadline = Date.now() + GIVE_UP_MS;
for (let attempt = 1; Date.now() < deadline; attempt++) {
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
    if (response.ok) {
      console.log(`[wake-api] API ready (${base}) on attempt ${attempt}.`);
      process.exit(0);
    }
  } catch { /* keep trying */ }
  console.log(`[wake-api] Attempt ${attempt}: the API is not answering yet…`);
  await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
}
console.log("[wake-api] The API did not answer; the build continues with fallback pages.");
