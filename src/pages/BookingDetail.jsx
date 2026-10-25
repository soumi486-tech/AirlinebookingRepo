import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { cancelBooking, getBooking } from '../api/client';
import FlightSummary from '../components/FlightSummary';
import { useAsync } from '../hooks/useAsync';
import { fmtMoney } from '../lib/format';
import { CANCEL_CUTOFF_HOURS } from '../../shared/pricing.js';

export default function BookingDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { data: booking, loading, error, reload } = useAsync(() => getBooking(id), [id]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  if (loading) return <p className="muted">Loading booking…</p>;
  if (error) return <p className="error">{error.message}</p>;
  if (!booking) return <div className="empty"><h1>Booking not found</h1><Link to="/bookings">My bookings</Link></div>;

  async function cancel() {
    if (!window.confirm('Cancel this booking? Your seats will be released.')) return;
    setBusy(true);
    setMsg('');
    try {
      await cancelBooking(booking.id);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  const cancelled = booking.status === 'cancelled';
  return (
    <>
      {params.get('new') && !cancelled && <div className="panel banner">Booking confirmed! Keep your reference below.</div>}
      <h1>Booking <span className="pnr">{booking.id}</span> <span className={`tag ${booking.status}`}>{booking.status}</span></h1>
      <div className="panel"><FlightSummary flight={booking} /></div>
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>Passengers</h2>
        {booking.passengers.map((p) => (
          <div className="sum" key={p.seat}>
            <span>{p.firstName} {p.lastName} · Seat {p.seat} ({p.cabin})</span><span>{fmtMoney(p.fare)}</span>
          </div>
        ))}
        <div className="sum"><span>Taxes &amp; fees</span><span>{fmtMoney(booking.taxes)}</span></div>
        <div className="sum total"><span>Total</span><span>{fmtMoney(booking.total)}</span></div>
        <p className="muted small">Confirmation sent to {booking.contact.email} (demo: no email is actually sent).</p>
      </div>
      {msg && <p className="error">{msg}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        {!cancelled && (
          <button className="btn" onClick={cancel} disabled={busy}>Cancel booking</button>
        )}
        <Link to="/bookings">My bookings</Link>
        {!cancelled && <span className="muted small">Cancellation closes {CANCEL_CUTOFF_HOURS} hours before departure.</span>}
      </div>
    </>
  );
}
