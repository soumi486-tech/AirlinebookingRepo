import { CABINS, cabinSeats } from '../../shared/seats.js';

// occupied: seats taken by others; selected: { seat: passengerIndex }.
export default function SeatMap({ occupied, selected, onPick }) {
  const taken = new Set(occupied);
  return (
    <div className="seatmap">
      {Object.entries(CABINS).map(([cabin, def]) => {
        const seats = new Set(cabinSeats(cabin));
        const rows = [];
        for (let r = def.firstRow; r <= def.lastRow; r++) rows.push(r);
        return (
          <section key={cabin}>
            <h2>{def.label}</h2>
            <div className="seat-cols">
              {def.cols.map((c) => (
                <span key={c} className={c === def.aisleAfter ? 'aisle-after' : ''}>{c}</span>
              ))}
            </div>
            {rows.map((r) => (
              <div className="seat-row" key={r}>
                <span className="row-no">{r}</span>
                {def.cols.map((c) => {
                  const seat = `${r}${c}`;
                  const isTaken = taken.has(seat);
                  const mine = selected[seat] !== undefined;
                  return (
                    <button
                      key={seat} type="button" disabled={isTaken || !seats.has(seat)}
                      className={`seat ${cabin} ${isTaken ? 'taken' : ''} ${mine ? 'mine' : ''} ${c === def.aisleAfter ? 'aisle-after' : ''}`}
                      aria-label={`Seat ${seat}${isTaken ? ' taken' : ''}`} aria-pressed={mine}
                      onClick={() => onPick(seat)}
                    >
                      {mine ? selected[seat] + 1 : ''}
                    </button>
                  );
                })}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
