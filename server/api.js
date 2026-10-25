import express, { Router } from 'express';
import { randomInt } from 'node:crypto';
import { pool, withTransaction } from './db.js';
import { HttpError, route, customerId, attachUser } from './http.js';
import { AIRPORTS, airportByCode } from '../shared/airports.js';
import { CABINS, capacity, cabinOf, isValidSeat } from '../shared/seats.js';
import { CANCEL_CUTOFF_HOURS, MAX_PASSENGERS, fareFor, quote } from '../shared/pricing.js';
import { dayWindow, isDateString } from '../shared/time.js';

export const api = Router();
api.use(express.json());
api.use(attachUser); // sets req.user from the session cookie (null when signed out)

// Postgres numeric columns arrive as strings; the toX mappers Number() them.
const toFlight = (r, taken = []) => {
  const base = Number(r.base_fare);
  const seatsLeft = {};
  const fromFare = {};
  for (const cabin of Object.keys(CABINS)) {
    seatsLeft[cabin] = capacity(cabin) - taken.filter((s) => cabinOf(s) === cabin).length;
    fromFare[cabin] = fareFor(base, cabin, r.departs_at);
  }
  return {
    id: r.id, flightNo: r.flight_no, origin: r.origin, destination: r.destination,
    departsAt: r.departs_at.toISOString(), arrivesAt: r.arrives_at.toISOString(),
    baseFare: base, aircraft: r.aircraft, seatsLeft, fromFare,
  };
};

const toBooking = (r, passengers) => ({
  id: r.id, flightId: r.flight_id, flightNo: r.flight_no, origin: r.origin, destination: r.destination,
  departsAt: r.departs_at.toISOString(), arrivesAt: r.arrives_at.toISOString(),
  status: r.status, contact: r.contact,
  fare: Number(r.fare), taxes: Number(r.taxes), total: Number(r.total),
  createdAt: r.created_at.toISOString(), cancelledAt: r.cancelled_at?.toISOString() ?? null,
  passengers: passengers.map((p) => ({
    seat: p.seat, cabin: p.cabin, firstName: p.first_name, lastName: p.last_name, fare: Number(p.fare),
  })),
});

async function loadBookings(q, where, params) {
  const { rows } = await q.query(`SELECT * FROM bookings WHERE ${where} ORDER BY departs_at DESC`, params);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const { rows: pax } = await q.query(
    'SELECT * FROM booking_passengers WHERE booking_id = ANY($1) ORDER BY id', [ids]);
  return rows.map((r) => toBooking(r, pax.filter((p) => p.booking_id === r.id)));
}

const flightSelect = `
  SELECT f.*, COALESCE(array_agg(p.seat) FILTER (WHERE p.seat IS NOT NULL), '{}') AS taken
  FROM flights f
  LEFT JOIN booking_passengers p ON p.flight_id = f.id AND p.active`;

api.get('/health', route(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ ok: true });
}));

api.get('/airports', (req, res) => res.json(AIRPORTS));

api.get('/flights', route(async (req, res) => {
  const { from, to, date } = req.query;
  const origin = airportByCode(from);
  if (!origin || !airportByCode(to)) throw new HttpError(400, 'Choose valid airports');
  if (from === to) throw new HttpError(400, 'Origin and destination must differ');
  if (!isDateString(date)) throw new HttpError(400, 'Date must be YYYY-MM-DD');

  const { start, end } = dayWindow(date, origin.timezone);
  const { rows } = await pool.query(
    `${flightSelect}
     WHERE f.origin = $1 AND f.destination = $2 AND f.departs_at >= GREATEST($3::timestamptz, now())
       AND f.departs_at < $4::timestamptz
     GROUP BY f.id ORDER BY f.departs_at`,
    [from, to, start.toISOString(), end.toISOString()]);
  res.json(rows.map((r) => toFlight(r, r.taken)));
}));

api.get('/flights/:id', route(async (req, res) => {
  const { rows } = await pool.query(`${flightSelect} WHERE f.id = $1 GROUP BY f.id`, [req.params.id]);
  if (!rows.length) throw new HttpError(404, 'Flight not found');
  res.json({ ...toFlight(rows[0], rows[0].taken), occupied: rows[0].taken });
}));

// PNR alphabet skips look-alikes (0/O, 1/I).
const PNR_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newPnr = () => Array.from({ length: 6 }, () => PNR_CHARS[randomInt(PNR_CHARS.length)]).join('');

const NAME_RE = /^[\p{L}][\p{L} '.-]{0,39}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateBooking(body) {
  const { flightId, passengers, contact } = body ?? {};
  if (typeof flightId !== 'string' || !flightId) throw new HttpError(400, 'flightId is required');
  if (!Array.isArray(passengers) || passengers.length < 1 || passengers.length > MAX_PASSENGERS) {
    throw new HttpError(400, `Book 1 to ${MAX_PASSENGERS} passengers`);
  }
  const cleaned = passengers.map((p) => {
    const firstName = String(p?.firstName ?? '').trim();
    const lastName = String(p?.lastName ?? '').trim();
    if (!NAME_RE.test(firstName) || !NAME_RE.test(lastName)) throw new HttpError(400, 'Enter each passenger\'s first and last name');
    if (!isValidSeat(p?.seat)) throw new HttpError(400, `Invalid seat ${p?.seat ?? ''}`);
    return { firstName, lastName, seat: p.seat };
  });
  if (new Set(cleaned.map((p) => p.seat)).size !== cleaned.length) throw new HttpError(400, 'Each passenger needs a different seat');
  const email = String(contact?.email ?? '').trim();
  if (!EMAIL_RE.test(email) || email.length > 120) throw new HttpError(400, 'Enter a valid contact email');
  const phone = String(contact?.phone ?? '').trim().slice(0, 30);
  return { flightId, passengers: cleaned, contact: { email, phone } };
}

async function createBooking(tx, cid, { flightId, passengers, contact }) {
  const { rows: fl } = await tx.query('SELECT * FROM flights WHERE id = $1 FOR UPDATE', [flightId]);
  if (!fl.length) throw new HttpError(404, 'Flight not found');
  const flight = fl[0];
  if (flight.departs_at <= new Date()) throw new HttpError(400, 'That flight has already departed');

  const seats = passengers.map((p) => p.seat);
  const { rows: clash } = await tx.query(
    'SELECT seat FROM booking_passengers WHERE flight_id = $1 AND active AND seat = ANY($2)', [flightId, seats]);
  if (clash.length) throw new HttpError(409, `Seat ${clash.map((c) => c.seat).join(', ')} was just taken`);

  const q = quote(Number(flight.base_fare), seats, flight.departs_at);
  const id = newPnr();
  await tx.query(
    `INSERT INTO bookings (id, customer_id, flight_id, flight_no, origin, destination, departs_at, arrives_at,
                           contact, fare, taxes, total)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, cid, flight.id, flight.flight_no, flight.origin, flight.destination, flight.departs_at,
     flight.arrives_at, JSON.stringify(contact), q.fare, q.taxes, q.total]);
  for (const [i, p] of passengers.entries()) {
    const line = q.passengers[i];
    await tx.query(
      `INSERT INTO booking_passengers (booking_id, flight_id, seat, cabin, first_name, last_name, fare)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [id, flight.id, p.seat, line.cabin, p.firstName, p.lastName, line.fare]);
  }
  return (await loadBookings(tx, 'id = $1', [id]))[0];
}

api.post('/bookings', route(async (req, res) => {
  const cid = customerId(req);
  const input = validateBooking(req.body);
  for (let attempt = 0; ; attempt++) {
    try {
      const booking = await withTransaction((tx) => createBooking(tx, cid, input));
      return res.status(201).json(booking);
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'bookings_pkey' && attempt < 4) continue; // PNR collision
      if (err.code === '23505' && err.constraint === 'booking_passengers_active_seat') {
        throw new HttpError(409, 'One of those seats was just taken');
      }
      throw err;
    }
  }
}));

api.get('/bookings', route(async (req, res) => {
  res.json(await loadBookings(pool, 'customer_id = $1', [customerId(req)]));
}));

api.get('/bookings/:id', route(async (req, res) => {
  const [booking] = await loadBookings(pool, 'id = $1 AND customer_id = $2', [req.params.id, customerId(req)]);
  if (!booking) throw new HttpError(404, 'Booking not found');
  res.json(booking);
}));

api.post('/bookings/:id/cancel', route(async (req, res) => {
  const cid = customerId(req);
  const booking = await withTransaction(async (tx) => {
    const { rows } = await tx.query(
      'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2 FOR UPDATE', [req.params.id, cid]);
    if (!rows.length) throw new HttpError(404, 'Booking not found');
    if (rows[0].status === 'confirmed') {
      const hours = (rows[0].departs_at - new Date()) / 3_600_000;
      if (hours < CANCEL_CUTOFF_HOURS) {
        throw new HttpError(409, `Bookings can't be cancelled within ${CANCEL_CUTOFF_HOURS} hours of departure`);
      }
      await tx.query("UPDATE bookings SET status = 'cancelled', cancelled_at = now() WHERE id = $1", [rows[0].id]);
      await tx.query('UPDATE booking_passengers SET active = false WHERE booking_id = $1', [rows[0].id]);
    }
    return (await loadBookings(tx, 'id = $1', [rows[0].id]))[0];
  });
  res.json(booking);
}));

api.use((req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
api.use((err, req, res, next) => {
  if (!err.status) console.error(err);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});
