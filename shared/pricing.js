// Rules shared by the browser (for display) and the server (authoritative).
import { cabinOf } from './seats.js';

export const round2 = (n) => Math.round(n * 100) / 100;

export const CABIN_MULTIPLIER = { economy: 1, business: 2.8 };
export const TAX_RATE = 0.12;
export const FEE_PER_PASSENGER = 12;
export const MAX_PASSENGERS = 6;
export const CANCEL_CUTOFF_HOURS = 2;

// Buying earlier is cheaper; the last days are dearer.
export function advanceFactor(departsAt, now = new Date()) {
  const days = (new Date(departsAt) - now) / 86_400_000;
  if (days >= 21) return 0.85;
  if (days >= 14) return 0.95;
  if (days >= 7) return 1;
  if (days >= 3) return 1.15;
  return 1.35;
}

export const fareFor = (baseFare, cabin, departsAt, now = new Date()) =>
  round2(baseFare * CABIN_MULTIPLIER[cabin] * advanceFactor(departsAt, now));

// seats: ['4A', '4B'] -> per-passenger fares plus totals.
export function quote(baseFare, seats, departsAt, now = new Date()) {
  const passengers = seats.map((seat) => {
    const cabin = cabinOf(seat);
    return { seat, cabin, fare: fareFor(baseFare, cabin, departsAt, now) };
  });
  const fare = round2(passengers.reduce((s, p) => s + p.fare, 0));
  const taxes = round2(fare * TAX_RATE + FEE_PER_PASSENGER * seats.length);
  return { passengers, fare, taxes, total: round2(fare + taxes) };
}
