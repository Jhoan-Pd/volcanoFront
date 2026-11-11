# volcanoFront

Web frontend of the **outbreak predictor for Pasto and the Galeras volcano area** (Nariño, Colombia).
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4, deployed on Vercel.

The backend (API gateway, gRPC prediction engine and realtime hub, one container) lives in the
[`volcano`](https://github.com/Jhoan-Pd/volcano) repository.

> **Language convention.** All code — identifiers, file names, comments, API fields — is English.
> Everything a user reads — texts, labels, page URLs (`/alertas`, `/mapa`, `?municipio=`) — is
> Spanish. The Spanish text for the API's English enum values lives in `src/lib/format.ts`.

## Quick start

```bash
# 1. Backend on http://localhost:10000 (in the volcano repository)
docker compose up

# 2. Frontend on http://localhost:3000
cp .env.example .env.local
npm ci
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Wakes the API up (Render's free plan sleeps) and builds for production |
| `npm run build:offline` | Production build without waiting for the API (what CI runs) |
| `npm start` | Serves the production build |
| `npm run typecheck` | `tsc --noEmit` |

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | yes | Public URL of the backend's edge proxy, no trailing slash |
| `NEXT_PUBLIC_REALTIME_URL` | no | Base URL of the realtime hub when it is not on the API's host (local runs without the proxy) |
| `REVALIDATE_SECRET` | production | Shared secret of `POST /api/revalidate`; must equal the backend's `REVALIDATE_SECRET` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | no | Enables Google Maps; without it the map uses Leaflet |

Never commit real values: set them in Vercel's project settings.

## Rendering patterns

Every page uses the pattern that fits how often its data changes, and shows a panel explaining how
it was rendered (`components/render/RenderPanel.tsx`).

| Pattern | Pages | Why |
|---|---|---|
| **SSG** | `/enfermedades`, `/enfermedades/[code]`, `/metodologia`, `/patrones` | Editorial content, built once |
| **ISR** | `/`, `/municipio/[id]` | Changes daily; cached 1 h and revalidated on demand by the backend |
| **SSR** | `/alertas`, `/reportes` | Depends on URL filters; rendered per request |
| **CSR** | `/mapa`, `/simulador`, `/admin`, `/farmacia`, `/login` | Interactive or private (token in the browser) |

On-demand revalidation: when the daily update or a retraining finishes, the backend calls
`POST /api/revalidate` (`Authorization: Bearer <REVALIDATE_SECRET>`), and announces it over the
realtime hub so open tabs refresh their server-rendered data (`components/LiveRefresh.tsx`).

## Realtime

`src/lib/realtime.ts` keeps **one WebSocket per browser tab** to the backend's hub (`/ws`), shared by
the alert banner, the live map and the simulator:

- lazy (opens with the first subscriber, closes with the last), with subscriptions replayed after
  every reconnection;
- exponential back-off with jitter, an application-level heartbeat watchdog, and an immediate
  reconnection when the API finishes waking up;
- graceful degradation: without the socket, alerts fall back to polling REST every 5 minutes.

Training progress uses Server-Sent Events over `fetch` (`src/lib/sse.ts`), because it is a POST that
carries the administrator's token.

## Web Workers

- `workers/csv.worker.ts` parses and validates CSV files off the main thread before they are
  uploaded (admin imports and the pharmacies' bulk upload). The rules mirror the backend's.
- `workers/sensitivity.worker.ts` opens its own WebSocket, sends a grid of scenarios to the
  simulator and assembles the sensitivity matrix.

## Project layout

```
src/
  api/          HTTP client, typed endpoints and the API's types (mirror of the backend schemas)
  app/          Routes (Spanish URLs), layout, server actions and the revalidation endpoint
  components/   UI primitives, dashboard widgets, admin panels, render-pattern panels
  context/      Session and theme providers
  lib/          Server fetch helpers, realtime client, hooks, formatting and Spanish labels
  views/        Client-side screens used by the CSR and ISR pages
  workers/      Web Workers and their typed message protocols
scripts/        Build helpers
```

## Deployment (Vercel)

1. Import the repository; the framework preset is Next.js (`vercel.json`).
2. Set the environment variables above.
3. On the backend, set `FRONTEND_URL` to the Vercel URL and add it to `CORS_ORIGINS`.
