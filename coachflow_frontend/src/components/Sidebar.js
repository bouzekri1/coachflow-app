import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Ic } from './UI';

const NAV = [
  { sec: 'Principal' },
  { path: '/dashboard', icon: 'dashboard', label: 'Tableau de bord' },
  { path: '/clients',   icon: 'clients',   label: 'Clients' },
  { path: '/programmes',icon: 'progs',     label: 'Programmes' },
  { path: '/nutrition', icon: 'nutrition', label: 'Nutrition' },
  { path: '/exercices', icon: 'exercices', label: 'Exercices' },
  { sec: 'Gestion' },
  { path: '/planning',  icon: 'planning',  label: 'Planning' },
  { path: '/revenus',   icon: 'revenus',   label: 'Revenus' },
  { path: '/messages',  icon: 'messages',  label: 'Messages',  badge: 'messages' },
  { path: '/alertes',   icon: 'alertes',   label: 'Alertes',   badge: 'alertes' },
  { sec: 'Support' },
  { path: '/aide',      icon: 'help',      label: 'Aide' },
];

export default function Sidebar({ badges = {}, open = false, onClose = () => {} }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { user, logout } = useAuth();
  const ini = user
    ? (`${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`).toUpperCase() || user.username?.[0]?.toUpperCase()
    : '?';

  const go = (path) => { nav(path); onClose(); };

  return (
    <aside className={`sidebar${open ? ' mob-open' : ''}`}>
      <div className="sb-logo">
        <div className="sb-mark">
          <div className="sb-ico">⚡</div>
          <span className="sb-nm">TrainFlow</span>
        </div>
        <span className="sb-plan">{user?.plan === 'pro' ? '✦ Plan Pro' : '◇ Plan Free'}</span>
      </div>

      <nav className="sb-nav">
        {NAV.map((item, i) => {
          if (item.sec) return <div key={i} className="sb-sec">{item.sec}</div>;
          const on = loc.pathname.startsWith(item.path);
          const bc = item.badge ? (badges[item.badge] || 0) : 0;
          return (
            <button key={item.path} className={`sb-item${on ? ' on' : ''}`} onClick={() => go(item.path)}>
              <Ic n={item.icon} s={15} />
              {item.label}
              {bc > 0 && <span className="sb-bdg">{bc}</span>}
            </button>
          );
        })}
        {user?.role === 'admin' && (
          <>
            <div className="sb-sec">Plateforme</div>
            <button className="sb-item" onClick={() => go('/admin-panel')}
              style={{ background: 'linear-gradient(135deg, #4338ca22, #6366f122)', color: '#4338ca', fontWeight: 700 }}>
              <span style={{ fontSize: 14 }}>👑</span>
              Panel admin
            </button>
          </>
        )}
      </nav>

      <div className="sb-foot">
        <button onClick={() => go('/compte')} title="Mon compte" style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', minWidth: 0 }}>
          <div className="sb-fav">{ini}</div>
          <div style={{ minWidth: 0 }}>
            <div className="sb-fnm">{user?.first_name} {user?.last_name}</div>
            <div className="sb-fsub">{user?.plan === 'pro' ? 'Coach Pro' : 'Coach'}</div>
          </div>
        </button>
        <button className="sb-out" onClick={logout} title="Déconnexion">
          <Ic n="logout" s={15} />
        </button>
      </div>
    </aside>
  );
}
