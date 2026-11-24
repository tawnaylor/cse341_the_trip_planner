import { Link, Outlet, Navigate } from 'react-router-dom';
import { API_BASE } from '../api';
import { useAuth } from '../AuthContext';

export default function Layout() {
  const { status } = useAuth();
  if (status === 'loading') return <p style={{ padding: 32 }}>Loading...</p>;
  if (status === 'out') return <Navigate to="/" replace />;
  return (
    <>
      <header style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}>
        <div className="row between" style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 32px' }}>
          <Link to="/trips" style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 20, color: 'var(--ink)', textDecoration: 'none' }}>
            Group Trip Planner
          </Link>
          <nav className="row" aria-label="Main">
            <Link to="/trips" className="btn btn-ghost">My trips</Link>
            <a href={`${API_BASE}/auth/logout`} className="btn btn-ghost">Sign out</a>
          </nav>
        </div>
      </header>
      <main className="container"><Outlet /></main>
    </>
  );
}
