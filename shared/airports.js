// Airports and routes. Timezones are IANA zones; all instants elsewhere are UTC.
export const AIRPORTS = [
  { code: 'JFK', city: 'New York', name: 'John F. Kennedy Intl', timezone: 'America/New_York' },
  { code: 'MIA', city: 'Miami', name: 'Miami Intl', timezone: 'America/New_York' },
  { code: 'ORD', city: 'Chicago', name: "O'Hare Intl", timezone: 'America/Chicago' },
  { code: 'LAX', city: 'Los Angeles', name: 'Los Angeles Intl', timezone: 'America/Los_Angeles' },
  { code: 'SFO', city: 'San Francisco', name: 'San Francisco Intl', timezone: 'America/Los_Angeles' },
  { code: 'SEA', city: 'Seattle', name: 'Seattle-Tacoma Intl', timezone: 'America/Los_Angeles' },
];

export const airportByCode = (code) => AIRPORTS.find((a) => a.code === code) ?? null;

// Each route flies both ways, twice a day.
export const ROUTES = [
  { a: 'JFK', b: 'LAX', minutes: 385, baseFare: 229 },
  { a: 'JFK', b: 'MIA', minutes: 190, baseFare: 129 },
  { a: 'JFK', b: 'ORD', minutes: 165, baseFare: 109 },
  { a: 'ORD', b: 'SFO', minutes: 270, baseFare: 169 },
  { a: 'LAX', b: 'SEA', minutes: 170, baseFare: 99 },
  { a: 'SFO', b: 'LAX', minutes: 85, baseFare: 79 },
  { a: 'MIA', b: 'ORD', minutes: 180, baseFare: 119 },
  { a: 'SEA', b: 'ORD', minutes: 235, baseFare: 149 },
];
