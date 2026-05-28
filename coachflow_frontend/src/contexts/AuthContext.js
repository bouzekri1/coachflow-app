import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('cf_token');
    if (t) {
      api.me()
        .then(u => { setUser(u); setLoading(false); })
        .catch(() => { localStorage.removeItem('cf_token'); setLoading(false); });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const d = await api.login(username, password);
    localStorage.setItem('cf_token', d.token);
    setUser(d.user);
  };

  const loginWithToken = (token, userData) => {
    localStorage.setItem('cf_token', token);
    if (userData) setUser(userData);
  };

  const updateUser = (patch) => setUser(u => ({ ...u, ...patch }));

  const logout = () => {
    localStorage.removeItem('cf_token');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, login, loginWithToken, logout, loading, updateUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
