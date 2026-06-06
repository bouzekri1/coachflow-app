import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Av, Loader, PBar, STag, Ic, Modal, Empty, toast, Lightbox } from '../components/UI';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

const METRICS = [
  { key: 'poids_kg',        label: 'Poids',          unit: 'kg', color: '#1D9E75' },
  { key: 'tour_taille_cm',  label: 'Tour de taille', unit: 'cm', color: '#3B82F6' },
  { key: 'tour_hanches_cm', label: 'Tour de hanches',unit: 'cm', color: '#F59E0B' },
  { key: 'masse_grasse_pct',label: 'Masse grasse',   unit: '%',  color: '#EF4444' },
];

/* ── MODAL NOUVEAU CLIENT ─────────────────────────────────────────────────── */
function NouveauClient({ onClose, onDone }) {
  const [f, setF] = useState({ prenom:'', nom:'', email:'', phone:'', statut:'nouveau', genre:'', taille_cm:'', poids_depart_kg:'', poids_cible_kg:'', niveau:'debutant', ville:'', mode_facturation:'mensuel', tarif:'' });
  const [busy, setBusy] = useState(false);
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));

  const go = async () => {
    if (!f.prenom || !f.nom || !f.email) return toast('Prénom, nom et email requis', 'err');
    setBusy(true);
    try {
      const p = { ...f };
      ['taille_cm','poids_depart_kg','poids_cible_kg','tarif'].forEach(k => { if (!p[k]) delete p[k]; });
      await api.clients.create(p);
      toast('Client créé !'); onDone();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  return (
    <Modal title="Nouveau client" onClose={onClose} footer={
      <><button className="btn btn-s" onClick={onClose}>Annuler</button>
        <button className="btn btn-p" onClick={go} disabled={busy}>{busy ? 'Création...' : 'Créer le client'}</button></>
    }>
      <div className="fr2">
        <div className="fg"><label className="fl">Prénom *</label><input className="fi" value={f.prenom} onChange={e => s('prenom', e.target.value)} /></div>
        <div className="fg"><label className="fl">Nom *</label><input className="fi" value={f.nom} onChange={e => s('nom', e.target.value)} /></div>
      </div>
      <div className="fg"><label className="fl">Email *</label><input className="fi" type="email" value={f.email} onChange={e => s('email', e.target.value)} /></div>
      <div className="fr2">
        <div className="fg"><label className="fl">Téléphone</label><input className="fi" value={f.phone} onChange={e => s('phone', e.target.value)} /></div>
        <div className="fg"><label className="fl">Ville</label><input className="fi" value={f.ville} onChange={e => s('ville', e.target.value)} /></div>
      </div>
      <div className="fr2">
        <div className="fg"><label className="fl">Genre</label>
          <select className="fi fsel" value={f.genre} onChange={e => s('genre', e.target.value)}>
            <option value="">—</option><option value="homme">Homme</option><option value="femme">Femme</option><option value="autre">Autre</option>
          </select></div>
        <div className="fg"><label className="fl">Niveau</label>
          <select className="fi fsel" value={f.niveau} onChange={e => s('niveau', e.target.value)}>
            <option value="debutant">Débutant</option><option value="intermediaire">Intermédiaire</option><option value="avance">Avancé</option>
          </select></div>
      </div>
      <div className="fr2">
        <div className="fg"><label className="fl">Taille (cm)</label><input className="fi" type="number" value={f.taille_cm} onChange={e => s('taille_cm', e.target.value)} /></div>
        <div className="fg"><label className="fl">Poids départ (kg)</label><input className="fi" type="number" step="0.1" value={f.poids_depart_kg} onChange={e => s('poids_depart_kg', e.target.value)} /></div>
      </div>
      <div className="fg"><label className="fl">Poids cible (kg)</label><input className="fi" type="number" step="0.1" value={f.poids_cible_kg} onChange={e => s('poids_cible_kg', e.target.value)} /></div>
      <div className="fg">
        <label className="fl">Mode de facturation</label>
        <div style={{ display:'flex', gap:8 }}>
          <button type="button"
            className={`btn btn-sm ${f.mode_facturation==='mensuel' ? 'btn-p' : 'btn-s'}`}
            style={{ flex:1, justifyContent:'center' }}
            onClick={() => s('mode_facturation','mensuel')}>
            📅 Forfait mensuel
          </button>
          <button type="button"
            className={`btn btn-sm ${f.mode_facturation==='seance' ? 'btn-p' : 'btn-s'}`}
            style={{ flex:1, justifyContent:'center' }}
            onClick={() => s('mode_facturation','seance')}>
            🎯 Par séance
          </button>
        </div>
      </div>
      <div className="fg">
        <label className="fl">
          {f.mode_facturation === 'mensuel' ? 'Tarif mensuel (€/mois)' : 'Prix par séance (€/séance)'}
        </label>
        <input className="fi" type="number" step="0.01"
          placeholder={f.mode_facturation === 'mensuel' ? 'ex : 120' : 'ex : 45'}
          value={f.tarif} onChange={e => s('tarif', e.target.value)} />
      </div>
    </Modal>
  );
}

/* ── LISTE CLIENTS ────────────────────────────────────────────────────────── */
export function ClientsList() {
  const [clients, setClients] = useState([]);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState('');
  const [filtre, setFiltre] = useState('');
  const [modal, setModal] = useState(false);
  const nav = useNavigate();

  // Auto-ouverture du modal Nouveau client si ?new=1 (depuis l'onboarding)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('new') === '1') {
      setModal(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const load = () => {
    setBusy(true);
    const q = [];
    if (search) q.push(`search=${encodeURIComponent(search)}`);
    if (filtre) q.push(`statut=${filtre}`);
    api.clients.list(q.length ? `?${q.join('&')}` : '').then(d => { setClients(d.results || d); setBusy(false); });
  };

  useEffect(() => { load(); }, [search, filtre]); // eslint-disable-line

  return (
    <div>
      <div className="page-hd">
        <div>
          <div className="page-title">Clients</div>
          <div className="page-sub">{clients.length} client{clients.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-p" onClick={() => setModal(true)}><Ic n="plus" s={14} /> Nouveau client</button>
      </div>

      <div style={{ display:'flex', gap:10, marginBottom:18 }}>
        <div style={{ position:'relative', flex:1 }}>
          <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--t3)', pointerEvents:'none' }}>
            <Ic n="search" s={14} />
          </span>
          <input className="fi" style={{ paddingLeft:32 }} placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="fi fsel" style={{ width:170 }} value={filtre} onChange={e => setFiltre(e.target.value)}>
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option><option value="nouveau">Nouveau</option>
          <option value="pause">En pause</option><option value="inactif">Inactif</option>
        </select>
      </div>

      {busy ? <Loader /> : clients.length === 0
        ? <Empty icon="user" title="Aucun client" desc="Ajoutez votre premier client pour commencer"
            action={<button className="btn btn-p" onClick={() => setModal(true)}><Ic n="plus" s={14} /> Nouveau client</button>} />
        : <div className="gap">
            {clients.map(c => {
              const p = c.programme_actif;
              return (
                <div key={c.id} className="cc" onClick={() => nav(`/clients/${c.id}`)}>
                  <Av name={c.nom_complet} size="md" />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="fw7" style={{ fontSize:14 }}>{c.nom_complet}</div>
                    <div className="t12 tc3 mt4 trunc">{p ? p.nom : 'Pas de programme'}{c.age ? ` · ${c.age} ans` : ''}{c.ville ? ` · ${c.ville}` : ''}</div>
                    <div style={{ marginTop:6 }}><STag s={c.statut} /></div>
                  </div>
                  <div className="tright" style={{ flexShrink:0 }}>
                    {p ? (
                      <><div style={{ fontSize:17, fontWeight:800, color:'var(--acc)' }}>{p.progression_pct}%</div>
                      <div className="t11 tc3">Programme</div></>
                    ) : <div className="tc3 t12">—</div>}
                  </div>
                </div>
              );
            })}
          </div>
      }

      {modal && <NouveauClient onClose={() => setModal(false)} onDone={() => { setModal(false); load(); }} />}
    </div>
  );
}

/* ── FICHE CLIENT ─────────────────────────────────────────────────────────── */
export function ClientDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [client, setClient] = useState(null);
  const [tab, setTab] = useState('infos');
  const [notes, setNotes] = useState([]);
  const [mesures, setMesures] = useState([]);
  const [hist, setHist] = useState([]);
  const [carnetId, setCarnetId] = useState(null);
  const [objs, setObjs] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [noteCat, setNoteCat] = useState('general');
  const [nutrition, setNutrition] = useState(null);
  const [nutritionDate, setNutritionDate] = useState(new Date().toISOString().slice(0, 10));
  const [checkins, setCheckins] = useState(null);
  const [suiviMesures, setSuiviMesures] = useState(null);
  const [suiviNutrition, setSuiviNutrition] = useState(null);
  const [suiviCheckins, setSuiviCheckins] = useState(null);
  const [suiviPerfs, setSuiviPerfs] = useState(null);
  const [showProgIa, setShowProgIa] = useState(false);
  const [compteModal, setCompteModal] = useState(false);
  const [compteInfo, setCompteInfo] = useState(null);
  const [pushModal, setPushModal] = useState(false);
  const [pushForm, setPushForm] = useState({ title: 'TrainFlow', body: '', url: '/' });
  const [pushBusy, setPushBusy] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState({});
  const [editBusy, setEditBusy] = useState(false);
  const avRef = useRef();

  const load = () => api.clients.get(id).then(setClient);
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const changeStatut = async (newStatut) => {
    try {
      await api.clients.update(id, { statut: newStatut });
      setClient(c => ({ ...c, statut: newStatut }));
      toast('Statut mis à jour');
    } catch (e) { toast(e.message, 'err'); }
  };

  useEffect(() => {
    if (!client) return;
    if (tab === 'notes')     api.clients.notes(id).then(d => setNotes(d.results || d));
    if (tab === 'mesures')   api.clients.mesures(id).then(d => setMesures(d.results || d));
    if (tab === 'historique')api.clients.historique(id).then(d => setHist(d.results || d));
    if (tab === 'objectifs') api.clients.objectifs(id).then(d => setObjs(d.results || d));
    if (tab === 'nutrition') api.clients.nutritionJournal(id, nutritionDate).then(setNutrition);
    if (tab === 'checkins')  api.clients.checkins(id).then(d => setCheckins(d.results || d));
    if (tab === 'suivi') {
      api.clients.mesures(id).then(d => setSuiviMesures((d.results || d).slice().reverse()));
      api.clients.nutritionHistorique(id, 60).then(setSuiviNutrition);
      api.clients.checkins(id).then(d => setSuiviCheckins((d.results || d).slice().reverse()));
      api.clients.performances(id).then(setSuiviPerfs);
    }
  }, [tab, client]); // eslint-disable-line

  useEffect(() => {
    if (tab === 'nutrition') api.clients.nutritionJournal(id, nutritionDate).then(setNutrition);
  }, [nutritionDate]); // eslint-disable-line

  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await api.clients.addNote(id, { contenu: newNote, categorie: noteCat });
      setNewNote('');
      api.clients.notes(id).then(d => setNotes(d.results || d));
      toast('Note ajoutée');
    } catch (e) { toast(e.message, 'err'); }
  };

  const handleAv = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      await api.clients.uploadAvatar(id, file); load(); toast('Photo mise à jour');
    } catch (e) { toast(e.message, 'err'); }
  };

  const openEdit = () => {
    setEditData({
      prenom: client.prenom || '', nom: client.nom || '',
      email: client.email || '', phone: client.phone || '',
      date_naissance: client.date_naissance || '', genre: client.genre || '',
      ville: client.ville || '', statut: client.statut || 'nouveau',
      niveau: client.niveau || '', taille_cm: client.taille_cm || '',
      poids_depart_kg: client.poids_depart_kg || '', poids_cible_kg: client.poids_cible_kg || '',
      mode_facturation: client.mode_facturation || 'mensuel',
      tarif: client.tarif || '', blessures: client.blessures || '',
      contraintes_medicales: client.contraintes_medicales || '', alimentation: client.alimentation || '',
    });
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editData.prenom || !editData.nom || !editData.email) return toast('Prénom, nom et email requis', 'err');
    setEditBusy(true);
    try {
      const payload = { ...editData };
      ['taille_cm','poids_depart_kg','poids_cible_kg','tarif'].forEach(k => {
        if (payload[k] === '' || payload[k] === null) delete payload[k];
        else if (payload[k]) payload[k] = Number(payload[k]);
      });
      if (!payload.date_naissance) delete payload.date_naissance;
      await api.clients.update(id, payload);
      toast('Informations mises à jour'); setEditModal(false); load();
    } catch (e) { toast(e.message, 'err'); } finally { setEditBusy(false); }
  };

  const se = (k, v) => setEditData(x => ({ ...x, [k]: v }));

  const creerCompte = async () => {
    try {
      const d = await api.clients.creerCompte(id, {});
      setCompteInfo(d);
      setCompteModal(true);
      load();
    } catch (e) { toast(e.message, 'err'); }
  };

  if (!client) return <Loader />;
  const prog = client.programme_actif;
  const photoSrc = client.photo ? `http://127.0.0.1:8000${client.photo}` : null;
  const aCompte = !!client.user_account;

  return (
    <div>
      <button className="btn btn-g btn-sm mb16" onClick={() => nav('/clients')}><Ic n="back" s={14} /> Retour</button>

      {/* Header */}
      <div className="fhd">
        <div className="fhd-av">
          <div className="faw">
            <Av name={client.nom_complet} src={photoSrc} size="xl" />
            <input ref={avRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleAv} />
            <button className="fcam" onClick={() => avRef.current?.click()} title="Changer la photo"><Ic n="cam" s={11} /></button>
          </div>
        </div>
        <div className="fhd-body">
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <h2 style={{ fontSize:20, fontWeight:800, letterSpacing:'-.3px' }}>{client.nom_complet}</h2>
            <select
              value={client.statut}
              onChange={e => changeStatut(e.target.value)}
              style={{
                fontSize: 11, fontWeight: 700, borderRadius: 8, border: '1.5px solid var(--bdr)',
                padding: '3px 8px', cursor: 'pointer', background: '#fff',
                color: client.statut === 'actif' ? '#065f46' : client.statut === 'nouveau' ? '#1E40AF' : client.statut === 'pause' ? '#92400E' : '#6B7280',
              }}>
              <option value="nouveau">Nouveau</option>
              <option value="actif">Actif</option>
              <option value="pause">En pause</option>
              <option value="inactif">Inactif</option>
            </select>
            {aCompte
              ? <>
                  <span className="tag tg" style={{ fontSize:11 }}>✓ Compte actif</span>
                  <button className="btn btn-s btn-sm" onClick={() => setPushModal(true)} title="Envoyer une notification push">🔔</button>
                </>
              : <button className="btn btn-s btn-sm" onClick={creerCompte}>+ Créer un compte</button>
            }
          </div>
          <div className="t13 tc3 mt4">{prog ? prog.nom : 'Pas de programme actif'}{client.ville ? ` · ${client.ville}` : ''}</div>
          {prog && (
            <div className="fhd-prog">
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--t3)', marginBottom:4 }}>
                <span>Sem. {prog.semaine_courante}/{prog.duree_semaines} · {prog.seances_realisees}/{prog.seances_total} séances</span>
                <span className="fw7" style={{ color:'var(--acc)' }}>{prog.progression_pct}%</span>
              </div>
              <PBar value={prog.progression_pct} />
            </div>
          )}
          <div className="fsts">
            <div className="fst"><div className="fst-l">Âge</div><div className="fst-v">{client.age || '—'}</div></div>
            <div className="fst"><div className="fst-l">Poids</div><div className="fst-v">{client.poids_depart_kg ? `${client.poids_depart_kg} kg` : '—'}</div></div>
            <div className="fst"><div className="fst-l">Taille</div><div className="fst-v">{client.taille_cm ? `${client.taille_cm} cm` : '—'}</div></div>
            <div className="fst"><div className="fst-l">IMC</div><div className="fst-v">{client.imc || '—'}</div></div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'suivi', label: '📈 Suivi' },
          { key: 'programme', label: '🏋️ Programme' },
          { key: 'infos', label: 'Infos' }, { key: 'notes', label: 'Notes' },
          { key: 'mesures', label: 'Mesures' }, { key: 'historique', label: 'Historique' },
          { key: 'objectifs', label: 'Objectifs' }, { key: 'nutrition', label: '🥗 Nutrition' },
          { key: 'checkins', label: '📋 Check-ins' }, { key: 'photos', label: '📸 Photos' },
          { key: 'badges', label: '🏆 Succès' },
        ].map(t => (
          <button key={t.key} className={`tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* INFOS */}
      {tab === 'infos' && (
        <div className="g2">
          <div className="card">
            <div className="card-t" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              Informations personnelles
              <button className="btn btn-s btn-sm" onClick={openEdit}><Ic n="edit" s={13} /> Modifier</button>
            </div>
            {[
              ['Email', client.email],
              ['Téléphone', client.phone || '—'],
              ['Ville', client.ville || '—'],
              ['Date de naissance', client.date_naissance ? new Date(client.date_naissance).toLocaleDateString('fr-FR') : '—'],
              ['Âge', client.age ? `${client.age} ans` : '—'],
              ['Genre', client.genre || '—'],
              ['Niveau', client.niveau || '—'],
            ].map(([l, v]) => (
              <div key={l} className="ir"><span className="irl">{l}</span><span className="irv">{v}</span></div>
            ))}
          </div>
          <div>
            <div className="card mb12">
              <div className="card-t">Données physiques</div>
              {[['Poids départ', client.poids_depart_kg ? `${client.poids_depart_kg} kg` : '—'],
                ['Poids cible', client.poids_cible_kg ? `${client.poids_cible_kg} kg` : '—'],
                ['Taille', client.taille_cm ? `${client.taille_cm} cm` : '—'],
                ['IMC', client.imc || '—']].map(([l, v]) => (
                <div key={l} className="ir"><span className="irl">{l}</span><span className="irv">{v}</span></div>
              ))}
            </div>
            <div className="card mb12">
              <div className="card-t">💰 Facturation</div>
              <div className="ir">
                <span className="irl">Mode</span>
                <span className="irv">
                  <span style={{
                    display:'inline-block', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700,
                    background: client.mode_facturation === 'seance' ? '#FEF3C7' : '#E0E7FF',
                    color: client.mode_facturation === 'seance' ? '#92400E' : '#3730A3',
                  }}>
                    {client.mode_facturation === 'seance' ? '🎯 Par séance' : '📅 Forfait mensuel'}
                  </span>
                </span>
              </div>
              <div className="ir">
                <span className="irl">Tarif</span>
                <span className="irv" style={{ fontWeight:700 }}>
                  {client.tarif
                    ? `${Number(client.tarif).toLocaleString('fr-FR')} €${client.mode_facturation === 'seance' ? ' / séance' : ' / mois'}`
                    : '—'}
                </span>
              </div>
            </div>
            <div className="card">
              <div className="card-t">Objectifs & contraintes</div>
              {client.objectifs?.length > 0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
                  {client.objectifs.map(o => <span key={o} className="tag tg">{o}</span>)}
                </div>
              )}
              {[['Blessures', client.blessures || 'Aucune'], ['Alimentation', client.alimentation || '—']].map(([l, v]) => (
                <div key={l} className="ir"><span className="irl">{l}</span><span className="irv t12">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NOTES */}
      {tab === 'notes' && (
        <div className="card">
          <div className="card-t">Notes de suivi ({notes.length})</div>
          {notes.length === 0 ? <Empty icon="file" title="Aucune note" desc="Commencez à noter vos observations" /> :
            notes.map(n => (
              <div key={n.id} className="ni">
                <div className="ni-d">{new Date(n.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })} · {n.categorie}</div>
                <div className="ni-t">{n.contenu}</div>
              </div>
            ))
          }
          <div className="pt16 bt mt16">
            <div className="fr2 mb12">
              <select className="fi fsel" value={noteCat} onChange={e => setNoteCat(e.target.value)}>
                <option value="general">Général</option><option value="performance">Performance</option>
                <option value="nutrition">Nutrition</option><option value="psychologie">Psychologie</option>
              </select>
            </div>
            <textarea className="fi fta" placeholder="Ajouter une note de suivi..." value={newNote} onChange={e => setNewNote(e.target.value)} />
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:8 }}>
              <button className="btn btn-p btn-sm" onClick={addNote}>Enregistrer la note</button>
            </div>
          </div>
        </div>
      )}

      {/* MESURES */}
      {tab === 'mesures' && (
        <ClientMesuresTab
          mesures={mesures}
          clientId={id}
          onDone={() => api.clients.mesures(id).then(d => setMesures(d.results || d))}
        />
      )}

      {/* HISTORIQUE */}
      {tab === 'historique' && (
        <div className="card">
          <div className="card-t">Historique des séances ({hist.length})</div>
          {hist.length === 0 ? <Empty icon="planning" title="Aucune séance" desc="Les séances réalisées apparaîtront ici" /> :
            hist.map(s => (
              <div key={s.id} className="hi">
                <div className="hi-d">{new Date(s.date_heure).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}</div>
                <div style={{ flex:1 }}>
                  <div className="fw6 t13">{s.titre || 'Séance'} <STag s={s.statut} /></div>
                  <div className="t11 tc3 mt4">{s.type_seance} · {s.duree_minutes} min</div>
                </div>
                <button className="btn btn-g btn-sm" style={{ fontSize:11 }} onClick={() => setCarnetId(s.id)}>📋 Carnet</button>
              </div>
            ))
          }
        </div>
      )}

      {carnetId && <CarnetCoachModal seanceId={carnetId} onClose={() => setCarnetId(null)} />}

      {/* MODAL ÉDITION CLIENT */}
      {editModal && (
        <Modal title="Modifier le client" onClose={() => setEditModal(false)} footer={
          <><button className="btn btn-s" onClick={() => setEditModal(false)}>Annuler</button>
            <button className="btn btn-p" onClick={saveEdit} disabled={editBusy}>{editBusy ? 'Enregistrement...' : 'Enregistrer'}</button></>
        }>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:10 }}>Identité</div>
          <div className="fr2">
            <div className="fg"><label className="fl">Prénom *</label><input className="fi" value={editData.prenom} onChange={e => se('prenom', e.target.value)} /></div>
            <div className="fg"><label className="fl">Nom *</label><input className="fi" value={editData.nom} onChange={e => se('nom', e.target.value)} /></div>
          </div>
          <div className="fg"><label className="fl">Email *</label><input className="fi" type="email" value={editData.email} onChange={e => se('email', e.target.value)} /></div>
          <div className="fr2">
            <div className="fg"><label className="fl">Téléphone</label><input className="fi" value={editData.phone} onChange={e => se('phone', e.target.value)} /></div>
            <div className="fg"><label className="fl">Ville</label><input className="fi" value={editData.ville} onChange={e => se('ville', e.target.value)} /></div>
          </div>
          <div className="fr2">
            <div className="fg">
              <label className="fl">Date de naissance
                {editData.date_naissance && (() => {
                  const d = new Date(editData.date_naissance);
                  const age = new Date().getFullYear() - d.getFullYear() - (new Date() < new Date(new Date().getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
                  return <span style={{ fontWeight:400, color:'var(--t3)', marginLeft:8 }}>→ {age} ans</span>;
                })()}
              </label>
              <input className="fi" type="date" value={editData.date_naissance} onChange={e => se('date_naissance', e.target.value)} />
            </div>
            <div className="fg"><label className="fl">Genre</label>
              <select className="fi fsel" value={editData.genre} onChange={e => se('genre', e.target.value)}>
                <option value="">—</option><option value="homme">Homme</option><option value="femme">Femme</option><option value="autre">Autre</option>
              </select></div>
          </div>
          <div className="fr2">
            <div className="fg"><label className="fl">Statut</label>
              <select className="fi fsel" value={editData.statut} onChange={e => se('statut', e.target.value)}>
                <option value="nouveau">Nouveau</option><option value="actif">Actif</option>
                <option value="pause">En pause</option><option value="inactif">Inactif</option>
              </select></div>
            <div className="fg"><label className="fl">Niveau</label>
              <select className="fi fsel" value={editData.niveau} onChange={e => se('niveau', e.target.value)}>
                <option value="">—</option><option value="debutant">Débutant</option>
                <option value="intermediaire">Intermédiaire</option><option value="avance">Avancé</option>
              </select></div>
          </div>

          <div style={{ fontSize:12, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', margin:'16px 0 10px' }}>Données physiques</div>
          <div className="fg"><label className="fl">Taille (cm)</label><input className="fi" type="number" value={editData.taille_cm} onChange={e => se('taille_cm', e.target.value)} /></div>
          <div className="fg">
            <label className="fl">Mode de facturation</label>
            <div style={{ display:'flex', gap:8 }}>
              <button type="button"
                className={`btn btn-sm ${editData.mode_facturation==='mensuel' ? 'btn-p' : 'btn-s'}`}
                style={{ flex:1, justifyContent:'center' }}
                onClick={() => se('mode_facturation','mensuel')}>
                📅 Forfait mensuel
              </button>
              <button type="button"
                className={`btn btn-sm ${editData.mode_facturation==='seance' ? 'btn-p' : 'btn-s'}`}
                style={{ flex:1, justifyContent:'center' }}
                onClick={() => se('mode_facturation','seance')}>
                🎯 Par séance
              </button>
            </div>
          </div>
          <div className="fg">
            <label className="fl">
              {editData.mode_facturation === 'mensuel' ? 'Tarif mensuel (€/mois)' : 'Prix par séance (€/séance)'}
            </label>
            <input className="fi" type="number" step="0.01"
              placeholder={editData.mode_facturation === 'mensuel' ? 'ex : 120' : 'ex : 45'}
              value={editData.tarif} onChange={e => se('tarif', e.target.value)} />
          </div>
          <div className="fr2">
            <div className="fg">
              <label className="fl">Poids départ (kg)
                {editData.taille_cm && editData.poids_depart_kg && (() => {
                  const h = editData.taille_cm / 100;
                  const imc = (editData.poids_depart_kg / (h * h)).toFixed(1);
                  return <span style={{ fontWeight:400, color:'var(--t3)', marginLeft:8 }}>→ IMC {imc}</span>;
                })()}
              </label>
              <input className="fi" type="number" step="0.1" value={editData.poids_depart_kg} onChange={e => se('poids_depart_kg', e.target.value)} />
            </div>
            <div className="fg"><label className="fl">Poids cible (kg)</label><input className="fi" type="number" step="0.1" value={editData.poids_cible_kg} onChange={e => se('poids_cible_kg', e.target.value)} /></div>
          </div>

          <div style={{ fontSize:12, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', margin:'16px 0 10px' }}>Santé & contraintes</div>
          <div className="fg"><label className="fl">Blessures / antécédents</label><textarea className="fi fta" value={editData.blessures} onChange={e => se('blessures', e.target.value)} /></div>
          <div className="fg"><label className="fl">Contraintes médicales</label><textarea className="fi fta" value={editData.contraintes_medicales} onChange={e => se('contraintes_medicales', e.target.value)} /></div>
          <div className="fg"><label className="fl">Alimentation</label><input className="fi" placeholder="ex: végétarien, sans gluten..." value={editData.alimentation} onChange={e => se('alimentation', e.target.value)} /></div>
        </Modal>
      )}

      {/* MODAL COMPTE CLIENT */}
      {compteModal && (
        <Modal title="Compte client créé ✓" onClose={() => setCompteModal(false)} footer={
          <button className="btn btn-p" onClick={() => setCompteModal(false)}>Fermer</button>
        }>
          <p style={{ fontSize:13, color:'var(--t2)', marginBottom:16 }}>
            Transmettez ces identifiants à <strong>{client.prenom}</strong> pour qu'il puisse se connecter.
          </p>
          <div style={{ background:'var(--bg)', border:'1px solid var(--bdr)', borderRadius:10, padding:'14px 16px', marginBottom:12 }}>
            <div className="ir">
              <span className="irl">Identifiant</span>
              <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, letterSpacing:1, color:'var(--acc)' }}>
                {compteInfo?.username}
              </span>
            </div>
            <div className="ir" style={{ marginTop:8 }}>
              <span className="irl">Mot de passe</span>
              <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:15, letterSpacing:1 }}>
                {compteInfo?.password}
              </span>
            </div>
          </div>
          <div style={{ background:'#fff8e1', border:'1px solid #ffe082', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#795548', marginBottom:12 }}>
            ⚠️ L'identifiant est sensible à la casse — il doit être saisi <strong>exactement</strong> comme affiché ci-dessus.
          </div>
          <p style={{ fontSize:11, color:'var(--t3)' }}>
            URL de connexion : <strong>{window.location.origin}/login</strong>
          </p>
        </Modal>
      )}

      {/* MODAL NOTIFICATION PUSH */}
      {pushModal && (
        <Modal title="🔔 Envoyer une notification" onClose={() => setPushModal(false)} footer={
          <>
            <button className="btn btn-g btn-sm" onClick={() => setPushModal(false)}>Annuler</button>
            <button className="btn btn-p btn-sm" disabled={pushBusy || !pushForm.body} onClick={async () => {
              setPushBusy(true);
              try {
                const r = await api.push.sendTo(client.id, pushForm);
                if (r.sent === 0) toast('Ce client n\'a pas activé les notifications', 'err');
                else { toast(`Notification envoyée ✓`); setPushModal(false); }
              } catch (e) { toast(e.message, 'err'); }
              finally { setPushBusy(false); }
            }}>{pushBusy ? 'Envoi...' : 'Envoyer'}</button>
          </>
        }>
          <div className="fg"><label className="fl">Titre</label>
            <input className="fi" value={pushForm.title} onChange={e => setPushForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="fg"><label className="fl">Message *</label>
            <textarea className="fi fta" style={{ minHeight:80 }} placeholder="Ex: Votre séance est confirmée pour demain à 10h" value={pushForm.body} onChange={e => setPushForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <div className="fg"><label className="fl">URL (optionnel)</label>
            <input className="fi" placeholder="/" value={pushForm.url} onChange={e => setPushForm(f => ({ ...f, url: e.target.value }))} />
          </div>
        </Modal>
      )}

      {/* OBJECTIFS */}
      {tab === 'objectifs' && (
        <div className="card">
          <div className="card-t">Objectifs ({objs.length})</div>
          {objs.length === 0 ? <Empty icon="target" title="Aucun objectif" desc="Définissez les objectifs de ce client" /> :
            objs.map(o => {
              const updateObj = async (statut) => {
                try {
                  const updated = await api.clients.updateObjectif(id, o.id, { statut });
                  setObjs(prev => prev.map(x => x.id === o.id ? updated : x));
                  toast(statut === 'atteint' ? '🎉 Objectif atteint !' : 'Objectif mis à jour');
                } catch (e) { toast(e.message, 'err'); }
              };
              return (
                <div key={o.id} className="or">
                  <div className="obj-info">
                    <div className="fw6 t13">{o.titre}</div>
                    {o.valeur_cible && <div className="t11 tc3">{o.valeur_actuelle || '—'} / {o.valeur_cible} {o.unite}</div>}
                  </div>
                  <div className="obj-bar">
                    <div className="t12 fw7 tright mb8" style={{ color:'var(--acc)' }}>{o.progression_pct}%</div>
                    <PBar value={o.progression_pct} />
                  </div>
                  <div className="obj-actions">
                    <STag s={o.statut} />
                    {o.statut === 'en_cours' && (
                      <button className="btn btn-s btn-sm" style={{ fontSize:11 }} onClick={() => updateObj('atteint')}>✓ Atteint</button>
                    )}
                    {o.statut !== 'abandonne' && (
                      <button className="btn btn-s btn-sm" style={{ fontSize:11, color:'var(--err)' }} onClick={() => updateObj('abandonne')}>Abandonner</button>
                    )}
                    {o.statut !== 'en_cours' && (
                      <button className="btn btn-s btn-sm" style={{ fontSize:11 }} onClick={() => updateObj('en_cours')}>Réactiver</button>
                    )}
                  </div>
                </div>
              );
            })
          }
          <ObjForm clientId={id} onDone={() => api.clients.objectifs(id).then(d => setObjs(d.results || d))} />
        </div>
      )}

      {/* NUTRITION */}
      {tab === 'nutrition' && (
        <ClientNutritionTab
          clientId={id}
          client={client}
          data={nutrition}
          date={nutritionDate}
          onDateChange={d => setNutritionDate(d)}
        />
      )}

      {/* CHECK-INS */}
      {tab === 'checkins' && (
        <ClientCheckinsTab checkins={checkins} />
      )}

      {/* PHOTOS */}
      {tab === 'photos' && (
        <ClientPhotosTab photos={client.photos || []} />
      )}

      {/* SUIVI */}
      {tab === 'suivi' && (
        <ClientSuiviTab
          client={client}
          mesures={suiviMesures}
          nutrition={suiviNutrition}
          checkins={suiviCheckins}
          performances={suiviPerfs}
        />
      )}

      {tab === 'programme' && (
        <ClientProgrammeTab
          client={client}
          clientId={id}
          onIaOpen={() => setShowProgIa(true)}
          onRefresh={load}
        />
      )}

      {tab === 'badges' && <ClientBadgesTab clientId={id} />}

      {showProgIa && (
        <ProgrammeIaModal
          clientId={id}
          client={client}
          onClose={() => setShowProgIa(false)}
          onSaved={() => { load(); setShowProgIa(false); }}
        />
      )}
    </div>
  );
}

const REPAS_LABELS_COACH = {
  petit_dejeuner: 'Petit-déjeuner', collation_matin: 'Collation matin',
  dejeuner: 'Déjeuner', collation_soir: 'Collation soir', diner: 'Dîner',
};

const fmtAxisDate = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

function NutritionCharts({ clientId, fetchFn }) {
  const [histo, setHisto] = useState(null);
  const [days, setDays]   = useState(30);

  useEffect(() => {
    setHisto(null);
    fetchFn(days).then(setHisto).catch(() => setHisto([]));
  }, [days]); // eslint-disable-line

  if (!histo) return <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Chargement…</div>;
  if (histo.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'var(--t3)' }}>
      <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
      <div style={{ fontSize:14, fontWeight:600 }}>Aucune donnée sur cette période</div>
    </div>
  );

  const periodBtn = (d, label) => (
    <button key={d} className={`btn btn-sm ${days === d ? 'btn-p' : 'btn-g'}`}
      style={{ borderRadius: 0, border: 'none' }} onClick={() => setDays(d)}>{label}</button>
  );

  const tooltipStyle = { background:'#fff', border:'1px solid var(--bdr)', borderRadius:8, fontSize:12 };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Sélecteur période */}
      <div style={{ display:'flex', border:'1px solid var(--bdr)', borderRadius:8, overflow:'hidden', alignSelf:'flex-start' }}>
        {periodBtn(7,'7 j')} {periodBtn(14,'14 j')} {periodBtn(30,'30 j')} {periodBtn(60,'60 j')}
      </div>

      {/* Calories */}
      <div className="card">
        <div className="card-t">🔥 Calories (kcal/jour)</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={histo} margin={{ top:10, right:10, left:0, bottom:0 }}>
            <defs>
              <linearGradient id="gCal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
            <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} width={45} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} kcal`, 'Calories']} labelFormatter={fmtAxisDate} />
            <Area type="monotone" dataKey="calories" stroke="#1D9E75" fill="url(#gCal)" strokeWidth={2} dot={false} activeDot={{ r:4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Macros */}
      <div className="card">
        <div className="card-t">🥩 Macronutriments (g/jour)</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={histo} margin={{ top:10, right:10, left:0, bottom:0 }}>
            <defs>
              {[['gProt','#3B82F6'],['gGluc','#F59E0B'],['gLip','#EF4444']].map(([id,c]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={c} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
            <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} width={35} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v}g`, n]} labelFormatter={fmtAxisDate} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Area type="monotone" dataKey="proteines" name="Protéines" stroke="#3B82F6" fill="url(#gProt)" strokeWidth={2} dot={false} activeDot={{ r:4 }} />
            <Area type="monotone" dataKey="glucides"  name="Glucides"  stroke="#F59E0B" fill="url(#gGluc)" strokeWidth={2} dot={false} activeDot={{ r:4 }} />
            <Area type="monotone" dataKey="lipides"   name="Lipides"   stroke="#EF4444" fill="url(#gLip)"  strokeWidth={2} dot={false} activeDot={{ r:4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Eau */}
      <div className="card">
        <div className="card-t">💧 Hydratation (ml/jour)</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={histo} margin={{ top:10, right:10, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
            <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} width={45} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} ml`, 'Eau']} labelFormatter={fmtAxisDate} />
            <ReferenceLine y={2000} stroke="#0369A1" strokeDasharray="4 4" label={{ value:'Objectif 2L', fill:'#0369A1', fontSize:10, position:'insideTopRight' }} />
            <Bar dataKey="eau_ml" name="Eau" fill="#38BDF8" radius={[3,3,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── CONSTANTES REPAS ──────────────────────────────────────────────────────── */
const REPAS_LABELS = {
  petit_dejeuner: '🌅 Petit-déjeuner',
  collation_matin: '🍎 Collation matin',
  dejeuner: '🍽️ Déjeuner',
  collation_soir: '🥜 Collation soir',
  diner: '🌙 Dîner',
};

/* ── QUOTA IA BADGE ────────────────────────────────────────────────────────── */
function IaQuotaBadge({ quota }) {
  if (!quota) return null;
  const { utilise, quota: total, restant } = quota;
  const pct = total > 0 ? Math.min(100, (utilise / total) * 100) : 0;
  const low = restant <= Math.max(1, Math.round(total * 0.2));
  const out = restant === 0;
  const color = out ? '#dc2626' : low ? '#ca8a04' : '#16a34a';
  const bg    = out ? '#fee2e2' : low ? '#fef9c3' : '#dcfce7';
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:10, padding:'8px 12px',
      background:bg, borderRadius:10, marginBottom:14, fontSize:12,
    }}>
      <span style={{ fontSize:16 }}>🪙</span>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, color }}>
          {out
            ? `Quota IA atteint : ${utilise}/${total} ce mois-ci`
            : `${restant} génération${restant>1?'s':''} IA restante${restant>1?'s':''} ce mois (${utilise}/${total})`}
        </div>
        <div style={{
          height:4, background:'rgba(0,0,0,0.08)', borderRadius:2, marginTop:4, overflow:'hidden',
        }}>
          <div style={{ width:`${pct}%`, height:'100%', background:color }} />
        </div>
      </div>
    </div>
  );
}

/* ── MODAL GÉNÉRATION IA ───────────────────────────────────────────────────── */
function PlanIaModal({ clientId, client, onClose, onSaved }) {
  const { user, updateUser }        = useAuth();
  const [step, setStep]             = useState('params'); // params | loading | result
  const [params, setParams]         = useState({ objectif:'equilibre', kcal_cible:'', restrictions:'', nb_jours:5 });
  const [plan, setPlan]             = useState(null);
  const [err, setErr]               = useState('');
  const [saving, setSaving]         = useState(false);
  const [savedOk, setSavedOk]       = useState(false);
  const [savePhase, setSavePhase]   = useState(0); // 0=idle 1=plan 2=recettes 3=assignation 4=ok
  const [activeDay, setActiveDay]   = useState(0);

  const SAVE_PHASES = [
    { icon:'📋', label:'Création du plan alimentaire…' },
    { icon:'🍽️', label:'Association des recettes…' },
    { icon:'👤', label:'Assignation au client…' },
    { icon:'✅', label:'Plan assigné avec succès !' },
  ];

  const generer = async () => {
    setStep('loading'); setErr('');
    try {
      const result = await api.clients.genererPlanIa(clientId, {
        ...params,
        kcal_cible: params.kcal_cible ? Number(params.kcal_cible) : undefined,
        nb_jours: Number(params.nb_jours),
      });
      if (result._quota) updateUser({ ia_quota: result._quota });
      if (result._cached) toast('♻️ Résultat depuis le cache (gratuit, dans les 24h)');
      setPlan(result);
      setStep('result');
    } catch (e) {
      setErr(e.message || 'Erreur lors de la génération');
      setStep('params');
    }
  };

  const sauvegarder = async () => {
    setSaving(true); setSavePhase(1); setErr('');
    const t1 = setTimeout(() => setSavePhase(2), 600);
    const t2 = setTimeout(() => setSavePhase(3), 1200);
    try {
      await api.clients.sauvegarderPlanIa(clientId, plan);
      clearTimeout(t1); clearTimeout(t2);
      setSavePhase(4);
      setSavedOk(true);
      onSaved && onSaved();
    } catch (e) {
      clearTimeout(t1); clearTimeout(t2);
      setErr(e.message || 'Erreur lors de la sauvegarde');
      setSaving(false); setSavePhase(0);
    }
  };

  const OBJECTIFS = [
    { val:'perte_poids', label:'Perte de poids', icon:'🔥', desc:'Déficit calorique, protéines élevées' },
    { val:'equilibre',   label:'Équilibre',       icon:'⚖️', desc:'Maintien du poids, nutrition complète' },
    { val:'prise_masse', label:'Prise de masse',  icon:'💪', desc:'Surplus calorique, favorise la croissance musculaire' },
  ];

  return (
    <div className="ov" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: step==='result' ? 760 : 480 }}>

        {/* Header */}
        <div className="mhd">
          <div>
            <div className="mttl">✨ Générer un plan alimentaire avec l'IA</div>
            {step==='result' && plan && <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>{plan.description}</div>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--t3)', lineHeight:1 }}>×</button>
        </div>

        <div className="mbd">
          {/* ── ÉTAPE PARAMS ─────────────────────────────────────────────── */}
          {step === 'params' && (<>
            <IaQuotaBadge quota={user?.ia_quota} />
            <div className="fg">
              <div className="fl">Objectif nutritionnel</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {OBJECTIFS.map(o => (
                  <button key={o.val} onClick={() => setParams(p => ({...p, objectif:o.val}))}
                    style={{
                      border:`2px solid ${params.objectif===o.val ? 'var(--acc)' : 'var(--bdr)'}`,
                      borderRadius:10, padding:'10px 8px', cursor:'pointer', textAlign:'center',
                      background: params.objectif===o.val ? 'var(--acc2)' : 'var(--bg)',
                      transition:'all .15s',
                    }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>{o.icon}</div>
                    <div style={{ fontSize:12, fontWeight:700, color: params.objectif===o.val ? 'var(--acc3)' : 'var(--t1)' }}>{o.label}</div>
                    <div style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="fr2">
              <div className="fg">
                <label className="fl">Calories cibles / jour (optionnel)</label>
                <input className="fi" type="number" placeholder="Auto-calculé selon le profil"
                  value={params.kcal_cible} onChange={e => setParams(p => ({...p, kcal_cible:e.target.value}))} />
                <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>Laissez vide pour un calcul automatique</div>
              </div>
              <div className="fg">
                <label className="fl">Nombre de jours</label>
                <select className="fi fsel" value={params.nb_jours} onChange={e => setParams(p => ({...p, nb_jours:e.target.value}))}>
                  <option value={1}>1 jour</option>
                  <option value={3}>3 jours</option>
                  <option value={5}>5 jours (Lun–Ven)</option>
                  <option value={7}>7 jours (semaine complète)</option>
                </select>
              </div>
            </div>

            <div className="fg mb0">
              <label className="fl">Restrictions supplémentaires (optionnel)</label>
              <input className="fi" placeholder="Ex: sans lactose, halal, allergique aux fruits à coque…"
                value={params.restrictions} onChange={e => setParams(p => ({...p, restrictions:e.target.value}))} />
            </div>

            {err && <div style={{ marginTop:14, padding:'10px 12px', background:'var(--red-bg)', color:'var(--red)', borderRadius:8, fontSize:13 }}>{err}</div>}
          </>)}

          {/* ── ÉTAPE LOADING ────────────────────────────────────────────── */}
          {step === 'loading' && (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:48, marginBottom:16, animation:'spin 2s linear infinite', display:'inline-block' }}>✨</div>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Claude génère votre plan…</div>
              <div style={{ color:'var(--t3)', fontSize:13 }}>Analyse du profil client, sélection des recettes et équilibrage des macros en cours…</div>
              <div style={{ marginTop:24 }}><div className="spin" style={{ margin:'0 auto' }} /></div>
            </div>
          )}

          {/* ── ÉTAPE RESULT ─────────────────────────────────────────────── */}
          {step === 'result' && plan && (<>

            {/* Bandeau progression sauvegarde */}
            {saving && !savedOk && (
              <div style={{ background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:12, padding:'14px 18px', marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#4c1d95', marginBottom:10 }}>Sauvegarde en cours…</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {SAVE_PHASES.slice(0, 3).map((ph, i) => {
                    const done    = savePhase > i + 1;
                    const active  = savePhase === i + 1;
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, opacity: done || active ? 1 : 0.35, transition:'opacity .3s' }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                          background: done ? '#059669' : active ? '#7c3aed' : 'var(--bdr)',
                          transition:'background .3s',
                        }}>
                          {done
                            ? <span style={{ color:'#fff', fontSize:12 }}>✓</span>
                            : active
                              ? <div style={{ width:10, height:10, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'rot .6s linear infinite' }} />
                              : <span style={{ color:'var(--t3)', fontSize:11 }}>{i+1}</span>
                          }
                        </div>
                        <span style={{ fontSize:13, fontWeight: active ? 600 : 500, color: done ? '#059669' : active ? '#4c1d95' : 'var(--t3)' }}>
                          {ph.icon} {ph.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {savedOk && (
              <div style={{ background:'var(--acc2)', border:'1px solid #6ee7b7', borderRadius:12, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#059669', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ color:'#fff', fontSize:18 }}>✓</span>
                </div>
                <div>
                  <div style={{ fontWeight:700, color:'var(--acc3)', fontSize:14 }}>Plan sauvegardé et assigné !</div>
                  <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>Le client verra ce plan dans son portail dès maintenant.</div>
                </div>
              </div>
            )}

            {/* Macros cibles */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:20 }}>
              {[
                { label:'Calories', val:`${plan.kcal_cible} kcal`, color:'#065f46', bg:'#ecfdf5' },
                { label:'Protéines', val:`${plan.proteines_g}g`, color:'#1e40af', bg:'#eff6ff' },
                { label:'Glucides', val:`${plan.glucides_g}g`, color:'#92400e', bg:'#fffbeb' },
                { label:'Lipides', val:`${plan.lipides_g}g`, color:'#991b1b', bg:'#fef2f2' },
              ].map(m => (
                <div key={m.label} style={{ background:m.bg, borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:11, fontWeight:600, color:m.color, marginBottom:4, textTransform:'uppercase', letterSpacing:'.4px' }}>{m.label}</div>
                  <div style={{ fontSize:17, fontWeight:800, color:m.color }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Sélecteur de jour */}
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:16 }}>
              {plan.jours.map((j, i) => (
                <button key={i} onClick={() => setActiveDay(i)}
                  className={`btn btn-sm ${activeDay===i ? 'btn-p' : 'btn-s'}`}>
                  {j.jour}
                </button>
              ))}
            </div>

            {/* Repas du jour actif */}
            {plan.jours[activeDay] && (<>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <div style={{ fontWeight:700, fontSize:15 }}>{plan.jours[activeDay].jour}</div>
                <div style={{ fontSize:12, color:'var(--t3)' }}>
                  Total : <strong style={{ color:'var(--t1)' }}>{plan.jours[activeDay].total_calories} kcal</strong>
                  {' · '}P {plan.jours[activeDay].total_proteines_g}g
                  {' · '}G {plan.jours[activeDay].total_glucides_g}g
                  {' · '}L {plan.jours[activeDay].total_lipides_g}g
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {plan.jours[activeDay].repas.map((r, ri) => (
                  <div key={ri} style={{
                    display:'flex', alignItems:'center', gap:12,
                    background:'var(--bg)', borderRadius:10, padding:'10px 14px',
                    border:'1px solid var(--bdr)',
                  }}>
                    <div style={{ fontSize:20, width:32, textAlign:'center', flexShrink:0 }}>
                      {r.type_repas==='petit_dejeuner' ? '🌅' : r.type_repas==='dejeuner' ? '🍽️' : r.type_repas==='diner' ? '🌙' : r.type_repas==='collation_matin' ? '🍎' : '🥜'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:11, fontWeight:600, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.4px' }}>
                        {REPAS_LABELS[r.type_repas] || r.type_repas}
                      </div>
                      <div style={{ fontWeight:600, fontSize:13, marginTop:2 }}>{r.nom_recette}</div>
                    </div>
                  </div>
                ))}
              </div>

              {err && <div style={{ marginTop:14, padding:'10px 12px', background:'var(--red-bg)', color:'var(--red)', borderRadius:8, fontSize:13 }}>{err}</div>}
            </>)}
          </>)}
        </div>

        {/* Footer */}
        <div className="mft">
          {step === 'params' && (<>
            <button className="btn btn-s" onClick={onClose}>Annuler</button>
            <button className="btn btn-p" onClick={generer} disabled={user?.ia_quota?.restant === 0}>
              {user?.ia_quota?.restant === 0 ? '🔒 Quota IA épuisé' : '✨ Générer le plan'}
            </button>
          </>)}
          {step === 'result' && !savedOk && (<>
            <button className="btn btn-s" onClick={() => { setStep('params'); setPlan(null); }} disabled={saving}>← Modifier</button>
            <button className="btn btn-p" onClick={sauvegarder} disabled={saving}
              style={{ background: saving ? 'var(--t3)' : undefined, cursor: saving ? 'not-allowed' : 'pointer', minWidth:220, justifyContent:'center' }}>
              {saving
                ? <><div className="spin" style={{ width:14, height:14, borderWidth:2 }} /> {SAVE_PHASES[savePhase - 1]?.label || 'Sauvegarde…'}</>
                : '💾 Sauvegarder & assigner au client'
              }
            </button>
          </>)}
          {step === 'result' && savedOk && (
            <button className="btn btn-p" onClick={onClose}>Fermer</button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── ONGLET NUTRITION CLIENT ───────────────────────────────────────────────── */
/* ── MODAL GÉNÉRATION PROGRAMME IA ────────────────────────────────────────── */
function ProgrammeIaModal({ clientId, client, onClose, onSaved }) {
  const { user, updateUser }      = useAuth();
  const [step, setStep]           = useState('params');
  const [params, setParams]       = useState({ objectif:'force', seances_par_semaine:3, duree_semaines:8, materiel:'salle_complete', notes:'' });
  const [prog, setProg]           = useState(null);
  const [err, setErr]             = useState('');
  const [saving, setSaving]       = useState(false);
  const [savedOk, setSavedOk]     = useState(false);
  const [savePhase, setSavePhase] = useState(0);
  const [activeDay, setActiveDay] = useState(0);
  const [asTemplate, setAsTemplate] = useState(false);

  const OBJECTIFS = [
    { val:'force',        label:'Force',         icon:'🏋️', desc:'Musculation & gains de force' },
    { val:'perte_poids',  label:'Perte de poids',icon:'🔥', desc:'Circuit training, cardio-muscu' },
    { val:'remise_forme', label:'Remise en forme',icon:'⚡', desc:'Équilibre fitness & bien-être' },
    { val:'cardio',       label:'Cardio',         icon:'🏃', desc:'Endurance & capacité cardio' },
  ];
  const MATERIELS = [
    { val:'salle_complete', label:'Salle complète', icon:'🏢' },
    { val:'halteres',       label:'Haltères & banc', icon:'🏠' },
    { val:'poids_corps',    label:'Poids du corps',  icon:'🌿' },
  ];
  const SAVE_PHASES = [
    { icon:'📋', label:'Création du programme…' },
    { icon:'📅', label:'Création des séances…' },
    { icon:'👤', label:'Assignation au client…' },
  ];

  const generer = async () => {
    setStep('loading'); setErr('');
    try {
      const result = await api.clients.genererProgrammeIa(clientId, params);
      if (result._quota) updateUser({ ia_quota: result._quota });
      if (result._cached) toast('♻️ Résultat depuis le cache (gratuit, dans les 24h)');
      setProg(result); setStep('result'); setActiveDay(0);
    } catch (e) {
      setErr(e.message || 'Erreur lors de la génération');
      setStep('params');
    }
  };

  const sauvegarder = async () => {
    setSaving(true); setSavePhase(1); setErr('');
    const t1 = setTimeout(() => setSavePhase(2), 700);
    const t2 = setTimeout(() => setSavePhase(3), 1400);
    try {
      await api.clients.sauvegarderProgrammeIa(clientId, { ...prog, as_template: asTemplate });
      clearTimeout(t1); clearTimeout(t2);
      setSavePhase(4); setSavedOk(true);
      onSaved && onSaved();
    } catch (e) {
      clearTimeout(t1); clearTimeout(t2);
      setErr(e.message || 'Erreur lors de la sauvegarde');
      setSaving(false); setSavePhase(0);
    }
  };

  const sp = (k, v) => setParams(p => ({ ...p, [k]: v }));

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: step === 'result' ? 700 : 500 }}>

        <div className="mhd">
          <div>
            <div className="mttl">✨ Générer un programme d'entraînement avec l'IA</div>
            {step === 'result' && prog && <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>{prog.description}</div>}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--t3)' }}>×</button>
        </div>

        <div className="mbd">

          {/* ── PARAMS ── */}
          {step === 'params' && (<>
            <IaQuotaBadge quota={user?.ia_quota} />
            <div className="fg">
              <div className="fl">Objectif</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {OBJECTIFS.map(o => (
                  <button key={o.val} onClick={() => sp('objectif', o.val)} style={{
                    border:`2px solid ${params.objectif===o.val ? 'var(--acc)' : 'var(--bdr)'}`,
                    borderRadius:10, padding:'10px 8px', cursor:'pointer', textAlign:'center',
                    background: params.objectif===o.val ? 'var(--acc2)' : 'var(--bg)',
                  }}>
                    <div style={{ fontSize:22, marginBottom:4 }}>{o.icon}</div>
                    <div style={{ fontSize:12, fontWeight:700, color: params.objectif===o.val ? 'var(--acc3)' : 'var(--t1)' }}>{o.label}</div>
                    <div style={{ fontSize:10, color:'var(--t3)', marginTop:2 }}>{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="fg">
              <div className="fl">Matériel disponible</div>
              <div style={{ display:'flex', gap:8 }}>
                {MATERIELS.map(m => (
                  <button key={m.val} onClick={() => sp('materiel', m.val)} style={{
                    flex:1, border:`2px solid ${params.materiel===m.val ? 'var(--acc)' : 'var(--bdr)'}`,
                    borderRadius:10, padding:'8px 6px', cursor:'pointer', textAlign:'center',
                    background: params.materiel===m.val ? 'var(--acc2)' : 'var(--bg)',
                  }}>
                    <div style={{ fontSize:18, marginBottom:4 }}>{m.icon}</div>
                    <div style={{ fontSize:11, fontWeight:600, color: params.materiel===m.val ? 'var(--acc3)' : 'var(--t1)' }}>{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="fr2">
              <div className="fg">
                <label className="fl">Séances / semaine</label>
                <select className="fi fsel" value={params.seances_par_semaine} onChange={e => sp('seances_par_semaine', Number(e.target.value))}>
                  {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} séances</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Durée du programme</label>
                <select className="fi fsel" value={params.duree_semaines} onChange={e => sp('duree_semaines', Number(e.target.value))}>
                  {[4,6,8,10,12,16].map(n => <option key={n} value={n}>{n} semaines</option>)}
                </select>
              </div>
            </div>

            <div className="fg mb0">
              <label className="fl">Notes / contraintes supplémentaires (optionnel)</label>
              <input className="fi" placeholder="Ex: focus bras, éviter les sauts, pas de squat…"
                value={params.notes} onChange={e => sp('notes', e.target.value)} />
            </div>

            {err && <div style={{ marginTop:12, padding:'10px 12px', background:'var(--red-bg)', color:'var(--red)', borderRadius:8, fontSize:13 }}>{err}</div>}
          </>)}

          {/* ── LOADING ── */}
          {step === 'loading' && (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✨</div>
              <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Claude génère votre programme…</div>
              <div style={{ color:'var(--t3)', fontSize:13 }}>Analyse du profil, sélection des exercices et équilibrage de la semaine en cours…</div>
              <div style={{ marginTop:24 }}><div className="spin" style={{ margin:'0 auto' }} /></div>
            </div>
          )}

          {/* ── RESULT ── */}
          {step === 'result' && prog && (<>

            {saving && !savedOk && (
              <div style={{ background:'#f5f3ff', border:'1px solid #c4b5fd', borderRadius:12, padding:'14px 18px', marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:13, color:'#4c1d95', marginBottom:10 }}>Sauvegarde en cours…</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {SAVE_PHASES.map((ph, i) => {
                    const done = savePhase > i + 1, active = savePhase === i + 1;
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:10, opacity: done || active ? 1 : 0.35 }}>
                        <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                          background: done ? '#059669' : active ? '#7c3aed' : 'var(--bdr)' }}>
                          {done ? <span style={{ color:'#fff', fontSize:12 }}>✓</span>
                            : active ? <div style={{ width:10, height:10, border:'2px solid #fff', borderTopColor:'transparent', borderRadius:'50%', animation:'rot .6s linear infinite' }} />
                            : <span style={{ color:'var(--t3)', fontSize:11 }}>{i+1}</span>}
                        </div>
                        <span style={{ fontSize:13, fontWeight: active ? 600 : 500, color: done ? '#059669' : active ? '#4c1d95' : 'var(--t3)' }}>
                          {ph.icon} {ph.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {savedOk && (
              <div style={{ background:'var(--acc2)', border:'1px solid #6ee7b7', borderRadius:12, padding:'14px 18px', marginBottom:16, display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'#059669', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ color:'#fff', fontSize:18 }}>✓</span>
                </div>
                <div>
                  <div style={{ fontWeight:700, color:'var(--acc3)', fontSize:14 }}>Programme sauvegardé et assigné !</div>
                  <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>Le client le verra dans son portail dès maintenant.</div>
                </div>
              </div>
            )}

            {/* Infos programme */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
              {[
                { label:'Durée',    val:`${prog.duree_semaines} semaines`, color:'#065f46', bg:'#ecfdf5' },
                { label:'Séances',  val:`${prog.seances_par_semaine}×/sem`, color:'#1e40af', bg:'#eff6ff' },
                { label:'Exercices',val:`${prog.jours?.reduce((s,j)=>s+(j.exercices?.length||0),0)||0} au total`, color:'#92400e', bg:'#fffbeb' },
              ].map(m => (
                <div key={m.label} style={{ background:m.bg, borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                  <div style={{ fontSize:10, fontWeight:600, color:m.color, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:4 }}>{m.label}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:m.color }}>{m.val}</div>
                </div>
              ))}
            </div>

            {/* Sélecteur jour */}
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:14 }}>
              {prog.jours.map((j, i) => (
                <button key={i} onClick={() => setActiveDay(i)}
                  className={`btn btn-sm ${activeDay===i ? 'btn-p' : 'btn-s'}`}>{j.jour}</button>
              ))}
            </div>

            {/* Détail du jour actif */}
            {prog.jours[activeDay] && (() => {
              const jour = prog.jours[activeDay];
              return (
                <div>
                  <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:'var(--t2)' }}>{jour.titre}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {jour.exercices.map((ex, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:12, background:'var(--bg)', borderRadius:10, padding:'10px 14px', border:'1px solid var(--bdr)' }}>
                        <div style={{ width:26, height:26, borderRadius:6, background:'var(--acc2)', color:'var(--acc3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{i+1}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, fontSize:13 }}>{ex.nom}</div>
                          <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>
                            {ex.series} séries × {ex.reps}
                            {ex.repos_sec ? ` · repos ${ex.repos_sec}s` : ''}
                            {ex.notes ? ` · ${ex.notes}` : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {prog.conseils && (
              <div style={{ marginTop:16, background:'#fffbeb', borderLeft:'3px solid #f59e0b', borderRadius:6, padding:'10px 14px', fontSize:13, color:'#92400e' }}>
                💡 {prog.conseils}
              </div>
            )}

            {!savedOk && (
              <label style={{ display:'flex', alignItems:'center', gap:10, marginTop:16, cursor:'pointer', padding:'10px 14px', background:'var(--bg)', borderRadius:10, border:`1px solid ${asTemplate ? 'var(--acc)' : 'var(--bdr)'}` }}>
                <input type="checkbox" checked={asTemplate} onChange={e => setAsTemplate(e.target.checked)} style={{ width:16, height:16, accentColor:'var(--acc)', flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color: asTemplate ? 'var(--acc3)' : 'var(--t1)' }}>📋 Sauvegarder aussi comme template réutilisable</div>
                  <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>Retrouvez-le dans la bibliothèque pour l'assigner rapidement à d'autres clients ayant un profil similaire.</div>
                </div>
              </label>
            )}

            {err && <div style={{ marginTop:12, padding:'10px 12px', background:'var(--red-bg)', color:'var(--red)', borderRadius:8, fontSize:13 }}>{err}</div>}
          </>)}
        </div>

        <div className="mft">
          {step === 'params' && (<>
            <button className="btn btn-s" onClick={onClose}>Annuler</button>
            <button className="btn btn-p" onClick={generer} disabled={user?.ia_quota?.restant === 0}>
              {user?.ia_quota?.restant === 0 ? '🔒 Quota IA épuisé' : '✨ Générer le programme'}
            </button>
          </>)}
          {step === 'result' && !savedOk && (<>
            <button className="btn btn-s" onClick={() => { setStep('params'); setProg(null); }} disabled={saving}>← Modifier</button>
            <button className="btn btn-p" onClick={sauvegarder} disabled={saving} style={{ minWidth:230, justifyContent:'center' }}>
              {saving
                ? <><div className="spin" style={{ width:14, height:14, borderWidth:2 }} /> {SAVE_PHASES[savePhase-1]?.label || 'Sauvegarde…'}</>
                : '💾 Sauvegarder & assigner au client'}
            </button>
          </>)}
          {step === 'result' && savedOk && <button className="btn btn-p" onClick={onClose}>Fermer</button>}
        </div>
      </div>
    </div>
  );
}

function TemplatePicker({ clientId, onClose, onDone }) {
  const [templates, setTemplates] = useState(null);
  const [busy, setBusy]           = useState(false);
  const [selected, setSelected]   = useState(null);

  useEffect(() => {
    api.programmes.templates().then(setTemplates).catch(() => setTemplates([]));
  }, []);

  const CAT_LABELS = { force:'Force', perte_poids:'Perte de poids', remise_forme:'Remise en forme', cardio:'Cardio', mobilite:'Mobilité', custom:'Autre' };

  const assigner = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.programmes.assigner(selected, { client_id: clientId, date_debut: new Date().toISOString().slice(0,10) });
      toast('Programme assigné !'); onDone();
    } catch (e) { toast(e.message, 'err'); setBusy(false); }
  };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:560 }}>
        <div className="mhd">
          <div className="mttl">📋 Choisir un template de programme</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--t3)' }}>×</button>
        </div>
        <div className="mbd">
          {!templates && <div style={{ textAlign:'center', padding:32 }}><div className="spin" style={{ margin:'0 auto' }} /></div>}
          {templates && templates.length === 0 && (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
              <div style={{ fontWeight:600, marginBottom:8 }}>Aucun template disponible</div>
              <div style={{ fontSize:13, color:'var(--t3)' }}>Générez un programme avec l'IA et cochez "Sauvegarder comme template" pour en créer un.</div>
            </div>
          )}
          {templates && templates.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {templates.map(t => (
                <button key={t.id} onClick={() => setSelected(t.id)} style={{
                  display:'flex', alignItems:'center', gap:14, padding:'12px 16px',
                  borderRadius:12, border:`2px solid ${selected===t.id ? 'var(--acc)' : 'var(--bdr)'}`,
                  background: selected===t.id ? 'var(--acc2)' : 'var(--bg)', cursor:'pointer', textAlign:'left',
                }}>
                  <div style={{ width:40, height:40, borderRadius:10, background: selected===t.id ? 'var(--acc)' : 'var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>🏋️</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, color: selected===t.id ? 'var(--acc3)' : 'var(--t1)' }}>{t.nom}</div>
                    <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>
                      {CAT_LABELS[t.categorie] || t.categorie} · {t.duree_semaines} sem · {t.seances_par_semaine}×/sem
                      {t.genere_par_ia && <span style={{ marginLeft:6, background:'#f5f3ff', color:'#7c3aed', padding:'1px 6px', borderRadius:4, fontSize:11 }}>✨ IA</span>}
                    </div>
                  </div>
                  {selected===t.id && <span style={{ color:'var(--acc3)', fontSize:18 }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mft">
          <button className="btn btn-s" onClick={onClose}>Annuler</button>
          <button className="btn btn-p" onClick={assigner} disabled={!selected || busy}>{busy ? 'Assignation…' : '📋 Assigner ce template'}</button>
        </div>
      </div>
    </div>
  );
}

function ClientProgrammeTab({ client, clientId, onIaOpen, onRefresh }) {
  const prog = client.programme_actif;
  const [showPicker, setShowPicker] = useState(false);

  const handleTemplateAssigned = () => { setShowPicker(false); onRefresh && onRefresh(); };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {showPicker && <TemplatePicker clientId={clientId} onClose={() => setShowPicker(false)} onDone={handleTemplateAssigned} />}

      {/* Programme actif */}
      {prog ? (
        <div className="card">
          <div className="card-t" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            Programme actif
            <div style={{ display:'flex', gap:6 }}>
              <button className="btn btn-s btn-sm" onClick={() => setShowPicker(true)}>📋 Template</button>
              <button className="btn btn-p btn-sm" onClick={onIaOpen}>✨ Nouveau IA</button>
            </div>
          </div>

          <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:12, marginBottom:16 }}>
            {[
              { label:'Programme',   val: prog.nom },
              { label:'Semaine',     val: `${prog.semaine_courante} / ${prog.duree_semaines}` },
              { label:'Séances',     val: `${prog.seances_realisees} / ${prog.seances_total}` },
            ].map(kpi => (
              <div key={kpi.label} style={{ flex:'1 1 120px', background:'var(--bg)', borderRadius:10, padding:'10px 14px', minWidth:110 }}>
                <div style={{ fontSize:11, color:'var(--t3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.4px', marginBottom:4 }}>{kpi.label}</div>
                <div style={{ fontSize:15, fontWeight:800, color:'var(--t1)' }}>{kpi.val}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom:6, display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--t3)' }}>
            <span>Progression globale</span>
            <span style={{ fontWeight:700, color:'var(--acc3)' }}>{prog.progression_pct}%</span>
          </div>
          <div style={{ height:8, background:'var(--bdr)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'var(--acc)', borderRadius:4, width:`${prog.progression_pct}%`, transition:'width .4s' }} />
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign:'center', padding:'50px 20px' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🏋️</div>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:8 }}>Aucun programme actif</div>
          <div style={{ fontSize:13, color:'var(--t3)', marginBottom:24 }}>
            Générez un programme personnalisé avec l'IA ou assignez un template existant.
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
            <button className="btn btn-s" onClick={() => setShowPicker(true)}>📋 Utiliser un template</button>
            <button className="btn btn-p" onClick={onIaOpen}>✨ Générer avec l'IA</button>
          </div>
        </div>
      )}

      {/* Infos client utiles */}
      <div className="card">
        <div className="card-t">Profil sportif du client</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:10, marginTop:12 }}>
          {[
            { label:'Niveau', val: client.niveau || '—' },
            { label:'Objectifs', val: (client.objectifs || []).join(', ') || '—' },
            { label:'Blessures', val: client.blessures || 'Aucune' },
            { label:'Taille', val: client.taille_cm ? `${client.taille_cm} cm` : '—' },
            { label:'Poids actuel', val: client.poids_depart_kg ? `${client.poids_depart_kg} kg` : '—' },
            { label:'Poids cible', val: client.poids_cible_kg ? `${client.poids_cible_kg} kg` : '—' },
          ].map(item => (
            <div key={item.label} style={{ background:'var(--bg)', borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:11, color:'var(--t3)', fontWeight:600, marginBottom:3 }}>{item.label}</div>
              <div style={{ fontSize:13, fontWeight:600 }}>{item.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const BADGE_CAT_LABELS_COACH = {
  assiduite: 'Assiduité', regularite: 'Régularité', suivi: 'Suivi',
  nutrition: 'Nutrition', objectifs: 'Objectifs', special: 'Spéciaux',
};
const BADGE_CAT_ORDER_COACH = ['assiduite','regularite','suivi','nutrition','objectifs','special'];

function ClientBadgesTab({ clientId }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.gamification.coachClient(clientId).then(setData).catch(() => setData({ badges:[], streaks:{} }));
  }, [clientId]);

  if (!data) return <Loader />;

  const { badges, streaks } = data;
  const acquis = badges.filter(b => b.acquis).length;
  const grouped = BADGE_CAT_ORDER_COACH.map(cat => ({
    cat, label: BADGE_CAT_LABELS_COACH[cat],
    items: badges.filter(b => b.categorie === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div>
      {/* Stats streaks */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10, marginBottom:18 }}>
        <div style={{ background:'linear-gradient(135deg, #f97316, #ea580c)', borderRadius:12, padding:'14px 16px', color:'#fff' }}>
          <div style={{ fontSize:10, fontWeight:700, opacity:.9, textTransform:'uppercase', letterSpacing:'.5px' }}>🔥 Streak actif</div>
          <div style={{ fontSize:26, fontWeight:900, marginTop:6 }}>{streaks.streak_actif || 0}<span style={{ fontSize:12, opacity:.85, marginLeft:4 }}>jours</span></div>
          <div style={{ fontSize:11, opacity:.85, marginTop:2 }}>Record : {streaks.best_streak_actif || 0} j</div>
        </div>
        <div style={{ background:'linear-gradient(135deg, #059669, #047857)', borderRadius:12, padding:'14px 16px', color:'#fff' }}>
          <div style={{ fontSize:10, fontWeight:700, opacity:.9, textTransform:'uppercase', letterSpacing:'.5px' }}>💪 Séances d'affilée</div>
          <div style={{ fontSize:26, fontWeight:900, marginTop:6 }}>{streaks.streak_seances || 0}</div>
          <div style={{ fontSize:11, opacity:.85, marginTop:2 }}>Sans absence</div>
        </div>
        <div style={{ background:'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius:12, padding:'14px 16px', color:'#fff' }}>
          <div style={{ fontSize:10, fontWeight:700, opacity:.9, textTransform:'uppercase', letterSpacing:'.5px' }}>🏆 Succès</div>
          <div style={{ fontSize:26, fontWeight:900, marginTop:6 }}>{acquis}<span style={{ fontSize:14, opacity:.85, marginLeft:3 }}>/{badges.length}</span></div>
          <div style={{ fontSize:11, opacity:.85, marginTop:2 }}>débloqués</div>
        </div>
      </div>

      {/* Liste des badges par catégorie */}
      {grouped.map(g => (
        <div key={g.cat} className="card" style={{ marginBottom:14 }}>
          <div className="card-t">{g.label}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(150px, 1fr))', gap:10, marginTop:12 }}>
            {g.items.map(b => (
              <div key={b.slug} style={{
                background: b.acquis ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'var(--bg)',
                border: `1px solid ${b.acquis ? '#fbbf24' : 'var(--bdr)'}`,
                borderRadius: 10, padding:'12px 10px', textAlign:'center',
                opacity: b.acquis ? 1 : 0.65,
              }}>
                <div style={{ fontSize:30, marginBottom:4, filter: b.acquis ? 'none' : 'grayscale(1)' }}>{b.icone}</div>
                <div style={{ fontSize:12, fontWeight:700, color: b.acquis ? '#92400e' : 'var(--t2)', marginBottom:3 }}>{b.nom}</div>
                <div style={{ fontSize:10, color:'var(--t3)', lineHeight:1.4, marginBottom:5 }}>{b.description}</div>
                {b.acquis ? (
                  <div style={{ fontSize:10, fontWeight:700, color:'#065f46' }}>✓ {new Date(b.obtenu_le).toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}</div>
                ) : (
                  <>
                    <div style={{ height:4, background:'var(--bdr)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${b.progression*100}%`, background:'var(--acc)' }} />
                    </div>
                    <div style={{ fontSize:10, color:'var(--t3)', marginTop:3 }}>{Math.round(b.progression*100)}%</div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const REPAS_ICONS = { petit_dejeuner:'🌅', collation_matin:'🍎', dejeuner:'🍽️', collation_soir:'🥜', diner:'🌙' };
const REPAS_ORDER_LIST = ['petit_dejeuner','collation_matin','dejeuner','collation_soir','diner'];

function ClientPlansTab({ plans, err, onGenerate, onRefresh }) {
  const [expanded, setExpanded] = useState(null);
  const [expandedDay, setExpandedDay] = useState({});

  if (err) return (
    <div style={{ textAlign:'center', padding:40 }}>
      <div style={{ fontSize:32, marginBottom:8 }}>⚠️</div>
      <div style={{ color:'var(--t2)', fontWeight:600 }}>{err}</div>
      <button className="btn btn-s btn-sm" style={{ marginTop:12 }} onClick={onRefresh}>Réessayer</button>
    </div>
  );

  if (!plans) return <div className="ldr"><div className="spin" /></div>;

  if (plans.length === 0) return (
    <div style={{ textAlign:'center', padding:'48px 20px' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🥗</div>
      <div style={{ fontWeight:700, fontSize:15, marginBottom:6, color:'var(--t2)' }}>Aucun plan alimentaire assigné</div>
      <div style={{ fontSize:13, color:'var(--t3)', marginBottom:20 }}>Générez un plan personnalisé avec l'IA ou créez-en un manuellement.</div>
      <button className="btn btn-sm" onClick={onGenerate}
        style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff', border:'none', boxShadow:'0 2px 8px rgba(124,58,237,.3)' }}>
        ✨ Générer un plan avec l'IA
      </button>
    </div>
  );

  const toggleDay = (planId, jour) => {
    setExpandedDay(prev => ({ ...prev, [`${planId}-${jour}`]: !prev[`${planId}-${jour}`] }));
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {plans.map(plan => {
        const isOpen = expanded === plan.id;
        return (
          <div key={plan.id} style={{
            background:'var(--bg2)', border:`2px solid ${plan.actif ? 'var(--acc)' : 'var(--bdr)'}`,
            borderRadius:14, overflow:'hidden', boxShadow: plan.actif ? '0 4px 16px rgba(22,163,127,.1)' : 'var(--sh)',
            transition:'box-shadow .2s',
          }}>
            {/* Header du plan */}
            <div style={{ padding:'14px 18px', display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
              onClick={() => setExpanded(isOpen ? null : plan.id)}>
              <div style={{
                width:42, height:42, borderRadius:10, flexShrink:0,
                background: plan.actif ? 'linear-gradient(135deg,#d1fae5,#6ee7b7)' : 'var(--bg3)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
              }}>🥗</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontWeight:700, fontSize:14 }}>{plan.nom}</span>
                  {plan.actif
                    ? <span className="tag tg">✓ Actif</span>
                    : <span className="tag tgr">Archivé</span>
                  }
                </div>
                <div style={{ fontSize:12, color:'var(--t3)', marginTop:3 }}>
                  Depuis le {new Date(plan.date_debut).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
                  {' · '}{plan.jours?.length || 0} jour{(plan.jours?.length || 0) > 1 ? 's' : ''}
                  {plan.objectif_calories ? ` · ${plan.objectif_calories} kcal/j` : ''}
                </div>
              </div>
              {/* Macros résumées */}
              {plan.objectif_calories > 0 && (
                <div className="plan-hdr-macros" style={{ display:'flex', gap:8, flexShrink:0 }}>
                  {[
                    { l:'P', v:plan.objectif_proteines_g, c:'#1e40af', bg:'#eff6ff' },
                    { l:'G', v:plan.objectif_glucides_g,  c:'#92400e', bg:'#fffbeb' },
                    { l:'L', v:plan.objectif_lipides_g,   c:'#991b1b', bg:'#fef2f2' },
                  ].map(m => (
                    <div key={m.l} style={{ background:m.bg, borderRadius:6, padding:'4px 8px', textAlign:'center', minWidth:46 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:m.c }}>{m.l}</div>
                      <div style={{ fontSize:12, fontWeight:800, color:m.c }}>{Math.round(m.v)}g</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ color:'var(--t3)', fontSize:18, flexShrink:0, transition:'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</div>
            </div>

            {/* Détail des jours */}
            {isOpen && plan.jours && plan.jours.length > 0 && (
              <div style={{ borderTop:'1px solid var(--bdr)', padding:'14px 18px', display:'flex', flexDirection:'column', gap:10 }}>
                {plan.jours.map((j, ji) => {
                  const dayKey = `${plan.id}-${j.jour}`;
                  const dayOpen = expandedDay[dayKey];
                  const sortedRepas = [...(j.repas || [])].sort((a,b) =>
                    REPAS_ORDER_LIST.indexOf(a.type_repas) - REPAS_ORDER_LIST.indexOf(b.type_repas)
                  );
                  // Total journalier
                  const dayTotal = sortedRepas.reduce((acc, r) => {
                    const m = r.macros_total || {};
                    return { kcal: acc.kcal + (m.calories||0), prot: acc.prot + (m.proteines||0), gluc: acc.gluc + (m.glucides||0), lip: acc.lip + (m.lipides||0) };
                  }, { kcal:0, prot:0, gluc:0, lip:0 });

                  return (
                    <div key={ji} style={{ background:'var(--bg)', borderRadius:12, overflow:'hidden', border:'1px solid var(--bdr)' }}>
                      {/* Header jour */}
                      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', cursor:'pointer' }}
                        onClick={() => toggleDay(plan.id, j.jour)}>
                        <span style={{ fontWeight:700, fontSize:13, flex:1 }}>{j.jour}</span>
                        {/* Total kcal du jour */}
                        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--acc3)', background:'var(--acc2)', padding:'2px 8px', borderRadius:20, whiteSpace:'nowrap' }}>
                            {Math.round(dayTotal.kcal)} kcal
                          </span>
                          <span className="day-macro-detail" style={{ fontSize:11, color:'var(--t3)', whiteSpace:'nowrap' }}>
                            P {Math.round(dayTotal.prot)}g · G {Math.round(dayTotal.gluc)}g · L {Math.round(dayTotal.lip)}g
                          </span>
                        </div>
                        <span style={{ color:'var(--t3)', fontSize:16, transition:'transform .2s', transform: dayOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                      </div>

                      {/* Repas du jour */}
                      {dayOpen && (
                        <div style={{ borderTop:'1px solid var(--bdr)', display:'flex', flexDirection:'column' }}>
                          {sortedRepas.map((r, ri) => {
                            const m = r.macros_total || {};
                            return (
                              <div key={ri} style={{
                                padding:'12px 16px',
                                borderBottom: ri < sortedRepas.length - 1 ? '1px solid var(--bdr)' : 'none',
                              }}>
                                {/* Label repas + macros totales */}
                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                                  <span style={{ fontSize:18 }}>{REPAS_ICONS[r.type_repas] || '🍴'}</span>
                                  <span style={{ fontWeight:700, fontSize:13, flex:1, color:'var(--t1)' }}>
                                    {REPAS_LABELS[r.type_repas] || r.type_repas}
                                  </span>
                                  <div className="repas-macros" style={{ display:'flex', gap:5 }}>
                                    {[
                                      { l:'Kcal', v: Math.round(m.calories||0), c:'#065f46', bg:'#ecfdf5' },
                                      { l:'P',    v: Math.round(m.proteines||0), c:'#1e40af', bg:'#eff6ff' },
                                      { l:'G',    v: Math.round(m.glucides||0),  c:'#92400e', bg:'#fffbeb' },
                                      { l:'L',    v: Math.round(m.lipides||0),   c:'#991b1b', bg:'#fef2f2' },
                                    ].map(mm => (
                                      <div key={mm.l} style={{ background:mm.bg, borderRadius:6, padding:'3px 7px', textAlign:'center' }}>
                                        <div style={{ fontSize:9, fontWeight:700, color:mm.c, textTransform:'uppercase' }}>{mm.l}</div>
                                        <div style={{ fontSize:12, fontWeight:800, color:mm.c }}>{mm.v}{mm.l!=='Kcal'?'g':''}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Items du repas */}
                                {r.items.map((item, ii) => {
                                  const im = item.macros || {};
                                  return (
                                    <div key={ii} style={{
                                      display:'flex', alignItems:'center', gap:10,
                                      background:'var(--bg2)', borderRadius:8, padding:'8px 10px',
                                      marginBottom: ii < r.items.length - 1 ? 6 : 0,
                                      border:'1px solid var(--bdr)',
                                    }}>
                                      {item.photo && (
                                        <img src={item.photo} alt={item.nom}
                                          style={{ width:38, height:38, borderRadius:6, objectFit:'cover', flexShrink:0 }} />
                                      )}
                                      <div style={{ flex:1, minWidth:0 }}>
                                        <div style={{ fontWeight:600, fontSize:13, color:'var(--t1)' }}>{item.nom}</div>
                                        <div style={{ fontSize:11, color:'var(--t3)', marginTop:1 }}>{item.quantite_g}g</div>
                                      </div>
                                      {/* Macros par item */}
                                      <div className="item-macros" style={{ display:'flex', gap:4, flexShrink:0 }}>
                                        {[
                                          { l:'Kcal', v: Math.round(im.calories||0), c:'#065f46' },
                                          { l:'P',    v: Math.round(im.proteines||0), c:'#1e40af' },
                                          { l:'G',    v: Math.round(im.glucides||0),  c:'#92400e' },
                                          { l:'L',    v: Math.round(im.lipides||0),   c:'#991b1b' },
                                        ].map(mm => (
                                          <div key={mm.l} style={{ textAlign:'center', minWidth:34 }}>
                                            <div style={{ fontSize:9, color:'var(--t3)', fontWeight:600 }}>{mm.l}</div>
                                            <div style={{ fontSize:12, fontWeight:700, color:mm.c }}>{mm.v}{mm.l!=='Kcal'?'g':''}</div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {isOpen && (!plan.jours || plan.jours.length === 0) && (
              <div style={{ borderTop:'1px solid var(--bdr)', padding:'20px 18px', color:'var(--t3)', fontSize:13, textAlign:'center' }}>
                Ce plan ne contient pas encore de repas.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClientNutritionTab({ clientId, client, data, date, onDateChange }) {
  const [subTab, setSubTab]   = useState('plans');
  const [showIa, setShowIa]   = useState(false);
  const [plans, setPlans]     = useState(null);
  const [plansErr, setPlansErr] = useState('');

  useEffect(() => {
    if (subTab === 'plans') {
      setPlans(null); setPlansErr('');
      api.clients.plans(clientId)
        .then(setPlans)
        .catch(() => setPlansErr('Impossible de charger les plans'));
    }
  }, [subTab, clientId]);

  if (!data) return <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Chargement…</div>;

  const { entries = [], eau_total_ml = 0 } = data;

  const totals = entries.reduce((acc, e) => {
    const m = e.macros || {};
    return { kcal: acc.kcal + (m.calories || 0), prot: acc.prot + (m.proteines || 0), gluc: acc.gluc + (m.glucides || 0), lip: acc.lip + (m.lipides || 0) };
  }, { kcal: 0, prot: 0, gluc: 0, lip: 0 });

  const byRepas = entries.reduce((acc, e) => {
    if (!acc[e.type_repas]) acc[e.type_repas] = [];
    acc[e.type_repas].push(e);
    return acc;
  }, {});

  return (
    <div>
      {showIa && (
        <PlanIaModal
          clientId={clientId}
          client={client}
          onClose={() => { setShowIa(false); setSubTab('plans'); setPlans(null); api.clients.plans(clientId).then(setPlans).catch(() => {}); }}
          onSaved={() => { setPlans(null); api.clients.plans(clientId).then(setPlans).catch(() => {}); }}
        />
      )}

      {/* Sous-onglets + bouton IA */}
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:4, flex:1 }}>
          {[['plans','📋 Plans assignés'],['journal','📅 Journal du jour'],['graphiques','📈 Graphiques']].map(([k,l]) => (
            <button key={k} className={`btn btn-sm ${subTab===k?'btn-p':'btn-g'}`} onClick={() => setSubTab(k)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-sm" onClick={() => setShowIa(true)}
          style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff', border:'none', boxShadow:'0 2px 8px rgba(124,58,237,.3)' }}>
          ✨ Générer avec l'IA
        </button>
      </div>

      {/* ── PLANS ASSIGNÉS ─────────────────────────────────────── */}
      {subTab === 'plans' && <ClientPlansTab plans={plans} err={plansErr} onGenerate={() => setShowIa(true)} onRefresh={() => { setPlans(null); api.clients.plans(clientId).then(setPlans).catch(() => setPlansErr('Erreur')); }} />}

      {subTab === 'graphiques' && (
        <NutritionCharts fetchFn={(days) => api.clients.nutritionHistorique(clientId, days)} />
      )}

      {subTab === 'journal' && (<>
      {/* Sélecteur de date */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <input type="date" className="fi" value={date} onChange={e => onDateChange(e.target.value)}
          style={{ maxWidth:180 }} />
        <div style={{ fontSize:13, color:'var(--t3)' }}>
          {new Date(date).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
        </div>
      </div>

      {/* Récap macros */}
      {entries.length > 0 && (
        <div className="jnl-macros" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:20 }}>
          {[
            { label:'Calories', val:`${Math.round(totals.kcal)} kcal`, color:'#065f46', bg:'#E8F8F2' },
            { label:'Protéines', val:`${Math.round(totals.prot)}g`, color:'#1E40AF', bg:'#EFF6FF' },
            { label:'Glucides',  val:`${Math.round(totals.gluc)}g`, color:'#92400E', bg:'#FFFBEB' },
            { label:'Lipides',   val:`${Math.round(totals.lip)}g`,  color:'#991B1B', bg:'#FEF2F2' },
          ].map(m => (
            <div key={m.label} style={{ background:m.bg, borderRadius:12, padding:'12px 14px', border:`1px solid ${m.color}22` }}>
              <div style={{ fontSize:11, color:m.color, fontWeight:700, marginBottom:4, opacity:0.8 }}>{m.label}</div>
              <div style={{ fontSize:18, fontWeight:900, color:m.color }}>{m.val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Eau */}
      <div className="card" style={{ marginBottom:16, display:'flex', alignItems:'center', gap:16 }}>
        <span style={{ fontSize:28 }}>💧</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>Hydratation du jour</div>
          <div style={{ background:'#E0F2FE', borderRadius:8, height:8, width:'100%' }}>
            <div style={{ background:'#0369A1', borderRadius:8, height:8, width:`${Math.min(eau_total_ml/2000*100,100)}%`, transition:'width .3s' }} />
          </div>
        </div>
        <div style={{ textAlign:'right', minWidth:80 }}>
          <div style={{ fontSize:18, fontWeight:900, color:'#0369A1' }}>{eau_total_ml} ml</div>
          <div style={{ fontSize:11, color:'var(--t3)' }}>/ 2 000 ml</div>
        </div>
      </div>

      {/* Journal par repas */}
      {entries.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t3)' }}>
          <div style={{ fontSize:36, marginBottom:8 }}>🍽️</div>
          <div style={{ fontSize:14, fontWeight:600 }}>Aucun aliment enregistré ce jour</div>
        </div>
      ) : (
        Object.entries(byRepas).map(([repasKey, items]) => {
          const repasTotal = items.reduce((s, e) => s + (e.macros?.calories || 0), 0);
          return (
            <div key={repasKey} className="card" style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{REPAS_LABELS_COACH[repasKey] || repasKey}</div>
                <div style={{ fontSize:12, color:'var(--t3)' }}>{Math.round(repasTotal)} kcal</div>
              </div>
              {items.map((e, i) => {
                const m = e.macros || {};
                return (
                  <div key={e.id} className="jnl-food-row" style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderTop: i>0?'1px solid var(--bdr)':undefined }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:600, wordBreak:'break-word' }}>{e.aliment_nom}</div>
                      <div style={{ fontSize:11, color:'var(--t3)' }}>{e.quantite_g}g</div>
                    </div>
                    <div className="jnl-food-macros" style={{ fontSize:12, color:'var(--t3)', display:'flex', gap:8, flexShrink:0 }}>
                      {m.calories && <span>{Math.round(m.calories)} kcal</span>}
                      {m.proteines && <span style={{ color:'#1E40AF' }}>P {Math.round(m.proteines)}g</span>}
                      {m.glucides  && <span style={{ color:'#92400E' }}>G {Math.round(m.glucides)}g</span>}
                      {m.lipides   && <span style={{ color:'#991B1B' }}>L {Math.round(m.lipides)}g</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
      </>)}
    </div>
  );
}

/* ── MESURES COACH ────────────────────────────────────────────────────────── */
function MesureTooltipCoach({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#fff', border:'1px solid var(--bdr)', borderRadius:8, padding:'8px 12px', fontSize:12, boxShadow:'var(--sh-md)' }}>
      <div style={{ fontWeight:700, marginBottom:2 }}>{label}</div>
      <div style={{ fontWeight:600 }}>{payload[0].value} {unit}</div>
    </div>
  );
}

const CHECKIN_METRICS = [
  { key: 'energie',      label: 'Énergie',      color: '#F59E0B' },
  { key: 'sommeil',      label: 'Sommeil',       color: '#3B82F6' },
  { key: 'motivation',   label: 'Motivation',    color: '#1D9E75' },
  { key: 'stress',       label: 'Stress',        color: '#EF4444' },
  { key: 'recuperation', label: 'Récupération',  color: '#8B5CF6' },
];

function ScoreBadge({ value }) {
  if (value == null) return <span style={{ color:'var(--t3)', fontSize:12 }}>—</span>;
  const color = value >= 7 ? '#1D9E75' : value >= 4 ? '#F59E0B' : '#EF4444';
  const bg    = value >= 7 ? '#E8F8F2' : value >= 4 ? '#FFFBEB' : '#FEF2F2';
  return (
    <span style={{ background: bg, color, fontWeight:800, fontSize:13, borderRadius:6, padding:'2px 8px' }}>
      {value}/10
    </span>
  );
}

function ClientCheckinsTab({ checkins }) {
  if (!checkins) return <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Chargement…</div>;

  if (checkins.length === 0) {
    return (
      <div className="card" style={{ textAlign:'center', padding:'60px 20px' }}>
        <div style={{ fontSize:48, marginBottom:12 }}>📋</div>
        <div style={{ fontSize:15, fontWeight:700, marginBottom:6 }}>Aucun check-in reçu</div>
        <div style={{ fontSize:13, color:'var(--t3)' }}>Le client n'a pas encore rempli de check-in hebdomadaire</div>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {checkins.map(c => (
        <div key={c.id} className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>
                Semaine du {new Date(c.semaine).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
              </div>
              {c.score_moyen != null && (
                <div style={{ fontSize:12, color:'var(--t3)', marginTop:3 }}>Score moyen : <strong>{c.score_moyen}/10</strong></div>
              )}
            </div>
            {c.poids_kg && (
              <div style={{ textAlign:'right', fontSize:13, fontWeight:700, color:'var(--acc3)', background:'var(--acc2)', borderRadius:8, padding:'4px 12px' }}>
                ⚖️ {c.poids_kg} kg
              </div>
            )}
          </div>

          {/* Métriques */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))', gap:10, marginBottom: c.commentaire ? 14 : 0 }}>
            {CHECKIN_METRICS.map(m => (
              <div key={m.key} style={{ background:'var(--bg2)', borderRadius:8, padding:'8px 12px' }}>
                <div style={{ fontSize:11, color:'var(--t3)', fontWeight:600, marginBottom:4 }}>{m.label}</div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <ScoreBadge value={c[m.key]} />
                  {c[m.key] != null && (
                    <div style={{ flex:1, height:4, background:'var(--bdr)', borderRadius:2 }}>
                      <div style={{ height:4, borderRadius:2, background:m.color, width:`${c[m.key] * 10}%`, transition:'width .3s' }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Commentaire */}
          {c.commentaire && (
            <div style={{ background:'#F8FAFC', borderLeft:'3px solid var(--bdr)', borderRadius:6, padding:'10px 14px', fontSize:13, color:'var(--t2)', fontStyle:'italic' }}>
              "{c.commentaire}"
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const ANGLE_LABELS_COACH = { face: 'Face', profil: 'Profil', dos: 'Dos' };

function ClientPhotosTab({ photos }) {
  const [lightbox, setLightbox] = useState(null);

  const byAngle = photos.reduce((acc, p) => {
    if (!acc[p.angle]) acc[p.angle] = [];
    acc[p.angle].push(p);
    return acc;
  }, {});

  const lbPhoto = lightbox != null ? photos[lightbox] : null;

  if (photos.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Aucune photo de progression</div>
        <div style={{ fontSize: 13, color: 'var(--t3)' }}>Le client n'a pas encore ajouté de photos</div>
      </div>
    );
  }

  return (
    <div>
      {Object.entries(byAngle).map(([ang, list]) => (
        <div key={ang} className="card" style={{ marginBottom: 16 }}>
          <div className="card-t">{ANGLE_LABELS_COACH[ang] || ang} <span style={{ color: 'var(--t3)', fontWeight: 400 }}>({list.length})</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 12 }}>
            {list.map(p => (
              <div key={p.id} style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--bg2)', boxShadow: 'var(--sh)' }}>
                <img
                  src={p.image_url}
                  alt={p.legende || ang}
                  onClick={() => setLightbox(photos.findIndex(x => x.id === p.id))}
                  style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                />
                <div style={{ padding: '6px 10px' }}>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>{new Date(p.date).toLocaleDateString('fr-FR')}</div>
                  {p.legende && <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.legende}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {lbPhoto && (
        <Lightbox
          src={lbPhoto.image_url}
          alt={lbPhoto.legende || lbPhoto.angle}
          caption={[
            lbPhoto.legende,
            new Date(lbPhoto.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
            ANGLE_LABELS_COACH[lbPhoto.angle] || lbPhoto.angle,
          ].filter(Boolean).join(' · ')}
          onClose={() => setLightbox(null)}
          onPrev={lightbox > 0 ? () => setLightbox(i => i - 1) : null}
          onNext={lightbox < photos.length - 1 ? () => setLightbox(i => i + 1) : null}
        />
      )}
    </div>
  );
}

function ClientMesuresTab({ mesures, clientId, onDone }) {
  const [metric, setMetric] = useState('poids_kg');
  const m = METRICS.find(x => x.key === metric);

  const sorted = [...mesures].sort((a, b) => new Date(a.date) - new Date(b.date));
  const chartData = sorted
    .filter(x => x[metric] != null)
    .map(x => ({
      date: new Date(x.date).toLocaleDateString('fr-FR', { day:'numeric', month:'short' }),
      value: parseFloat(x[metric]),
    }));

  const first = chartData[0]?.value;
  const last  = chartData[chartData.length - 1]?.value;
  const delta = first != null && last != null && chartData.length > 1 ? last - first : null;

  return (
    <div>
      {mesures.length > 0 && (
        <div className="card" style={{ marginBottom:16 }}>
          <div className="card-t">Évolution</div>

          {/* Metric pills */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {METRICS.map(met => (
              <button key={met.key} onClick={() => setMetric(met.key)} style={{
                padding:'5px 13px', borderRadius:20, fontSize:12, fontWeight:600,
                border:'1.5px solid', cursor:'pointer', transition:'all .12s',
                borderColor: metric === met.key ? met.color : 'var(--bdr)',
                background:  metric === met.key ? met.color : '#fff',
                color:       metric === met.key ? '#fff' : 'var(--t2)',
              }}>{met.label}</button>
            ))}
          </div>

          {/* Trend summary */}
          {delta != null && (
            <div className="mes-trend" style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:16, background:'var(--bg)', borderRadius:10, padding:'12px 16px' }}>
              <div style={{ flex:'1 1 auto', minWidth:70 }}>
                <div style={{ fontSize:11, color:'var(--t3)', marginBottom:2 }}>Début</div>
                <div style={{ fontSize:18, fontWeight:800 }}>{first}<span style={{ fontSize:12, color:'var(--t3)', fontWeight:500, marginLeft:4 }}>{m.unit}</span></div>
              </div>
              <div style={{ fontSize:16, color:'var(--bdr)', flexShrink:0 }}>→</div>
              <div style={{ flex:'1 1 auto', minWidth:70 }}>
                <div style={{ fontSize:11, color:'var(--t3)', marginBottom:2 }}>Actuel</div>
                <div style={{ fontSize:18, fontWeight:800 }}>{last}<span style={{ fontSize:12, color:'var(--t3)', fontWeight:500, marginLeft:4 }}>{m.unit}</span></div>
              </div>
              <div style={{ flex:'1 1 auto', minWidth:70 }}>
                <div style={{ fontSize:11, color:'var(--t3)', marginBottom:2 }}>Évolution</div>
                <div style={{ fontSize:18, fontWeight:800, color: delta < 0 ? '#059669' : delta > 0 ? '#EF4444' : 'var(--t2)' }}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}<span style={{ fontSize:12, fontWeight:500, marginLeft:4 }}>{m.unit}</span>
                </div>
              </div>
              <div style={{ fontSize:24, flexShrink:0 }}>
                {delta < 0 ? '📉' : delta > 0 ? '📈' : '➡️'}
              </div>
            </div>
          )}

          {/* Chart */}
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top:5, right:10, left:-10, bottom:0 }}>
                <defs>
                  <linearGradient id="grad-coach" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={m.color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize:11, fill:'var(--t3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize:11, fill:'var(--t3)' }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                <Tooltip content={<MesureTooltipCoach unit={m.unit} />} />
                <Area type="monotone" dataKey="value" stroke={m.color} strokeWidth={2.5}
                  fill="url(#grad-coach)"
                  dot={{ r:5, fill:m.color, strokeWidth:2, stroke:'#fff' }}
                  activeDot={{ r:7, strokeWidth:2, stroke:'#fff' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--t3)', fontSize:13 }}>
              {chartData.length === 0 ? 'Aucune donnée pour cette mesure' : 'Au moins 2 mesures nécessaires pour afficher le graphique'}
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-t">Mesures corporelles ({mesures.length})</div>
        {mesures.length === 0
          ? <Empty icon="trend" title="Aucune mesure" desc="Enregistrez les premières mesures" />
          : (
            <div className="twrap"><table>
              <thead><tr><th>Date</th><th>Poids</th><th>Tour taille</th><th>Tour hanches</th><th>Masse grasse</th></tr></thead>
              <tbody>
                {[...mesures].sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => (
                  <tr key={r.id}>
                    <td className="fw6">{new Date(r.date).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}</td>
                    <td>{r.poids_kg        ? `${r.poids_kg} kg`        : '—'}</td>
                    <td>{r.tour_taille_cm  ? `${r.tour_taille_cm} cm`  : '—'}</td>
                    <td>{r.tour_hanches_cm ? `${r.tour_hanches_cm} cm` : '—'}</td>
                    <td>{r.masse_grasse_pct? `${r.masse_grasse_pct} %` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )
        }
        <MesureForm clientId={clientId} onDone={onDone} />
      </div>
    </div>
  );
}

/* ── SOUS-FORMULAIRES ─────────────────────────────────────────────────────── */
function MesureForm({ clientId, onDone }) {
  const [f, setF] = useState({ date:'', poids_kg:'', tour_taille_cm:'', tour_hanches_cm:'', masse_grasse_pct:'' });
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));
  const go = async () => {
    if (!f.date) return toast('Date requise', 'err');
    try {
      const p = { ...f }; Object.keys(p).forEach(k => { if (!p[k]) delete p[k]; });
      await api.clients.addMesure(clientId, p);
      setF({ date:'', poids_kg:'', tour_taille_cm:'', tour_hanches_cm:'', masse_grasse_pct:'' });
      onDone(); toast('Mesure ajoutée');
    } catch (e) { toast(e.message, 'err'); }
  };
  return (
    <div className="pt16 bt mt16">
      <div className="t12 fw6 tc2 mb12">Ajouter une mesure</div>
      <div className="fr2">
        <div className="fg"><label className="fl">Date *</label><input className="fi" type="date" value={f.date} onChange={e => s('date', e.target.value)} /></div>
        <div className="fg"><label className="fl">Poids (kg)</label><input className="fi" type="number" step="0.1" value={f.poids_kg} onChange={e => s('poids_kg', e.target.value)} /></div>
      </div>
      <div className="fr2">
        <div className="fg"><label className="fl">Tour taille (cm)</label><input className="fi" type="number" step="0.1" value={f.tour_taille_cm} onChange={e => s('tour_taille_cm', e.target.value)} /></div>
        <div className="fg"><label className="fl">Tour hanches (cm)</label><input className="fi" type="number" step="0.1" value={f.tour_hanches_cm} onChange={e => s('tour_hanches_cm', e.target.value)} /></div>
      </div>
      <div className="fr2">
        <div className="fg"><label className="fl">Masse grasse (%)</label><input className="fi" type="number" step="0.1" value={f.masse_grasse_pct} onChange={e => s('masse_grasse_pct', e.target.value)} /></div>
        <div className="fg" />
      </div>
      <button className="btn btn-p btn-sm" onClick={go}>+ Ajouter la mesure</button>
    </div>
  );
}

function ObjForm({ clientId, onDone }) {
  const [f, setF] = useState({ titre:'', valeur_cible:'', valeur_actuelle:'', unite:'' });
  const s = (k, v) => setF(x => ({ ...x, [k]: v }));
  const go = async () => {
    if (!f.titre) return toast('Titre requis', 'err');
    const p = { ...f }; Object.keys(p).forEach(k => { if (!p[k]) delete p[k]; });
    await api.clients.addObjectif(clientId, p);
    setF({ titre:'', valeur_cible:'', valeur_actuelle:'', unite:'' });
    onDone(); toast('Objectif ajouté');
  };
  return (
    <div className="pt16 bt mt16">
      <div className="t12 fw6 tc2 mb12">Ajouter un objectif</div>
      <div className="fg"><label className="fl">Titre *</label><input className="fi" placeholder="ex: Squat 60 kg" value={f.titre} onChange={e => s('titre', e.target.value)} /></div>
      <div className="fr3">
        <div className="fg"><label className="fl">Valeur cible</label><input className="fi" type="number" value={f.valeur_cible} onChange={e => s('valeur_cible', e.target.value)} /></div>
        <div className="fg"><label className="fl">Valeur actuelle</label><input className="fi" type="number" value={f.valeur_actuelle} onChange={e => s('valeur_actuelle', e.target.value)} /></div>
        <div className="fg"><label className="fl">Unité</label><input className="fi" placeholder="kg, km..." value={f.unite} onChange={e => s('unite', e.target.value)} /></div>
      </div>
      <button className="btn btn-p btn-sm" onClick={go}>+ Ajouter l&apos;objectif</button>
    </div>
  );
}

function CarnetCoachModal({ seanceId, onClose }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    api.seances.detail(seanceId).then(setDetail).catch(() => {});
  }, [seanceId]);

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

      {logs.length === 0
        ? <div style={{ textAlign:'center', padding:'24px 0', color:'var(--t3)', fontSize:13 }}>
            Aucune série enregistrée par le client pour cette séance
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
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET SUIVI — tableau de bord graphiques pour le coach
───────────────────────────────────────────────────────────────────────────── */
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
const fmtSemaine = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
const TOOLTIP_STYLE = { background:'#1e293b', border:'1px solid #334155', borderRadius:8, fontSize:12, color:'#e2e8f0' };

function KpiCard({ label, value, unit, delta, color = '#1D9E75' }) {
  return (
    <div style={{ background:'#1e293b', borderRadius:12, padding:'14px 18px', border:'1px solid #334155', flex:1, minWidth:120 }}>
      <div style={{ fontSize:11, color:'#64748b', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:700, color }}>
        {value != null ? value : '—'}<span style={{ fontSize:13, fontWeight:400, color:'#94a3b8', marginLeft:3 }}>{unit}</span>
      </div>
      {delta != null && (
        <div style={{ fontSize:11, marginTop:3, color: delta < 0 ? '#22c55e' : delta > 0 ? '#ef4444' : '#94a3b8' }}>
          {delta > 0 ? '+' : ''}{delta} {unit}
        </div>
      )}
    </div>
  );
}

function SuiviSection({ title, children, loading }) {
  return (
    <div style={{ background:'#1e293b', borderRadius:14, padding:'18px 20px', border:'1px solid #334155' }}>
      <div style={{ fontWeight:700, fontSize:14, color:'#e2e8f0', marginBottom:16 }}>{title}</div>
      {loading
        ? <div style={{ textAlign:'center', padding:'30px 0', color:'#64748b', fontSize:13 }}>Chargement…</div>
        : children}
    </div>
  );
}

function NoData({ icon = '📊' }) {
  return (
    <div style={{ textAlign:'center', padding:'28px 0', color:'#475569' }}>
      <div style={{ fontSize:28, marginBottom:6 }}>{icon}</div>
      <div style={{ fontSize:12 }}>Aucune donnée disponible</div>
    </div>
  );
}

function PerformancesChart({ data }) {
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState('max_kg');

  if (!data) return <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Chargement…</div>;
  if (data.length === 0) return <NoData icon="🏋️" />;

  const exo = data[selected];
  const color = mode === 'max_kg' ? '#6366f1' : '#f59e0b';
  const unit  = mode === 'max_kg' ? 'kg' : 'kg';
  const label = mode === 'max_kg' ? 'Charge max' : 'Volume total';

  return (
    <div>
      {/* Sélecteur exercice */}
      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
        {data.map((e, i) => (
          <button key={e.nom} onClick={() => setSelected(i)} style={{
            padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, cursor:'pointer',
            border:'1.5px solid', transition:'all .12s',
            borderColor: selected === i ? '#6366f1' : 'var(--bdr)',
            background:  selected === i ? '#6366f1' : '#fff',
            color:       selected === i ? '#fff' : 'var(--t2)',
          }}>{e.nom} <span style={{ opacity:.7 }}>({e.nb_sessions})</span></button>
        ))}
      </div>

      {/* Sélecteur mode */}
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[['max_kg','💪 Charge max'],['volume','📦 Volume']].map(([k, lbl]) => (
          <button key={k} onClick={() => setMode(k)} style={{
            padding:'4px 14px', borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer',
            border:'1.5px solid',
            borderColor: mode === k ? color : 'var(--bdr)',
            background:  mode === k ? color : '#fff',
            color:       mode === k ? '#fff' : 'var(--t2)',
          }}>{lbl}</button>
        ))}
      </div>

      {/* Résumé delta */}
      {exo.data.length >= 2 && (() => {
        const first = exo.data[0][mode];
        const last  = exo.data[exo.data.length - 1][mode];
        const delta = last - first;
        return (
          <div style={{ display:'flex', gap:12, background:'var(--bg)', borderRadius:10, padding:'10px 16px', marginBottom:14, flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 80px' }}>
              <div style={{ fontSize:11, color:'var(--t3)' }}>Début</div>
              <div style={{ fontSize:16, fontWeight:800 }}>{first} <span style={{ fontSize:11, color:'var(--t3)' }}>{unit}</span></div>
            </div>
            <div style={{ color:'var(--bdr)', fontSize:16 }}>→</div>
            <div style={{ flex:'1 1 80px' }}>
              <div style={{ fontSize:11, color:'var(--t3)' }}>Actuel</div>
              <div style={{ fontSize:16, fontWeight:800 }}>{last} <span style={{ fontSize:11, color:'var(--t3)' }}>{unit}</span></div>
            </div>
            <div style={{ flex:'1 1 80px' }}>
              <div style={{ fontSize:11, color:'var(--t3)' }}>Progression</div>
              <div style={{ fontSize:16, fontWeight:800, color: delta > 0 ? '#1D9E75' : delta < 0 ? '#ef4444' : 'var(--t2)' }}>
                {delta > 0 ? '+' : ''}{delta.toFixed(1)} <span style={{ fontSize:11 }}>{unit}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {exo.data.length < 2 ? (
        <div style={{ textAlign:'center', padding:'16px 0', color:'var(--t3)', fontSize:13 }}>Au moins 2 séances nécessaires pour afficher la courbe</div>
      ) : (
        <ResponsiveContainer width="100%" height={210}>
          <LineChart data={exo.data} margin={{ top:8, right:16, left:0, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize:10, fill:'#94a3b8' }} />
            <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} width={45} domain={['auto','auto']} unit={` ${unit}`} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v} ${unit}`, label]} labelFormatter={fmtDate} />
            <Line type="monotone" dataKey={mode} stroke={color} strokeWidth={2.5}
              dot={{ r:4, fill:color, strokeWidth:2, stroke:'#fff' }}
              activeDot={{ r:6, strokeWidth:2, stroke:'#fff' }}
              name={label} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function ClientSuiviTab({ client, mesures, nutrition, checkins, performances }) {
  const loading = mesures === null || nutrition === null || checkins === null;

  /* ── KPIs poids ─────────────────────────────────────────────────────────── */
  const derniereMesure = mesures && mesures.length > 0 ? mesures[mesures.length - 1] : null;
  const premiereMesure = mesures && mesures.length > 0 ? mesures[0] : null;
  const poidsActuel = derniereMesure?.poids_kg ? parseFloat(derniereMesure.poids_kg) : null;
  const poidsDepart = client.poids_depart_kg ? parseFloat(client.poids_depart_kg) : (premiereMesure?.poids_kg ? parseFloat(premiereMesure.poids_kg) : null);
  const poidsCible  = client.poids_cible_kg  ? parseFloat(client.poids_cible_kg)  : null;
  const deltaTotal  = (poidsActuel != null && poidsDepart != null) ? Math.round((poidsActuel - poidsDepart) * 10) / 10 : null;
  const mgActuelle  = derniereMesure?.masse_grasse_pct ? parseFloat(derniereMesure.masse_grasse_pct) : null;

  /* ── Données check-in pour graphe bien-être ─────────────────────────────── */
  const checkinsData = (checkins || []).map(c => ({
    date: c.semaine,
    énergie:     c.energie,
    sommeil:     c.sommeil,
    motivation:  c.motivation,
    humeur:      c.humeur,
    récupération:c.recuperation,
    stress:      c.stress,
  }));

  /* ── Dernières moyennes bien-être ──────────────────────────────────────── */
  const lastCheckin = checkins && checkins.length > 0 ? checkins[checkins.length - 1] : null;

  /* ── Calories moyennes nutrition ───────────────────────────────────────── */
  const avgCal = nutrition && nutrition.length > 0
    ? Math.round(nutrition.reduce((s, d) => s + d.calories, 0) / nutrition.length)
    : null;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* ── KPIs ── */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
        <KpiCard label="Poids actuel"    value={poidsActuel}   unit="kg" delta={deltaTotal} color="#1D9E75" />
        <KpiCard label="Poids cible"     value={poidsCible}    unit="kg" color="#6366f1" />
        <KpiCard label="Masse grasse"    value={mgActuelle}    unit="%" color="#f59e0b" />
        <KpiCard label="Moy. calories"   value={avgCal}        unit="kcal/j" color="#ef4444" />
        <KpiCard label="Énergie (dernier check-in)" value={lastCheckin?.energie} unit="/10" color="#22c55e" />
      </div>

      {/* ── Graphe poids ── */}
      <SuiviSection title="⚖️ Évolution du poids" loading={loading}>
        {!mesures || mesures.filter(m => m.poids_kg).length < 2
          ? <NoData icon="⚖️" />
          : <ResponsiveContainer width="100%" height={220}>
              <LineChart data={mesures.filter(m => m.poids_kg)} margin={{ top:8, right:16, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize:10, fill:'#94a3b8' }} />
                <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} width={40} domain={['auto','auto']} unit=" kg" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v} kg`, 'Poids']} labelFormatter={fmtDate} />
                {poidsCible && <ReferenceLine y={poidsCible} stroke="#6366f1" strokeDasharray="4 4" label={{ value:'Cible', fill:'#6366f1', fontSize:10 }} />}
                <Line type="monotone" dataKey="poids_kg" stroke="#1D9E75" strokeWidth={2.5} dot={{ r:4, fill:'#1D9E75' }} activeDot={{ r:6 }} name="Poids" />
              </LineChart>
            </ResponsiveContainer>
        }
      </SuiviSection>

      {/* ── Mesures corporelles ── */}
      <SuiviSection title="📏 Mesures corporelles (cm)" loading={loading}>
        {!mesures || mesures.filter(m => m.tour_taille_cm || m.tour_hanches_cm || m.tour_cuisse_cm).length < 2
          ? <NoData icon="📏" />
          : <ResponsiveContainer width="100%" height={230}>
              <LineChart data={mesures} margin={{ top:8, right:16, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize:10, fill:'#94a3b8' }} />
                <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} width={40} domain={['auto','auto']} unit=" cm" />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => v ? [`${v} cm`, n] : [null, n]} labelFormatter={fmtDate} />
                <Legend wrapperStyle={{ fontSize:11, color:'#94a3b8' }} />
                <Line type="monotone" dataKey="tour_taille_cm"  stroke="#3B82F6" strokeWidth={2} dot={{ r:3 }} name="Taille" connectNulls />
                <Line type="monotone" dataKey="tour_hanches_cm" stroke="#ec4899" strokeWidth={2} dot={{ r:3 }} name="Hanches" connectNulls />
                <Line type="monotone" dataKey="tour_cuisse_cm"  stroke="#f59e0b" strokeWidth={2} dot={{ r:3 }} name="Cuisse" connectNulls />
              </LineChart>
            </ResponsiveContainer>
        }
      </SuiviSection>

      {/* ── Masse grasse ── */}
      {mesures && mesures.filter(m => m.masse_grasse_pct).length >= 2 && (
        <SuiviSection title="🔬 Masse grasse (%)" loading={loading}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={mesures.filter(m => m.masse_grasse_pct)} margin={{ top:8, right:16, left:0, bottom:0 }}>
              <defs>
                <linearGradient id="gMG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
              <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize:10, fill:'#94a3b8' }} />
              <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} width={35} unit="%" />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v}%`, 'Masse grasse']} labelFormatter={fmtDate} />
              <Area type="monotone" dataKey="masse_grasse_pct" stroke="#f59e0b" fill="url(#gMG)" strokeWidth={2} dot={{ r:3 }} name="MG%" />
            </AreaChart>
          </ResponsiveContainer>
        </SuiviSection>
      )}

      {/* ── Nutrition ── */}
      <SuiviSection title="🔥 Apports caloriques (60 jours)" loading={loading}>
        {!nutrition || nutrition.length < 2
          ? <NoData icon="🥗" />
          : <>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={nutrition} margin={{ top:8, right:16, left:0, bottom:0 }}>
                  <defs>
                    <linearGradient id="gCalS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize:10, fill:'#94a3b8' }} />
                  <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} width={45} unit=" kcal" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={v => [`${v} kcal`, 'Calories']} labelFormatter={fmtDate} />
                  {client.objectif_calories && <ReferenceLine y={client.objectif_calories} stroke="#6366f1" strokeDasharray="4 4" label={{ value:'Objectif', fill:'#6366f1', fontSize:10 }} />}
                  <Area type="monotone" dataKey="calories" stroke="#1D9E75" fill="url(#gCalS)" strokeWidth={2} dot={false} activeDot={{ r:4 }} />
                </AreaChart>
              </ResponsiveContainer>

              <div style={{ fontWeight:600, fontSize:12, color:'#94a3b8', margin:'12px 0 8px' }}>Macronutriments (g/jour)</div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={nutrition} margin={{ top:4, right:16, left:0, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize:10, fill:'#94a3b8' }} />
                  <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} width={35} unit="g" />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [`${v}g`, n]} labelFormatter={fmtDate} />
                  <Legend wrapperStyle={{ fontSize:11, color:'#94a3b8' }} />
                  <Line type="monotone" dataKey="proteines" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="Protéines" />
                  <Line type="monotone" dataKey="glucides"  stroke="#f59e0b" strokeWidth={1.5} dot={false} name="Glucides" />
                  <Line type="monotone" dataKey="lipides"   stroke="#ef4444" strokeWidth={1.5} dot={false} name="Lipides" />
                </LineChart>
              </ResponsiveContainer>
            </>
        }
      </SuiviSection>

      {/* ── Performances sportives ── */}
      <SuiviSection title="💪 Performances sportives" loading={performances === null}>
        <PerformancesChart data={performances} />
      </SuiviSection>

      {/* ── Bien-être (check-ins) ── */}
      <SuiviSection title="🧠 Bien-être hebdomadaire (check-ins)" loading={loading}>
        {checkinsData.length < 2
          ? <NoData icon="📋" />
          : <ResponsiveContainer width="100%" height={240}>
              <LineChart data={checkinsData} margin={{ top:8, right:16, left:0, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" tickFormatter={fmtSemaine} tick={{ fontSize:10, fill:'#94a3b8' }} />
                <YAxis tick={{ fontSize:10, fill:'#94a3b8' }} width={25} domain={[0, 10]} ticks={[0,2,4,6,8,10]} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => v ? [`${v}/10`, n] : [null, n]} labelFormatter={fmtSemaine} />
                <Legend wrapperStyle={{ fontSize:11, color:'#94a3b8' }} />
                <Line type="monotone" dataKey="énergie"      stroke="#22c55e" strokeWidth={2} dot={{ r:3 }} connectNulls />
                <Line type="monotone" dataKey="sommeil"      stroke="#3B82F6" strokeWidth={2} dot={{ r:3 }} connectNulls />
                <Line type="monotone" dataKey="motivation"   stroke="#a855f7" strokeWidth={2} dot={{ r:3 }} connectNulls />
                <Line type="monotone" dataKey="humeur"       stroke="#f59e0b" strokeWidth={2} dot={{ r:3 }} connectNulls />
                <Line type="monotone" dataKey="récupération" stroke="#1D9E75" strokeWidth={2} dot={{ r:3 }} connectNulls />
                <Line type="monotone" dataKey="stress"       stroke="#ef4444" strokeWidth={2} dot={{ r:3 }} strokeDasharray="4 4" connectNulls />
              </LineChart>
            </ResponsiveContainer>
        }
      </SuiviSection>

    </div>
  );
}
