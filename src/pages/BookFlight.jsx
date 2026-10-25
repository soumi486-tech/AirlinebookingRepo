import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { createBooking, getFlight } from '../api/client';
import { storage } from '../api/storage';
import FlightSummary from '../components/FlightSummary';
import SeatMap from '../components/SeatMap';
import { useAsync } from '../hooks/useAsync';
import { fmtMoney } from '../lib/format';
import { MAX_PASSENGERS, quote } from '../../shared/pricing.js';

export default function BookFlight() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const count = Math.min(MAX_PASSENGERS, Math.max(1, Number(params.get('pax')) || 1));
  const { data: flight, loading, error, reload } = useAsync(() => getFlight(id), [id]);

  // Names and contact persist in localStorage (never payment data).
  const [pax, setPax] = useState(() => {
    const saved = storage.get('passengers', []);
    return Array.from({ length: count }, (_, i) => ({ firstName: saved[i]?.firstName ?? '', lastName: saved[i]?.lastName ?? '', seat: '' }));
  });
  const [contact, setContact] = useState(() => storage.get('contact', { email: '', phone: '' }));
  const [active, setActive] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading) return <p className="muted">Loading flight…</p>;
  if (error) return <p className="error">{error.message}</p>;
  if (!flight) return <div className="empty"><h1>Flight not found</h1><Link to="/">Back to search</Link></div>;

  const selected = Object.fromEntries(pax.flatMap((p, i) => (p.seat ? [[p.seat, i]] : [])));
  const seats = pax.map((p) => p.seat).filter(Boolean);
  const price = seats.length ? quote(flight.baseFare, seats, flight.departsAt) : null;
  const ready = pax.every((p) => p.seat && p.firstName.trim() && p.lastName.trim()) && contact.email.trim();

  function pick(seat) {
    setFormError('');
    setPax((list) => {
      const owner = list.findIndex((p) => p.seat === seat);
      const next = list.map((p) => ({ ...p }));
      if (owner === active) { next[active].seat = ''; return next; } // click own seat again to clear
      if (owner >= 0) next[owner].seat = '';
      next[active].seat = seat;
      return next;
    });
    const nextEmpty = pax.findIndex((p, i) => i !== active && !p.seat);
    if (nextEmpty >= 0) setActive(nextEmpty);
  }

  const setName = (i, key, value) => setPax((list) => list.map((p, j) => (j === i ? { ...p, [key]: value } : p)));

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const booking = await createBooking({ flightId: flight.id, passengers: pax, contact });
      storage.set('passengers', pax.map(({ firstName, lastName }) => ({ firstName, lastName })));
      storage.set('contact', contact);
      navigate(`/bookings/${booking.id}?new=1`);
    } catch (err) {
      setFormError(err.message);
      reload(); // refresh occupied seats after a conflict
      setPax((list) => list.map((p) => ({ ...p, seat: '' })));
      setActive(0);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <h1>Choose seats</h1>
      <div className="panel"><FlightSummary flight={flight} /></div>
      <div className="layout-2col" style={{ marginTop: 20 }}>
        <div className="panel">
          <p className="muted small">Select a passenger, then click a seat. Taken seats are greyed out.</p>
          <SeatMap occupied={flight.occupied} selected={selected} onPick={pick} />
        </div>
        <aside className="form">
          <div className="panel form">
            <h2>Passengers</h2>
            {pax.map((p, i) => (
              <fieldset key={i} className={`pax ${i === active ? 'active' : ''}`} onClick={() => setActive(i)}>
                <legend>Passenger {i + 1} · {p.seat ? `Seat ${p.seat}` : 'no seat'}</legend>
                <input placeholder="First name" value={p.firstName} maxLength={40} required
                  onChange={(e) => setName(i, 'firstName', e.target.value)} />
                <input placeholder="Last name" value={p.lastName} maxLength={40} required
                  onChange={(e) => setName(i, 'lastName', e.target.value)} />
              </fieldset>
            ))}
          </div>
          <div className="panel form">
            <h2>Contact</h2>
            <input type="email" placeholder="Email" value={contact.email} required maxLength={120}
              onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <input type="tel" placeholder="Phone (optional)" value={contact.phone} maxLength={30}
              onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
          </div>
          <div className="panel">
            <h2>Price</h2>
            {price ? (
              <>
                <div className="sum"><span>Fare</span><span>{fmtMoney(price.fare)}</span></div>
                <div className="sum"><span>Taxes &amp; fees</span><span>{fmtMoney(price.taxes)}</span></div>
                <div className="sum total"><span>Total</span><span>{fmtMoney(price.total)}</span></div>
              </>
            ) : <p className="muted small">Pick seats to see the price.</p>}
            <p className="muted small">Fares rise as departure nears; the confirmation shows the final price. No payment is taken in this demo.</p>
            {formError && <p className="error">{formError}</p>}
            <button className="btn btn-primary btn-block" disabled={!ready || submitting}>
              {submitting ? 'Booking…' : 'Confirm booking'}
            </button>
          </div>
        </aside>
      </div>
    </form>
  );
}
