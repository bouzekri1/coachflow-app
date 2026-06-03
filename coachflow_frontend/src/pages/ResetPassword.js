import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ResetPassword() {
  const [params]              = useSearchParams();
  const token                 = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [done, setDone]         = useState(false);
  const [err, setErr]           = useState('');
  const [busy, setBusy]         = useState(false);
  const nav = useNavigate();

  if (!token) {
    return (
      <div className="lg-pg">
        <div className="lg-box" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Lien invalide</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>Ce lien de réinitialisation est invalide ou a expiré.</div>
          <Link to="/forgot-password" className="btn btn-p" style={{ justifyContent: 'center' }}>
            Faire une nouvelle demande
          </Link>
        </div>
      </div>
    );
  }

  const go = async e => {
    e.preventDefault(); setErr('');
    if (password !== confirm) { setErr('Les mots de passe ne correspondent pas.'); return; }
    if (password.length < 8)  { setErr('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    setBusy(true);
    try {
      await api.passwordResetConfirm(token, password);
      setDone(true);
      setTimeout(() => nav('/login'), 3000);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lg-pg">
      <div className="lg-box">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="lg-ico">⚡</div>
          <div className="lg-h1">TrainFlow</div>
          <div className="lg-sub">Nouveau mot de passe</div>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
              <div style={{ fontWeight: 700, color: '#065F46', marginBottom: 4 }}>Mot de passe modifié !</div>
              <div style={{ fontSize: 14, color: '#047857' }}>Vous allez être redirigé vers la connexion…</div>
            </div>
          </div>
        ) : (
          <form onSubmit={go}>
            <div className="fg">
              <label className="fl">Nouveau mot de passe</label>
              <input
                className="fi"
                type="password"
                placeholder="8 caractères minimum"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="fg">
              <label className="fl">Confirmer le mot de passe</label>
              <input
                className="fi"
                type="password"
                placeholder="Répétez le mot de passe"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
            {err && (
              <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
                {err}
              </div>
            )}
            <button className="btn btn-p w100" style={{ justifyContent: 'center', padding: 11 }} disabled={busy}>
              {busy ? 'Enregistrement...' : 'Enregistrer le nouveau mot de passe →'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: '#64748b' }}>
          <Link to="/login" style={{ color: '#6366F1', textDecoration: 'none', fontWeight: 600 }}>
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
