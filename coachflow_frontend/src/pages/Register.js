import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import GoogleLoginButton from '../components/GoogleLoginButton';

function PendingVerification({ email }) {
  const [busy, setBusy] = useState(false);
  const [msg,  setMsg]  = useState('');
  const resend = async () => {
    setBusy(true); setMsg('');
    try {
      await api.resendVerification(email);
      setMsg('Email renvoyé. Vérifiez votre boîte mail (et vos spams).');
    } catch (e) {
      setMsg(e.message || 'Erreur lors de l\'envoi.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="lg-pg">
      <div className="lg-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <div className="lg-h1" style={{ marginBottom: 8 }}>Vérifiez votre email</div>
        <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
          Un lien de confirmation a été envoyé à <strong>{email}</strong>.<br />
          Cliquez sur le lien pour activer votre compte.
        </p>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
          Pas reçu ? Vérifiez vos spams.
        </p>
        <button onClick={resend} disabled={busy} className="btn btn-s" style={{ fontSize: 13 }}>
          {busy ? 'Envoi…' : '📧 Renvoyer le mail de vérification'}
        </button>
        {msg && (
          <div style={{ marginTop: 12, fontSize: 12, color: msg.startsWith('Email') ? '#065F46' : '#991B1B' }}>
            {msg}
          </div>
        )}
        <Link to="/login" style={{ color: '#6366F1', fontSize: 14, textDecoration: 'none', display: 'block', marginTop: 24 }}>
          ← Retour à la connexion
        </Link>
      </div>
    </div>
  );
}

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    first_name: '', last_name: '', username: '', email: '', password: '', password2: '',
  });
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setErr('');
    if (form.password !== form.password2) {
      setErr('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.password.length < 8) {
      setErr('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    setBusy(true);
    try {
      await api.register(form);
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return <PendingVerification email={form.email} />;
  }

  return (
    <div className="lg-pg">
      <div className="lg-box">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div className="lg-ico">⚡</div>
          <div className="lg-h1">Créer un compte</div>
          <div className="lg-sub">Rejoignez TrainFlow gratuitement</div>
        </div>

        <form onSubmit={submit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="fg">
              <label className="fl">Prénom</label>
              <input className="fi" placeholder="Sophie" value={form.first_name} onChange={set('first_name')} required />
            </div>
            <div className="fg">
              <label className="fl">Nom</label>
              <input className="fi" placeholder="Dupont" value={form.last_name} onChange={set('last_name')} required />
            </div>
          </div>
          <div className="fg">
            <label className="fl">Nom d&apos;utilisateur</label>
            <input className="fi" placeholder="sophie.dupont" value={form.username} onChange={set('username')} required />
          </div>
          <div className="fg">
            <label className="fl">Adresse email</label>
            <input className="fi" type="email" placeholder="sophie@exemple.fr" value={form.email} onChange={set('email')} required />
          </div>
          <div className="fg">
            <label className="fl">Mot de passe</label>
            <input className="fi" type="password" placeholder="8 caractères minimum" value={form.password} onChange={set('password')} required />
          </div>
          <div className="fg">
            <label className="fl">Confirmer le mot de passe</label>
            <input className="fi" type="password" placeholder="••••••••" value={form.password2} onChange={set('password2')} required />
          </div>

          {err && (
            <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
              {err}
            </div>
          )}

          <button className="btn btn-p w100" style={{ justifyContent: 'center', padding: 11 }} disabled={busy}>
            {busy ? 'Création du compte...' : 'Créer mon compte →'}
          </button>
          <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12, marginBottom: 0 }}>
            En créant un compte, vous acceptez nos{' '}
            <Link to="/cgu" style={{ color: '#6366F1', textDecoration: 'none' }}>CGU et politique de confidentialité</Link>.
          </p>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0 16px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--bdr, #e2e8f0)' }} />
          <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>ou s&apos;inscrire avec</span>
          <div style={{ flex: 1, height: 1, background: 'var(--bdr, #e2e8f0)' }} />
        </div>

        <GoogleLoginButton />

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#64748b' }}>
          Déjà un compte ?{' '}
          <Link to="/login" style={{ color: '#6366F1', textDecoration: 'none', fontWeight: 600 }}>
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
}
