import { useEffect, useState } from 'react';
import { api } from '../api';
import { money, dateLabel } from '../format';

const SPLIT_HINTS = {
  equal: 'Everyone pays the same share. Leftover cents go to the first members.',
  percentage: 'Give each person a percentage. They must add up to 100.',
  custom: 'Enter an exact amount for each person. They must add up to the total.',
};

export default function ExpensesTab({ trip, names }) {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [split, setSplit] = useState('equal');
  const [error, setError] = useState('');

  const load = () => api(`/trips/${trip._id}/expenses`).then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [trip._id]);

  async function save(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const amountCents = Math.round(parseFloat(f.get('amount')) * 100);
    if (!(amountCents > 0)) {
      setError('Enter an amount greater than zero, like 45.50');
      return;
    }
    const body = {
      description: f.get('description'),
      amountCents,
      paidBy: f.get('paidBy'),
      splitType: split,
      category: f.get('category'),
      date: f.get('date'),
    };
    if (split !== 'equal') {
      body.splits = trip.memberIds.map((uid) => {
        const v = parseFloat(f.get(`split-${uid}`) || '0');
        return split === 'percentage'
          ? { userId: uid, percent: v }
          : { userId: uid, amountCents: Math.round(v * 100) };
      }).filter((s) => (s.percent ?? s.amountCents) > 0);
    }
    try {
      await api(`/trips/${trip._id}/expenses`, { method: 'POST', body });
      setShowForm(false); setError(''); load();
    } catch (err) { setError(err.message); }
  }

  const total = items.reduce((s, e) => s + e.amountCents, 0);

  return (
    <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="row between">
        <div>
          <h2 style={{ fontSize: 22 }}>Expenses</h2>
          <p className="muted">Trip total so far: <strong>{money(total)}</strong></p>
        </div>
        <button className="btn btn-accent" onClick={() => setShowForm(!showForm)}>Add expense</button>
      </div>
      {error && <div className="error" role="alert">{error}</div>}

      {showForm && (
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg)', padding: 20, borderRadius: 14 }}>
          <div className="row">
            <div className="field"><label htmlFor="description">What was it for?</label>
              <input id="description" name="description" required minLength={2} maxLength={100} /></div>
            <div className="field"><label htmlFor="amount">Amount (dollars)</label>
              <input id="amount" name="amount" inputMode="decimal" required /></div>
            <div className="field"><label htmlFor="paidBy">Paid by</label>
              <select id="paidBy" name="paidBy">
                {trip.memberIds.map((uid) => <option key={uid} value={uid}>{names[uid] || uid}</option>)}
              </select></div>
            <div className="field"><label htmlFor="category">Category</label>
              <select id="category" name="category">
                {['lodging', 'food', 'transport', 'activity', 'other'].map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div className="field"><label htmlFor="date">Date</label>
              <input id="date" name="date" type="date" required /></div>
          </div>

          <div role="group" aria-label="Split type" className="row">
            {Object.keys(SPLIT_HINTS).map((s) => (
              <button type="button" key={s} aria-pressed={split === s}
                className={split === s ? 'btn btn-primary' : 'btn btn-ghost'}
                style={{ textTransform: 'capitalize', borderRadius: 999 }}
                onClick={() => setSplit(s)}>{s}</button>
            ))}
          </div>
          <p className="muted" style={{ margin: 0 }}>{SPLIT_HINTS[split]}</p>

          {split !== 'equal' && (
            <div className="row">
              {trip.memberIds.map((uid) => (
                <div className="field" key={uid}>
                  <label htmlFor={`split-${uid}`}>{names[uid] || uid} {split === 'percentage' ? '(%)' : '($)'}</label>
                  <input id={`split-${uid}`} name={`split-${uid}`} inputMode="decimal" />
                </div>
              ))}
            </div>
          )}

          <div className="row">
            <button className="btn btn-primary" type="submit">Save expense</button>
            <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <ul className="list">
        {items.map((e) => (
          <li key={e._id} className="row between">
            <div>
              <strong>{e.description}</strong> <span className="chip chip-completed">{e.category}</span>
              <div className="muted">Paid by {names[e.paidBy] || 'a member'} · {dateLabel(e.date)} · {e.splitType} split</div>
            </div>
            <strong style={{ fontFamily: 'Outfit', fontSize: 20 }}>{money(e.amountCents)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
