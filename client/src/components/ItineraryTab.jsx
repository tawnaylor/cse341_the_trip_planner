export default function ItineraryTab({ trip, goTo }) {
  if (trip.status === 'planning' || !trip.itinerary || trip.itinerary.length === 0) {
    return (
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <h2 style={{ fontSize: 22 }}>Itinerary</h2>
        <p className="muted">The itinerary is not locked yet. Once the group has voted, the organizer can lock the winners.</p>
        <button className="btn btn-primary" onClick={() => goTo('activities')}>Go to voting</button>
      </section>
    );
  }
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 22 }}>Itinerary</h2>
      <ol className="list">
        {trip.itinerary.map((d, i) => (
          <li key={i}><strong>Day {d.day}</strong> · {d.title}</li>
        ))}
      </ol>
    </section>
  );
}
