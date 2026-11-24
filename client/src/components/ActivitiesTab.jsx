import { useEffect, useState } from 'react';
import { api } from '../api';

export default function ActivitiesTab({ trip, names, reloadTrip, goTo }) {
  const [items, setItems] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const planning = trip.status === 'planning';

  const load = () => api(`/trips/${trip._id}/activities`).then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [trip._id]);

  async function propose(e) {
    e.preventDefault();
    try {
      await api(`/trips/${trip._id}/activities`, { method: 'POST', body: { title } });
      setTitle(''); setError(''); load();
    } catch (err) { setError(err.message); }
  }

  async function vote(id) {
    try {
      await api(`/trips/${trip._id}/activities/${id}/vote`, { method: 'PUT' });
      setError(''); load();
    } catch (err) { setError(err.message); }
  }

  async function lock() {
    try {
      await api(`/trips/${trip._id}/lock`, { method: 'PUT' });
      setError('');
      await reloadTrip();
      goTo('itinerary');
    } catch (err) { setError(err.message); }
  }

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <section className="card" style={{ flex: '2 1 560px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 22 }}>Vote on activities</h2>
        <p className="muted">One vote per activity. Press Vote again to take your vote back.</p>
        {error && <div className="error" role="alert">{error}</div>}
        <ul className="list">
          {items.map((a, i) => (
            <li key={a._id} className="row between">
              <div>
                <strong>{i + 1}. {a.title}</strong>
                <div className="muted">
                  Proposed by {names[a.proposedBy] || 'a member'}
                  {a.estimatedCost != null && ` · est. $${a.estimatedCost}`}
                </div>
              </div>
              <div className="row">
                <span><strong>{a.votes.length}</strong> {a.votes.length === 1 ? 'vote' : 'votes'}</span>
                <button className="btn btn-ghost" onClick={() => vote(a._id)} disabled={!planning} aria-label={`Vote for ${a.title}`}>Vote</button>
              </div>
            </li>
          ))}
        </ul>
        {items.length === 0 && <p className="muted">No activities yet. Propose the first one.</p>}
        {planning && (
          <form className="row" onSubmit={propose}>
            <div className="field">
              <label htmlFor="proposal">Propose an activity</label>
              <input id="proposal" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} maxLength={100} />
            </div>
            <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-end' }}>Propose</button>
          </form>
        )}
      </section>

      <aside className="card" style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ fontSize: 20 }}>Top picks</h2>
        <ol>{items.slice(0, 3).map((a) => <li key={a._id}>{a.title}</li>)}</ol>
        {planning
          ? <button className="btn btn-accent" onClick={lock}>Lock itinerary</button>
          : <div className="chip chip-locked">Itinerary locked</div>}
      </aside>
    </div>
  );
}
