import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { dateLabel } from '../format';
import ActivitiesTab from '../components/ActivitiesTab';
import ItineraryTab from '../components/ItineraryTab';
import ExpensesTab from '../components/ExpensesTab';
import SettleTab from '../components/SettleTab';

const TABS = [['activities', 'Activities'], ['itinerary', 'Itinerary'], ['expenses', 'Expenses'], ['settle', 'Settle up']];

export default function TripDetail() {
  const { id } = useParams();
  const [trip, setTrip] = useState(null);
  const [names, setNames] = useState({});
  const [tab, setTab] = useState('activities');
  const [error, setError] = useState('');

  const loadTrip = () => api(`/trips/${id}`).then(setTrip).catch((e) => setError(e.message));

  useEffect(() => {
    loadTrip();
    api('/users').then((users) => {
      setNames(Object.fromEntries(users.map((u) => [u._id, u.displayName])));
    }).catch(() => {});
  }, [id]);

  if (error) return <div className="error" role="alert">{error}</div>;
  if (!trip) return <p>Loading...</p>;

  const props = { trip, names, reloadTrip: loadTrip, goTo: setTab };

  return (
    <>
      <Link to="/trips">All trips</Link>
      <section style={{ background: 'var(--teal)', color: '#fff', borderRadius: 20, padding: '28px 32px' }}>
        <div className="row">
          <h1 style={{ fontSize: 36 }}>{trip.name}</h1>
          <span className={`chip chip-${trip.status}`} style={{ textTransform: 'capitalize' }}>{trip.status}</span>
        </div>
        <p>{trip.destination} · {dateLabel(trip.startDate)} to {dateLabel(trip.endDate)}</p>
      </section>

      <div className="tabs" role="tablist" aria-label="Trip sections">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" className="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      {tab === 'activities' && <ActivitiesTab {...props} />}
      {tab === 'itinerary' && <ItineraryTab {...props} />}
      {tab === 'expenses' && <ExpensesTab {...props} />}
      {tab === 'settle' && <SettleTab {...props} />}
    </>
  );
}
