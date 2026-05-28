import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [err, setErr]       = useState('');
  const [busy, setBusy]     = useState(false);

  const go = async e => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api.passwordResetRequest(email.trim());
      setSent(true);
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
          <div className="lg-h1">CoachFlow</div>
          <div className="lg-sub">Réinitialisation du mot de passe</div>
        </div>

        {sent ? (
          <div>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 8, padding: '16px 18px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📬</div>
              <div style={{ fontWeight: 700, color: '#065F46', marginBottom: 4 }}>Email envoyé !</div>
              <div style={{ fontSize: 14, color: '#047857', lineHeight: 1.5 }}>
                Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation dans quelques minutes.
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#64748b', textAlign: 'center' }}>
              Vérifiez aussi vos spams. Le lien expire dans <strong>1 heure</strong>.
            </div>
          </div>
        ) : (
          <form onSubmit={go}>
            <div className="fg">
              <label className="fl">Adresse email de votre compte</label>
              <input
                className="fi"
                type="email"
                placeholder="sophie@exemple.fr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {err && (
              <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
                {err}
              </div>
            )}
            <button className="btn btn-p w100" style={{ justifyContent: 'center', padding: 11 }} disabled={busy}>
              {busy ? 'Envoi...' : 'Envoyer le lien de réinitialisation →'}
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
