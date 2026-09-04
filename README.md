# SIH26118 — H2S Exposure Dosimeter Reader

A system for reading and recording H2S exposure of refinery workers via a lead
acetate strip wristband. Two reading sources — phone camera (app) and hardware
sensor (ESP32 + TCS34725) — send to the same backend and database. A web
dashboard shows all records.

## Structure

- `backend/` — Node/Express API backed by Supabase (Postgres)
- `dashboard/` — Static HTML/CSS/JS web dashboard
- `app/` — React Native (Expo) mobile app
- `esp32/` — Hardware firmware (placeholder until hardware arrives)

## Setup

### Backend

```bash
cd backend
npm install
```

Fill in `backend/.env` with your Supabase project's URL and keys, then run
`backend/db/setup.sql` in the Supabase SQL Editor to create the `readings`
table. Start the server with `npm start`.

### Dashboard

Open `dashboard/index.html` directly, or serve the folder statically. Update
the `BACKEND_URL` constant at the top of `dashboard/app.js` once the backend
is deployed.

### App

```bash
cd app
npm install
npx expo install --fix
npx expo start
```

Update `BACKEND_URL` in `app/src/config/backend.ts` once the backend is
deployed. Admin PIN is hardcoded as `696969`.

## Deployment

The backend is deployed to Railway (root directory: `/backend`). Update
`BACKEND_URL` in both the dashboard and the app once the Railway URL is known.
