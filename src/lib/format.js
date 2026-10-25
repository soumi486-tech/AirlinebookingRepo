import { airportByCode } from '../../shared/airports.js';

const zoneOf = (code) => airportByCode(code)?.timezone ?? 'UTC';

// Always render instants in the airport's own zone, never the browser's.
export const fmtTime = (iso, code) =>
  new Intl.DateTimeFormat('en-US', { timeZone: zoneOf(code), hour: 'numeric', minute: '2-digit' }).format(new Date(iso));

export const fmtDate = (iso, code) =>
  new Intl.DateTimeFormat('en-US', { timeZone: zoneOf(code), weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(iso));

export const fmtMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function fmtDuration(fromIso, toIso) {
  const mins = Math.round((new Date(toIso) - new Date(fromIso)) / 60000);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, '0')}m`;
}

// Local calendar date (YYYY-MM-DD) for the date input default.
export function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
