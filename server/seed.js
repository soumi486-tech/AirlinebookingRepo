// Generates a rolling 30-day timetable. Safe to run on every start: it is a no-op while the
// timetable already reaches 25+ days ahead, otherwise it tops up (ON CONFLICT DO NOTHING).
import { AIRPORTS, ROUTES, airportByCode } from '../shared/airports.js';
import { addDays, zonedTimeToUtc } from '../shared/time.js';

const DAYS = 30;

function buildFlights(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const directions = ROUTES.flatMap((r) => [
    { from: r.a, to: r.b, minutes: r.minutes, baseFare: r.baseFare },
    { from: r.b, to: r.a, minutes: r.minutes, baseFare: r.baseFare },
  ]);
  const rows = [];
  directions.forEach((dir, i) => {
    const tz = airportByCode(dir.from).timezone;
    const times = [
      `${String(6 + (i % 5)).padStart(2, '0')}:${i % 2 ? '30' : '10'}`,
      `${16 + (i % 4)}:45`,
    ];
    times.forEach((time, n) => {
      const flightNo = `SB${100 + i * 2 + n}`;
      for (let d = 0; d < DAYS; d++) {
        const date = addDays(today, d);
        const departs = zonedTimeToUtc(date, time, tz);
        if (departs <= now) continue;
        const arrives = new Date(departs.getTime() + dir.minutes * 60_000);
        rows.push({
          id: `${flightNo}-${date.replaceAll('-', '')}`,
          flightNo, origin: dir.from, destination: dir.to,
          departs: departs.toISOString(), arrives: arrives.toISOString(),
          baseFare: dir.baseFare, aircraft: n ? 'B737' : 'A320',
        });
      }
    });
  });
  return rows;
}

export async function seed(pool, withTransaction) {
  const { rows } = await pool.query(
    `SELECT (max(departs_at) > now() + interval '25 days') AS fresh FROM flights`);
  if (rows[0].fresh) return;

  const flights = buildFlights();
  await withTransaction(async (tx) => {
    await tx.query(
      `INSERT INTO flights (id, flight_no, origin, destination, departs_at, arrives_at, base_fare, aircraft)
       SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::timestamptz[], $6::timestamptz[], $7::numeric[], $8::text[])
       ON CONFLICT (id) DO NOTHING`,
      [
        flights.map((f) => f.id), flights.map((f) => f.flightNo), flights.map((f) => f.origin),
        flights.map((f) => f.destination), flights.map((f) => f.departs), flights.map((f) => f.arrives),
        flights.map((f) => f.baseFare), flights.map((f) => f.aircraft),
      ],
    );
  });
  console.log(`Seeded timetable: ${flights.length} flights across ${AIRPORTS.length} airports`);
}
