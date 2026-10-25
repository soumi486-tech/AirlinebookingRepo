// One seat layout for every aircraft. Client draws it, server validates against it.
// Business: rows 1-3, 2-2 (A C | D F). Economy: rows 4-20, 3-3 (A B C | D E F).
export const CABINS = {
  business: { label: 'Business', firstRow: 1, lastRow: 3, cols: ['A', 'C', 'D', 'F'], aisleAfter: 'C' },
  economy: { label: 'Economy', firstRow: 4, lastRow: 20, cols: ['A', 'B', 'C', 'D', 'E', 'F'], aisleAfter: 'C' },
};

export function cabinSeats(cabin) {
  const { firstRow, lastRow, cols } = CABINS[cabin];
  const seats = [];
  for (let r = firstRow; r <= lastRow; r++) for (const c of cols) seats.push(`${r}${c}`);
  return seats;
}

export const ALL_SEATS = [...cabinSeats('business'), ...cabinSeats('economy')];
const SEAT_SET = new Set(ALL_SEATS);

export const isValidSeat = (seat) => SEAT_SET.has(seat);
export const cabinOf = (seat) => {
  if (!SEAT_SET.has(seat)) return null;
  return Number.parseInt(seat, 10) <= CABINS.business.lastRow ? 'business' : 'economy';
};
export const capacity = (cabin) => cabinSeats(cabin).length;
