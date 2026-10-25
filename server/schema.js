// Idempotent schema, applied on every server start. Keep it a JS module (not .sql):
// reading files under server/ at runtime triggers dev restart loops on Windows.
export const schema = `
CREATE TABLE IF NOT EXISTS flights (
  id          text PRIMARY KEY,
  flight_no   text NOT NULL,
  origin      text NOT NULL,
  destination text NOT NULL,
  departs_at  timestamptz NOT NULL,
  arrives_at  timestamptz NOT NULL CHECK (arrives_at > departs_at),
  base_fare   numeric(10,2) NOT NULL CHECK (base_fare >= 0),
  aircraft    text NOT NULL DEFAULT 'A320'
);
CREATE INDEX IF NOT EXISTS flights_search_idx ON flights (origin, destination, departs_at);

CREATE TABLE IF NOT EXISTS bookings (
  id          text PRIMARY KEY,                 -- 6-char PNR
  customer_id text NOT NULL,
  flight_id   text NOT NULL REFERENCES flights (id),
  flight_no   text NOT NULL,                    -- copied at booking time
  origin      text NOT NULL,
  destination text NOT NULL,
  departs_at  timestamptz NOT NULL,
  arrives_at  timestamptz NOT NULL,
  status      text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  contact     jsonb NOT NULL,
  fare        numeric(10,2) NOT NULL,
  taxes       numeric(10,2) NOT NULL,
  total       numeric(10,2) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
CREATE INDEX IF NOT EXISTS bookings_customer_idx ON bookings (customer_id, departs_at DESC);

CREATE TABLE IF NOT EXISTS booking_passengers (
  id         serial PRIMARY KEY,
  booking_id text NOT NULL REFERENCES bookings (id),
  flight_id  text NOT NULL REFERENCES flights (id),
  seat       text NOT NULL,
  cabin      text NOT NULL,
  first_name text NOT NULL,
  last_name  text NOT NULL,
  fare       numeric(10,2) NOT NULL,
  active     boolean NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS booking_passengers_active_seat
  ON booking_passengers (flight_id, seat) WHERE active;
CREATE INDEX IF NOT EXISTS booking_passengers_booking_idx ON booking_passengers (booking_id);
`;
