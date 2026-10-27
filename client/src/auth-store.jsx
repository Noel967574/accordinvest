import { createContext, useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, setCsrf } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .session()
      .then((res) => {
        setCsrf(res.csrfToken);
        setUser(res.user);
      })
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  async function login(payload) {
    const res = await api.login(payload);
    const session = await api.session();
    setCsrf(session.csrfToken);
    setUser(session.user ?? res.user);
    return res.user;
  }

  async function register(payload) {
    await api.register(payload);
    const session = await api.session();
    setCsrf(session.csrfToken);
    setUser(session.user);
  }

  async function logout() {
    await api.logout();
    setCsrf(null);
    setUser(null);
  }

  // A 401 from any account call means the session ended; drop to signed-out state.
  function handleAuthError(error) {
    if (error?.status === 401) {
      setUser(null);
      return true;
    }
    return false;
  }

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, setUser, handleAuthError }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

export function RequireAuth({ children, role }) {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!ready) return;
    if (!user) navigate(`/login?next=${encodeURIComponent(location.pathname)}`, { replace: true });
    else if (role && user.role !== role) navigate('/', { replace: true });
  }, [ready, user, role, location.pathname, navigate]);

  if (!ready) return <div className="fatal loading">Loading…</div>;
  if (!user || (role && user.role !== role)) return null;
  return children;
}
