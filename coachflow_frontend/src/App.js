import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import { Toasts } from './components/UI';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Compte from './pages/Compte';
import CGU from './pages/CGU';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './pages/Dashboard';
import { ClientsList, ClientDetail } from './pages/Clients';
import { Programmes, Planning, Revenus, Messages, Alertes } from './pages/Pages';
import { ClientPortalLayout } from './pages/ClientPortal';
import Nutrition from './pages/Nutrition';
import Exercices from './pages/Exercices';
import { api } from './services/api';
import InstallPWA from './components/InstallPWA';
import FeedbackWidget from './components/FeedbackWidget';

/* ── LAYOUT COACH ─────────────────────────────────────────────────────────── */
function CoachLayout() {
  const { user } = useAuth();
  const [badges, setBadges] = useState({ messages: 0, alertes: 0 });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      Promise.all([api.conversations.list(), api.alertes.list()])
        .then(([convs, alertes]) => {
          const msgs = (convs.results || convs).reduce((s, c) => s + (c.non_lus || 0), 0);
          const alts = (alertes.results || alertes).filter(a => !a.lue).length;
          setBadges({ messages: msgs, alertes: alts });
        })
        .catch(() => {});
    };
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [user]);

  return (
    <div className="app">
      {/* Overlay mobile pour fermer la sidebar */}
      {sidebarOpen && <div className="sb-overlay" onClick={() => setSidebarOpen(false)} />}
      <Sidebar badges={badges} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main">
        {/* Topbar mobile avec hamburger */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0 14px', height: 52,
          background: '#fff', borderBottom: '1px solid var(--bdr)',
          position: 'sticky', top: 0, zIndex: 50,
        }} className="mob-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#065f46,#1D9E75)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff' }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: 15 }}>CoachFlow</span>
          </div>
        </div>
        <main className="page">
          <Routes>
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/clients"      element={<ClientsList />} />
            <Route path="/clients/:id"  element={<ClientDetail />} />
            <Route path="/programmes"   element={<Programmes />} />
            <Route path="/nutrition"    element={<Nutrition />} />
            <Route path="/exercices"    element={<Exercices />} />
            <Route path="/planning"     element={<Planning />} />
            <Route path="/revenus"      element={<Revenus />} />
            <Route path="/messages"     element={<Messages />} />
            <Route path="/alertes"      element={<Alertes />} />
            <Route path="/compte"       element={<Compte />} />
            <Route path="/cgu"          element={<CGU />} />
            <Route path="*"             element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/* ── LAYOUT (routage coach/client) ────────────────────────────────────────── */
function Layout() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh' }}>
      <div className="spin" />
    </div>
  );

  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      {user.role === 'client' ? <ClientPortalLayout /> : <CoachLayout />}
      <FeedbackWidget />
    </>
  );
}

/* ── ROUTE PUBLIQUE ───────────────────────────────────────────────────────── */
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

/* ── APP ROOT ─────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"        element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register"     element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/verify-email"    element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password"  element={<ResetPassword />} />
          <Route path="/*"               element={<Layout />} />
        </Routes>
        <Toasts />
        <InstallPWA />
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  );
}
