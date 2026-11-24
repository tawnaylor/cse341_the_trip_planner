import { useEffect, useState } from 'react';
import { api } from './api';

export default function App() {
  const [status, setStatus] = useState('Checking the API...');

  useEffect(() => {
    api('/')
      .then((data) => setStatus(data.message))
      .catch((err) => setStatus(`API unavailable: ${err.message}`));
  }, []);

  return (
    <main className="container">
      <div className="card">
        <h1>Group Trip Planner</h1>
        <p className="muted">{status}</p>
      </div>
    </main>
  );
}
