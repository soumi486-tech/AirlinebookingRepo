import { Link, useSearchParams } from 'react-router-dom';
import { searchFlights } from '../api/client';
import FlightSummary from '../components/FlightSummary';
import { useAsync } from '../hooks/useAsync';
import { fmtMoney } from '../lib/format';

export default function SearchResults() {
  const [params] = useSearchParams();
  const from = params.get('from');
  const to = params.get('to');
  const date = params.get('date');
  const pax = Math.max(1, Number(params.get('pax')) || 1);
  const { data: flights, loading, error, reload } = useAsync(() => searchFlights({ from, to, date }), [from, to, date]);

  return (
    <>
      <h1>{from} → {to}</h1>
      <p className="muted">{date} · {pax} passenger{pax > 1 ? 's' : ''} · <Link to="/">Change search</Link></p>
      {loading && <p className="muted">Searching…</p>}
      {error && <p className="error">{error.message} <button className="btn btn-sm" onClick={reload}>Retry</button></p>}
      {flights?.length === 0 && <div className="empty panel"><p>No flights that day.</p><Link to="/">Try another date</Link></div>}
      {flights?.map((f) => {
        const soldOut = f.seatsLeft.economy + f.seatsLeft.business < pax;
        return (
          <div className="panel flight-card" key={f.id}>
            <FlightSummary flight={f} />
            <div className="fares">
              <div><span className="muted small">Economy from</span><strong>{fmtMoney(f.fromFare.economy)}</strong>
                <span className="muted small">{f.seatsLeft.economy} left</span></div>
              <div><span className="muted small">Business from</span><strong>{fmtMoney(f.fromFare.business)}</strong>
                <span className="muted small">{f.seatsLeft.business} left</span></div>
              {soldOut
                ? <span className="error small">Not enough seats</span>
                : <Link className="btn btn-primary" to={`/flights/${f.id}?pax=${pax}`}>Select</Link>}
            </div>
          </div>
        );
      })}
    </>
  );
}
