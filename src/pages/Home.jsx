import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAirports } from '../api/client';
import { storage } from '../api/storage';
import { useAsync } from '../hooks/useAsync';
import { todayPlus } from '../lib/format';
import { MAX_PASSENGERS } from '../../shared/pricing.js';

export default function Home() {
  const navigate = useNavigate();
  const { data: airports, loading, error } = useAsync(getAirports);
  const saved = storage.get('search', {});
  const [from, setFrom] = useState(saved.from ?? 'JFK');
  const [to, setTo] = useState(saved.to ?? 'LAX');
  const [date, setDate] = useState(saved.date >= todayPlus(0) ? saved.date : todayPlus(14));
  const [pax, setPax] = useState(saved.pax ?? 1);

  function submit(e) {
    e.preventDefault();
    storage.set('search', { from, to, date, pax });
    navigate(`/search?from=${from}&to=${to}&date=${date}&pax=${pax}`);
  }

  return (
    <>
      <section className="hero">
        <h1>Where to next?</h1>
        <p className="muted">Search flights, pick your seats and book. Book early for lower fares.</p>
      </section>
      <form className="panel form" onSubmit={submit}>
        {error && <p className="error">{error.message}</p>}
        <div className="row">
          <label className="field">From
            <select value={from} onChange={(e) => setFrom(e.target.value)} disabled={loading}>
              {airports?.map((a) => <option key={a.code} value={a.code}>{a.city} ({a.code})</option>)}
            </select>
          </label>
          <label className="field">To
            <select value={to} onChange={(e) => setTo(e.target.value)} disabled={loading}>
              {airports?.map((a) => <option key={a.code} value={a.code}>{a.city} ({a.code})</option>)}
            </select>
          </label>
          <label className="field">Departure date
            <input type="date" value={date} min={todayPlus(0)} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="field">Passengers
            <select value={pax} onChange={(e) => setPax(Number(e.target.value))}>
              {Array.from({ length: MAX_PASSENGERS }, (_, i) => <option key={i + 1}>{i + 1}</option>)}
            </select>
          </label>
        </div>
        {from === to && <p className="error small">Choose different airports.</p>}
        <button className="btn btn-primary" disabled={loading || from === to || !date}>Search flights</button>
      </form>
      <p className="muted small">Demo app: no real payments are taken and no emails are sent.</p>
    </>
  );
}
