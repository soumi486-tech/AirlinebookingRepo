// Data access layer: thin wrappers around the Express REST API.
// Pages never call fetch directly.

// Same-origin requests carry the Better Auth session cookie automatically. A 401 means signed out:
// the error has `status` 401 so pages can send the user to /login.
async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 404 && method === 'GET') return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}

export const getHealth = () => request('/health');
export const getAirports = () => request('/airports');
export const searchFlights = ({ from, to, date }) =>
  request(`/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}`);
export const getFlight = (id) => request(`/flights/${encodeURIComponent(id)}`);
export const createBooking = (payload) => request('/bookings', { method: 'POST', body: payload });
export const getBookings = () => request('/bookings');
export const getBooking = (id) => request(`/bookings/${encodeURIComponent(id)}`);
export const cancelBooking = (id) => request(`/bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST' });
