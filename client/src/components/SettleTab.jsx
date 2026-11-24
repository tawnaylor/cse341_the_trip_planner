import { useEffect, useState } from 'react';
import { api } from '../api';
import { money } from '../format';

export default function SettleTab({ trip, names }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api(`/trips/${trip._id}/settlement`).then(setData).catch((e) => setError(e.message));
  }, [trip._id]);

  if (error) return <div className="error" role="alert">{error}</div>;
  if (!data) return <p>Loading...</p>;

  const name = (id) => names[id] || 'Member';
  const entries = Object.entries(data.balances);
  const max = Math.max(1, ...entries.map(([, c]) => Math.abs(c)));

  return (
    <div className="row" style={{ alignItems: 'flex-start' }}>
      <section className="card" style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 22 }}>Balances</h2>
        <ul className="list">
          {entries.map(([id, cents]) => (
            <li key={id}>
              <div className="row between">
                <strong>{name(id)}</strong>
                <span>{cents > 0 ? `is owed ${money(cents)}` : cents < 0 ? `owes ${money(-cents)}` : 'is settled'}</span>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: '#E6EEF0', marginTop: 8 }}>
                <div style={{ height: 12, borderRadius: 6, width: `${Math.max(3, (Math.abs(cents) / max) * 100)}%`, background: cents < 0 ? 'var(--coral)' : 'var(--teal)' }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="card" style={{ flex: '1 1 380px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: 22 }}>Who pays whom</h2>
        {data.payments.length === 0 && <p className="muted">Everyone is settled up.</p>}
        <ul className="list">
          {data.payments.map((p, i) => (
            <li key={i} className="row between">
              <span><strong>{name(p.from)}</strong> pays <strong>{name(p.to)}</strong></span>
              <strong style={{ fontFamily: 'Outfit', fontSize: 20, color: '#0B4552' }}>{money(p.amountCents)}</strong>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
