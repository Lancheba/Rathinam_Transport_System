# Rathinam Transport System — Frontend

React + TypeScript + Vite dashboard for the [Rathinam Smart Bus Parking & Transport
System](../README.md). See the root README for the full project overview, backend setup,
deployment and API reference — this file only covers the frontend.

## Stack

- React 19, TypeScript, Vite 8, React Router 7
- `axios` for API calls (`src/api/client.ts`), proxied to `/api` in dev
- `face-api.js` for in-browser face embeddings, `jsqr` for QR scanning
- `lucide-react` icons, `@fontsource` (Plus Jakarta Sans, Caveat)
- `oxlint` for linting

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000, proxies /api to http://127.0.0.1:8000
```

Run the Django backend (see the root README) alongside this for a working app.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with the `/api` proxy |
| `npm run build` | Type-check (`tsc -b`) then build for production |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run `oxlint` |

## Environment variables

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Backend API base URL, e.g. `https://<app>.up.railway.app/api`. Leave unset locally — the dev server proxies `/api` to `http://127.0.0.1:8000` instead |

## Project layout

```
src/
  api/          Axios client and typed API endpoint wrappers
  components/   Shared UI (nav, cards, QR display, style helpers, etc.)
  context/      React context providers (auth, theme, ...)
  hooks/        Shared hooks
  pages/        One file per route/screen (see below)
  types/        Shared TypeScript types
  utils/        Helpers (e.g. face-scan guidance)
public/models/  face-api.js model weights, served statically
```

Pages, by role area: `LandingPage`, `LoginPage`, `SignUpPage`; `Dashboard`, `BusesPage`,
`ParkingPage`, `BusFinder`, `OptimizePage`, `SensorsPage`; `AttendanceReportPage`,
`AttendanceAnalyticsPage`, `AttendanceFlagsPage`, `CombinedCabsPage`, `HistoryPage`,
`DriverAttendancePage`, `InchargeAttendancePage`, `ScanAttendancePage`, `FaceEnrollmentPage`,
`MyAttendancePage`; `StudentsPage`, `DriverStudentsPage`, `InchargeStudentsPage`, `PeoplePage`,
`MyBusPage`, `ReportsPage`, `FeedbackPage`, `SettingsPage`.

## Notes

- File encoding must be UTF-8 — a non-UTF-8 source file (e.g. an em dash pasted from Word) breaks
  the Vite/Rolldown production build.
- `vercel.json` rewrites all routes to `index.html` for client-side routing.
- There is no configured test runner yet (no test files, and `vitest` isn't a dependency despite
  the `test` script in `package.json`); `npm run build`'s type-check is the current safety net.
