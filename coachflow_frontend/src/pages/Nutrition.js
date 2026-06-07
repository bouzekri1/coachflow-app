import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';
import { Loader, Empty, Modal, toast } from '../components/UI';

/* ── VISUEL RECETTE ─────────────────────────────────────────────────────── */
function recipeVisual(nom = '') {
  const n = nom.toLowerCase();
  if (n.includes('smoothie') || n.includes('shake'))          return { e: '🥤', bg: '#D1FAE5' };
  if (n.includes('saumon') || n.includes('truite'))           return { e: '🐟', bg: '#DBEAFE' };
  if (n.includes('thon') || n.includes('cabillaud'))          return { e: '🐠', bg: '#E0F2FE' };
  if (n.includes('crevette'))                                 return { e: '🦐', bg: '#FCE7F3' };
  if (n.includes('omelette') || n.includes('œuf') || n.includes('oeuf')) return { e: '🍳', bg: '#FEF9C3' };
  if (n.includes('pancake'))                                  return { e: '🥞', bg: '#FEE2E2' };
  if (n.includes('muffin') || n.includes('cake'))             return { e: '🧁', bg: '#F3E8FF' };
  if (n.includes('burger') || n.includes('hamburger'))        return { e: '🍔', bg: '#FCA5A5' };
  if (n.includes('wrap') || n.includes('tortilla'))           return { e: '🌯', bg: '#F5F3FF' };
  if (n.includes('buddha') || n.includes('bowl'))             return { e: '🥗', bg: '#A7F3D0' };
  if (n.includes('curry') || n.includes('dahl') || n.includes('dhal')) return { e: '🍛', bg: '#FDE68A' };
  if (n.includes('soupe') || n.includes('miso') || n.includes('chili')) return { e: '🍲', bg: '#FEF3C7' };
  if (n.includes('salade'))                                   return { e: '🥗', bg: '#BBF7D0' };
  if (n.includes('falafel') || n.includes('pois chiche'))     return { e: '🧆', bg: '#FEF3C7' };
  if (n.includes('steak') || n.includes('boeuf') || n.includes('dinde') || n.includes('poulet')) return { e: '🍗', bg: '#FED7AA' };
  if (n.includes('skyr') || n.includes('oat') || n.includes('porridge') || n.includes('granola')) return { e: '🥣', bg: '#FEF3C7' };
  if (n.includes('tartine') || n.includes('tartare'))         return { e: '🍱', bg: '#E0F2FE' };
  if (n.includes('wok') || n.includes('asiat'))               return { e: '🥢', bg: '#FCE7F3' };
  if (n.includes('riz'))                                      return { e: '🍚', bg: '#F0FDF4' };
  if (n.includes('tempeh') || n.includes('tofu'))             return { e: '🌱', bg: '#DCFCE7' };
  return { e: '🍽️', bg: '#F1F5F9' };
}

function RecipeThumb({ recette, size = 56, radius = 10 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = recette?.photo_url;
  const vis = recipeVisual(recette?.nom);
  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={recette.nom}
        style={{ width: size, height: size, borderRadius: radius, objectFit: 'cover', flexShrink: 0 }}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: vis.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.43, flexShrink: 0 }}>
      {vis.e}
    </div>
  );
}

function RecipeThumbBanner({ recette }) {
  const [failed, setFailed] = useState(false);
  const src = recette?.photo_url;
  const vis = recipeVisual(recette?.nom);
  if (src && !failed) {
    return (
      <img src={src} alt={recette.nom}
        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', objectPosition: 'center', borderRadius: 10, display: 'block', background: '#F1F5F9' }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div style={{ width:'100%', aspectRatio: '16/9', background: vis.bg, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', fontSize:64 }}>
      {vis.e}
    </div>
  );
}

/* ── CONSTANTES ──────────────────────────────────────────────────────────── */
const REPAS_LABELS = {
  petit_dejeuner:  '🌅 Petit-déjeuner',
  collation_matin: '🍎 Collation matin',
  dejeuner:        '☀️ Déjeuner',
  collation_soir:  '🥜 Collation après-midi',
  diner:           '🌙 Dîner',
};

const REPAS_TYPES = Object.keys(REPAS_LABELS);

const CAT_LABELS = {
  viandes_poissons: '🥩 Viandes & Poissons',
  legumes:          '🥦 Légumes',
  feculents:        '🍚 Féculents & Céréales',
  laitiers:         '🥛 Produits laitiers',
  fruits:           '🍎 Fruits',
  matieres_grasses: '🫒 Matières grasses',
  legumineuses:     '🫘 Légumineuses',
  autres:           '📦 Autres',
};

/* ── BADGE MACRO ─────────────────────────────────────────────────────────── */
function MacroBadge({ macros, compact }) {
  if (!macros) return null;
  const items = [
    { k: 'calories',  v: macros.calories,  u: 'kcal', c: '#1D9E75' },
    { k: 'proteines', v: macros.proteines, u: 'P',    c: '#3B82F6' },
    { k: 'glucides',  v: macros.glucides,  u: 'G',    c: '#F59E0B' },
    { k: 'lipides',   v: macros.lipides,   u: 'L',    c: '#EF4444' },
  ];
  if (compact) return (
    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {items.map(({ k, v, u, c }) => (
        <span key={k} style={{ fontSize: 11, fontWeight: 700, color: c }}>
          {Math.round(v)}{u}
        </span>
      ))}
    </span>
  );
  return (
    <div className="macro-badge">
      {items.map(({ k, v, u, c }) => (
        <div key={k} style={{
          background: c + '18', borderRadius: 8, padding: '6px 10px', textAlign: 'center', minWidth: 56,
        }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: c }}>{Math.round(v)}</div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>{u}</div>
        </div>
      ))}
    </div>
  );
}

/* ── MODAL RECHERCHE ALIMENT ─────────────────────────────────────────────── */
function AlimentSearchModal({ onSelect, onClose }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [externs, setExterns] = useState(null); // null = pas encore cherché, [] = vide, [...] = résultats
  const [externBusy, setExternBusy] = useState(false);
  const [importing, setImporting] = useState(null); // source_id en cours d'import

  const search = useCallback(async () => {
    setBusy(true);
    try {
      const params = [];
      if (q) params.push(`q=${encodeURIComponent(q)}`);
      if (cat) params.push(`cat=${cat}`);
      const data = await api.nutrition.aliments(`?${params.join('&')}`);
      setResults(data.results || data);
    } catch { setResults([]); }
    finally { setBusy(false); }
  }, [q, cat]);

  useEffect(() => { search(); setExterns(null); }, [search]);

  const searchExterne = async () => {
    if (q.trim().length < 2) return;
    setExternBusy(true);
    try {
      const data = await api.nutrition.searchAlimentExterne(q.trim());
      setExterns(data.results || []);
    } catch { setExterns([]); }
    finally { setExternBusy(false); }
  };

  const importExterne = async (candidate) => {
    setImporting(candidate.source_id);
    try {
      const created = await api.nutrition.importAlimentExterne({
        nom: candidate.nom,
        categorie: candidate.categorie,
        calories_100g:  candidate.calories_100g,
        proteines_100g: candidate.proteines_100g,
        glucides_100g:  candidate.glucides_100g,
        lipides_100g:   candidate.lipides_100g,
        fibres_100g:    candidate.fibres_100g,
        source_id:      candidate.source_id,
      });
      setSel(created);
      setResults(r => [created, ...r.filter(a => a.id !== created.id)]);
      setExterns(null);
      setQ(created.nom);
    } catch (e) {
      // affiche l'erreur via toast si dispo
    } finally {
      setImporting(null);
    }
  };

  const [qty, setQty] = useState('100');
  const [sel, setSel] = useState(null);

  const confirm = () => {
    if (!sel || !qty) return;
    onSelect({ aliment: sel.id, quantite_g: parseFloat(qty), aliment_details: sel });
  };

  return (
    <Modal title="Ajouter un aliment" onClose={onClose} footer={
      <>
        <button className="btn btn-s" onClick={onClose}>Annuler</button>
        <button className="btn btn-p" onClick={confirm} disabled={!sel}>
          Ajouter {sel ? `${qty}g de ${sel.nom}` : ''}
        </button>
      </>
    }>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input className="fi" style={{ flex: 1 }} placeholder="Rechercher..." value={q}
          onChange={e => setQ(e.target.value)} autoFocus />
        <select className="fi fsel" style={{ width: 160 }} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CAT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--bdr)', borderRadius: 8 }}>
        {busy ? <div style={{ padding: 20, textAlign: 'center' }}><div className="spin" /></div>
          : results.length === 0
          ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
              <div style={{ marginBottom: 12 }}>Aucun aliment dans ta base</div>
              {q.trim().length >= 2 && externs === null && (
                <button className="btn btn-p btn-sm" onClick={searchExterne} disabled={externBusy}>
                  {externBusy ? '🔍 Recherche…' : `🌍 Chercher "${q.trim()}" sur Open Food Facts`}
                </button>
              )}
            </div>
          )
          : results.map(a => (
            <div key={a.id}
              onClick={() => setSel(a)}
              style={{
                padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--bdr)',
                background: sel?.id === a.id ? 'var(--acc2)' : 'transparent',
                transition: 'background .1s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{a.nom}</span>
                  <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 8 }}>
                    {CAT_LABELS[a.categorie] || a.categorie}
                  </span>
                </div>
                <MacroBadge macros={{ calories: a.calories_100g, proteines: a.proteines_100g, glucides: a.glucides_100g, lipides: a.lipides_100g }} compact />
              </div>
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>pour 100g</div>
            </div>
          ))
        }
      </div>

      {/* Suggestion Open Food Facts quand on a des résultats locaux mais que le coach veut élargir */}
      {!busy && results.length > 0 && q.trim().length >= 2 && externs === null && (
        <div style={{ marginTop: 10, textAlign: 'center' }}>
          <button className="btn btn-s btn-sm" onClick={searchExterne} disabled={externBusy}>
            {externBusy ? '🔍 Recherche…' : `🌍 Chercher "${q.trim()}" sur Open Food Facts`}
          </button>
        </div>
      )}

      {/* Résultats Open Food Facts */}
      {externs !== null && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', marginBottom: 8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>🌍 Suggestions Open Food Facts ({externs.length})</span>
            <button className="btn btn-g btn-sm" style={{ fontSize:11 }} onClick={() => setExterns(null)}>Fermer</button>
          </div>
          {externs.length === 0 ? (
            <div style={{ padding:14, textAlign:'center', color:'var(--t3)', fontSize:13, background:'var(--bg)', borderRadius:8 }}>
              Aucun résultat dans Open Food Facts.
            </div>
          ) : (
            <div style={{ maxHeight: 240, overflowY:'auto', border:'1px solid var(--bdr)', borderRadius:8 }}>
              {externs.map(c => (
                <div key={c.source_id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderBottom:'1px solid var(--bdr)' }}>
                  {c.image
                    ? <img src={c.image} alt="" style={{ width:40, height:40, objectFit:'cover', borderRadius:6, flexShrink:0 }} />
                    : <div style={{ width:40, height:40, borderRadius:6, background:'var(--bg)', flexShrink:0 }} />}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nom}</div>
                    <div style={{ fontSize:11, color:'var(--t3)' }}>
                      {Math.round(c.calories_100g)} kcal · P {c.proteines_100g}g · G {c.glucides_100g}g · L {c.lipides_100g}g — /100g
                    </div>
                  </div>
                  <button className="btn btn-p btn-sm" style={{ fontSize:11, flexShrink:0 }}
                    onClick={() => importExterne(c)} disabled={importing === c.source_id}>
                    {importing === c.source_id ? '⏳' : '+ Ajouter'}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize:10, color:'var(--t3)', marginTop:6, textAlign:'center' }}>
            Les aliments importés sont ajoutés à ta base personnelle.
          </div>
        </div>
      )}

      {sel && (
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="fl">Quantité (g) *</label>
            <input className="fi" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          {qty && (
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6 }}>Macros pour {qty}g</div>
              <MacroBadge macros={{
                calories:  sel.calories_100g  * qty / 100,
                proteines: sel.proteines_100g * qty / 100,
                glucides:  sel.glucides_100g  * qty / 100,
                lipides:   sel.lipides_100g   * qty / 100,
              }} compact />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ── PLAN BUILDER ────────────────────────────────────────────────────────── */
function PlanBuilder({ plan: initPlan, clients, onDone }) {
  const isNew = !initPlan?.id;
  const [plan, setPlan] = useState(initPlan || { nom: '', description: '', objectif_calories: '', objectif_proteines_g: '', objectif_glucides_g: '', objectif_lipides_g: '' });
  const [savedPlan, setSavedPlan] = useState(isNew ? null : initPlan);
  const [busy, setBusy] = useState(false);
  const [addAlimentTo, setAddAlimentTo] = useState(null); // repas_id
  const [assignModal, setAssignModal] = useState(false);
  const [af, setAf] = useState({ client_id: '', date_debut: new Date().toISOString().split('T')[0] });

  const sf = (k, v) => setPlan(p => ({ ...p, [k]: v }));

  const savePlan = async () => {
    if (!plan.nom) return toast('Nom du plan requis', 'err');
    setBusy(true);
    try {
      const payload = { ...plan };
      ['objectif_calories', 'objectif_proteines_g', 'objectif_glucides_g', 'objectif_lipides_g']
        .forEach(k => { if (!payload[k]) delete payload[k]; });
      let saved;
      if (isNew || !savedPlan?.id) {
        saved = await api.nutrition.createPlan(payload);
      } else {
        saved = await api.nutrition.updatePlan(savedPlan.id, payload);
      }
      setSavedPlan(saved);
      toast('Plan sauvegardé ✓');
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const addRepas = async (type_repas) => {
    if (!savedPlan?.id) return toast('Sauvegardez d\'abord le plan', 'err');
    try {
      const r = await api.nutrition.addRepas(savedPlan.id, { type_repas });
      setSavedPlan(p => ({ ...p, repas: [...(p.repas || []), r] }));
    } catch (e) { toast(e.message, 'err'); }
  };

  const removeRepas = async (repasId) => {
    try {
      await api.nutrition.removeRepas(savedPlan.id, repasId);
      setSavedPlan(p => ({ ...p, repas: p.repas.filter(r => r.id !== repasId) }));
    } catch (e) { toast(e.message, 'err'); }
  };

  const onAlimentSelected = async ({ aliment, quantite_g }) => {
    try {
      const ar = await api.nutrition.addAlimentRepas(savedPlan.id, addAlimentTo, { aliment, quantite_g });
      setSavedPlan(p => ({
        ...p,
        repas: p.repas.map(r => r.id === addAlimentTo
          ? { ...r, aliments: [...(r.aliments || []), ar], macros_total: recalcMacros(r, ar) }
          : r
        ),
      }));
      setAddAlimentTo(null);
      toast('Aliment ajouté ✓');
    } catch (e) { toast(e.message, 'err'); }
  };

  const recalcMacros = (repas, newAr) => {
    const all = [...(repas.aliments || []), newAr];
    const t = { calories: 0, proteines: 0, glucides: 0, lipides: 0 };
    all.forEach(ar => { if (ar.macros) Object.keys(t).forEach(k => t[k] += ar.macros[k] || 0); });
    return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v * 10) / 10]));
  };

  const removeAlimentRepas = async (repasId, arId) => {
    try {
      await api.nutrition.removeAlimentRepas(savedPlan.id, repasId, arId);
      setSavedPlan(p => ({
        ...p,
        repas: p.repas.map(r => r.id === repasId
          ? { ...r, aliments: r.aliments.filter(a => a.id !== arId) }
          : r
        ),
      }));
    } catch (e) { toast(e.message, 'err'); }
  };

  const assigner = async () => {
    if (!af.client_id || !af.date_debut) return toast('Client et date requis', 'err');
    try {
      await api.nutrition.assignerPlan(savedPlan.id, af);
      toast('Plan assigné au client ✓');
      setAssignModal(false);
    } catch (e) { toast(e.message, 'err'); }
  };

  const existingRepasTypes = (savedPlan?.repas || []).map(r => r.type_repas);
  const availableTypes = REPAS_TYPES.filter(t => !existingRepasTypes.includes(t));

  return (
    <div>
      <div className="plan-list-hd" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 18, fontWeight: 800, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isNew ? 'Nouveau plan' : `Modifier : ${savedPlan?.nom}`}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {savedPlan?.id && (
            <button className="btn btn-s btn-sm" onClick={() => setAssignModal(true)}>👤 Assigner</button>
          )}
          <button className="btn btn-s btn-sm" onClick={onDone}>← Retour</button>
        </div>
      </div>

      {/* Infos plan */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-t">Informations du plan</div>
        <div className="fg">
          <label className="fl">Nom du plan *</label>
          <input className="fi" placeholder="ex: Plan prise de masse" value={plan.nom} onChange={e => sf('nom', e.target.value)} />
        </div>
        <div className="fg">
          <label className="fl">Description</label>
          <textarea className="fi fta" style={{ minHeight: 60 }} placeholder="Objectifs, consignes..." value={plan.description} onChange={e => sf('description', e.target.value)} />
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', marginBottom: 10 }}>Objectifs journaliers (optionnel)</div>
        <div className="macro-grid">
          {[
            { k: 'objectif_calories',    label: 'Calories', u: 'kcal' },
            { k: 'objectif_proteines_g', label: 'Protéines', u: 'g' },
            { k: 'objectif_glucides_g',  label: 'Glucides', u: 'g' },
            { k: 'objectif_lipides_g',   label: 'Lipides', u: 'g' },
          ].map(({ k, label, u }) => (
            <div key={k} className="fg" style={{ marginBottom: 0 }}>
              <label className="fl">{label} ({u})</label>
              <input className="fi" type="number" placeholder="—" value={plan[k] || ''} onChange={e => sf(k, e.target.value)} style={{ textAlign: 'center' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14 }}>
          <button className="btn btn-p btn-sm" onClick={savePlan} disabled={busy}>
            {busy ? 'Sauvegarde...' : savedPlan?.id ? '✓ Mettre à jour' : '+ Créer le plan'}
          </button>
        </div>
      </div>

      {/* Calculateur calorique */}
      <CalcCalories onApply={(r) => {
        sf('objectif_calories', String(r.calories));
        sf('objectif_proteines_g', String(r.proteines_g));
        sf('objectif_glucides_g', String(r.glucides_g));
        sf('objectif_lipides_g', String(r.lipides_g));
        toast('Objectifs appliqués depuis le calculateur ✓');
      }} />

      {/* Repas */}
      {savedPlan?.id && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>Repas de la journée type</div>
            {availableTypes.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {availableTypes.map(t => (
                  <button key={t} className="btn btn-s btn-sm" style={{ fontSize: 11 }} onClick={() => addRepas(t)}>
                    + {REPAS_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {(savedPlan.repas || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--t3)', fontSize: 13, border: '2px dashed var(--bdr)', borderRadius: 12 }}>
              Ajoutez des repas à votre plan en cliquant sur les boutons ci-dessus
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {(savedPlan.repas || []).map(repas => (
                <div key={repas.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{REPAS_LABELS[repas.type_repas]}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {repas.macros_total && <MacroBadge macros={repas.macros_total} compact />}
                      <button className="btn btn-p btn-sm" style={{ fontSize: 11 }} onClick={() => setAddAlimentTo(repas.id)}>+ Aliment</button>
                      <button className="btn btn-sm" style={{ color: 'var(--red)', fontSize: 11, border: '1px solid var(--red)', background: 'transparent' }}
                        onClick={() => removeRepas(repas.id)}>Supprimer</button>
                    </div>
                  </div>

                  {(repas.aliments || []).length === 0
                    ? <div style={{ fontSize: 12, color: 'var(--t3)', padding: '8px 0' }}>Aucun aliment — cliquez sur "+ Aliment"</div>
                    : (repas.aliments || []).map(ar => (
                      <div key={ar.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0', borderBottom: '1px solid var(--bdr)',
                      }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>
                            {ar.aliment_details?.nom || ar.recette_details?.nom}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--t3)', marginLeft: 8 }}>{ar.quantite_g}g</span>
                        </div>
                        {ar.macros && <MacroBadge macros={ar.macros} compact />}
                        <button onClick={() => removeAlimentRepas(repas.id, ar.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 16, padding: '0 4px' }}>✕</button>
                      </div>
                    ))
                  }
                </div>
              ))}
            </div>
          )}

          {/* Total macros */}
          {(savedPlan.repas || []).length > 0 && (
            <div className="card" style={{ marginTop: 16, background: 'var(--bg)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Totaux journaliers</div>
              <MacroBadge macros={calcTotalMacros(savedPlan.repas || [])} />
            </div>
          )}
        </div>
      )}

      {addAlimentTo && (
        <AlimentSearchModal onSelect={onAlimentSelected} onClose={() => setAddAlimentTo(null)} />
      )}

      {assignModal && (
        <Modal title="Assigner le plan à un client" onClose={() => setAssignModal(false)} footer={
          <>
            <button className="btn btn-s" onClick={() => setAssignModal(false)}>Annuler</button>
            <button className="btn btn-p" onClick={assigner}>Assigner</button>
          </>
        }>
          <div className="fg">
            <label className="fl">Client *</label>
            <select className="fi fsel" value={af.client_id} onChange={e => setAf(x => ({ ...x, client_id: e.target.value }))}>
              <option value="">Choisir un client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>
              ))}
            </select>
          </div>
          <div className="fg">
            <label className="fl">Date de début *</label>
            <input className="fi" type="date" value={af.date_debut} onChange={e => setAf(x => ({ ...x, date_debut: e.target.value }))} />
          </div>
          <p style={{ fontSize: 11, color: 'var(--t3)' }}>
            Tout plan alimentaire actif pour ce client sera désactivé.
          </p>
        </Modal>
      )}
    </div>
  );
}

function calcTotalMacros(repas) {
  const t = { calories: 0, proteines: 0, glucides: 0, lipides: 0, fibres: 0 };
  repas.forEach(r => {
    if (r.macros_total) Object.keys(t).forEach(k => t[k] += r.macros_total[k] || 0);
  });
  return Object.fromEntries(Object.entries(t).map(([k, v]) => [k, Math.round(v)]));
}

/* ── CALCULATEUR CALORIQUE ───────────────────────────────────────────────── */
function CalcCalories({ onApply }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ poids_kg: '', taille_cm: '', age: '', genre: 'homme', activite: 'modere', objectif: 'maintien' });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const sf = (k, v) => setF(x => ({ ...x, [k]: v }));

  const calc = async () => {
    if (!f.poids_kg || !f.taille_cm || !f.age) return toast('Poids, taille et âge requis', 'err');
    setBusy(true);
    try {
      const r = await api.nutrition.calculateur({ ...f, poids_kg: Number(f.poids_kg), taille_cm: Number(f.taille_cm), age: Number(f.age) });
      setResult(r);
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  if (!open) return (
    <div className="card" style={{ marginBottom: 16, background: 'var(--bg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>🧮 Calculateur calorique</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Harris-Benedict • Calcul automatique des besoins</div>
        </div>
        <button className="btn btn-s btn-sm" onClick={() => setOpen(true)}>Ouvrir</button>
      </div>
    </div>
  );

  return (
    <div className="card" style={{ marginBottom: 16, border: '1.5px solid var(--acc)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>🧮 Calculateur calorique (Harris-Benedict)</div>
        <button className="btn btn-g btn-sm" onClick={() => setOpen(false)}>✕</button>
      </div>
      <div className="calc-grid" style={{ marginBottom: 10 }}>
        {[
          { k: 'poids_kg',  label: 'Poids (kg)',   ph: '75' },
          { k: 'taille_cm', label: 'Taille (cm)',  ph: '175' },
          { k: 'age',       label: 'Âge',          ph: '30' },
        ].map(({ k, label, ph }) => (
          <div key={k} className="fg" style={{ marginBottom: 0 }}>
            <label className="fl">{label}</label>
            <input className="fi" type="number" placeholder={ph} value={f[k]} onChange={e => sf(k, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="calc-grid" style={{ marginBottom: 14 }}>
        <div className="fg" style={{ marginBottom: 0 }}>
          <label className="fl">Genre</label>
          <select className="fi fsel" value={f.genre} onChange={e => sf('genre', e.target.value)}>
            <option value="homme">Homme</option><option value="femme">Femme</option>
          </select>
        </div>
        <div className="fg" style={{ marginBottom: 0 }}>
          <label className="fl">Activité</label>
          <select className="fi fsel" value={f.activite} onChange={e => sf('activite', e.target.value)}>
            <option value="sedentaire">Sédentaire</option>
            <option value="leger">Légèrement actif</option>
            <option value="modere">Modérément actif</option>
            <option value="actif">Très actif</option>
            <option value="tres_actif">Extrêmement actif</option>
          </select>
        </div>
        <div className="fg" style={{ marginBottom: 0 }}>
          <label className="fl">Objectif</label>
          <select className="fi fsel" value={f.objectif} onChange={e => sf('objectif', e.target.value)}>
            <option value="perte_poids">Perte de poids</option>
            <option value="maintien">Maintien</option>
            <option value="prise_masse">Prise de masse</option>
          </select>
        </div>
      </div>
      <button className="btn btn-p btn-sm" onClick={calc} disabled={busy}>
        {busy ? 'Calcul...' : 'Calculer mes besoins'}
      </button>

      {result && (
        <div style={{ marginTop: 14, background: 'var(--bg)', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 10 }}>
            BMR : {result.bmr} kcal/j · TDEE : {result.tdee} kcal/j
          </div>
          <MacroBadge macros={{ calories: result.calories, proteines: result.proteines_g, glucides: result.glucides_g, lipides: result.lipides_g }} />
          <button className="btn btn-p btn-sm" style={{ marginTop: 12 }} onClick={() => { onApply(result); setOpen(false); }}>
            ← Appliquer au plan
          </button>
        </div>
      )}
    </div>
  );
}

/* ── PAGE PLANS ──────────────────────────────────────────────────────────── */
function Plans() {
  const [plans, setPlans] = useState(null);
  const [clients, setClients] = useState([]);
  const [editing, setEditing] = useState(null); // null = liste, false = nouveau, obj = existant

  const load = async () => {
    const [p, c] = await Promise.all([api.nutrition.plans(), api.clients.list()]);
    setPlans(p.results || p);
    setClients(c.results || c);
  };

  const deletePlan = async (p) => {
    if (!window.confirm(`Supprimer "${p.nom}" ?${p.nb_clients > 0 ? `\n⚠️ Ce plan est assigné à ${p.nb_clients} client(s).` : ''}`)) return;
    try {
      await api.nutrition.deletePlan(p.id);
      toast('Plan supprimé'); load();
    } catch (e) { toast(e.message, 'err'); }
  };

  useEffect(() => { load(); }, []);

  if (editing !== null) return (
    <PlanBuilder plan={editing || undefined} clients={clients} onDone={() => { setEditing(null); load(); }} />
  );

  if (!plans) return <Loader />;

  return (
    <div>
      <div className="plan-list-hd">
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Plans alimentaires</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2 }}>{plans.length} plan{plans.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-p" onClick={() => setEditing(false)}>+ Nouveau plan</button>
      </div>

      {plans.length === 0
        ? <Empty icon="file" title="Aucun plan alimentaire" desc="Créez votre premier plan pour vos clients"
            action={<button className="btn btn-p" onClick={() => setEditing(false)}>+ Créer un plan</button>} />
        : <div style={{ display: 'grid', gap: 12 }}>
            {plans.map(p => (
              <div key={p.id} className="card plan-card">
                <div className="plan-card-body">
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 800 }}>{p.nom}</div>
                    <span style={{ fontSize: 11, background: 'var(--acc2)', color: 'var(--acc3)', padding: '2px 8px', borderRadius: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {p.nb_clients} client{p.nb_clients !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {p.description && <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 10 }}>{p.description}</div>}
                  <MacroBadge macros={
                    (p.macros_total?.calories || 0) > 0
                      ? p.macros_total
                      : { calories: p.objectif_calories, proteines: p.objectif_proteines_g, glucides: p.objectif_glucides_g, lipides: p.objectif_lipides_g }
                  } />
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 8 }}>
                    {(p.repas || []).length} repas · créé le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div className="plan-card-actions">
                  <button className="btn btn-s btn-sm" onClick={() => setEditing(p)}>Modifier</button>
                  <button className="btn btn-s btn-sm" style={{ color: 'var(--err)' }} onClick={() => deletePlan(p)}>Supprimer</button>
                </div>
              </div>
            ))}
          </div>
      }
    </div>
  );
}

/* ── PAGE ALIMENTS ───────────────────────────────────────────────────────── */
function Aliments() {
  const [aliments, setAliments] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ nom: '', categorie: 'autres', calories_100g: '', proteines_100g: '', glucides_100g: '', lipides_100g: '', fibres_100g: '' });
  const sf = (k, v) => setF(x => ({ ...x, [k]: v }));

  const load = useCallback(async () => {
    const params = [];
    if (q) params.push(`q=${encodeURIComponent(q)}`);
    if (cat) params.push(`cat=${cat}`);
    const data = await api.nutrition.aliments(params.length ? `?${params.join('&')}` : '');
    setAliments(data.results || data);
  }, [q, cat]);

  useEffect(() => { load(); }, [load]);

  const createCustom = async () => {
    if (!f.nom || !f.calories_100g) return toast('Nom et calories requis', 'err');
    try {
      const payload = { ...f };
      ['proteines_100g','glucides_100g','lipides_100g','fibres_100g'].forEach(k => {
        if (!payload[k]) payload[k] = 0;
      });
      await api.nutrition.createAliment(payload);
      toast('Aliment créé ✓'); setShowForm(false);
      setF({ nom: '', categorie: 'autres', calories_100g: '', proteines_100g: '', glucides_100g: '', lipides_100g: '', fibres_100g: '' });
      load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const grouped = (aliments || []).reduce((acc, a) => {
    if (!acc[a.categorie]) acc[a.categorie] = [];
    acc[a.categorie].push(a);
    return acc;
  }, {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Base d'aliments</div>
        <button className="btn btn-p" onClick={() => setShowForm(true)}>+ Aliment personnalisé</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input className="fi" style={{ flex: 1 }} placeholder="Rechercher un aliment..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="fi fsel" style={{ width: 200 }} value={cat} onChange={e => setCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {!aliments ? <Loader /> : aliments.length === 0
        ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>Aucun résultat</div>
        : Object.entries(grouped).map(([catKey, items]) => (
          <div key={catKey} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
              {CAT_LABELS[catKey] || catKey}
            </div>
            <div className="card" style={{ padding: 0 }}>
              {items.map((a, i) => (
                <div key={a.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '10px 16px', borderBottom: i < items.length - 1 ? '1px solid var(--bdr)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{a.nom}</span>
                    {a.coach && <span style={{ fontSize: 10, background: '#F3F0FF', color: '#4C1D95', padding: '1px 6px', borderRadius: 8, marginLeft: 8, fontWeight: 700 }}>Perso.</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>pour 100g</div>
                  <MacroBadge macros={{ calories: a.calories_100g, proteines: a.proteines_100g, glucides: a.glucides_100g, lipides: a.lipides_100g }} compact />
                </div>
              ))}
            </div>
          </div>
        ))
      }

      {showForm && (
        <Modal title="Ajouter un aliment personnalisé" onClose={() => setShowForm(false)} footer={
          <>
            <button className="btn btn-s" onClick={() => setShowForm(false)}>Annuler</button>
            <button className="btn btn-p" onClick={createCustom}>Créer</button>
          </>
        }>
          <div className="fr2">
            <div className="fg"><label className="fl">Nom *</label>
              <input className="fi" value={f.nom} onChange={e => sf('nom', e.target.value)} />
            </div>
            <div className="fg"><label className="fl">Catégorie</label>
              <select className="fi fsel" value={f.categorie} onChange={e => sf('categorie', e.target.value)}>
                {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { k: 'calories_100g',   label: 'Calories *', u: 'kcal' },
              { k: 'proteines_100g',  label: 'Protéines',  u: 'g' },
              { k: 'glucides_100g',   label: 'Glucides',   u: 'g' },
              { k: 'lipides_100g',    label: 'Lipides',    u: 'g' },
              { k: 'fibres_100g',     label: 'Fibres',     u: 'g' },
            ].map(({ k, label, u }) => (
              <div key={k} className="fg" style={{ marginBottom: 0 }}>
                <label className="fl">{label} ({u}/100g)</label>
                <input className="fi" type="number" step="0.1" value={f[k]} onChange={e => sf(k, e.target.value)} />
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── PAGE RECETTES ───────────────────────────────────────────────────────── */
const RECIPE_TAGS = [
  { slug:'vegan',           label:'Vegan',          icon:'🌱', color:'#16a34a', bg:'#dcfce7' },
  { slug:'vegetarien',      label:'Végétarien',     icon:'🥗', color:'#65a30d', bg:'#ecfccb' },
  { slug:'sans_gluten',     label:'Sans gluten',    icon:'🌾', color:'#ca8a04', bg:'#fef9c3' },
  { slug:'sans_lactose',    label:'Sans lactose',   icon:'🥛', color:'#0891b2', bg:'#cffafe' },
  { slug:'low_fodmap',      label:'Low-FODMAP',     icon:'🫀', color:'#9333ea', bg:'#f3e8ff' },
  { slug:'riche_proteines', label:'Riche protéines',icon:'💪', color:'#dc2626', bg:'#fee2e2' },
  { slug:'low_carb',        label:'Low-carb',       icon:'🥩', color:'#ea580c', bg:'#ffedd5' },
];

function TagChips({ tags, onClick, size = 'sm' }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
      {tags.map(t => {
        const meta = RECIPE_TAGS.find(x => x.slug === t);
        if (!meta) return null;
        return (
          <span key={t} onClick={onClick ? (e) => { e.stopPropagation(); onClick(t); } : undefined}
            style={{
              fontSize: size === 'sm' ? 10 : 11,
              padding: size === 'sm' ? '1px 6px' : '2px 8px',
              borderRadius: 4, fontWeight: 600,
              background: meta.bg, color: meta.color,
              cursor: onClick ? 'pointer' : 'default',
            }}>
            {meta.icon} {meta.label}
          </span>
        );
      })}
    </div>
  );
}

function Recettes() {
  const [recettes, setRecettes]   = useState(null);
  const [editing, setEditing]     = useState(null);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeTags, setActiveTags] = useState([]);
  const [searchQ, setSearchQ]     = useState('');
  const photoRef = useRef();

  const buildQuery = (p, tags = activeTags, q = searchQ) => {
    const params = new URLSearchParams();
    params.set('page', p);
    if (tags.length > 0) params.set('tags', tags.join(','));
    if (q.trim()) params.set('q', q.trim());
    return '?' + params.toString();
  };

  const load = (p = page, tags = activeTags, q = searchQ) => api.nutrition.recettes(buildQuery(p, tags, q)).then(d => {
    const arr = d.results || [];
    setRecettes(arr);
    setTotalCount(d.count || 0);
    setTotalPages(Math.ceil((d.count || 0) / 8));
    if (editing?.id) setEditing(arr.find(r => r.id === editing.id) || null);
  }).catch(() => setRecettes([]));

  const toggleTag = (slug) => {
    const next = activeTags.includes(slug) ? activeTags.filter(t => t !== slug) : [...activeTags, slug];
    setActiveTags(next);
    setPage(1);
    load(1, next, searchQ);
  };

  const clearFilters = () => {
    setActiveTags([]);
    setSearchQ('');
    setPage(1);
    load(1, [], '');
  };

  // Recherche avec debounce
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(1, activeTags, searchQ); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [searchQ]);

  const goPage = (p) => { setPage(p); load(p); };

  const uploadPhoto = async (recetteId, file) => {
    try {
      await api.nutrition.uploadPhotoRecette(recetteId, file);
      toast('Photo mise à jour !'); load();
    } catch(e) { toast(e.message, 'err'); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const create = async (data) => {
    try {
      const r = await api.nutrition.createRecette(data);
      setEditing(r);
      load();
      toast('Recette créée ✓');
      return r;
    } catch (e) { toast(e.message, 'err'); }
  };

  const personnaliser = async (recetteId) => {
    try {
      const copie = await api.nutrition.personnaliserRecette(recetteId);
      toast('Recette personnalisée ✓');
      load();
      setEditing(copie);
    } catch (e) { toast(e.message, 'err'); }
  };

  const deleteRecette = async (recetteId) => {
    try {
      await api.nutrition.deleteRecette(recetteId);
      toast('Recette supprimée');
      setEditing(null);
      load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const addIng = async (recetteId, ing) => {
    try {
      const updated = await api.nutrition.addIngredient(recetteId, ing);
      load();
      setEditing(prev => prev?.id === recetteId
        ? { ...prev, ingredients: [...(prev.ingredients || []), updated] }
        : prev);
    } catch (e) { toast(e.message, 'err'); }
  };

  const removeIng = async (recetteId, ingId) => {
    try {
      await api.nutrition.removeIngredient(recetteId, ingId);
      load();
      setEditing(prev => prev?.id === recetteId
        ? { ...prev, ingredients: prev.ingredients.filter(i => i.id !== ingId) }
        : prev);
    } catch (e) { toast(e.message, 'err'); }
  };

  const isMobile = window.innerWidth < 768;

  if (!recettes) return <Loader />;

  // Mobile : afficher uniquement l'éditeur quand une recette est sélectionnée
  if (isMobile && editing !== null) {
    return (
      <div>
        <button className="btn btn-g btn-sm" style={{ marginBottom: 14 }} onClick={() => setEditing(null)}>
          ← Retour aux recettes
        </button>
        <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }}
          onChange={e => { if (e.target.files[0] && editing?.id) uploadPhoto(editing.id, e.target.files[0]); e.target.value=''; }} />
        <RecetteEditor
          recette={editing}
          onCreate={create}
          onAddIng={addIng}
          onRemoveIng={removeIng}
          onPersonnaliser={personnaliser}
          onDelete={deleteRecette}
          onClose={() => setEditing(null)}
          onUploadPhoto={() => photoRef.current?.click()}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Bibliothèque de recettes</div>
          <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
            {totalCount} recette{totalCount !== 1 ? 's' : ''}
            {(activeTags.length > 0 || searchQ) && (
              <button onClick={clearFilters} style={{ marginLeft:8, background:'none', border:'none', color:'var(--acc3)', cursor:'pointer', fontSize:11, fontWeight:600, textDecoration:'underline' }}>
                Effacer les filtres
              </button>
            )}
          </div>
        </div>
        <button className="btn btn-p" onClick={() => setEditing({})}>+ Nouvelle recette</button>
      </div>

      {/* Barre de recherche + filtres tags */}
      <div className="card" style={{ marginBottom:14, padding:'12px 14px' }}>
        <input className="fi" placeholder="🔍 Rechercher une recette..." value={searchQ}
          onChange={e => setSearchQ(e.target.value)} style={{ marginBottom:10 }} />
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {RECIPE_TAGS.map(t => {
            const active = activeTags.includes(t.slug);
            return (
              <button key={t.slug} onClick={() => toggleTag(t.slug)} style={{
                fontSize:12, fontWeight:600, padding:'5px 10px', borderRadius:16, cursor:'pointer',
                border: `1.5px solid ${active ? t.color : 'var(--bdr)'}`,
                background: active ? t.bg : 'transparent',
                color: active ? t.color : 'var(--t2)',
                transition: 'all .15s',
              }}>
                {t.icon} {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: editing ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Liste */}
        <div>
          {recettes.length === 0 && !editing
            ? <Empty icon="file" title="Aucune recette" desc="Créez des recettes réutilisables dans vos plans" />
            : recettes.map(r => (
              <div key={r.id} className="card" style={{ marginBottom: 10, cursor: 'pointer', border: editing?.id === r.id ? '2px solid var(--acc)' : undefined }}
                onClick={() => setEditing(r)}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <RecipeThumb recette={r} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.nom}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                      {r.is_global && <span style={{ fontSize: 10, background: '#EEF2FF', color: '#6366F1', borderRadius: 4, padding: '1px 6px' }}>Bibliothèque</span>}
                      {r.original && <span style={{ fontSize: 10, background: '#FFF7ED', color: '#EA580C', borderRadius: 4, padding: '1px 6px' }}>Personnalisée</span>}
                      <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                        {r.ingredients?.length || 0} ingrédients · {r.portions} portion{r.portions > 1 ? 's' : ''}
                      </span>
                    </div>
                    {r.tags && r.tags.length > 0 && (
                      <div style={{ marginBottom: 6 }}>
                        <TagChips tags={r.tags} onClick={toggleTag} />
                      </div>
                    )}
                    <MacroBadge macros={r.macros_par_portion} compact />
                  </div>
                </div>
              </div>
            ))
          }

          {/* Pagination */}
          {totalPages > 1 && (() => {
            const pages = [];
            const delta = 1;
            const left = page - delta, right = page + delta;
            let last = 0;
            for (let p = 1; p <= totalPages; p++) {
              if (p === 1 || p === totalPages || (p >= left && p <= right)) {
                if (last && p - last > 1) pages.push('…');
                pages.push(p);
                last = p;
              }
            }
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 16, flexWrap: 'wrap' }}>
                <button className="btn btn-s btn-sm" onClick={() => goPage(page - 1)} disabled={page === 1}>‹</button>
                {pages.map((p, i) => p === '…'
                  ? <span key={`e${i}`} style={{ minWidth: 28, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>…</span>
                  : <button key={p} onClick={() => goPage(p)} style={{
                      minWidth: 32, height: 32, borderRadius: 8, border: '1px solid var(--bdr)',
                      background: p === page ? 'var(--acc)' : '#fff',
                      color: p === page ? '#fff' : 'var(--t1)',
                      fontWeight: p === page ? 700 : 400, fontSize: 13, cursor: 'pointer',
                    }}>{p}</button>
                )}
                <button className="btn btn-s btn-sm" onClick={() => goPage(page + 1)} disabled={page === totalPages}>›</button>
              </div>
            );
          })()}
        </div>

        {/* Éditeur (desktop) */}
        {editing !== null && (
          <>
            <input ref={photoRef} type="file" accept="image/*" style={{ display:'none' }}
              onChange={e => { if (e.target.files[0] && editing?.id) uploadPhoto(editing.id, e.target.files[0]); e.target.value=''; }} />
            <RecetteEditor
              recette={editing}
              onCreate={create}
              onAddIng={addIng}
              onRemoveIng={removeIng}
              onPersonnaliser={personnaliser}
              onDelete={deleteRecette}
              onClose={() => setEditing(null)}
              onUploadPhoto={() => photoRef.current?.click()}
            />
          </>
        )}
      </div>
    </div>
  );
}

function RecetteEditor({ recette, onCreate, onAddIng, onRemoveIng, onPersonnaliser, onDelete, onClose, onUploadPhoto }) {
  const [nom, setNom] = useState(recette.nom || '');
  const [desc, setDesc] = useState(recette.description || '');
  const [portions, setPortions] = useState(recette.portions || 1);
  const [instructions, setInstructions] = useState(recette.instructions || '');
  const [addIng, setAddIng] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyPerso, setBusyPerso] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const createPhotoRef = useRef();

  const pickPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const save = async () => {
    if (!nom) return toast('Nom requis', 'err');
    setBusy(true);
    try {
      const created = await onCreate({ nom, description: desc, portions: Number(portions), instructions });
      if (photoFile && created?.id) {
        await api.nutrition.uploadPhotoRecette(created.id, photoFile);
      }
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const handlePersonnaliser = async () => {
    setBusyPerso(true);
    try { await onPersonnaliser(recette.id); }
    finally { setBusyPerso(false); }
  };

  const isGlobal = recette.is_global;
  const isPersonnalisee = !!recette.original;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            {recette.id ? recette.nom : 'Nouvelle recette'}
          </div>
          {isGlobal && <span style={{ fontSize: 10, background: '#EEF2FF', color: '#6366F1', borderRadius: 4, padding: '2px 8px' }}>Bibliothèque</span>}
          {isPersonnalisee && <span style={{ fontSize: 10, background: '#FFF7ED', color: '#EA580C', borderRadius: 4, padding: '2px 8px' }}>Personnalisée</span>}
        </div>
        <button className="btn btn-g btn-sm" onClick={onClose}>✕</button>
      </div>

      {!recette.id ? (
        <>
          {/* Photo à la création */}
          <div style={{ marginBottom: 14 }}>
            <input ref={createPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={pickPhoto} />
            {photoPreview ? (
              <div style={{ position: 'relative' }}>
                <img src={photoPreview} alt="aperçu" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10 }} />
                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none', borderRadius: 6, padding: '2px 8px', fontSize: 14, cursor: 'pointer' }}>✕</button>
                <button onClick={() => createPhotoRef.current?.click()}
                  style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,.55)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>Changer</button>
              </div>
            ) : (
              <button onClick={() => createPhotoRef.current?.click()} style={{
                width: '100%', height: 80, background: 'var(--bg)', border: '2px dashed var(--bdr)',
                borderRadius: 10, cursor: 'pointer', fontSize: 13, color: 'var(--t3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>📷 Ajouter une photo (optionnel)</button>
            )}
          </div>
          <div className="fg"><label className="fl">Nom *</label>
            <input className="fi" value={nom} onChange={e => setNom(e.target.value)} placeholder="ex: Bol açaï protéiné" />
          </div>
          <div className="fg"><label className="fl">Description</label>
            <input className="fi" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="fr2">
            <div className="fg"><label className="fl">Portions</label>
              <input className="fi" type="number" min="1" value={portions} onChange={e => setPortions(e.target.value)} />
            </div>
          </div>
          <div className="fg"><label className="fl">Instructions</label>
            <textarea className="fi fta" value={instructions} onChange={e => setInstructions(e.target.value)} />
          </div>
          <button className="btn btn-p btn-sm w100" onClick={save} disabled={busy}>
            {busy ? 'Création...' : 'Créer la recette'}
          </button>
        </>
      ) : (
        <>
          {/* Bannière photo */}
          <div style={{ marginBottom: 14, position: 'relative', cursor: isGlobal ? 'default' : 'pointer' }}
            onClick={isGlobal ? undefined : onUploadPhoto}>
            <RecipeThumbBanner recette={recette} />
            {!isGlobal && (
              <div style={{ position:'absolute', bottom:8, right:8, background:'rgba(0,0,0,.45)', color:'#fff', borderRadius:8, padding:'4px 10px', fontSize:11 }}>
                {recette.photo_url ? 'Changer la photo' : '📷 Ajouter une photo'}
              </div>
            )}
          </div>

          <MacroBadge macros={recette.macros_par_portion} />
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6, marginBottom: 14 }}>macros par portion</div>

          {/* Ingrédients */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Ingrédients</div>
            {!isGlobal && (
              <button className="btn btn-p btn-sm" style={{ fontSize: 11 }} onClick={() => setAddIng(true)}>+ Ajouter</button>
            )}
          </div>

          {(recette.ingredients || []).map(ing => (
            <div key={ing.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--bdr)' }}>
              <span style={{ flex: 1, fontSize: 13 }}>{ing.aliment_nom}</span>
              <span style={{ fontSize: 12, color: 'var(--t3)' }}>{ing.quantite_g}g</span>
              {!isGlobal && (
                <button onClick={() => onRemoveIng(recette.id, ing.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', fontSize: 14 }}>✕</button>
              )}
            </div>
          ))}

          {/* Bouton personnaliser — recettes de bibliothèque seulement */}
          {isGlobal && (
            <button
              className="btn btn-p w100"
              style={{ justifyContent: 'center', marginTop: 16 }}
              onClick={handlePersonnaliser}
              disabled={busyPerso}
            >
              {busyPerso ? 'Création...' : '✏️ Personnaliser cette recette'}
            </button>
          )}

          {/* Bouton supprimer — recettes personnalisées seulement */}
          {isPersonnalisee && (
            <button
              className="btn btn-sm w100"
              style={{ justifyContent: 'center', marginTop: 8, color: 'var(--err)', background: 'none', border: '1px solid var(--err)' }}
              onClick={() => { if (window.confirm('Supprimer cette recette personnalisée ?')) onDelete(recette.id); }}
            >
              Supprimer la version personnalisée
            </button>
          )}

          {addIng && !isGlobal && (
            <AlimentSearchModal
              onSelect={({ aliment, quantite_g }) => { onAddIng(recette.id, { aliment, quantite_g }); setAddIng(false); }}
              onClose={() => setAddIng(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ── PAGE PRINCIPALE NUTRITION ───────────────────────────────────────────── */
export default function Nutrition() {
  const [tab, setTab] = useState('plans');
  const TABS = [
    { k: 'plans',    label: '📋 Plans alimentaires' },
    { k: 'aliments', label: '🥦 Base d\'aliments' },
    { k: 'recettes', label: '👨‍🍳 Recettes' },
  ];

  return (
    <div>
      <div className="page-hd">
        <div>
          <div className="page-title">Nutrition</div>
          <div className="page-sub">Plans alimentaires · Suivi macros · Recettes</div>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button key={t.k} className={`tab${tab === t.k ? ' on' : ''}`} onClick={() => setTab(t.k)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'plans'    && <Plans />}
      {tab === 'aliments' && <Aliments />}
      {tab === 'recettes' && <Recettes />}
    </div>
  );
}
