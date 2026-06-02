import { createContext, useContext, useState, useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { api } from '../services/api';

const Ctx = createContext(null);

function syncSentryUser(u) {
  if (!process.env.REACT_APP_SENTRY_DSN) return;
  if (u) {
    Sentry.setUser({ id: u.id, username: u.username, email: u.email, role: u.role });
  } else {
    Sentry.setUser(null);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(u => { setUser(u); syncSentryUser(u); })
      .catch(() => { setUser(null); syncSentryUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const d = await api.login(username, password);
    setUser(d.user); syncSentryUser(d.user);
  };

  // Utilisé après vérification email / Google : le cookie est déjà posé côté serveur
  const loginWithUser = (userData) => {
    if (userData) { setUser(userData); syncSentryUser(userData); }
  };

  const updateUser = (patch) => setUser(u => {
    const next = { ...u, ...patch };
    syncSentryUser(next);
    return next;
  });

  const logout = async () => {
    try { await api.logout(); } catch (e) { /* ignore */ }
    setUser(null); syncSentryUser(null);
  };

  return <Ctx.Provider value={{ user, login, loginWithUser, logout, loading, updateUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
