import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getBookings } from '../api/client';
import FlightSummary from '../components/FlightSummary';
import { useAsync } from '../hooks/useAsync';
import { fmtMoney } from '../lib/format';

export default function MyBookings() {
  const { data: bookings, loading, error, reload } = useAsync(getBookings);
  const [tab, setTab] = useState('upcoming');

  const now = Date.now();
  const list = (bookings ?? []).filter((b) =>
    tab === 'upcoming' ? b.status === 'confirmed' && new Date(b.departsAt) > now
      : b.status === 'cancelled' || new Date(b.departsAt) <= now);

  return (
    <>
      <h1>My bookings</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'upcoming' ? 'btn-primary' : ''}`} onClick={() => setTab('upcoming')}>Upcoming</button>
        <button className={`btn btn-sm ${tab === 'past' ? 'btn-primary' : ''}`} onClick={() => setTab('past')}>Past &amp; cancelled</button>
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error.message} <button className="btn btn-sm" onClick={reload}>Retry</button></p>}
      {bookings && list.length === 0 && <div className="empty panel"><p>Nothing here yet.</p><Link to="/">Search flights</Link></div>}
      {list.map((b) => (
        <Link to={`/bookings/${b.id}`} className="panel flight-card link-card" key={b.id}>
          <FlightSummary flight={b} />
          <div className="fares">
            <span className="pnr">{b.id}</span>
            <span className={`tag ${b.status}`}>{b.status}</span>
            <span className="muted small">{b.passengers.length} passenger{b.passengers.length > 1 ? 's' : ''}</span>
            <strong>{fmtMoney(b.total)}</strong>
          </div>
        </Link>
      ))}
    </>
  );
}
