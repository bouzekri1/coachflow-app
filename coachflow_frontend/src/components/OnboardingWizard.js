import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const STEPS = ['Bienvenue', 'Premier client', 'C\'est parti !'];

function ProgressBar({ step }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
      {STEPS.map((s, i) => (
        <div key={i} style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            height: 4, borderRadius: 4, marginBottom: 6,
            background: i <= step ? '#6366F1' : '#E2E8F0',
            transition: 'background .3s',
          }} />
          <div style={{ fontSize: 11, color: i <= step ? '#6366F1' : '#94a3b8', fontWeight: i === step ? 700 : 400 }}>
            {s}
          </div>
        </div>
      ))}
    </div>
  );
}

function Btn({ children, onClick, primary, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      border: primary ? 'none' : '1px solid var(--bdr)',
      background: primary ? '#6366F1' : '#fff',
      color: primary ? '#fff' : 'var(--t2)',
      opacity: disabled ? .6 : 1,
    }}>
      {children}
    </button>
  );
}

export default function OnboardingWizard({ user, onDone }) {
  const [step, setStep]   = useState(0);
  const [form, setForm]   = useState({ prenom: '', nom: '', email: '', objectif: '' });
  const [busy, setBusy]   = useState(false);
  const [err,  setErr]    = useState('');
  const [created, setCreated] = useState(null);
  const { updateUser } = useAuth();
  const nav = useNavigate();

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const createClient = async () => {
    if (!form.prenom.trim() || !form.nom.trim()) { setErr('Le prénom et le nom sont obligatoires.'); return; }
    setBusy(true); setErr('');
    try {
      const client = await api.clients.create({
        prenom: form.prenom.trim(),
        nom: form.nom.trim(),
        email: form.email.trim() || undefined,
        objectifs: form.objectif.trim() ? [form.objectif.trim()] : [],
        statut: 'nouveau',
      });
      setCreated(client);
      setStep(2);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const finish = async (goTo) => {
    await api.onboardingDone().catch(() => {});
    updateUser({ onboarding_completed: true });
    onDone();
    if (goTo) nav(goTo);
  };

  const skip = () => finish(null);

  const prenom = user?.first_name || 'Coach';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '36px 32px',
        width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(0,0,0,.18)',
        animation: 'fadeIn .25s ease',
      }}>
        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }`}</style>

        <ProgressBar step={step} />

        {/* ── ÉTAPE 0 : Bienvenue ── */}
        {step === 0 && (
          <>
            <div style={{ fontSize: 40, marginBottom: 12, textAlign: 'center' }}>👋</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 10 }}>
              Bienvenue sur TrainFlow, {prenom} !
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, textAlign: 'center', marginBottom: 28 }}>
              En moins de 2 minutes, nous allons créer votre premier client et vous montrer l'essentiel.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 28 }}>
              {[
                { e: '👤', label: 'Gérer vos clients' },
                { e: '📅', label: 'Planifier les séances' },
                { e: '🥗', label: 'Suivre la nutrition' },
              ].map(({ e, label }) => (
                <div key={label} style={{ textAlign: 'center', padding: '14px 8px', background: '#F8FAFF', borderRadius: 12, border: '1px solid #E0E7FF' }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{e}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#4338CA' }}>{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={skip} style={{ background: 'none', border: 'none', fontSize: 13, color: '#94a3b8', cursor: 'pointer' }}>
                Passer l'intro
              </button>
              <Btn primary onClick={() => setStep(1)}>Créer mon premier client →</Btn>
            </div>
          </>
        )}

        {/* ── ÉTAPE 1 : Formulaire client ── */}
        {step === 1 && (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Votre premier client
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 22 }}>
              Entrez ses informations de base. Vous pourrez compléter le profil plus tard.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="fl">Prénom *</label>
                <input className="fi" placeholder="Marie" value={form.prenom} onChange={set('prenom')} autoFocus />
              </div>
              <div className="fg" style={{ marginBottom: 0 }}>
                <label className="fl">Nom *</label>
                <input className="fi" placeholder="Dupont" value={form.nom} onChange={set('nom')} />
              </div>
            </div>
            <div className="fg" style={{ marginBottom: 12 }}>
              <label className="fl">Email <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optionnel)</span></label>
              <input className="fi" type="email" placeholder="marie@exemple.fr" value={form.email} onChange={set('email')} />
            </div>
            <div className="fg" style={{ marginBottom: 20 }}>
              <label className="fl">Objectif principal <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optionnel)</span></label>
              <input className="fi" placeholder="Perte de poids, prise de masse…" value={form.objectif} onChange={set('objectif')} />
            </div>

            {err && (
              <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '9px 12px', borderRadius: 7, fontSize: 13, marginBottom: 14 }}>
                {err}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Btn onClick={() => setStep(0)}>← Retour</Btn>
              <Btn primary onClick={createClient} disabled={busy}>
                {busy ? 'Création…' : 'Créer le client →'}
              </Btn>
            </div>
          </>
        )}

        {/* ── ÉTAPE 2 : Terminé ── */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12, textAlign: 'center' }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', textAlign: 'center', marginBottom: 8 }}>
              {created ? `${created.prenom} ${created.nom} est créé !` : 'Vous êtes prêt !'}
            </h2>
            <p style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 1.7, marginBottom: 28 }}>
              Votre espace TrainFlow est prêt. Que voulez-vous faire maintenant ?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {created && (
                <button onClick={() => finish(`/clients/${created.id}`)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  background: '#F8FAFF', border: '2px solid #6366F1', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{ fontSize: 24 }}>👤</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Voir la fiche de {created.prenom}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Compléter le profil, ajouter des mesures</div>
                  </div>
                </button>
              )}
              <button onClick={() => finish('/planning')} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: '#F8FAFF', border: '1px solid #E2E8F0', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 24 }}>📅</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Planifier une séance</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Créer un rendez-vous avec votre client</div>
                </div>
              </button>
              <button onClick={() => finish('/dashboard')} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                background: '#F8FAFF', border: '1px solid #E2E8F0', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 24 }}>🏠</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>Aller au tableau de bord</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>Explorer TrainFlow à mon rythme</div>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
