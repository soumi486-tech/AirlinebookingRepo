# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # http://localhost:3000 (PORT overrides), Express with Vite embedded as middleware (HMR); restarts on server/ or shared/ changes
npm run build    # vite build -> dist/
npm start        # production: Express serves dist/ + /api on $PORT (default 3000)
```

There is no test suite or linter configured. Verify API changes by running the dev server and hitting `/api/*` with curl. For booking endpoints, sign up a throwaway user with a cookie jar (`curl -c jar -H "Origin: http://localhost:PORT" -H "Content-Type: application/json" -d '{"name":"T","email":"t1@example.test","password":"test-pass-123"}' localhost:PORT/api/auth/sign-up/email`), pass `-b jar`, and delete `@example.test` users afterwards.

Requires Node >= 22 and `DATABASE_URL` (Neon serverless Postgres connection string) in `.env` or the environment. Without it, the server exits at startup.

## Architecture

**One process, one port, one deployable artifact.** This is a deliberate requirement: do not split the frontend and backend into separate servers or packages. `server/index.js` mounts the API at `/api`. In development (`--dev` flag) it then embeds Vite in middleware mode, sharing the HTTP server for HMR. Otherwise it serves `dist/` with an SPA fallback.

**Layers:**
- `src/`: React 18 SPA (react-router v6). All network access goes through `src/api/client.js`. A GET that returns 404 resolves to `null`; other errors throw with the server's `error` message.
- `server/api.js`: Express router with all routes and validation. Async handlers must be wrapped in `route()` (Express 4). Throw `HttpError(status, msg)` for client errors; anything else becomes a logged 500. Helpers live in `server/http.js`.
- `server/db.js`: Neon `Pool` (node-postgres-compatible over WebSockets). `migrate()` runs on every startup: applies the idempotent `server/schema.js`, then `server/seed.js`. Use `withTransaction(fn)` for multi-statement writes.
- `shared/`: rules (pricing, slots, ...) imported by both client (display) and server (authoritative).

**Where state lives:** Postgres tables `flights` (rolling 30-day timetable, topped up by `seed.js` on start), `bookings` (6-char PNR ids, flight/route/times/prices copied at booking time) and `booking_passengers` (one row per seat, `active` flag; partial unique index `(flight_id, seat) WHERE active` is the double-booking backstop). localStorage (prefix `skybook:`): last search, contact and passenger names. Never payment data (none exists). Airports, routes and the seat layout are code, not tables: `shared/airports.js` (drives the seed) and `shared/seats.js` (drives both the seat map UI and server validation).

**Trust boundary:** the client sends flight id, passengers (names + seats) and contact only. The server derives cabin from the seat (`shared/seats.js`), computes fare/taxes/total (`shared/pricing.js`, advance-purchase factor depends on "now"), and creates the booking in one transaction that locks the flight row `FOR UPDATE`. The displayed price can differ slightly from the final one; the booking response is authoritative. 23505 on the seat index maps to 409; a PNR collision (`bookings_pkey`) retries. Cancellation sets `active=false`, blocked within 2h of departure; other customers' bookings return 404.

**Time:** instants are UTC `timestamptz`; render in the airport zone (`src/lib/format.js`); search date = calendar day at the origin (`dayWindow` in `shared/time.js`).

**Authentication: Better Auth** (email + password, cookie sessions). `server/auth.js` configures it; `migrateAuth()` creates `user`/`session`/`account`/`verification` on every start; `index.js` mounts `/api/auth/*` BEFORE any body parser. `attachUser` sets `req.user`; `customerId(req)` returns the user id or throws 401, scoping every booking read and write (404 for other users' bookings). Search and flight/seat reads are public; booking pages are wrapped in `RequireAuth`. `bookings.customer_id` holds the user id as plain text (no FK). Bookings made before auth existed used random anonymous ids and are no longer reachable. No email verification or password reset exists.

## Gotchas

- Port 3000 may be taken by another app on this machine; run `PORT=3100 npm run dev` (PowerShell: `$env:PORT=3100; npm run dev`). Better Auth logs a harmless "Base URL is not set" warning locally; set `BETTER_AUTH_URL` (and `BETTER_AUTH_SECRET`, already in `.env`) when deploying.
- Dev watch-mode processes can linger after a shell exits and keep restarting on file edits; check for stray `node ... server/index.js --dev` processes before assuming a port is free.
- Postgres `numeric` columns come back as strings. Convert them with `toX` mappers before returning JSON.
- Don't read files under `server/` or `shared/` at runtime, and don't use `node --env-file`. On Windows, `node --watch-path` treats those reads as changes, causing a dev restart loop. `.env` is loaded in code by `server/env.js` (must stay the first import in `index.js`), and the schema is a JS module, not `.sql`.
- React, Vite and the router are devDependencies (build-time only). Run `npm run build` before pruning dev dependencies.
