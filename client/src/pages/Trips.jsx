import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { dateLabel } from '../format';

const FILTERS = ['all', 'planning', 'locked', 'completed'];

export default function Trips() {
  const [trips, setTrips] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = () => api('/trips').then(setTrips).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function createTrip(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    try {
      await api('/trips', {
        method: 'POST',
        body: {
          name: f.get('name'),
          destination: f.get('destination'),
          startDate: f.get('startDate'),
          endDate: f.get('endDate'),
          description: f.get('description') || undefined,
        },
      });
      setShowForm(false);
      setError('');
      load();
    } catch (err) { setError(err.message); }
  }

  const shown = trips.filter((t) => filter === 'all' || t.status === filter);

  return (
    <>
      <div className="row between">
        <div>
          <h1 style={{ fontSize: 40 }}>Your trips</h1>
          <p className="muted">Pick a trip to vote, plan, and split costs.</p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowForm(!showForm)}>New trip</button>
      </div>

      {error && <div className="error" role="alert">{error}</div>}

      {showForm && (
        <form className="card" onSubmit={createTrip} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 22 }}>Create a trip</h2>
          <div className="row">
            <div className="field"><label htmlFor="name">Trip name</label>
              <input id="name" name="name" required minLength={3} maxLength={80} /></div>
            <div className="field"><label htmlFor="destination">Destination</label>
              <input id="destination" name="destination" required /></div>
            <div className="field"><label htmlFor="startDate">Start date</label>
              <input id="startDate" name="startDate" type="date" required /></div>
            <div className="field"><label htmlFor="endDate">End date</label>
              <input id="endDate" name="endDate" type="date" required /></div>
          </div>
          <div className="field"><label htmlFor="description">Description (optional)</label>
            <textarea id="description" name="description" rows={2} maxLength={500} /></div>
          <div className="row">
            <button className="btn btn-primary" type="submit">Create trip</button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="row" role="group" aria-label="Filter trips by status">
        {FILTERS.map((f) => (
          <button key={f} aria-pressed={filter === f}
            className={filter === f ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ textTransform: 'capitalize', borderRadius: 999 }}
            onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      <div className="grid">
        {shown.map((t) => (
          <Link key={t._id} to={`/trips/${t._id}`} className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div className="row between" style={{ alignItems: 'flex-start' }}>
              <h2 style={{ fontSize: 20 }}>{t.name}</h2>
              <span className={`chip chip-${t.status}`} style={{ textTransform: 'capitalize' }}>{t.status}</span>
            </div>
            <p className="muted">{t.destination}</p>
            <p className="muted">{dateLabel(t.startDate)} to {dateLabel(t.endDate)} · {(t.memberIds || []).length === 1 ? '1 traveler' : `${(t.memberIds || []).length} travelers`}</p>
            <strong style={{ color: 'var(--teal)' }}>Open trip</strong>
          </Link>
        ))}
      </div>
      {shown.length === 0 && <p className="card muted">No trips here yet.</p>}
    </>
  );
}
