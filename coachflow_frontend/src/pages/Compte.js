import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--bdr)' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="fg" style={{ marginBottom: 14 }}>
      <label className="fl">{label}</label>
      {children}
    </div>
  );
}

export default function Compte() {
  const { user, logout, loginWithToken } = useAuth();
  const nav = useNavigate();

  const [profile, setProfile] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '' });
  const [profileBusy, setProfileBusy]   = useState(false);
  const [profileMsg,  setProfileMsg]    = useState(null);

  const [pw, setPw]     = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwBusy, setPwBusy]   = useState(false);
  const [pwMsg,  setPwMsg]    = useState(null);

  const [deleteWord, setDeleteWord] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteErr,  setDeleteErr]  = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const isGoogle = user?.email_verified && !user?.has_password;

  const saveProfile = async e => {
    e.preventDefault();
    setProfileBusy(true); setProfileMsg(null);
    try {
      const data = await api.updateMe({ first_name: profile.first_name, last_name: profile.last_name });
      setProfileMsg({ ok: true, text: 'Profil mis à jour.' });
      if (data.new_token) loginWithToken(data.new_token);
    } catch (e) {
      setProfileMsg({ ok: false, text: e.message });
    } finally {
      setProfileBusy(false);
    }
  };

  const savePassword = async e => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.new_password !== pw.confirm) { setPwMsg({ ok: false, text: 'Les mots de passe ne correspondent pas.' }); return; }
    if (pw.new_password.length < 8)     { setPwMsg({ ok: false, text: 'Minimum 8 caractères.' }); return; }
    setPwBusy(true);
    try {
      const data = await api.updateMe({ old_password: pw.old_password, new_password: pw.new_password });
      setPwMsg({ ok: true, text: 'Mot de passe modifié. Reconnexion…' });
      setPw({ old_password: '', new_password: '', confirm: '' });
      if (data.new_token) {
        setTimeout(() => loginWithToken(data.new_token), 1200);
      }
    } catch (e) {
      setPwMsg({ ok: false, text: e.message });
    } finally {
      setPwBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteWord !== 'SUPPRIMER') { setDeleteErr('Tapez exactement SUPPRIMER pour confirmer.'); return; }
    setDeleteBusy(true); setDeleteErr('');
    try {
      await api.deleteAccount('SUPPRIMER');
      logout();
      nav('/login');
    } catch (e) {
      setDeleteErr(e.message);
      setDeleteBusy(false);
    }
  };

  const Msg = ({ msg }) => msg ? (
    <div style={{ padding: '9px 12px', borderRadius: 7, fontSize: 13, marginTop: 10,
      background: msg.ok ? '#ECFDF5' : '#FEF2F2',
      color: msg.ok ? '#065F46' : '#991B1B',
      border: `1px solid ${msg.ok ? '#A7F3D0' : '#FECACA'}` }}>
      {msg.text}
    </div>
  ) : null;

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Mon compte</div>

      {/* ── PROFIL ───────────────────────────────────────────────────── */}
      <Section title="Informations personnelles">
        <form onSubmit={saveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Prénom">
              <input className="fi" value={profile.first_name} onChange={e => setProfile(p => ({ ...p, first_name: e.target.value }))} />
            </Field>
            <Field label="Nom">
              <input className="fi" value={profile.last_name} onChange={e => setProfile(p => ({ ...p, last_name: e.target.value }))} />
            </Field>
          </div>
          <Field label="Email">
            <input className="fi" value={user?.email || ''} disabled style={{ opacity: .6, cursor: 'not-allowed' }} />
          </Field>
          <Field label="Identifiant">
            <input className="fi" value={user?.username || ''} disabled style={{ opacity: .6, cursor: 'not-allowed' }} />
          </Field>
          <button className="btn btn-p" disabled={profileBusy}>{profileBusy ? 'Enregistrement…' : 'Enregistrer'}</button>
          <Msg msg={profileMsg} />
        </form>
      </Section>

      {/* ── MOT DE PASSE ─────────────────────────────────────────────── */}
      {!isGoogle && (
        <Section title="Sécurité — Modifier le mot de passe">
          <form onSubmit={savePassword}>
            <Field label="Mot de passe actuel">
              <input className="fi" type="password" placeholder="••••••••"
                value={pw.old_password} onChange={e => setPw(p => ({ ...p, old_password: e.target.value }))} required />
            </Field>
            <Field label="Nouveau mot de passe">
              <input className="fi" type="password" placeholder="8 caractères minimum"
                value={pw.new_password} onChange={e => setPw(p => ({ ...p, new_password: e.target.value }))} required />
            </Field>
            <Field label="Confirmer le nouveau mot de passe">
              <input className="fi" type="password" placeholder="Répétez le mot de passe"
                value={pw.confirm} onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} required />
            </Field>
            <button className="btn btn-p" disabled={pwBusy}>{pwBusy ? 'Enregistrement…' : 'Modifier le mot de passe'}</button>
            <Msg msg={pwMsg} />
          </form>
        </Section>
      )}
      {isGoogle && (
        <Section title="Sécurité">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F8FAFF', borderRadius: 8, border: '1px solid #C7D2FE', fontSize: 14, color: '#4338CA' }}>
            <span>🔗</span>
            <span>Connexion via Google — aucun mot de passe CoachFlow associé à ce compte.</span>
          </div>
        </Section>
      )}

      {/* ── DONNÉES & CGU ────────────────────────────────────────────── */}
      <Section title="Données & confidentialité">
        <div style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.7, marginBottom: 14 }}>
          Vos données sont hébergées en France et ne sont jamais revendues à des tiers.
          Vous disposez d'un droit d'accès, de rectification et d'effacement conformément au RGPD.
        </div>
        <Link to="/cgu" style={{ fontSize: 14, color: '#6366F1', textDecoration: 'none', fontWeight: 600 }}>
          Consulter les CGU et la politique de confidentialité →
        </Link>
      </Section>

      {/* ── ZONE DANGER ──────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20, border: '1px solid #FECACA' }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: '#991B1B' }}>
          Zone de danger
        </div>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.6 }}>
          La suppression de votre compte est <strong>irréversible</strong>. Tous vos clients, séances, factures,
          recettes et messages seront définitivement effacés.
        </div>

        {!showDelete ? (
          <button onClick={() => setShowDelete(true)} style={{
            background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA',
            borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Supprimer mon compte
          </button>
        ) : (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#7F1D1D', marginBottom: 10 }}>
              Tapez <code style={{ background: '#FEE2E2', padding: '1px 6px', borderRadius: 4 }}>SUPPRIMER</code> pour confirmer la suppression de votre compte :
            </div>
            <input
              className="fi"
              placeholder="SUPPRIMER"
              value={deleteWord}
              onChange={e => { setDeleteWord(e.target.value); setDeleteErr(''); }}
              style={{ marginBottom: 10, borderColor: '#FECACA' }}
              autoFocus
            />
            {deleteErr && (
              <div style={{ fontSize: 13, color: '#991B1B', marginBottom: 10 }}>{deleteErr}</div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={deleteAccount} disabled={deleteBusy} style={{
                background: '#DC2626', color: '#fff', border: 'none',
                borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>
                {deleteBusy ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
              <button onClick={() => { setShowDelete(false); setDeleteWord(''); setDeleteErr(''); }} style={{
                background: '#fff', border: '1px solid var(--bdr)',
                borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer',
              }}>
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
