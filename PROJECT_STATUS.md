# Project Report — H2S Exposure Dosimeter Reader (SIH26118)

**Repo:** https://github.com/basilalfarooqui-cmyk/sih26118-h2s-reader

## 1. Backend (`/backend`)

Node/Express server (`server.js`), listening on `0.0.0.0:$PORT`.

Routes (`routes/readings.js`):

- `POST /readings` — insert a reading (`workerName`, `workerId`, `hexCode`, `source`, `timeRecorded`, optional `timeSynced`)
- `GET /readings` — list all, optional `?source=app|hardware` filter
- `GET /readings/worker/:workerId` — readings for one worker
- `DELETE /readings/:id` — delete one reading
- `DELETE /readings` — delete selected (`{ ids: [...] }`) or all
- `GET /health` — status check

Talks to Supabase via the `service_role` key (`services/supabase.js`).

**Deployed and live on Railway:** https://sih26118-h2s-reader-production.up.railway.app

## 2. Database (Supabase)

`readings` table created via `backend/db/setup.sql`: `id`, `worker_name`, `worker_id`, `hex_code`, `source` (checked `app`/`hardware`), `time_recorded`, `time_synced`, `created_at`, plus indexes on `worker_id`, `source`, `time_recorded`.

RLS is enabled on the table — safe because the backend only ever connects with `service_role` (bypasses RLS); the unused `anon` key has zero access.

## 3. Dashboard (`backend/public`)

Plain HTML/CSS/JS, no framework. Originally built as a standalone `/dashboard` folder meant for its own Railway service, then changed to be served as static files directly from the backend's Express server, so one Railway URL serves both the API and the dashboard automatically on every push (no second service to manage).

Features: search/filter, sortable columns, source toggle (App/Hardware), colored hex swatches, hamburger menu (export PDF/Excel, delete selected/all), 30s auto-refresh.

**Live at:** https://sih26118-h2s-reader-production.up.railway.app/

## 4. React Native App (`/app`)

Expo + TypeScript + expo-router, SafeAreaView on every screen.

Screens: Home → Normal/Admin Reading, PIN login (`696969`), Camera (hex extraction from center-crop average color), Record (Send Now / Save Locally), Saved Records (sync pending local records).

`BACKEND_URL` centralized in `app/src/config/backend.ts` — points at the live Railway URL.

## 5. ESP32

Placeholder only (`esp32/README.md`) — actual firmware pending hardware arrival (TCS34725 sensor), will use `source: "hardware"`.

## 6. Environment / tooling

- `backend/.env` holds real Supabase credentials (gitignored, never pushed).
- Same three vars set in Railway's Variables tab.
- Node.js v24.20.0 / npm 11.19.0 confirmed installed locally.

## Commits pushed (chronological)

1. `feat: backend server, readings endpoints`
2. `feat: add Supabase setup SQL script`
3. `feat: web dashboard, add delete endpoints to backend`
4. `feat: React Native app, esp32 placeholder, README`
5. `feat: enable RLS on readings table`
6. `feat: point dashboard and app at deployed Railway backend`
7. `feat: add static server for dashboard so it can deploy on Railway` (superseded)
8. `refactor: serve dashboard as static files from backend instead of a separate service`

## What's left

- Add real readings (currently 0 rows) — either via the app or by hand — to see the dashboard populated.
- ESP32 firmware once hardware arrives.
- Optional: build/publish the Expo app (APK or EAS build) if it needs to run on an actual phone rather than the Expo Go dev client.
