import { Navigate } from 'react-router-dom';
import { API_BASE } from '../api';
import { useAuth } from '../auth';

const features = [
  ['Vote on activities', 'One vote each, so the best ideas rise to the top.'],
  ['Lock the itinerary', 'The organizer turns the winners into a day-by-day plan.'],
  ['Settle up fairly', 'Equal, percentage, or custom splits, with a short list of who pays whom.'],
];

export default function Login() {
  const { status } = useAuth();
  if (status === 'in') return <Navigate to="/trips" replace />;
  return (
    <div className="container" style={{ maxWidth: 640, paddingTop: 72 }}>
      <h1 style={{ fontSize: 52, lineHeight: 1.05 }}>Plan the trip together.</h1>
      <p style={{ fontSize: 18, color: 'var(--muted)', margin: 0 }}>
        Vote on activities, lock the itinerary, and settle up the money without digging through a group chat.
      </p>
      <a className="btn btn-primary" style={{ alignSelf: 'flex-start', minHeight: 52 }} href={`${API_BASE}/auth/google`}>
        Continue with Google
      </a>
      <ul className="list">
        {features.map(([title, text]) => (
          <li key={title}><strong>{title}</strong><div className="muted">{text}</div></li>
        ))}
      </ul>
    </div>
  );
}
