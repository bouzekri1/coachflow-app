import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { Loader, Empty, STag, Ic, Modal, PBar, Av, toast, ExerciseImg } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

/* ══════════════════════════════════════════════════════════════
   PROGRAMMES
══════════════════════════════════════════════════════════════ */
const PROG_TEMPLATES = [
  { emoji:'💪', nom:'Force & Hypertrophie',    categorie:'force',        duree_semaines:12, seances_par_semaine:4, tag:'Populaire',    tagColor:'#1D9E75', tagBg:'#E8F8F2', description:'Programme de musculation axé sur la progression de force et le développement musculaire. Idéal pour les intermédiaires.' },
  { emoji:'🏃', nom:'Cardio & Endurance',       categorie:'cardio',       duree_semaines:8,  seances_par_semaine:3, tag:'Débutant',     tagColor:'#3B82F6', tagBg:'#EFF6FF', description:'Programme cardio progressif pour améliorer l\'endurance et la condition physique générale. Mixte running et HIIT.' },
  { emoji:'🔥', nom:'Perte de poids intense',   categorie:'perte_poids',  duree_semaines:10, seances_par_semaine:5, tag:'Intensif',     tagColor:'#EF4444', tagBg:'#FEF2F2', description:'Programme combinant cardio HIIT et musculation pour maximiser la dépense calorique et perdre du poids rapidement.' },
  { emoji:'🧘', nom:'Remise en forme douce',    categorie:'remise_forme', duree_semaines:6,  seances_par_semaine:3, tag:'Accessible',   tagColor:'#F59E0B', tagBg:'#FFFBEB', description:'Idéal pour les débutants ou après une blessure. Exercices accessibles pour retrouver une bonne condition physique.' },
  { emoji:'🤸', nom:'Mobilité & Souplesse',     categorie:'mobilite',     duree_semaines:8,  seances_par_semaine:4, tag:'Récupération', tagColor:'#8B5CF6', tagBg:'#F5F3FF', description:'Programme axé sur l\'amélioration de la mobilité articulaire et de la souplesse. Complément idéal à tout autre programme.' },
  { emoji:'⚡', nom:'Programme personnalisé',   categorie:'custom',       duree_semaines:12, seances_par_semaine:3, tag:'Sur mesure',   tagColor:'#6B7280', tagBg:'#F3F4F6', description:'Créez votre propre programme sur mesure adapté aux besoins spécifiques de votre client.' },
];

const JOURS_LABELS = { '1':'Lundi','2':'Mardi','3':'Mercredi','4':'Jeudi','5':'Vendredi','6':'Samedi','7':'Dimanche' };

function PlanEditor({ prog, onClose }) {
  const [plan, setPlan]       = useState([]);
  const [busy, setBusy]       = useState(true);
  const [exBib, setExBib]     = useState([]);
  const [addingJour, setAddingJour]   = useState(false);
  const [jourF, setJourF]     = useState({ semaine:1, jour:'1', titre:'' });
  const [addingEx, setAddingEx]       = useState(null); // jourId
  const [editingEx, setEditingEx]     = useState(null); // { jourId, id, series, reps, repos_sec, notes, nom_affiche }
  const [exF, setExF]         = useState({ exercice:'', nom_affiche_bib:'', nom_libre:'', series:3, reps:'10', repos_sec:60, notes:'' });
  const [exSearch, setExSearch]       = useState('');
  const [exMode, setExMode]   = useState('bib'); // 'bib' | 'libre'

  const loadPlan = () => api.programmes.plan(prog.id).then(d => { setPlan(d.jours || d); setBusy(false); });
  useEffect(() => { loadPlan(); api.exercices.list().then(d => setExBib(d.results || d)); }, []); // eslint-disable-line

  const addJour = async () => {
    if (!jourF.jour) return;
    try {
      await api.programmes.addJour(prog.id, { semaine: Number(jourF.semaine), jour: jourF.jour, titre: jourF.titre, ordre: plan.length });
      toast('Journée ajoutée !'); setAddingJour(false); setJourF({ semaine:1, jour:'1', titre:'' }); loadPlan();
    } catch(e) { toast(e.message,'err'); }
  };

  const deleteJour = async (jourId) => {
    if (!window.confirm('Supprimer cette journée et ses exercices ?')) return;
    try { await api.programmes.deleteJour(prog.id, jourId); loadPlan(); } catch(e) { toast(e.message,'err'); }
  };

  const addEx = async () => {
    if (exMode === 'bib' && !exF.exercice) return toast('Sélectionnez un exercice','err');
    if (exMode === 'libre' && !exF.nom_libre) return toast('Nom requis','err');
    try {
      const payload = { series: Number(exF.series), reps: exF.reps, repos_sec: Number(exF.repos_sec), notes: exF.notes, ordre: 0 };
      if (exMode === 'bib') payload.exercice = exF.exercice; else payload.nom_libre = exF.nom_libre;
      await api.programmes.addExercice(prog.id, addingEx, payload);
      toast('Exercice ajouté !'); setAddingEx(null); setExF({ exercice:'', nom_affiche_bib:'', nom_libre:'', series:3, reps:'10', repos_sec:60, notes:'' }); setExSearch(''); loadPlan();
    } catch(e) { toast(e.message,'err'); }
  };

  const saveEditEx = async () => {
    try {
      await api.programmes.updateExercice(prog.id, editingEx.jourId, editingEx.id, {
        series: Number(editingEx.series), reps: editingEx.reps,
        repos_sec: Number(editingEx.repos_sec), notes: editingEx.notes,
      });
      toast('Exercice mis à jour !'); setEditingEx(null); loadPlan();
    } catch(e) { toast(e.message,'err'); }
  };

  const deleteEx = async (jourId, exId) => {
    try { await api.programmes.deleteExercice(prog.id, jourId, exId); loadPlan(); } catch(e) { toast(e.message,'err'); }
  };

  const filteredEx = exBib.filter(e => e.nom.toLowerCase().includes(exSearch.toLowerCase())).slice(0,8);

  // Group jours by semaine
  const semaines = {};
  plan.forEach(j => { if (!semaines[j.semaine]) semaines[j.semaine] = []; semaines[j.semaine].push(j); });

  return (
    <Modal title={`📋 Plan — ${prog.nom}`} onClose={onClose} wide>
      {busy ? <Loader /> : (
        <div>
          {Object.keys(semaines).sort((a,b)=>a-b).map(sem => (
            <div key={sem} style={{ marginBottom:20 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--t2)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, borderBottom:'1px solid var(--bdr)', paddingBottom:6 }}>
                Semaine {sem}
              </div>
              {semaines[sem].map(jour => (
                <div key={jour.id} style={{ background:'var(--bg)', borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <span style={{ fontWeight:700, fontSize:14 }}>{JOURS_LABELS[jour.jour]}{jour.titre ? ` — ${jour.titre}` : ''}</span>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-s btn-sm" onClick={() => { setAddingEx(jour.id); setEditingEx(null); setExF({ exercice:'', nom_affiche_bib:'', nom_libre:'', series:3, reps:'10', repos_sec:60, notes:'' }); setExSearch(''); }}>+ Exercice</button>
                      <button className="btn btn-sm" style={{ color:'var(--err)', border:'1px solid var(--bdr)', borderRadius:6, padding:'2px 8px', fontSize:12, background:'none', cursor:'pointer' }} onClick={() => deleteJour(jour.id)}>✕</button>
                    </div>
                  </div>
                  {jour.exercices && jour.exercices.length > 0 ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {jour.exercices.map((ex) => (
                        <div key={ex.id}>
                          <div style={{ display:'flex', alignItems:'center', gap:10, background:'#fff', borderRadius:8, padding:'8px 12px', border: editingEx?.id === ex.id ? '1px solid var(--acc)' : '1px solid var(--bdr)' }}>
                            {ex.exercice_gif && <ExerciseImg src={ex.exercice_gif} alt={ex.nom_affiche} size={36} />}
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:600, fontSize:13 }}>{ex.nom_affiche}</div>
                              <div style={{ fontSize:12, color:'var(--t3)' }}>{ex.series} séries × {ex.reps} reps · repos {ex.repos_sec}s{ex.notes ? ` · ${ex.notes}` : ''}</div>
                            </div>
                            <button title="Modifier" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t2)', fontSize:14, padding:'0 4px' }}
                              onClick={() => setEditingEx(editingEx?.id === ex.id ? null : { jourId: jour.id, id: ex.id, series: ex.series, reps: ex.reps, repos_sec: ex.repos_sec, notes: ex.notes || '', nom_affiche: ex.nom_affiche })}>✏️</button>
                            <button title="Supprimer" style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:18, padding:'0 4px', lineHeight:1 }} onClick={() => deleteEx(jour.id, ex.id)}>×</button>
                          </div>
                          {editingEx?.id === ex.id && (
                            <div style={{ background:'#fff', borderRadius:'0 0 8px 8px', padding:'10px 12px', border:'1px solid var(--acc)', borderTop:'none', marginTop:-1 }}>
                              <div style={{ fontSize:12, fontWeight:600, color:'var(--acc)', marginBottom:8 }}>Modifier — {editingEx.nom_affiche}</div>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:8 }}>
                                <div className="fg"><label className="fl" style={{ fontSize:11 }}>Séries</label><input className="fi" type="number" min="1" value={editingEx.series} onChange={e => setEditingEx(x => ({ ...x, series: e.target.value }))} /></div>
                                <div className="fg"><label className="fl" style={{ fontSize:11 }}>Reps</label><input className="fi" value={editingEx.reps} onChange={e => setEditingEx(x => ({ ...x, reps: e.target.value }))} /></div>
                                <div className="fg"><label className="fl" style={{ fontSize:11 }}>Repos (s)</label><input className="fi" type="number" min="0" value={editingEx.repos_sec} onChange={e => setEditingEx(x => ({ ...x, repos_sec: e.target.value }))} /></div>
                              </div>
                              <div className="fg" style={{ marginBottom:8 }}><label className="fl" style={{ fontSize:11 }}>Notes</label><input className="fi" value={editingEx.notes} onChange={e => setEditingEx(x => ({ ...x, notes: e.target.value }))} /></div>
                              <div style={{ display:'flex', gap:8 }}>
                                <button className="btn btn-s btn-sm" onClick={() => setEditingEx(null)}>Annuler</button>
                                <button className="btn btn-p btn-sm" onClick={saveEditEx}>Enregistrer</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize:12, color:'var(--t3)', fontStyle:'italic' }}>Aucun exercice — cliquez "+ Exercice"</div>
                  )}

                  {addingEx === jour.id && (
                    <div style={{ marginTop:12, background:'#fff', borderRadius:10, padding:'12px 14px', border:'1px solid var(--bdr)' }}>
                      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                        <button className={`btn btn-sm ${exMode==='bib'?'btn-p':'btn-s'}`} onClick={() => setExMode('bib')}>Bibliothèque</button>
                        <button className={`btn btn-sm ${exMode==='libre'?'btn-p':'btn-s'}`} onClick={() => setExMode('libre')}>Nom libre</button>
                      </div>
                      {exMode === 'bib' ? (
                        <div className="fg" style={{ marginBottom:10 }}>
                          <input
                            className="fi"
                            placeholder="Rechercher un exercice…"
                            value={exSearch}
                            onChange={e => { setExSearch(e.target.value); setExF(x => ({ ...x, exercice: '', nom_affiche_bib: '' })); }}
                            style={{ marginBottom: exF.exercice ? 0 : 4 }}
                          />
                          {exF.exercice ? (
                            <div style={{ display:'flex', alignItems:'center', gap:8, background:'var(--acc2)', borderRadius:8, padding:'6px 10px', marginTop:6 }}>
                              <span style={{ flex:1, fontSize:13, fontWeight:600, color:'var(--acc3)' }}>{exF.nom_affiche_bib}</span>
                              <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--acc3)', fontSize:16, lineHeight:1 }}
                                onClick={() => { setExF(x => ({ ...x, exercice:'', nom_affiche_bib:'' })); setExSearch(''); }}>×</button>
                            </div>
                          ) : exSearch && filteredEx.length > 0 && (
                            <div style={{ border:'1px solid var(--bdr)', borderRadius:8, overflow:'hidden', maxHeight:200, overflowY:'auto' }}>
                              {filteredEx.map(e => (
                                <button key={e.id} onClick={() => { setExF(x => ({ ...x, exercice: e.id, nom_affiche_bib: e.nom })); setExSearch(e.nom); }}
                                  style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', background:'#fff', border:'none', borderBottom:'1px solid var(--bdr)', cursor:'pointer', fontSize:13 }}
                                  onMouseEnter={e => e.currentTarget.style.background='var(--bg)'}
                                  onMouseLeave={e => e.currentTarget.style.background='#fff'}>
                                  {e.nom}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="fg" style={{ marginBottom:10 }}>
                          <input className="fi" placeholder="Nom de l'exercice" value={exF.nom_libre} onChange={e => setExF(x => ({ ...x, nom_libre: e.target.value }))} />
                        </div>
                      )}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                        <div className="fg"><label className="fl" style={{ fontSize:11 }}>Séries</label><input className="fi" type="number" min="1" value={exF.series} onChange={e => setExF(x => ({ ...x, series: e.target.value }))} /></div>
                        <div className="fg"><label className="fl" style={{ fontSize:11 }}>Reps</label><input className="fi" value={exF.reps} onChange={e => setExF(x => ({ ...x, reps: e.target.value }))} /></div>
                        <div className="fg"><label className="fl" style={{ fontSize:11 }}>Repos (s)</label><input className="fi" type="number" min="0" value={exF.repos_sec} onChange={e => setExF(x => ({ ...x, repos_sec: e.target.value }))} /></div>
                      </div>
                      <div className="fg" style={{ marginBottom:10 }}><label className="fl" style={{ fontSize:11 }}>Notes</label><input className="fi" value={exF.notes} onChange={e => setExF(x => ({ ...x, notes: e.target.value }))} /></div>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-s btn-sm" onClick={() => setAddingEx(null)}>Annuler</button>
                        <button className="btn btn-p btn-sm" onClick={addEx}>Ajouter</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}

          {plan.length === 0 && !addingJour && (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--t3)', fontSize:13 }}>
              Aucune journée pour l'instant. Ajoutez la première ci-dessous.
            </div>
          )}

          {addingJour ? (
            <div style={{ background:'var(--bg)', borderRadius:10, padding:'14px', border:'1px solid var(--bdr)', marginTop:8 }}>
              <div style={{ fontWeight:600, marginBottom:10, fontSize:14 }}>Nouvelle journée</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                <div className="fg"><label className="fl" style={{ fontSize:12 }}>Semaine</label><input className="fi" type="number" min="1" max={prog.duree_semaines} value={jourF.semaine} onChange={e => setJourF(x => ({ ...x, semaine: e.target.value }))} /></div>
                <div className="fg"><label className="fl" style={{ fontSize:12 }}>Jour</label>
                  <select className="fi fsel" value={jourF.jour} onChange={e => setJourF(x => ({ ...x, jour: e.target.value }))}>
                    {Object.entries(JOURS_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg" style={{ marginBottom:10 }}><label className="fl" style={{ fontSize:12 }}>Titre (optionnel)</label><input className="fi" placeholder="ex: Haut du corps, Jambes…" value={jourF.titre} onChange={e => setJourF(x => ({ ...x, titre: e.target.value }))} /></div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-s btn-sm" onClick={() => setAddingJour(false)}>Annuler</button>
                <button className="btn btn-p btn-sm" onClick={addJour}>Ajouter</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-s" style={{ marginTop:8, width:'100%' }} onClick={() => setAddingJour(true)}>+ Ajouter une journée</button>
          )}
        </div>
      )}
    </Modal>
  );
}

export function Programmes() {
  const [progs, setProgs]     = useState([]);
  const [clients, setClients] = useState([]);
  const [busy, setBusy]       = useState(true);
  const [showNew, setShowNew]   = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [showAssign, setShowAssign] = useState(null);
  const [showPlan, setShowPlan]     = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [f, setF] = useState({ nom:'', description:'', categorie:'force', duree_semaines:12, seances_par_semaine:3, prix:'' });
  const [af, setAf] = useState({ client_id:'', date_debut:'' });
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));

  const applyTemplate = (tpl) => {
    setF({ nom: tpl.nom === 'Programme personnalisé' ? '' : tpl.nom, description: tpl.description, categorie: tpl.categorie, duree_semaines: tpl.duree_semaines, seances_par_semaine: tpl.seances_par_semaine, prix: '' });
    setShowTemplates(false);
    setShowNew(true);
  };

  const load = () => Promise.all([api.programmes.list(), api.clients.list()]).then(([p, c]) => {
    setProgs(p.results || p); setClients(c.results || c); setBusy(false);
  });
  useEffect(() => { load(); }, []); // eslint-disable-line

  const openEdit = (p) => {
    setF({ nom: p.nom, description: p.description || '', categorie: p.categorie, duree_semaines: p.duree_semaines, seances_par_semaine: p.seances_par_semaine, prix: p.prix || '' });
    setShowEdit(p);
  };

  const create = async () => {
    if (!f.nom) return toast('Nom requis', 'err');
    try {
      await api.programmes.create({ ...f, duree_semaines: Number(f.duree_semaines), seances_par_semaine: Number(f.seances_par_semaine) });
      toast('Programme créé !'); setShowNew(false); load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const update = async () => {
    if (!f.nom) return toast('Nom requis', 'err');
    try {
      await api.programmes.update(showEdit.id, { ...f, duree_semaines: Number(f.duree_semaines), seances_par_semaine: Number(f.seances_par_semaine) });
      toast('Programme mis à jour !'); setShowEdit(null); load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const deleteProg = async (p) => {
    if (!window.confirm(`Supprimer "${p.nom}" ?${p.nb_clients > 0 ? `\n⚠️ Ce programme est assigné à ${p.nb_clients} client(s) en cours.` : ''}`)) return;
    try {
      await api.programmes.delete(p.id);
      toast('Programme supprimé'); load();
    } catch (e) { toast(e.message, 'err'); }
  };

  const assigner = async () => {
    if (!af.client_id || !af.date_debut) return toast('Client et date requis', 'err');
    try {
      await api.programmes.assigner(showAssign.id, af);
      toast('Programme assigné !'); setShowAssign(null);
    } catch (e) { toast(e.message, 'err'); }
  };

  const CATS = { force:'Force & Musculation', cardio:'Cardio & Endurance', perte_poids:'Perte de poids', remise_forme:'Remise en forme', mobilite:'Mobilité', custom:'Personnalisé' };

  const FormFields = () => (
    <>
      <div className="fg"><label className="fl">Nom *</label><input className="fi" value={f.nom} onChange={e => s('nom', e.target.value)} /></div>
      <div className="fg"><label className="fl">Catégorie</label>
        <select className="fi fsel" value={f.categorie} onChange={e => s('categorie', e.target.value)}>
          {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select></div>
      <div className="fr2">
        <div className="fg"><label className="fl">Durée (semaines)</label><input className="fi" type="number" value={f.duree_semaines} onChange={e => s('duree_semaines', e.target.value)} /></div>
        <div className="fg"><label className="fl">Séances / semaine</label><input className="fi" type="number" value={f.seances_par_semaine} onChange={e => s('seances_par_semaine', e.target.value)} /></div>
      </div>
      <div className="fg"><label className="fl">Prix mensuel (€)</label><input className="fi" type="number" value={f.prix} onChange={e => s('prix', e.target.value)} /></div>
      <div className="fg"><label className="fl">Description</label><textarea className="fi fta" value={f.description} onChange={e => s('description', e.target.value)} /></div>
    </>
  );

  if (busy) return <Loader />;

  return (
    <div>
      <div className="page-hd">
        <div>
          <div className="page-title">Programmes</div>
          <div className="page-sub">{progs.length} programme{progs.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-s" onClick={() => setShowTemplates(t => !t)}>🎯 Modèles</button>
          <button className="btn btn-p" onClick={() => { setF({ nom:'', description:'', categorie:'force', duree_semaines:12, seances_par_semaine:3, prix:'' }); setShowNew(true); }}><Ic n="plus" s={14} /> Nouveau</button>
        </div>
      </div>

      {/* Programmes recommandés */}
      {showTemplates && (
        <div className="card mb16">
          <div className="card-t" style={{ marginBottom:12 }}>
            🎯 Programmes recommandés
            <button className="btn btn-g btn-sm" onClick={() => setShowTemplates(false)}>✕ Fermer</button>
          </div>
          <p style={{ fontSize:13, color:'var(--t3)', marginBottom:16 }}>Sélectionnez un modèle pour le personnaliser, ou créez votre propre programme.</p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:12 }}>
            {PROG_TEMPLATES.map((t, i) => (
              <button key={i} onClick={() => applyTemplate(t)} style={{
                border:'1px solid var(--bdr)', borderRadius:14, padding:'14px 12px',
                background:'#fff', cursor:'pointer', textAlign:'left',
                transition:'box-shadow .15s, transform .15s', boxShadow:'var(--sh)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 4px 20px rgba(0,0,0,.1)'; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='var(--sh)'; e.currentTarget.style.transform='none'; }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:26 }}>{t.emoji}</span>
                  <span style={{ fontSize:10, fontWeight:700, color:t.tagColor, background:t.tagBg, borderRadius:6, padding:'2px 7px' }}>{t.tag}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:5 }}>{t.nom}</div>
                <div style={{ fontSize:11, color:'var(--t3)', lineHeight:1.5, marginBottom:10 }}>{t.description.slice(0,75)}…</div>
                <div style={{ display:'flex', gap:6 }}>
                  <span style={{ fontSize:11, color:'var(--t2)', background:'var(--bg)', borderRadius:6, padding:'2px 7px' }}>⏱ {t.duree_semaines} sem.</span>
                  <span style={{ fontSize:11, color:'var(--t2)', background:'var(--bg)', borderRadius:6, padding:'2px 7px' }}>📅 {t.seances_par_semaine}×/sem.</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {progs.length === 0
        ? <Empty icon="progs" title="Aucun programme" desc="Cliquez sur Modèles pour partir d'un template ou Nouveau pour créer le vôtre" />
        : <div className="gap">{progs.map(p => (
          <div key={p.id} className="card" style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <span style={{ fontSize:15, fontWeight:800 }}>{p.nom}</span>
                <span className="tag tp">{CATS[p.categorie] || p.categorie}</span>
              </div>
              {p.description && <p className="t13 tc3 mb12">{p.description}</p>}
              <div style={{ display:'flex', gap:18, fontSize:12, color:'var(--t3)' }}>
                <span>⏱ {p.duree_semaines} semaines</span>
                <span>🏃 {p.seances_par_semaine}×/sem.</span>
                <span>👥 {p.nb_clients} client{p.nb_clients !== 1 ? 's' : ''}</span>
                {p.prix && <span>💶 {p.prix} €/mois</span>}
              </div>
              {p.nb_clients > 0 && (
                <div style={{ marginTop:10 }}>
                  <div className="t11 tc3 mb8">Complétion moy. {p.completion_moy}%</div>
                  <div style={{ maxWidth:200 }}><PBar value={p.completion_moy} /></div>
                </div>
              )}
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
              <button className="btn btn-s btn-sm" onClick={() => setShowPlan(p)}>📋 Plan</button>
              <button className="btn btn-s btn-sm" onClick={() => openEdit(p)}>Modifier</button>
              <button className="btn btn-s btn-sm" onClick={() => setShowAssign(p)}>Assigner →</button>
              <button className="btn btn-s btn-sm" style={{ color:'var(--err)' }} onClick={() => deleteProg(p)}>Supprimer</button>
            </div>
          </div>
        ))}</div>
      }

      {showNew && (
        <Modal title="Nouveau programme" onClose={() => setShowNew(false)} footer={
          <><button className="btn btn-s" onClick={() => setShowNew(false)}>Annuler</button>
            <button className="btn btn-p" onClick={create}>Créer</button></>
        }>
          <FormFields />
        </Modal>
      )}

      {showEdit && (
        <Modal title={`Modifier "${showEdit.nom}"`} onClose={() => setShowEdit(null)} footer={
          <><button className="btn btn-s" onClick={() => setShowEdit(null)}>Annuler</button>
            <button className="btn btn-p" onClick={update}>Enregistrer</button></>
        }>
          {showEdit.nb_clients > 0 && (
            <div style={{ background:'#FFF7ED', border:'1px solid #FED7AA', borderRadius:8, padding:'10px 14px', marginBottom:16, fontSize:13, color:'#9A3412' }}>
              ⚠️ Ce programme est assigné à {showEdit.nb_clients} client{showEdit.nb_clients > 1 ? 's' : ''} en cours. Les modifications affectent le calcul des séances totales.
            </div>
          )}
          <FormFields />
        </Modal>
      )}

      {showAssign && (
        <Modal title={`Assigner "${showAssign.nom}"`} onClose={() => setShowAssign(null)} footer={
          <><button className="btn btn-s" onClick={() => setShowAssign(null)}>Annuler</button>
            <button className="btn btn-p" onClick={assigner}>Assigner</button></>
        }>
          <div className="fg"><label className="fl">Client *</label>
            <select className="fi fsel" value={af.client_id} onChange={e => setAf(x => ({ ...x, client_id: e.target.value }))}>
              <option value="">Sélectionner un client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom_complet}</option>)}
            </select></div>
          <div className="fg"><label className="fl">Date de début *</label>
            <input className="fi" type="date" value={af.date_debut} onChange={e => setAf(x => ({ ...x, date_debut: e.target.value }))} />
          </div>
        </Modal>
      )}

      {showPlan && <PlanEditor prog={showPlan} onClose={() => setShowPlan(null)} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PLANNING
══════════════════════════════════════════════════════════════ */
export function Planning() {
  const [seances, setSeances] = useState([]);
  const [toutesSeances, setToutesSeances] = useState([]);
  const [allSeances, setAllSeances] = useState([]);
  const [clients, setClients] = useState([]);
  const [busy, setBusy]       = useState(true);
  const [vue, setVue]         = useState('semaine');
  const [showNew, setShowNew] = useState(false);
  const [carnetId, setCarnetId] = useState(null);
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [f, setF] = useState({ client:'', date_heure:'', duree_minutes:60, type_seance:'presentiel', titre:'' });
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));

  const load = () => Promise.all([
    api.seances.semaine(),
    api.seances.list('?statut=planifiee'),
    api.clients.list(),
    api.seances.list(''),
  ]).then(([se, toutes, cl, all]) => {
    setSeances(se.results || se);
    setToutesSeances((toutes.results || toutes).sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure)));
    setClients(cl.results || cl);
    setAllSeances(all.results || all);
    setBusy(false);
  });
  useEffect(() => { load(); }, []); // eslint-disable-line

  const create = async () => {
    if (!f.client || !f.date_heure) return toast('Client et date requis', 'err');
    try {
      await api.seances.create({ ...f, duree_minutes: Number(f.duree_minutes) });
      toast('Séance planifiée !'); setShowNew(false); load();
    } catch (e) { toast(e.message, 'err'); }
  };
  const marquer   = async id => { try { await api.seances.marquerRealisee(id); toast('Réalisée ✓'); load(); } catch (e) { toast(e.message, 'err'); } };
  const annuler   = async id => { try { await api.seances.annuler(id); toast('Annulée'); load(); } catch (e) { toast(e.message, 'err'); } };
  const supprimer = async id => { try { await api.seances.delete(id); toast('Séance supprimée'); load(); } catch (e) { toast(e.message, 'err'); } };

  if (busy) return <Loader />;

  const grouped = seances.reduce((acc, seance) => {
    const k = new Date(seance.date_heure).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
    if (!acc[k]) acc[k] = [];
    acc[k].push(seance); return acc;
  }, {});
  const dot = t => t === 'presentiel' ? 'dg' : t === 'visio' ? 'db' : 'da';

  return (
    <div>
      <div className="page-hd">
        <div>
          <div className="page-title">Planning</div>
          <div className="page-sub">
            {vue === 'semaine'
              ? `Cette semaine · ${seances.length} séance${seances.length !== 1 ? 's' : ''}`
              : vue === 'calendrier'
              ? calMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
              : `${toutesSeances.length} séance${toutesSeances.length !== 1 ? 's' : ''} à venir`}
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', border:'1px solid var(--bdr)', borderRadius:8, overflow:'hidden' }}>
            {[['semaine','Semaine'],['calendrier','📅 Calendrier'],['toutes','À venir']].map(([k,l]) => (
              <button key={k} className={`btn btn-sm ${vue === k ? 'btn-p' : 'btn-g'}`}
                style={{ borderRadius:0, border:'none' }} onClick={() => setVue(k)}>{l}</button>
            ))}
          </div>
          <button className="btn btn-p" onClick={() => setShowNew(true)}><Ic n="plus" s={14} /> Planifier</button>
        </div>
      </div>

      {vue === 'semaine' && (
        seances.length === 0
          ? <Empty icon="planning" title="Aucune séance cette semaine" desc="Planifiez vos prochaines séances"
              action={<button className="btn btn-p" onClick={() => setShowNew(true)}>Planifier</button>} />
          : Object.entries(grouped).map(([day, ss]) => (
            <div key={day} className="card mb12">
              <div className="card-t" style={{ textTransform:'capitalize' }}>{day}</div>
              {ss.map(seance => (
                <div key={seance.id} className="si" style={{ alignItems:'flex-start' }}>
                  <div className="si-t">{new Date(seance.date_heure).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</div>
                  <div className={`dot ${dot(seance.type_seance)}`} style={{ marginTop:4 }} />
                  <div style={{ flex:1 }}>
                    <div className="si-n">{seance.client_nom}{seance.titre ? ` — ${seance.titre}` : ''}</div>
                    <div className="si-s">{seance.type_seance} · {seance.duree_minutes} min</div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
                    <STag s={seance.statut} />
                    <button className="btn btn-g btn-sm" onClick={() => setCarnetId(seance.id)}>📋</button>
                    {seance.statut === 'planifiee' && (
                      <><button className="btn btn-s btn-sm" onClick={() => marquer(seance.id)}>✓ Réalisée</button>
                        <button className="btn btn-g btn-sm" style={{ color:'var(--red)' }} onClick={() => annuler(seance.id)}>Annuler</button></>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
      )}

      {vue === 'toutes' && (
        toutesSeances.length === 0
          ? <Empty icon="planning" title="Aucune séance planifiée" desc="Planifiez vos prochaines séances"
              action={<button className="btn btn-p" onClick={() => setShowNew(true)}>Planifier</button>} />
          : <div className="card">
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ fontSize:11, color:'var(--t3)', textAlign:'left' }}>
                    <th style={{ padding:'6px 10px', fontWeight:600 }}>Date</th>
                    <th style={{ padding:'6px 10px', fontWeight:600 }}>Client</th>
                    <th style={{ padding:'6px 10px', fontWeight:600 }}>Type</th>
                    <th style={{ padding:'6px 10px', fontWeight:600 }}>Durée</th>
                    <th style={{ padding:'6px 10px', fontWeight:600 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {toutesSeances.map(seance => (
                    <tr key={seance.id} style={{ borderTop:'1px solid var(--bdr)', fontSize:13 }}>
                      <td style={{ padding:'10px 10px' }}>
                        <div className="fw6">{new Date(seance.date_heure).toLocaleDateString('fr-FR', { day:'numeric', month:'short', year:'numeric' })}</div>
                        <div style={{ fontSize:11, color:'var(--t3)' }}>{new Date(seance.date_heure).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</div>
                      </td>
                      <td style={{ padding:'10px 10px' }}>
                        <div className="fw6">{seance.client_nom}</div>
                        {seance.titre && <div style={{ fontSize:11, color:'var(--t3)' }}>{seance.titre}</div>}
                      </td>
                      <td style={{ padding:'10px 10px', color:'var(--t2)' }}>{seance.type_seance}</td>
                      <td style={{ padding:'10px 10px', color:'var(--t2)' }}>{seance.duree_minutes} min</td>
                      <td style={{ padding:'10px 10px', textAlign:'right' }}>
                        <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }}>
                          <button className="btn btn-g btn-sm" onClick={() => setCarnetId(seance.id)}>📋 Carnet</button>
                          <button className="btn btn-s btn-sm" onClick={() => marquer(seance.id)}>✓ Réalisée</button>
                          <button className="btn btn-g btn-sm" style={{ color:'var(--red)' }} onClick={() => annuler(seance.id)}>Annuler</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}

      {vue === 'calendrier' && (
        <CalendarView
          seances={allSeances}
          month={calMonth}
          onMonthChange={setCalMonth}
          onCarnet={setCarnetId}
          onMarquer={marquer}
          onAnnuler={annuler}
          onSupprimer={supprimer}
          onDayClick={dk => {
            setF(x => ({ ...x, date_heure: `${dk}T09:00` }));
            setShowNew(true);
          }}
        />
      )}

      {carnetId && <CarnetCoachModal seanceId={carnetId} onClose={() => setCarnetId(null)} />}

      {showNew && (
        <Modal title="Planifier une séance" onClose={() => setShowNew(false)} footer={
          <><button className="btn btn-s" onClick={() => setShowNew(false)}>Annuler</button>
            <button className="btn btn-p" onClick={create}>Planifier</button></>
        }>
          <div className="fg"><label className="fl">Client *</label>
            <select className="fi fsel" value={f.client} onChange={e => s('client', e.target.value)}>
              <option value="">Sélectionner</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom_complet}</option>)}
            </select></div>
          <div className="fg"><label className="fl">Date et heure *</label>
            <input className="fi" type="datetime-local" value={f.date_heure} onChange={e => s('date_heure', e.target.value)} /></div>
          <div className="fr2">
            <div className="fg"><label className="fl">Durée (min)</label><input className="fi" type="number" value={f.duree_minutes} onChange={e => s('duree_minutes', e.target.value)} /></div>
            <div className="fg"><label className="fl">Type</label>
              <select className="fi fsel" value={f.type_seance} onChange={e => s('type_seance', e.target.value)}>
                <option value="presentiel">Présentiel</option><option value="visio">Visio</option><option value="autonome">Autonome</option>
              </select></div>
          </div>
          <div className="fg"><label className="fl">Titre / thème</label>
            <input className="fi" placeholder="ex: Renforcement bas du corps" value={f.titre} onChange={e => s('titre', e.target.value)} /></div>
        </Modal>
      )}
    </div>
  );
}

const CAL_DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const CAL_COLOR = { presentiel: '#1D9E75', visio: '#3B82F6', autonome: '#F59E0B' };
const CAL_STATUS_OPACITY = { planifiee: 1, realisee: 0.5, annulee: 0.25 };

function easterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getFrenchHolidays(year) {
  const easter = easterDate(year);
  const add = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dk = d => d.toISOString().slice(0, 10);
  return {
    [dk(new Date(year, 0, 1))]:   "Jour de l'An",
    [dk(add(easter, 1))]:         "Lundi de Pâques",
    [dk(new Date(year, 4, 1))]:   "Fête du Travail",
    [dk(new Date(year, 4, 8))]:   "Victoire 1945",
    [dk(add(easter, 39))]:        "Ascension",
    [dk(add(easter, 50))]:        "Lundi de Pentecôte",
    [dk(new Date(year, 6, 14))]:  "Fête Nationale",
    [dk(new Date(year, 7, 15))]:  "Assomption",
    [dk(new Date(year, 10, 1))]:  "Toussaint",
    [dk(new Date(year, 10, 11))]: "Armistice",
    [dk(new Date(year, 11, 25))]: "Noël",
  };
}

function CalendarView({ seances, month, onMonthChange, onCarnet, onMarquer, onAnnuler, onSupprimer, onDayClick }) {
  const [popover, setPopover] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileSel, setMobileSel] = useState(null);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const year = month.getFullYear();
  const mon  = month.getMonth();
  const firstDay    = new Date(year, mon, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const lastDay     = new Date(year, mon + 1, 0);
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => new Date(year, mon, 1 - startOffset + i));

  const holidays = { ...getFrenchHolidays(year), ...getFrenchHolidays(year + 1) };

  const byDate = seances.reduce((acc, s) => {
    const k = new Date(s.date_heure).toISOString().slice(0, 10);
    if (!acc[k]) acc[k] = [];
    acc[k].push(s);
    return acc;
  }, {});

  const today = new Date().toISOString().slice(0, 10);
  const prev  = () => onMonthChange(new Date(year, mon - 1, 1));
  const next  = () => onMonthChange(new Date(year, mon + 1, 1));

  /* ── Vue mobile : grille compacte + panneau détail ── */
  const MobileCalendar = () => {
    const selDk = mobileSel;
    const selSeances = selDk ? (byDate[selDk] || []) : [];
    return (
      <div style={{ padding: '0 2px' }}>
        {/* Nav mois */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, padding:'0 4px' }}>
          <button onClick={prev} style={{ width:36, height:36, borderRadius:10, border:'1px solid var(--bdr)', background:'none', fontSize:20, cursor:'pointer', color:'var(--t2)', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
          <div style={{ fontWeight:800, fontSize:16, textTransform:'capitalize' }}>
            {month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={next} style={{ width:36, height:36, borderRadius:10, border:'1px solid var(--bdr)', background:'none', fontSize:20, cursor:'pointer', color:'var(--t2)', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
        </div>

        {/* En-têtes */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4 }}>
          {['L','M','M','J','V','S','D'].map((d, i) => (
            <div key={i} style={{ textAlign:'center', fontSize:10, fontWeight:700, color: i >= 5 ? '#EF4444' : 'var(--t3)', padding:'2px 0' }}>{d}</div>
          ))}
        </div>

        {/* Grille compacte */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
          {cells.map((d, i) => {
            const dk = d.toISOString().slice(0, 10);
            const inMonth   = d.getMonth() === mon;
            const isToday   = dk === today;
            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
            const holiday   = holidays[dk];
            const ds        = inMonth ? (byDate[dk] || []) : [];
            const isSel     = dk === selDk;

            return (
              <button key={i} onClick={() => {
                if (!inMonth) return;
                if (ds.length > 0) setMobileSel(isSel ? null : dk);
                else { setMobileSel(null); onDayClick(dk); }
              }} style={{
                border: isSel ? '2px solid var(--acc)' : isToday ? '2px solid #1D9E75' : '1px solid transparent',
                borderRadius: 10,
                background: isSel ? 'var(--acc2)' : isToday ? '#E8F8F2' : holiday && inMonth ? '#FFF7ED' : 'transparent',
                padding: '6px 2px 5px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                minHeight: 52, opacity: inMonth ? 1 : 0.2, cursor: inMonth ? 'pointer' : 'default',
              }}>
                {/* Numéro */}
                <span style={{
                  fontSize: 13, fontWeight: isToday || isSel ? 800 : 500, lineHeight: 1,
                  color: isSel ? 'var(--acc3)' : isToday ? '#065f46' : holiday && inMonth ? '#EA580C' : isWeekend ? '#EF4444' : 'var(--t1)',
                }}>{d.getDate()}</span>
                {/* Points séances */}
                {ds.length > 0 && (
                  <div style={{ display:'flex', gap:2, flexWrap:'wrap', justifyContent:'center' }}>
                    {ds.slice(0,3).map((s, j) => (
                      <span key={j} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: CAL_COLOR[s.type_seance] || 'var(--acc)',
                        opacity: CAL_STATUS_OPACITY[s.statut] ?? 1,
                        flexShrink: 0,
                      }}/>
                    ))}
                    {ds.length > 3 && <span style={{ fontSize:8, color:'var(--t3)', fontWeight:700 }}>+{ds.length-3}</span>}
                  </div>
                )}
                {/* Indicator férié */}
                {holiday && inMonth && <span style={{ fontSize:8 }}>🎊</span>}
              </button>
            );
          })}
        </div>

        {/* Légende points */}
        <div style={{ display:'flex', gap:12, marginTop:12, padding:'0 4px', flexWrap:'wrap' }}>
          {Object.entries(CAL_COLOR).map(([k,c]) => (
            <span key={k} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--t2)' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:c, display:'inline-block' }}/>
              {k.charAt(0).toUpperCase()+k.slice(1)}
            </span>
          ))}
        </div>

        {/* Panneau détail jour sélectionné */}
        {selDk && (
          <div style={{ marginTop:14, borderTop:'1px solid var(--bdr)', paddingTop:12 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:10, color:'var(--t2)' }}>
              {new Date(selDk).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
              {' '}· {selSeances.length} séance{selSeances.length > 1 ? 's' : ''}
            </div>
            {selSeances.length === 0
              ? <div style={{ fontSize:12, color:'var(--t3)' }}>Aucune séance</div>
              : selSeances.map(s => (
                <div key={s.id} style={{
                  background:'var(--bg)', borderRadius:10, padding:'10px 12px',
                  marginBottom:8, borderLeft:`3px solid ${CAL_COLOR[s.type_seance]||'var(--acc)'}`,
                }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:13 }}>{s.client_nom}</div>
                      {s.titre && <div style={{ fontSize:11, color:'var(--t3)' }}>{s.titre}</div>}
                    </div>
                    <STag s={s.statut} />
                  </div>
                  <div style={{ fontSize:11, color:'var(--t3)', marginBottom:8 }}>
                    🕐 {new Date(s.date_heure).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})} · {s.duree_minutes} min · {s.type_seance}
                  </div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <button className="btn btn-g btn-sm" onClick={() => onCarnet(s.id)}>📋 Carnet</button>
                    {s.statut === 'planifiee' && <button className="btn btn-s btn-sm" onClick={() => onMarquer(s.id)}>✓ Réalisée</button>}
                    {s.statut === 'planifiee' && <button className="btn btn-g btn-sm" style={{color:'var(--red)'}} onClick={() => onAnnuler(s.id)}>Annuler</button>}
                    <button className="btn btn-g btn-sm" style={{color:'var(--red)',marginLeft:'auto'}} onClick={() => { if(window.confirm('Supprimer ?')) onSupprimer(s.id); }}>🗑</button>
                  </div>
                </div>
              ))
            }
            <button className="btn btn-p btn-sm" style={{ width:'100%', justifyContent:'center', marginTop:4 }}
              onClick={() => { setMobileSel(null); onDayClick(selDk); }}>
              + Planifier ce jour
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card" style={{ padding: isMobile ? 12 : 20, overflow:'hidden' }}>
      {isMobile ? <MobileCalendar /> : <>
      {/* Navigation mois */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <button className="btn btn-g btn-sm" onClick={prev} style={{ fontSize:18, padding:'2px 12px' }}>‹</button>
        <div style={{ fontWeight:800, fontSize:17, textTransform:'capitalize' }}>
          {month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
        </div>
        <button className="btn btn-g btn-sm" onClick={next} style={{ fontSize:18, padding:'2px 12px' }}>›</button>
      </div>

      {/* En-têtes jours */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3, marginBottom:3 }}>
        {CAL_DAYS.map((d, i) => (
          <div key={d} className="cal-hdr" style={{ textAlign:'center', fontSize:11, fontWeight:700, color: i >= 5 ? '#EF4444' : 'var(--t3)', padding:'4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Grille desktop */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3 }}>
        {cells.map((d, i) => {
          const dk = d.toISOString().slice(0, 10);
          const inMonth  = d.getMonth() === mon;
          const isToday  = dk === today;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const holiday  = holidays[dk];
          const daySeances = byDate[dk] || [];

          return (
            <div key={i} className="cal-cell"
              onClick={() => inMonth && onDayClick(dk)}
              style={{
                minHeight: 90, borderRadius: 8,
                background: isToday ? '#E8F8F2' : holiday && inMonth ? '#FFF7ED' : isWeekend && inMonth ? '#FAFAFA' : inMonth ? 'var(--bg2)' : 'transparent',
                border: isToday ? '2px solid var(--acc)' : holiday && inMonth ? '1px solid #FED7AA' : '1px solid var(--bdr)',
                padding: '6px 5px', opacity: inMonth ? 1 : 0.2,
                cursor: inMonth ? 'pointer' : 'default', transition: 'background .1s',
              }}
              onMouseEnter={e => { if (inMonth) e.currentTarget.style.background = isToday ? '#d1f5e9' : '#f0f0f0'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isToday ? '#E8F8F2' : holiday && inMonth ? '#FFF7ED' : isWeekend && inMonth ? '#FAFAFA' : inMonth ? 'var(--bg2)' : 'transparent'; }}
            >
              <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom: holiday ? 2 : 4 }}>
                <span style={{
                  fontSize: 12, fontWeight: isToday ? 800 : 600,
                  color: isToday ? '#fff' : holiday ? '#EA580C' : isWeekend ? '#EF4444' : 'var(--t1)',
                  background: isToday ? 'var(--acc)' : 'transparent',
                  borderRadius: isToday ? '50%' : 0,
                  width: isToday ? 22 : 'auto', height: isToday ? 22 : 'auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>{d.getDate()}</span>
              </div>
              {holiday && inMonth && (
                <div style={{ fontSize: 9, color:'#EA580C', fontWeight:700, marginBottom:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  🎊 {holiday}
                </div>
              )}
              {daySeances.slice(0, 3).map(s => (
                <div key={s.id} className="cal-evt"
                  onClick={e => { e.stopPropagation(); setPopover(p => p?.id === s.id ? null : s); }}
                  style={{
                    fontSize: 10, fontWeight: 600,
                    background: CAL_COLOR[s.type_seance] + '28', color: CAL_COLOR[s.type_seance],
                    borderRadius: 4, padding: '2px 5px', marginBottom: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer',
                    opacity: CAL_STATUS_OPACITY[s.statut] ?? 1,
                    textDecoration: s.statut === 'annulee' ? 'line-through' : 'none',
                  }}>
                  {new Date(s.date_heure).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })} {s.client_nom}
                </div>
              ))}
              {daySeances.length > 3 && (
                <div style={{ fontSize: 9, color:'var(--t3)', fontWeight:600, paddingLeft:2 }}>+{daySeances.length - 3} autres</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Légende desktop */}
      <div className="cal-legend" style={{ display:'flex', gap:16, marginTop:14, flexWrap:'wrap', alignItems:'center' }}>
        {Object.entries(CAL_COLOR).map(([k, c]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--t2)' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:c }} />
            {k.charAt(0).toUpperCase() + k.slice(1)}
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--t2)' }}>
          <span style={{ fontSize:10 }}>🎊</span> Jour férié
        </div>
        <div style={{ fontSize:11, color:'var(--t3)', marginLeft:'auto' }}>Cliquez sur un jour pour planifier</div>
      </div>
      </>}

      {/* Panel séance — overlay centré */}
      {popover && (
        <div
          onClick={() => setPopover(null)}
          style={{
            position:'fixed', inset:0, zIndex:200,
            background:'rgba(0,0,0,.35)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:'#fff', borderRadius:16, boxShadow:'0 16px 48px rgba(0,0,0,.22)',
              padding:24, minWidth:320, maxWidth:420, width:'90%',
            }}
          >
            {/* En-tête */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
              <div>
                <div style={{ fontWeight:800, fontSize:16 }}>{popover.client_nom}</div>
                {popover.titre && <div style={{ fontSize:13, color:'var(--t3)', marginTop:3 }}>{popover.titre}</div>}
              </div>
              <button className="btn btn-g btn-sm" style={{ padding:'4px 8px' }} onClick={() => setPopover(null)}>×</button>
            </div>

            {/* Détails */}
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--t2)' }}>
                <span>📅</span>
                <span style={{ textTransform:'capitalize' }}>
                  {new Date(popover.date_heure).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--t2)' }}>
                <span>🕐</span>
                <span>{new Date(popover.date_heure).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })} · {popover.duree_minutes} min</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--t2)' }}>
                <span>📍</span>
                <span style={{ textTransform:'capitalize' }}>{popover.type_seance}</span>
                <STag s={popover.statut} />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', borderTop:'1px solid var(--bdr)', paddingTop:16 }}>
              <button className="btn btn-g btn-sm" onClick={() => { onCarnet(popover.id); setPopover(null); }}>📋 Carnet</button>
              {popover.statut === 'planifiee' && (
                <button className="btn btn-s btn-sm" onClick={() => { onMarquer(popover.id); setPopover(null); }}>✓ Réalisée</button>
              )}
              {popover.statut === 'planifiee' && (
                <button className="btn btn-g btn-sm" style={{ color:'var(--red)' }} onClick={() => { onAnnuler(popover.id); setPopover(null); }}>Annuler</button>
              )}
              <button
                className="btn btn-g btn-sm"
                style={{ color:'var(--red)', marginLeft:'auto' }}
                onClick={() => {
                  if (!window.confirm('Supprimer définitivement cette séance ?')) return;
                  onSupprimer(popover.id);
                  setPopover(null);
                }}
              >🗑 Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ExercicePicker({ seanceId, onAdded }) {
  const [open, setOpen]       = useState(false);
  const [exercices, setEx]    = useState([]);
  const [search, setSearch]   = useState('');
  const [groupe, setGroupe]   = useState('');
  const [adding, setAdding]   = useState(null);
  const [form, setForm]       = useState({ series:3, repetitions:'', duree_sec:'', repos_sec:60, poids_kg:'', notes:'' });

  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams();
    if (groupe) params.append('groupe', groupe);
    if (search) params.append('q', search);
    const q = params.toString() ? '?' + params.toString() : '';
    api.exercices.list(q).then(d => setEx(Array.isArray(d) ? d : d.results || [])).catch(() => {});
  }, [open, groupe, search]);

  async function addExercice(ex) {
    try {
      const payload = {
        exercice: ex.id,
        series: Number(form.series) || 3,
        repetitions: form.repetitions ? Number(form.repetitions) : null,
        duree_sec: form.duree_sec ? Number(form.duree_sec) : null,
        repos_sec: Number(form.repos_sec) || 60,
        poids_kg: form.poids_kg || null,
        notes: form.notes,
      };
      await api.exercices.addToSeance(seanceId, payload);
      onAdded();
      setAdding(null);
      setForm({ series:3, repetitions:'', duree_sec:'', repos_sec:60, poids_kg:'', notes:'' });
    } catch (e) { toast(e.message, 'err'); }
  }

  const GROUPES_SHORT = [
    { value:'', label:'Tous' },
    { value:'pectoraux', label:'Pecto' },
    { value:'dorsaux', label:'Dos' },
    { value:'epaules', label:'Épaules' },
    { value:'biceps', label:'Biceps' },
    { value:'triceps', label:'Triceps' },
    { value:'abdominaux', label:'Abdos' },
    { value:'quadriceps', label:'Quadri' },
    { value:'ischio', label:'Ischio' },
    { value:'fessiers', label:'Fessiers' },
    { value:'full_body', label:'Full body' },
    { value:'cardio', label:'Cardio' },
  ];

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{
        background:'#6366f122', border:'1px dashed #6366f155', color:'#6366f1',
        borderRadius:8, padding:'6px 14px', fontSize:12, cursor:'pointer', width:'100%', marginTop:8,
      }}>+ Ajouter un exercice</button>
    );
  }

  return (
    <div style={{ border:'1px solid #334155', borderRadius:10, padding:12, marginTop:8, background:'#0f172a' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:12, fontWeight:700, color:'#94a3b8' }}>Sélectionner un exercice</span>
        <button onClick={() => { setOpen(false); setAdding(null); }}
          style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:16 }}>×</button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher..."
        style={{ width:'100%', boxSizing:'border-box', padding:'6px 10px', background:'#1e293b', border:'1px solid #334155', borderRadius:6, color:'#e2e8f0', fontSize:12, marginBottom:8 }} />
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        {GROUPES_SHORT.map(g => (
          <button key={g.value} onClick={() => setGroupe(g.value)}
            style={{ padding:'3px 8px', borderRadius:99, fontSize:11, cursor:'pointer', border:'1px solid',
              background: groupe === g.value ? '#6366f1' : '#1e293b',
              color: groupe === g.value ? '#fff' : '#94a3b8',
              borderColor: groupe === g.value ? '#6366f1' : '#334155',
            }}>{g.label}</button>
        ))}
      </div>
      <div style={{ maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:4 }}>
        {exercices.map(ex => (
          <div key={ex.id}>
            <button onClick={() => setAdding(adding?.id === ex.id ? null : ex)}
              style={{
                width:'100%', textAlign:'left', padding:'7px 10px', borderRadius:7, cursor:'pointer',
                background: adding?.id === ex.id ? '#6366f133' : '#1e293b',
                border: `1px solid ${adding?.id === ex.id ? '#6366f1' : '#334155'}`,
                color:'#e2e8f0', fontSize:12, display:'flex', alignItems:'center', gap:8,
              }}>
              {ex.gif_url && (
                <ExerciseImg url={ex.gif_url} alt={ex.nom} width={32} height={32} style={{ borderRadius:4, flexShrink:0 }} />
              )}
              <div>
                <div style={{ fontWeight:600 }}>{ex.nom}</div>
                <div style={{ fontSize:10, color:'#64748b' }}>{ex.groupe_musculaire_label} · {ex.categorie_label}</div>
              </div>
            </button>
            {adding?.id === ex.id && (
              <div style={{ background:'#1e293b', border:'1px solid #6366f1', borderTop:'none', borderRadius:'0 0 7px 7px', padding:'10px 10px 8px', marginBottom:4 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:8 }}>
                  {[['series','Séries'],['repetitions','Reps'],['poids_kg','Poids (kg)']].map(([k,l]) => (
                    <div key={k}>
                      <div style={{ fontSize:10, color:'#94a3b8', marginBottom:3 }}>{l}</div>
                      <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                        style={{ width:'100%', boxSizing:'border-box', padding:'4px 7px', background:'#0f172a', border:'1px solid #334155', borderRadius:5, color:'#e2e8f0', fontSize:12 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:8, marginBottom:8 }}>
                  {[['duree_sec','Durée (sec)'],['repos_sec','Repos (sec)']].map(([k,l]) => (
                    <div key={k}>
                      <div style={{ fontSize:10, color:'#94a3b8', marginBottom:3 }}>{l}</div>
                      <input type="number" value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
                        style={{ width:'100%', boxSizing:'border-box', padding:'4px 7px', background:'#0f172a', border:'1px solid #334155', borderRadius:5, color:'#e2e8f0', fontSize:12 }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => addExercice(ex)} style={{
                  width:'100%', padding:'6px 0', background:'#6366f1', border:'none',
                  color:'#fff', borderRadius:6, cursor:'pointer', fontSize:12, fontWeight:600,
                }}>Ajouter à la séance</button>
              </div>
            )}
          </div>
        ))}
        {exercices.length === 0 && <div style={{ textAlign:'center', padding:16, color:'#64748b', fontSize:12 }}>Aucun exercice trouvé</div>}
      </div>
    </div>
  );
}

function CarnetCoachModal({ seanceId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [planifies, setPlanifies] = useState([]);

  const reload = () => {
    api.seances.detail(seanceId).then(d => {
      setDetail(d);
      setPlanifies(d.exercices_planifies || []);
    }).catch(() => {});
  };

  useEffect(() => { reload(); }, [seanceId]); // eslint-disable-line

  async function removeExercice(itemId) {
    try {
      await api.exercices.removeFromSeance(seanceId, itemId);
      setPlanifies(prev => prev.filter(e => e.id !== itemId));
    } catch (e) { toast(e.message, 'err'); }
  }

  if (!detail) return <Modal title="Carnet d'entraînement" onClose={onClose}><Loader /></Modal>;

  const logs = detail.series_log || [];
  const grouped = logs.reduce((acc, l) => {
    if (!acc[l.exercice_nom]) acc[l.exercice_nom] = [];
    acc[l.exercice_nom].push(l);
    return acc;
  }, {});

  const date = new Date(detail.date_heure).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });

  return (
    <Modal
      title={`📋 ${detail.titre || 'Séance'} — ${detail.client_nom}`}
      onClose={onClose}
      footer={<button className="btn btn-s" onClick={onClose}>Fermer</button>}
    >
      <div style={{ fontSize:12, color:'var(--t3)', marginBottom:16 }}>
        {date} · {detail.duree_minutes} min · <STag s={detail.statut} />
      </div>

      {/* Planned exercises */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
          Programme prévu
        </div>
        {planifies.length === 0
          ? <div style={{ fontSize:12, color:'var(--t3)', fontStyle:'italic' }}>Aucun exercice planifié</div>
          : planifies.map((item, idx) => {
              const ex = item.exercice_details;
              return (
                <div key={item.id} style={{
                  display:'flex', alignItems:'center', gap:10, marginBottom:6,
                  background:'var(--bg)', borderRadius:8, padding:'8px 10px',
                }}>
                  <span style={{ fontSize:11, color:'var(--t3)', minWidth:20 }}>{idx + 1}.</span>
                  {ex?.gif_url && (
                    <ExerciseImg url={ex.gif_url} alt={ex?.nom || ''} width={36} height={36} style={{ borderRadius:4 }} />
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'var(--t1)' }}>{ex?.nom || 'Exercice'}</div>
                    <div style={{ fontSize:11, color:'var(--t3)' }}>
                      {item.series} séries
                      {item.repetitions ? ` × ${item.repetitions} reps` : ''}
                      {item.poids_kg ? ` @ ${item.poids_kg} kg` : ''}
                      {item.duree_sec ? ` · ${item.duree_sec}s` : ''}
                      {item.repos_sec ? ` · repos ${item.repos_sec}s` : ''}
                    </div>
                  </div>
                  <button onClick={() => removeExercice(item.id)}
                    style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:16, padding:'0 4px' }}
                    title="Retirer">×</button>
                </div>
              );
            })
        }
        <ExercicePicker seanceId={seanceId} onAdded={reload} />
      </div>

      {/* Logged series */}
      <div style={{ borderTop:'1px solid var(--bdr)', paddingTop:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>
          Séries enregistrées
        </div>
        {logs.length === 0
          ? <div style={{ textAlign:'center', padding:'16px 0', color:'var(--t3)', fontSize:13 }}>
              Aucune série enregistrée par le client
            </div>
          : <>
              {Object.entries(grouped).map(([nom, series]) => (
                <div key={nom} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:6 }}>
                    {nom} <span style={{ fontSize:11, color:'var(--t3)', fontWeight:400 }}>{series.length} série{series.length > 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ display:'grid', gap:4 }}>
                    {series.map(l => (
                      <div key={l.id} style={{
                        display:'flex', alignItems:'center', gap:8,
                        background:'var(--bg)', borderRadius:6, padding:'6px 10px', fontSize:13,
                      }}>
                        <span style={{ fontWeight:700, color:'var(--acc)', minWidth:22 }}>S{l.serie_numero}</span>
                        {l.repetitions && <span>{l.repetitions} reps</span>}
                        {l.poids_kg && <span style={{ color:'#059669', fontWeight:600 }}>{l.poids_kg} kg</span>}
                        {l.duree_secondes && <span>{l.duree_secondes}s</span>}
                        {l.notes && <span style={{ color:'var(--t3)', fontSize:11 }}>— {l.notes}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ fontSize:12, color:'var(--t3)', textAlign:'center', marginTop:8 }}>
                {logs.length} série{logs.length > 1 ? 's' : ''} enregistrée{logs.length > 1 ? 's' : ''}
              </div>
            </>
        }
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════
   REVENUS
══════════════════════════════════════════════════════════════ */
export function Revenus() {
  const [stats, setStats]     = useState(null);
  const [factures, setFact]   = useState([]);
  const [clients, setClients] = useState([]);
  const [busy, setBusy]       = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [f, setF] = useState({ client:'', montant_ht:'', date_emission:'', date_echeance:'', statut:'envoyee', notes:'' });
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));

  const load = () => Promise.all([api.factures.stats(), api.factures.list(), api.clients.list()]).then(([st, fa, cl]) => {
    setStats(st); setFact(fa.results || fa); setClients(cl.results || cl); setBusy(false);
  });
  useEffect(() => { load(); }, []); // eslint-disable-line

  const create = async () => {
    if (!f.client || !f.montant_ht) return toast('Client et montant requis', 'err');
    if (!f.date_emission || !f.date_echeance) return toast('Dates d\'émission et d\'échéance requises', 'err');
    const m = Number(f.montant_ht);
    try {
      await api.factures.create({ ...f, montant_ht:m, montant_ttc:m, taux_tva:0, lignes:[{ description:'Coaching', quantite:1, prix_unitaire:m }] });
      toast('Facture créée !'); setShowNew(false); load();
    } catch (e) { toast(e.message, 'err'); }
  };
  const envoyer      = async id => { try { await api.factures.envoyer(id); toast('Facture envoyée ✓'); load(); } catch (e) { toast(e.message, 'err'); } };
  const payer        = async id => { try { await api.factures.marquerPayee(id); toast('Facture payée ✓'); load(); } catch (e) { toast(e.message, 'err'); } };
  const envoyerEmail = async (id, email) => {
    try { await api.factures.envoyerEmail(id); toast(`Facture envoyée à ${email} ✓`); }
    catch (e) { toast(e.message, 'err'); }
  };
  const dlPdf    = async (id, numero) => {
    try {
      const blob = await api.factures.pdf(id);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${numero}.pdf`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (e) { toast(e.message, 'err'); }
  };

  if (busy) return <Loader />;
  const chart = stats?.par_mois?.map(m => ({ mois: m.mois, total: m.total })) || [];

  return (
    <div>
      <div className="page-hd">
        <div>
          <div className="page-title">Revenus</div>
          <div className="page-sub">Suivi financier et facturation</div>
        </div>
        <button className="btn btn-p" onClick={() => setShowNew(true)}><Ic n="plus" s={14} /> Nouvelle facture</button>
      </div>

      <div className="mets rev-mets">
        <div className="met">
          <div className="met-l">Ce mois</div>
          <div className="met-v">{Number(stats?.revenus_mois || 0).toLocaleString('fr-FR')} €</div>
          <div className="met-d up">Revenus encaissés</div>
        </div>
        <div className="met">
          <div className="met-l">En attente</div>
          <div className="met-v" style={{ color:'var(--amber)' }}>{Number(stats?.en_attente || 0).toLocaleString('fr-FR')} €</div>
        </div>
        <div className="met">
          <div className="met-l">Cumul annuel</div>
          <div className="met-v">{Number(stats?.revenus_annee || 0).toLocaleString('fr-FR')} €</div>
        </div>
        <div className="met">
          <div className="met-l">Factures</div>
          <div className="met-v">{factures.length}</div>
        </div>
      </div>

      {chart.length > 0 && (
        <div className="card mb16">
          <div className="card-t">Évolution mensuelle</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chart} margin={{ top:4, right:8, bottom:0, left:-16 }}>
              <XAxis dataKey="mois" tick={{ fontSize:11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} width={48} />
              <Tooltip formatter={v => [`${Number(v).toLocaleString('fr-FR')} €`]} />
              <Bar dataKey="total" fill="var(--acc)" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div className="card-t">Factures ({factures.length})</div>
        {factures.length === 0
          ? <Empty icon="file" title="Aucune facture" desc="Créez votre première facture" />
          : <>
              {/* Table — desktop */}
              <div className="twrap factures-table">
                <table>
                  <thead><tr><th>Client</th><th>Montant</th><th>Émise le</th><th>Échéance</th><th>Statut</th><th></th></tr></thead>
                  <tbody>{factures.map(facture => (
                    <tr key={facture.id}>
                      <td className="fw6">{facture.client_nom}</td>
                      <td style={{ fontWeight:800 }}>{Number(facture.montant_ttc).toLocaleString('fr-FR')} €</td>
                      <td>{new Date(facture.date_emission).toLocaleDateString('fr-FR')}</td>
                      <td>
                        {new Date(facture.date_echeance).toLocaleDateString('fr-FR')}
                        {facture.jours_retard > 0 && <span className="tag tr" style={{ marginLeft:6 }}>+{facture.jours_retard}j</span>}
                      </td>
                      <td><STag s={facture.statut} /></td>
                      <td style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {facture.statut === 'brouillon' && <button className="btn btn-g btn-sm" onClick={() => envoyer(facture.id)}>Envoyer</button>}
                        {['envoyee','retard'].includes(facture.statut) && <button className="btn btn-s btn-sm" onClick={() => payer(facture.id)}>✓ Payée</button>}
                        <button className="btn btn-g btn-sm" onClick={() => dlPdf(facture.id, facture.numero)}>⬇ PDF</button>
                        {facture.client_email && <button className="btn btn-g btn-sm" onClick={() => envoyerEmail(facture.id, facture.client_email)}>✉</button>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>

              {/* Cards — mobile */}
              <div className="factures-cards">
                {factures.map(facture => (
                  <div key={facture.id} style={{ border:'1px solid var(--bdr)', borderRadius:12, padding:'14px 16px', background:'var(--bg)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14, color:'var(--t1)' }}>{facture.client_nom}</div>
                        <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>
                          Émise le {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                          {' · '}Éch. {new Date(facture.date_echeance).toLocaleDateString('fr-FR')}
                          {facture.jours_retard > 0 && <span style={{ color:'var(--red)', fontWeight:700 }}> (+{facture.jours_retard}j)</span>}
                        </div>
                      </div>
                      <STag s={facture.statut} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontWeight:800, fontSize:20, color:'var(--t1)' }}>
                        {Number(facture.montant_ttc).toLocaleString('fr-FR')} €
                      </span>
                      <div style={{ display:'flex', gap:6 }}>
                        {facture.statut === 'brouillon' && <button className="btn btn-g btn-sm" onClick={() => envoyer(facture.id)}>Envoyer</button>}
                        {['envoyee','retard'].includes(facture.statut) && <button className="btn btn-s btn-sm" onClick={() => payer(facture.id)}>✓</button>}
                        <button className="btn btn-g btn-sm" onClick={() => dlPdf(facture.id, facture.numero)}>⬇</button>
                        {facture.client_email && <button className="btn btn-g btn-sm" onClick={() => envoyerEmail(facture.id, facture.client_email)}>✉</button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
        }
      </div>

      {showNew && (
        <Modal title="Nouvelle facture" onClose={() => setShowNew(false)} footer={
          <><button className="btn btn-s" onClick={() => setShowNew(false)}>Annuler</button>
            <button className="btn btn-p" onClick={create}>Créer</button></>
        }>
          <div className="fg"><label className="fl">Client *</label>
            <select className="fi fsel" value={f.client} onChange={e => s('client', e.target.value)}>
              <option value="">Sélectionner</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom_complet}</option>)}
            </select></div>
          <div className="fg"><label className="fl">Montant HT (€) *</label>
            <input className="fi" type="number" value={f.montant_ht} onChange={e => s('montant_ht', e.target.value)} /></div>
          <div className="fr2">
            <div className="fg"><label className="fl">Date d&apos;émission</label><input className="fi" type="date" value={f.date_emission} onChange={e => s('date_emission', e.target.value)} /></div>
            <div className="fg"><label className="fl">Date d&apos;échéance</label><input className="fi" type="date" value={f.date_echeance} onChange={e => s('date_echeance', e.target.value)} /></div>
          </div>
          <div className="fg"><label className="fl">Statut</label>
            <select className="fi fsel" value={f.statut} onChange={e => s('statut', e.target.value)}>
              <option value="envoyee">Envoyée</option>
              <option value="payee">Payée</option>
              <option value="brouillon">Brouillon</option>
            </select></div>
          <div className="fg"><label className="fl">Notes</label><textarea className="fi fta" value={f.notes} onChange={e => s('notes', e.target.value)} /></div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MESSAGES
══════════════════════════════════════════════════════════════ */
export function Messages() {
  const [convs, setConvs]   = useState([]);
  const [active, setActive] = useState(null);
  const [msgs, setMsgs]     = useState([]);
  const [txt, setTxt]       = useState('');
  const [busy, setBusy]     = useState(true);
  const [newBanner, setNewBanner] = useState(false); // nouveau message hors-vue
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const bot      = useRef();
  const fileRef  = useRef();
  const chatRef  = useRef();        // conteneur scroll des messages
  const activeRef  = useRef(null);  // ref pour accéder à active dans les closures
  const msgsRef    = useRef([]);    // ref pour le dernier id connu
  const pollMsgRef = useRef(null);  // interval messages
  const pollConvRef= useRef(null);  // interval conversations

  activeRef.current = active;
  msgsRef.current   = msgs;

  /* ── utilitaire scroll ────────────────────────────────────────── */
  const isAtBottom = () => {
    const el = chatRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  const scrollBottom = (smooth = true) => {
    bot.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
  };

  /* ── polling messages (3 s) ──────────────────────────────────── */
  const startMsgPoll = (convId) => {
    stopMsgPoll();
    pollMsgRef.current = setInterval(async () => {
      if (document.hidden) return;           // onglet invisible → skip
      const cur  = msgsRef.current;
      const lastId = cur.length ? cur[cur.length - 1].id : null;
      try {
        const news = await api.conversations.messages(convId, lastId);
        const arr  = news.results ?? news;
        if (!arr.length) return;
        setMsgs(prev => {
          const ids = new Set(prev.map(m => m.id));
          return [...prev, ...arr.filter(m => !ids.has(m.id))];
        });
        // Mettre à jour les convs (compteur non-lus)
        setConvs(prev => prev.map(c =>
          c.id === convId ? { ...c, non_lus: 0, dernier_message: arr[arr.length - 1] } : c
        ));
        if (isAtBottom()) {
          setTimeout(() => scrollBottom(), 60);
        } else {
          setNewBanner(true); // nouveau message mais l'utilisateur a scrollé vers le haut
        }
      } catch { /* réseau indispo — on réessaie au prochain tick */ }
    }, 3000);
  };

  const stopMsgPoll = () => {
    if (pollMsgRef.current) { clearInterval(pollMsgRef.current); pollMsgRef.current = null; }
  };

  /* ── polling conversations (10 s, pour les badges) ───────────── */
  const startConvPoll = () => {
    pollConvRef.current = setInterval(async () => {
      if (document.hidden) return;
      try {
        const d = await api.conversations.list();
        setConvs(d.results ?? d);
      } catch { /* silence */ }
    }, 10000);
  };

  /* ── mount / unmount ─────────────────────────────────────────── */
  useEffect(() => {
    api.conversations.list().then(d => { setConvs(d.results || d); setBusy(false); });
    startConvPoll();
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', fn);
    return () => {
      window.removeEventListener('resize', fn);
      stopMsgPoll();
      if (pollConvRef.current) clearInterval(pollConvRef.current);
    };
  }, []); // eslint-disable-line

  /* ── ouvrir une conversation ─────────────────────────────────── */
  const open = async conv => {
    stopMsgPoll();
    setActive(conv);
    setNewBanner(false);
    const m = await api.conversations.messages(conv.id);
    const arr = m.results ?? m;
    setMsgs(arr);
    setTimeout(() => scrollBottom(false), 80);
    startMsgPoll(conv.id);
  };

  /* ── envoi texte ─────────────────────────────────────────────── */
  const send = async () => {
    if (!txt.trim() || !active) return;
    try {
      const msg = await api.conversations.send(active.id, txt);
      setTxt('');
      setMsgs(prev => [...prev, msg]);
      setConvs(prev => prev.map(c => c.id === active.id ? { ...c, dernier_message: msg } : c));
      setTimeout(() => scrollBottom(), 60);
    } catch (e) { toast(e.message, 'err'); }
  };

  /* ── envoi image ─────────────────────────────────────────────── */
  const sendImage = async (file) => {
    if (!file || !active) return;
    try {
      const msg = await api.conversations.sendImage(active.id, file);
      setMsgs(prev => [...prev, msg]);
      setTimeout(() => scrollBottom(), 60);
    } catch (e) { toast(e.message, 'err'); }
  };

  if (busy) return <Loader />;

  /* ── Liste conversations ── */
  const ConvList = () => (
    <div className="card" style={{ padding:0, overflow:'auto', flex:1 }}>
      {convs.length === 0 ? <Empty icon="messages" title="Aucune conversation" desc="" /> :
        convs.map(c => (
          <div key={c.id} onClick={() => open(c)} style={{
            padding:'14px 16px', cursor:'pointer', borderBottom:'1px solid var(--bdr)',
            background: active?.id === c.id ? 'var(--acc2)' : 'transparent',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Av name={c.client_nom} size="sm" />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontWeight: c.non_lus > 0 ? 700 : 500, fontSize:14, color: c.non_lus > 0 ? 'var(--acc3)' : 'var(--t1)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {c.client_nom}
                </div>
                {c.dernier_message && (
                  <div style={{ fontSize:12, color:'var(--t3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{c.dernier_message.contenu}</div>
                )}
              </div>
              {c.non_lus > 0 && <span className="sb-bdg">{c.non_lus}</span>}
            </div>
          </div>
        ))
      }
    </div>
  );

  /* ── Fenêtre chat ── */
  const ChatPanel = () => (
    <div className="card" style={{ display:'flex', flexDirection:'column', padding:0, overflow:'hidden', flex:1, position:'relative' }}>
      {!active
        ? <Empty icon="messages" title="Sélectionnez une conversation" desc="Cliquez sur un client pour ouvrir le chat" />
        : <>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--bdr)', display:'flex', alignItems:'center', gap:10 }}>
            {isMobile && (
              <button onClick={() => setActive(null)} style={{ background:'none', border:'none', cursor:'pointer', padding:'0 8px 0 0', fontSize:20, color:'var(--t2)', lineHeight:1 }}>‹</button>
            )}
            <Av name={active.client_nom} size="sm" />
            <span style={{ fontWeight:700, fontSize:14 }}>{active.client_nom}</span>
          </div>
          <div className="chat-msgs" ref={chatRef} onScroll={() => { if (isAtBottom()) setNewBanner(false); }}>
            {msgs.map(m => (
              <div key={m.id} className={m.expediteur_role === 'coach' ? 'bme' : 'bth'}>
                {m.image_url
                  ? <img src={m.image_url} alt="" style={{ maxWidth:220, borderRadius:10, display:'block', marginBottom:2 }} />
                  : m.contenu && <div className="bbl">{m.contenu}</div>
                }
                <div className="btm">{new Date(m.created_at).toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</div>
              </div>
            ))}
            <div ref={bot} />
          </div>
          {newBanner && (
            <div onClick={() => { scrollBottom(); setNewBanner(false); }} style={{
              position:'absolute', bottom:80, left:'50%', transform:'translateX(-50%)',
              background:'#6366F1', color:'#fff', borderRadius:20, padding:'6px 16px',
              fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 12px rgba(99,102,241,.4)',
              display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
            }}>
              ↓ Nouveau message
            </div>
          )}
          <div style={{ padding:'10px 12px', borderTop:'1px solid var(--bdr)', display:'flex', gap:8, alignItems:'flex-end' }}>
            <button onClick={() => fileRef.current.click()} style={{
              width:38, height:38, borderRadius:10, border:'1px solid var(--bdr)',
              background:'#fff', cursor:'pointer', flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:18,
            }}>📎</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
              onChange={e => { const f = e.target.files[0]; if (f) sendImage(f); e.target.value=''; }} />
            <textarea className="fi" style={{ flex:1, minHeight:36, maxHeight:100, resize:'none' }}
              placeholder="Écrire un message..." value={txt}
              onChange={e => setTxt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <button className="btn btn-p" onClick={send} style={{ flexShrink:0, height:38 }}><Ic n="send" s={15} /></button>
          </div>
        </>
      }
    </div>
  );

  /* ── Mobile : liste OU chat ── */
  if (isMobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)' }}>
        <div className="page-hd" style={{ paddingBottom:10 }}>
          {active
            ? <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <button onClick={() => setActive(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'var(--t2)', padding:0 }}>‹</button>
                <div className="page-title">{active.client_nom}</div>
              </div>
            : <div className="page-title">Messages</div>
          }
        </div>
        {active ? <ChatPanel /> : <ConvList />}
      </div>
    );
  }

  /* ── Desktop : deux colonnes ── */
  return (
    <div>
      <div className="page-hd"><div className="page-title">Messages</div></div>
      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:14, height:'calc(100vh - 160px)' }}>
        <ConvList />
        <ChatPanel />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ALERTES
══════════════════════════════════════════════════════════════ */
export function Alertes() {
  const [alertes, setAlertes] = useState([]);
  const [busy, setBusy]       = useState(true);
  const [tab, setTab]         = useState('pending');

  const load = () => api.alertes.list().then(d => { setAlertes(d.results || d); setBusy(false); });
  useEffect(() => { load(); }, []);

  const traiter    = async id => { try { await api.alertes.traiter(id);    toast('Alerte traitée'); load(); } catch (e) { toast(e.message, 'err'); } };
  const marquerLue = async id => { try { await api.alertes.marquerLue(id); load(); } catch (e) { toast(e.message, 'err'); } };

  const filtered = alertes.filter(a => tab === 'all' ? true : tab === 'pending' ? !a.traitee : a.traitee);
  const pending  = alertes.filter(a => !a.traitee).length;

  const CLS = { haute:'ae', moyenne:'aw', basse:'ao' };

  if (busy) return <Loader />;

  return (
    <div>
      <div className="page-hd">
        <div>
          <div className="page-title">Alertes</div>
          <div className="page-sub">{pending} alerte{pending !== 1 ? 's' : ''} en attente</div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          {[['pending','En attente'], ['all','Toutes'], ['done','Traitées']].map(([k, l]) => (
            <button key={k} className={`btn btn-sm ${tab === k ? 'btn-p' : 'btn-s'}`} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0
        ? <Empty icon="check" title={tab === 'pending' ? 'Aucune alerte en attente ✓' : 'Aucune alerte'} desc="" />
        : filtered.map(a => (
          <div key={a.id} className={`alrt ${CLS[a.priorite] || 'ai'}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {a.priorite === 'haute' || a.priorite === 'moyenne'
                ? <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>
                : <><circle cx="12" cy="12" r="10"/><polyline points="20,6 9,17 4,12"/></>
              }
            </svg>
            <div style={{ flex:1 }}>
              <div className="alrt-t">{a.titre}</div>
              {a.description && <div className="alrt-s">{a.description}</div>}
              <div style={{ fontSize:11, marginTop:4, opacity:.7 }}>
                {new Date(a.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long' })} · {a.client_nom}
              </div>
            </div>
            {!a.traitee && (
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {!a.lue && <button className="btn btn-sm" style={{ background:'rgba(255,255,255,.5)', border:'none' }} onClick={() => marquerLue(a.id)}>Lu</button>}
                <button className="btn btn-sm" style={{ background:'rgba(255,255,255,.7)', border:'none', fontWeight:700 }} onClick={() => traiter(a.id)}>✓ Traiter</button>
              </div>
            )}
            {a.traitee && <span className="tag tgr">Traitée</span>}
          </div>
        ))
      }
    </div>
  );
}
