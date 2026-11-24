import { useEffect, useState } from 'react';
import { api } from './api';
import { AuthContext } from './auth';

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading'); // loading | in | out
  useEffect(() => {
    // There is no "who am I" route, so ask for /trips. Only a 401 means signed out;
    // other failures (404 while the route is missing, 500, network) are left to each page to report.
    api('/trips')
      .then(() => setStatus('in'))
      .catch((err) => setStatus(err.status === 401 ? 'out' : 'in'));
  }, []);
  return <AuthContext.Provider value={{ status }}>{children}</AuthContext.Provider>;
}
