export default function ItineraryTab({ trip, goTo }) {
  const days = trip.itinerary || [];
  if (trip.status === 'planning') {
    return (
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <h2 style={{ fontSize: 22 }}>Itinerary</h2>
        <p className="muted">The itinerary is not locked yet. Once the group has voted, the organizer can lock the winners.</p>
        <button className="btn btn-primary" onClick={() => goTo('activities')}>Go to voting</button>
      </section>
    );
  }
  if (days.length === 0) {
    return (
      <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 22 }}>Itinerary</h2>
        <p className="muted">This trip is locked, but no days have been added to the itinerary yet.</p>
      </section>
    );
  }
  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ fontSize: 22 }}>Itinerary</h2>
      <ol className="list">
        {days.map((d, i) => (
          <li key={i}><strong>Day {d.day}</strong> · {d.title}</li>
        ))}
      </ol>
    </section>
  );
}
