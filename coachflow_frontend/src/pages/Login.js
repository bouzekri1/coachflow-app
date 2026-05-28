import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function Login() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const go = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(u, p); nav('/dashboard'); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="lg-pg">
      <div className="lg-box">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="lg-ico">⚡</div>
          <div className="lg-h1">CoachFlow</div>
          <div className="lg-sub">Votre espace coaching</div>
        </div>

        <form onSubmit={go}>
          <div className="fg">
            <label className="fl">Email ou nom d&apos;utilisateur</label>
            <input className="fi" placeholder="sophie ou sophie@exemple.fr" value={u} onChange={e => setU(e.target.value)} required />
          </div>
          <div className="fg">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
              <label className="fl" style={{ marginBottom: 0 }}>Mot de passe</label>
              <Link to="/forgot-password" style={{ fontSize: 12, color: '#6366F1', textDecoration: 'none' }}>
                Mot de passe oublié ?
              </Link>
            </div>
            <input className="fi" type="password" placeholder="••••••••" value={p} onChange={e => setP(e.target.value)} required />
          </div>
          {err && (
            <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              {err}
            </div>
          )}
          <button className="btn btn-p w100" style={{ justifyContent: 'center', padding: 11 }} disabled={busy}>
            {busy ? 'Connexion...' : 'Se connecter →'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--bdr, #e2e8f0)' }} />
          <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>ou continuer avec</span>
          <div style={{ flex: 1, height: 1, background: 'var(--bdr, #e2e8f0)' }} />
        </div>

        <GoogleLoginButton />

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
          Pas encore de compte ?{' '}
          <Link to="/register" style={{ color: '#6366F1', textDecoration: 'none', fontWeight: 600 }}>
            S&apos;inscrire gratuitement
          </Link>
        </div>

        <div className="lg-demo">
          Compte démo : <strong>sophie</strong> / <strong>coach123</strong>
        </div>
      </div>
    </div>
  );
}
