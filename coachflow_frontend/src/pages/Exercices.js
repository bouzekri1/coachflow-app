import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { ExerciseImg } from '../components/UI';

const GROUPES = [
  { value: '', label: 'Tous les groupes' },
  { value: 'pectoraux',  label: 'Pectoraux' },
  { value: 'dorsaux',    label: 'Dorsaux' },
  { value: 'epaules',    label: 'Épaules' },
  { value: 'biceps',     label: 'Biceps' },
  { value: 'triceps',    label: 'Triceps' },
  { value: 'abdominaux', label: 'Abdominaux' },
  { value: 'quadriceps', label: 'Quadriceps' },
  { value: 'ischio',     label: 'Ischio-jambiers' },
  { value: 'fessiers',   label: 'Fessiers' },
  { value: 'mollets',    label: 'Mollets' },
  { value: 'full_body',  label: 'Full body' },
  { value: 'cardio',     label: 'Cardio' },
];

const CATEGORIES = [
  { value: '', label: 'Toutes catégories' },
  { value: 'force',    label: 'Force' },
  { value: 'cardio',   label: 'Cardio' },
  { value: 'mobilite', label: 'Mobilité' },
  { value: 'gainage',  label: 'Gainage' },
];

const CAT_COLORS = {
  force:    '#6366f1',
  cardio:   '#ef4444',
  mobilite: '#22c55e',
  gainage:  '#f59e0b',
};

const GROUPE_EMOJIS = {
  pectoraux: '💪', dorsaux: '🔙', epaules: '🏋️', biceps: '💪',
  triceps: '💪', abdominaux: '🎯', quadriceps: '🦵', ischio: '🦵',
  fessiers: '🍑', mollets: '🦵', full_body: '⚡', cardio: '❤️',
};

function GifPreview({ url, groupe }) {
  return (
    <div style={{
      width: '100%', aspectRatio: '1', background: '#1e293b',
      borderRadius: 8, overflow: 'hidden', display: 'flex',
      alignItems: 'center', justifyContent: 'center', position: 'relative',
    }}>
      {!url ? (
        <div style={{ color: '#64748b', fontSize: 28 }}>{GROUPE_EMOJIS[groupe] || '🏋️'}</div>
      ) : (
        <ExerciseImg url={url} alt="" width="100%" height="100%" />
      )}
    </div>
  );
}

function ExerciceCard({ ex, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      background: '#1e293b', borderRadius: 12, overflow: 'hidden',
      border: '1px solid #334155', transition: 'transform .15s, box-shadow .15s',
      cursor: 'default',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,.4)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      <GifPreview url={ex.gif_url || ex.gif_file} groupe={ex.groupe_musculaire} />
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            background: CAT_COLORS[ex.categorie] + '22',
            color: CAT_COLORS[ex.categorie],
            border: `1px solid ${CAT_COLORS[ex.categorie]}44`,
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
          }}>{ex.categorie_label}</span>
          <span style={{
            background: '#0f172a', color: '#94a3b8',
            border: '1px solid #334155',
            fontSize: 10, padding: '2px 7px', borderRadius: 99,
          }}>{ex.groupe_musculaire_label}</span>
          {ex.est_personnalise && (
            <span style={{
              background: '#f59e0b22', color: '#f59e0b',
              border: '1px solid #f59e0b44',
              fontSize: 10, padding: '2px 7px', borderRadius: 99,
            }}>Perso</span>
          )}
        </div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#e2e8f0', marginBottom: 6, lineHeight: 1.3 }}>
          {ex.nom}
        </div>
        {ex.description && (
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
            {expanded ? ex.description : ex.description.slice(0, 80) + (ex.description.length > 80 ? '…' : '')}
            {ex.description.length > 80 && (
              <button onClick={() => setExpanded(v => !v)}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, cursor: 'pointer', padding: 0, marginLeft: 4 }}>
                {expanded ? 'Moins' : 'Plus'}
              </button>
            )}
          </div>
        )}
        {ex.est_personnalise && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <button onClick={() => onEdit(ex)} style={{
              flex: 1, background: '#334155', border: 'none', color: '#94a3b8',
              borderRadius: 6, padding: '5px 0', fontSize: 11, cursor: 'pointer',
            }}>Modifier</button>
            <button onClick={() => onDelete(ex)} style={{
              background: '#7f1d1d', border: 'none', color: '#fca5a5',
              borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer',
            }}>Suppr.</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExerciceModal({ exercice, onSave, onClose }) {
  const [form, setForm] = useState({
    nom: exercice?.nom || '',
    description: exercice?.description || '',
    groupe_musculaire: exercice?.groupe_musculaire || 'pectoraux',
    categorie: exercice?.categorie || 'force',
    gif_url: exercice?.gif_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nom.trim()) { setErr('Le nom est requis.'); return; }
    setSaving(true); setErr('');
    try {
      let result;
      if (exercice) {
        result = await api.exercices.update(exercice.id, form);
      } else {
        result = await api.exercices.create(form);
      }
      onSave(result);
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: '#1e293b', borderRadius: 14, padding: 28, width: 480,
        maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, color: '#e2e8f0', fontSize: 16 }}>
            {exercice ? 'Modifier l\'exercice' : 'Nouvel exercice'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Nom *</label>
            <input value={form.nom} onChange={e => set('nom', e.target.value)}
              style={inputStyle} placeholder="Ex: Curl marteau haltères" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Groupe musculaire</label>
              <select value={form.groupe_musculaire} onChange={e => set('groupe_musculaire', e.target.value)} style={inputStyle}>
                {GROUPES.slice(1).map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Catégorie</label>
              <select value={form.categorie} onChange={e => set('categorie', e.target.value)} style={inputStyle}>
                {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>URL du GIF (optionnel)</label>
            <input value={form.gif_url} onChange={e => set('gif_url', e.target.value)}
              style={inputStyle} placeholder="https://..." />
          </div>
          {form.gif_url && (
            <div style={{ width: 120 }}>
              <GifPreview url={form.gif_url} groupe={form.groupe_musculaire} />
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 5 }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} style={{ ...inputStyle, resize: 'vertical' }}
              placeholder="Description de l'exercice, conseils d'exécution..." />
          </div>
          {err && <div style={{ color: '#f87171', fontSize: 12 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 18px', background: '#334155', border: 'none',
              color: '#94a3b8', borderRadius: 8, cursor: 'pointer', fontSize: 13,
            }}>Annuler</button>
            <button type="submit" disabled={saving} style={{
              padding: '8px 20px', background: '#6366f1', border: 'none',
              color: '#fff', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 12px', background: '#0f172a',
  border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0',
  fontSize: 13, boxSizing: 'border-box', outline: 'none',
};

export default function Exercices() {
  const [exercices, setExercices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [groupe, setGroupe] = useState('');
  const [categorie, setCategorie] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | exercice-object

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (groupe) params.append('groupe', groupe);
      if (categorie) params.append('categorie', categorie);
      if (search) params.append('q', search);
      const q = params.toString() ? '?' + params.toString() : '';
      const data = await api.exercices.list(q);
      setExercices(Array.isArray(data) ? data : data.results || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [groupe, categorie, search]);

  useEffect(() => { load(); }, [load]);

  function handleSave(result) {
    setExercices(prev => {
      const idx = prev.findIndex(e => e.id === result.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = result; return next;
      }
      return [result, ...prev];
    });
    setModal(null);
  }

  async function handleDelete(ex) {
    if (!window.confirm(`Supprimer "${ex.nom}" ?`)) return;
    try {
      await api.exercices.delete(ex.id);
      setExercices(prev => prev.filter(e => e.id !== ex.id));
    } catch (err) {
      alert(err.message);
    }
  }

  // Group exercises by muscle group for display
  const grouped = {};
  exercices.forEach(ex => {
    const g = ex.groupe_musculaire_label || ex.groupe_musculaire;
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(ex);
  });

  const showGrouped = !groupe && !search;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Bibliothèque d'exercices</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            {exercices.length} exercice{exercices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setModal('create')} style={{
          background: '#6366f1', border: 'none', color: '#fff',
          padding: '9px 18px', borderRadius: 9, cursor: 'pointer',
          fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
        }}>+ Ajouter un exercice</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher un exercice..."
          style={{ ...inputStyle, width: 220 }}
        />
        <select value={groupe} onChange={e => setGroupe(e.target.value)} style={{ ...inputStyle, width: 180 }}>
          {GROUPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        <select value={categorie} onChange={e => setCategorie(e.target.value)} style={{ ...inputStyle, width: 160 }}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        {(groupe || categorie || search) && (
          <button onClick={() => { setGroupe(''); setCategorie(''); setSearch(''); }}
            style={{ background: '#334155', border: 'none', color: '#94a3b8', padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 }}>
            Réinitialiser
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Chargement…</div>
      ) : exercices.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Aucun exercice trouvé.</div>
      ) : showGrouped ? (
        Object.entries(grouped).map(([groupeLabel, items]) => (
          <div key={groupeLabel} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
              {GROUPE_EMOJIS[items[0]?.groupe_musculaire] || '💪'} {groupeLabel}
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16,
            }}>
              {items.map(ex => (
                <ExerciceCard key={ex.id} ex={ex} onEdit={setModal} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 16,
        }}>
          {exercices.map(ex => (
            <ExerciceCard key={ex.id} ex={ex} onEdit={setModal} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {modal && (
        <ExerciceModal
          exercice={modal === 'create' ? null : modal}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
