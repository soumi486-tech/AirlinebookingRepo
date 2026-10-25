import { fmtDate, fmtDuration, fmtTime } from '../lib/format';

// Origin -> destination timeline used on results, booking and confirmation pages.
export default function FlightSummary({ flight }) {
  return (
    <div className="flight-line">
      <div>
        <div className="time">{fmtTime(flight.departsAt, flight.origin)}</div>
        <div className="muted small">{flight.origin} · {fmtDate(flight.departsAt, flight.origin)}</div>
      </div>
      <div className="flight-mid muted small">
        {fmtDuration(flight.departsAt, flight.arrivesAt)}
        <div className="flight-bar" />
        {flight.flightNo}
      </div>
      <div>
        <div className="time">{fmtTime(flight.arrivesAt, flight.destination)}</div>
        <div className="muted small">{flight.destination} · {fmtDate(flight.arrivesAt, flight.destination)}</div>
      </div>
    </div>
  );
}
