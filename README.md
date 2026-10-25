# SkyBook

Search flights, pick seats and book

React + Vite frontend and a Node.js + Express API, run as **one process on one port**. Express serves both
`/api/*` and the React app. Data is stored in Neon serverless Postgres.

## Setup

1. Create a Neon project and copy its pooled connection string (never commit it).
2. `cp .env.example .env` and set `DATABASE_URL`.

On startup the server creates the tables (`server/schema.js`) and seeds an empty database (`server/seed.js`).

## Run

```bash
npm install
npm run dev        # http://localhost:3000, Vite runs inside Express with hot reload
```

## Deploy (single artifact)

```bash
npm ci
npm run build      # builds the React app into dist/
npm start          # Express serves dist/ + /api on $PORT (default 3000)
```

Or build the included `Dockerfile`. React/Vite are dev dependencies (build-time only), so build before pruning.

| Env var        | Default | Purpose                                    |
|----------------|---------|--------------------------------------------|
| `DATABASE_URL` | none    | Neon serverless Postgres connection string (required)  |
| `PORT`         | `3000`  | HTTP port                                  |
| `BETTER_AUTH_SECRET` | none | Session signing secret, 32+ chars (required) |
| `BETTER_AUTH_URL` | inferred locally | Public URL of the app (required in production) |

Never commit `.env`.

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | Liveness check |
| GET | `/api/airports` | Airport list |
| GET | `/api/flights?from=&to=&date=YYYY-MM-DD` | Future flights that day (origin local), fares + seats left |
| GET | `/api/flights/:id` | Flight with occupied seats |
| POST | `/api/bookings` | `{flightId, passengers:[{firstName,lastName,seat}], contact:{email,phone}}` -> 201; 409 seat taken |
| * | `/api/auth/*` | Better Auth: sign-up, sign-in, sign-out, session |
| GET | `/api/bookings` | Signed-in user's bookings (401 when signed out) |
| GET | `/api/bookings/:id` | Owner only (404 otherwise) |
| POST | `/api/bookings/:id/cancel` | Owner only; blocked within 2h of departure; idempotent |

## Structure

```
server/   index.js (entry), api.js (routes), http.js (helpers), db.js, schema.js, seed.js, env.js
shared/   rules used by both client and server
src/      React app (api/client.js wraps fetch calls to /api)
```
