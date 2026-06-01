import { useState } from 'react';
import { api } from '../services/api';
import { toast } from './UI';

const TYPES = [
  { key: 'bug',        label: 'Bug',        icon: '🐛', color: '#dc2626', bg: '#fee2e2' },
  { key: 'suggestion', label: 'Suggestion', icon: '💡', color: '#ca8a04', bg: '#fef9c3' },
  { key: 'question',   label: 'Question',   icon: '❓', color: '#0891b2', bg: '#cffafe' },
];

const SEVERITIES = [
  { key: 'low',    label: 'Mineur',   color: '#16a34a' },
  { key: 'medium', label: 'Moyen',    color: '#ca8a04' },
  { key: 'high',   label: 'Critique', color: '#dc2626' },
];

export default function FeedbackWidget() {
  const [open, setOpen]       = useState(false);
  const [type, setType]       = useState('bug');
  const [severity, setSev]    = useState('medium');
  const [title, setTitle]     = useState('');
  const [desc, setDesc]       = useState('');
  const [busy, setBusy]       = useState(false);

  const reset = () => { setType('bug'); setSev('medium'); setTitle(''); setDesc(''); };

  const submit = async () => {
    if (!title.trim() || !desc.trim()) {
      toast('Titre et description requis', 'err');
      return;
    }
    setBusy(true);
    try {
      await api.feedback.submit({
        type,
        severity: type === 'bug' ? severity : '',
        title: title.trim(),
        description: desc.trim(),
        url: window.location.pathname + window.location.search,
      });
      toast(type === 'bug' ? 'Bug signalé, merci !' : 'Feedback envoyé, merci !');
      reset();
      setOpen(false);
    } catch (e) {
      toast(e.message || 'Erreur lors de l\'envoi', 'err');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        title="Signaler un bug ou faire une suggestion"
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9000,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1, #4338ca)',
          color: '#fff', border: 'none', cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(99,102,241,.35)',
          fontSize: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .15s',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >💬</button>

      {open && (
        <div onClick={e => e.target === e.currentTarget && setOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            zIndex: 9001, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}>
          <div style={{
            background: '#fff', borderRadius: 14, maxWidth: 480, width: '100%',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,.3)',
          }}>
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--bdr)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>📩 Signaler un bug / suggérer</div>
                <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Aidez-nous à améliorer l'application — votre retour est précieux !</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--t3)' }}>×</button>
            </div>

            <div style={{ padding: 22 }}>
              {/* Type */}
              <div className="fg">
                <label className="fl">Type</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {TYPES.map(t => (
                    <button key={t.key} onClick={() => setType(t.key)}
                      style={{
                        flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                        border: `2px solid ${type === t.key ? t.color : 'var(--bdr)'}`,
                        background: type === t.key ? t.bg : 'var(--bg)',
                        color: type === t.key ? t.color : 'var(--t1)',
                        fontWeight: 700,
                      }}>
                      <div style={{ fontSize: 22, marginBottom: 3 }}>{t.icon}</div>
                      <div style={{ fontSize: 12 }}>{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sévérité (bug uniquement) */}
              {type === 'bug' && (
                <div className="fg">
                  <label className="fl">Sévérité</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {SEVERITIES.map(s => (
                      <button key={s.key} onClick={() => setSev(s.key)}
                        style={{
                          flex: 1, padding: '7px 6px', borderRadius: 8, cursor: 'pointer',
                          border: `1.5px solid ${severity === s.key ? s.color : 'var(--bdr)'}`,
                          background: severity === s.key ? s.color : 'transparent',
                          color: severity === s.key ? '#fff' : s.color,
                          fontWeight: 600, fontSize: 12,
                        }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Titre */}
              <div className="fg">
                <label className="fl">Titre court *</label>
                <input className="fi" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder={
                    type === 'bug' ? 'Ex: la séance ne se sauvegarde pas' :
                    type === 'suggestion' ? 'Ex: ajouter un calendrier mensuel' :
                    'Ex: comment fonctionne la facturation ?'
                  }
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div className="fg">
                <label className="fl">Description *</label>
                <textarea className="fi" rows={5} value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder={
                    type === 'bug'
                      ? 'Étapes pour reproduire :\n1. ...\n2. ...\n\nComportement attendu :\n\nComportement observé :'
                      : 'Décrivez en détail votre idée ou votre question…'
                  }
                  maxLength={5000}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
                <div style={{ fontSize: 10, color: 'var(--t3)', textAlign: 'right', marginTop: 3 }}>
                  {desc.length} / 5000
                </div>
              </div>

              <div style={{ fontSize: 11, color: 'var(--t3)', background: 'var(--bg)', padding: '8px 12px', borderRadius: 8, lineHeight: 1.5 }}>
                ℹ️ Pour nous aider à reproduire, nous capturons la page actuelle ({window.location.pathname}) et votre navigateur. Pas de données sensibles.
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--bdr)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-s" onClick={() => setOpen(false)} disabled={busy}>Annuler</button>
              <button className="btn btn-p" onClick={submit} disabled={busy || !title.trim() || !desc.trim()}>
                {busy ? 'Envoi…' : '📤 Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
