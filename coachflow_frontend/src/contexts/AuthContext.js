import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(u => { setUser(u); })
      .catch(() => { setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const d = await api.login(username, password);
    setUser(d.user);
  };

  // Utilisé après vérification email / Google : le cookie est déjà posé côté serveur
  const loginWithUser = (userData) => {
    if (userData) setUser(userData);
  };

  const updateUser = (patch) => setUser(u => ({ ...u, ...patch }));

  const logout = async () => {
    try { await api.logout(); } catch (e) { /* ignore */ }
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, loginWithUser, logout, loading, updateUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
