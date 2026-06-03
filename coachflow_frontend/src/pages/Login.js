import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import GoogleLoginButton from '../components/GoogleLoginButton';

export default function Login() {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg,  setResendMsg]  = useState('');
  const { login } = useAuth();
  const nav = useNavigate();

  const go = async e => {
    e.preventDefault(); setErr(''); setUnverifiedEmail(''); setResendMsg(''); setBusy(true);
    try { await login(u, p); nav('/dashboard'); }
    catch (e) {
      setErr(e.message);
      if (e.data?.code === 'email_not_verified') {
        setUnverifiedEmail(e.data.email || u);
      }
    }
    finally { setBusy(false); }
  };

  const resend = async () => {
    setResendBusy(true); setResendMsg('');
    try {
      await api.resendVerification(unverifiedEmail);
      setResendMsg('Email de vérification renvoyé. Vérifiez votre boîte mail (et vos spams).');
    } catch (e) {
      setResendMsg(e.message || 'Erreur lors de l\'envoi.');
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <div className="lg-pg">
      <div className="lg-box">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="lg-ico">⚡</div>
          <div className="lg-h1">TrainFlow</div>
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
              {unverifiedEmail && (
                <div style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    onClick={resend}
                    disabled={resendBusy}
                    style={{
                      background: '#fff', color: '#991B1B',
                      border: '1px solid #FECACA', borderRadius: 6,
                      padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {resendBusy ? 'Envoi…' : '📧 Renvoyer le mail de vérification'}
                  </button>
                  {resendMsg && (
                    <div style={{ marginTop: 8, fontSize: 12, color: resendMsg.startsWith('Email') ? '#065F46' : '#991B1B' }}>
                      {resendMsg}
                    </div>
                  )}
                </div>
              )}
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
