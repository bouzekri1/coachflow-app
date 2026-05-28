import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

function GoogleCalendarSettings({ user, updateUser }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState(null);
  const [blockAllday, setBlockAllday] = useState(user?.gcal_block_allday ?? true);

  const load = () => api.googleCalendar.status().then(setStatus).catch(() => setStatus({ connected:false }));

  useEffect(() => {
    load();
    // Détecte le retour de l'OAuth callback (?gcal=connected ou error)
    const params = new URLSearchParams(window.location.search);
    const gcal = params.get('gcal');
    if (gcal === 'connected') {
      setMsg({ ok:true, text:'Google Calendar connecté avec succès.' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (gcal === 'error') {
      setMsg({ ok:false, text:`Échec de connexion : ${params.get('msg') || 'erreur inconnue'}` });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const connect = async () => {
    setBusy(true); setMsg(null);
    try {
      const { auth_url } = await api.googleCalendar.connect();
      window.location.href = auth_url;
    } catch (e) { setMsg({ ok:false, text:e.message }); setBusy(false); }
  };

  const disconnect = async () => {
    if (!window.confirm('Déconnecter Google Calendar ? Les séances déjà synchronisées resteront dans votre agenda mais ne seront plus mises à jour.')) return;
    setBusy(true); setMsg(null);
    try {
      await api.googleCalendar.disconnect();
      setStatus({ connected:false });
      setMsg({ ok:true, text:'Google Calendar déconnecté.' });
    } catch (e) { setMsg({ ok:false, text:e.message }); }
    finally { setBusy(false); }
  };

  const syncAll = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await api.googleCalendar.syncAll();
      setMsg({ ok:true, text:`${r.pushed}/${r.total} séances synchronisées.` });
      load();
    } catch (e) { setMsg({ ok:false, text:e.message }); }
    finally { setBusy(false); }
  };

  const toggleBlockAllday = async (val) => {
    setBlockAllday(val); setMsg(null);
    try {
      await api.updateMe({ gcal_block_allday: val });
      updateUser({ gcal_block_allday: val });
    } catch (e) {
      setBlockAllday(!val);
      setMsg({ ok:false, text:e.message });
    }
  };

  if (!status) return <div style={{ textAlign:'center', padding:20 }}><div className="spin" style={{ margin:'0 auto' }} /></div>;

  return (
    <>
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background: status.connected ? '#ecfdf5' : 'var(--bg)', borderRadius:10, marginBottom: status.connected ? 14 : 0, border: status.connected ? '1px solid #a7f3d0' : '1px solid var(--bdr)' }}>
        <div style={{ width:42, height:42, borderRadius:10, background:'#fff', border:'1px solid var(--bdr)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M19.5 22h-15A2.5 2.5 0 0 1 2 19.5v-15A2.5 2.5 0 0 1 4.5 2h15A2.5 2.5 0 0 1 22 4.5v15a2.5 2.5 0 0 1-2.5 2.5"/><path fill="#fff" d="M14.5 7.5h-5v9h5v-9z"/><path fill="#1A73E8" d="M9.5 11.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25h1v2.5h-1zm5 0h-1V8.75h1c.69 0 1.25.56 1.25 1.25s-.56 1.25-1.25 1.25z"/></svg>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:700, fontSize:14, color: status.connected ? '#065f46' : 'var(--t1)' }}>
            {status.connected ? '✓ Connecté' : 'Non connecté'}
          </div>
          <div style={{ fontSize:12, color:'var(--t3)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {status.connected
              ? <>Compte : <strong>{status.email}</strong>{status.last_sync_at && ` · Dernière synchro : ${new Date(status.last_sync_at).toLocaleString('fr-FR')}`}</>
              : 'Synchronisez vos séances avec votre agenda Google. Les événements de votre calendrier bloqueront aussi les créneaux de réservation.'}
          </div>
        </div>
        {!status.connected
          ? <button className="btn btn-p" onClick={connect} disabled={busy}>{busy ? '…' : 'Connecter'}</button>
          : <button className="btn btn-s" onClick={disconnect} disabled={busy}>Déconnecter</button>
        }
      </div>

      {status.connected && (
        <>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
            <button className="btn btn-p btn-sm" onClick={syncAll} disabled={busy}>
              {busy ? 'Synchronisation…' : '🔄 Synchroniser toutes les séances futures'}
            </button>
            <div style={{ flex:1, fontSize:11, color:'var(--t3)', alignSelf:'center' }}>
              Les nouvelles séances et leurs modifications sont synchronisées automatiquement.
            </div>
          </div>

          <label style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', background:'var(--bg)', borderRadius:10, cursor:'pointer', border:`1px solid ${blockAllday ? 'var(--acc)' : 'var(--bdr)'}` }}>
            <div style={{ position:'relative', display:'inline-block', width:40, height:22, flexShrink:0, marginTop:2 }}>
              <input type="checkbox" checked={blockAllday} onChange={e => toggleBlockAllday(e.target.checked)}
                style={{ opacity:0, width:0, height:0 }} />
              <span style={{ position:'absolute', top:0, left:0, right:0, bottom:0,
                background: blockAllday ? 'var(--acc)' : '#cbd5e1', borderRadius:11, transition:'.2s' }}>
                <span style={{ position:'absolute', width:16, height:16, left: blockAllday ? 21 : 3, top:3,
                  background:'#fff', borderRadius:'50%', transition:'.2s' }} />
              </span>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:13 }}>Bloquer aussi les events all-day marqués "Disponible"</div>
              <div style={{ fontSize:11, color:'var(--t3)', marginTop:3, lineHeight:1.5 }}>
                Google met par défaut les events sur une journée entière (vacances, jours fériés…) en "Disponible".
                Activé, on les considère comme une absence et on bloque les réservations ce jour-là.
                Désactive si tu utilises ton agenda Google pour des notes/anniversaires qui ne doivent pas bloquer.
              </div>
            </div>
          </label>
        </>
      )}

      {msg && (
        <div style={{ padding:'9px 12px', borderRadius:7, fontSize:13, marginTop:10,
          background: msg.ok ? '#ECFDF5' : '#FEF2F2',
          color: msg.ok ? '#065F46' : '#991B1B',
          border:`1px solid ${msg.ok ? '#A7F3D0' : '#FECACA'}` }}>{msg.text}</div>
      )}
    </>
  );
}

function ReservationSettings({ user, updateUser }) {
  const [active, setActive]     = useState(user?.reservation_active || false);
  const [duree, setDuree]       = useState(user?.reservation_duree_min || 60);
  const [preavis, setPreavis]   = useState(user?.reservation_preavis_h || 12);
  const [horizon, setHorizon]   = useState(user?.reservation_horizon_j || 30);
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null);
  const [dispos, setDispos]     = useState([]);
  const [excs, setExcs]         = useState([]);
  const [newSlot, setNewSlot]   = useState({ jour_semaine:0, heure_debut:'09:00', heure_fin:'12:00' });
  const [newExc, setNewExc]     = useState({ date:'', type:'ferme', heure_debut:'09:00', heure_fin:'12:00', motif:'' });
  const [busy, setBusy]         = useState(false);

  useEffect(() => {
    Promise.all([api.reservation.dispoList(), api.reservation.excList()])
      .then(([d, e]) => { setDispos(d); setExcs(e); })
      .catch(() => {});
  }, []);

  const saveConfig = async () => {
    setSaving(true); setMsg(null);
    try {
      await api.updateMe({
        reservation_active: active,
        reservation_duree_min: Number(duree),
        reservation_preavis_h: Number(preavis),
        reservation_horizon_j: Number(horizon),
      });
      updateUser({
        reservation_active: active, reservation_duree_min: Number(duree),
        reservation_preavis_h: Number(preavis), reservation_horizon_j: Number(horizon),
      });
      setMsg({ ok:true, text:'Paramètres enregistrés.' });
    } catch (e) { setMsg({ ok:false, text:e.message }); }
    finally { setSaving(false); }
  };

  const addSlot = async () => {
    setBusy(true);
    try {
      const d = await api.reservation.dispoCreate(newSlot);
      setDispos(arr => [...arr, d].sort((a,b) => a.jour_semaine - b.jour_semaine || a.heure_debut.localeCompare(b.heure_debut)));
    } catch (e) { setMsg({ ok:false, text:e.message }); }
    finally { setBusy(false); }
  };

  const delSlot = async (id) => {
    if (!window.confirm('Supprimer ce créneau ?')) return;
    await api.reservation.dispoDelete(id);
    setDispos(arr => arr.filter(d => d.id !== id));
  };

  const addExc = async () => {
    if (!newExc.date) { setMsg({ ok:false, text:'Choisir une date.' }); return; }
    setBusy(true);
    try {
      const payload = newExc.type === 'ferme'
        ? { date:newExc.date, type:'ferme', motif:newExc.motif }
        : { ...newExc };
      const e = await api.reservation.excCreate(payload);
      setExcs(arr => [...arr, e].sort((a,b) => a.date.localeCompare(b.date)));
      setNewExc({ date:'', type:'ferme', heure_debut:'09:00', heure_fin:'12:00', motif:'' });
    } catch (e) { setMsg({ ok:false, text:e.message }); }
    finally { setBusy(false); }
  };

  const delExc = async (id) => {
    if (!window.confirm('Supprimer cette exception ?')) return;
    await api.reservation.excDelete(id);
    setExcs(arr => arr.filter(e => e.id !== id));
  };

  const dispoByJour = JOURS.map((_,i) => dispos.filter(d => d.jour_semaine === i));

  return (
    <>
      {/* ── Toggle + config ── */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'var(--bg)', borderRadius:10, marginBottom:18 }}>
        <label style={{ position:'relative', display:'inline-block', width:46, height:26, flexShrink:0 }}>
          <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}
            style={{ opacity:0, width:0, height:0 }} />
          <span style={{ position:'absolute', cursor:'pointer', top:0, left:0, right:0, bottom:0,
            background: active ? 'var(--acc)' : '#cbd5e1', borderRadius:13, transition:'.2s' }}>
            <span style={{ position:'absolute', width:20, height:20, left: active ? 23 : 3, bottom:3,
              background:'#fff', borderRadius:'50%', transition:'.2s' }} />
          </span>
        </label>
        <div>
          <div style={{ fontWeight:700, fontSize:14 }}>{active ? 'Réservation activée' : 'Réservation désactivée'}</div>
          <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>
            {active ? 'Les clients peuvent réserver leurs séances depuis le portail.' : 'Activez pour permettre aux clients de réserver eux-mêmes.'}
          </div>
        </div>
      </div>

      {active && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:18 }}>
          <div className="fg" style={{ margin:0 }}>
            <label className="fl">Durée d'un créneau (min)</label>
            <select className="fi fsel" value={duree} onChange={e => setDuree(e.target.value)}>
              {[30,45,60,90,120].map(n => <option key={n} value={n}>{n} min</option>)}
            </select>
          </div>
          <div className="fg" style={{ margin:0 }}>
            <label className="fl">Préavis minimum (h)</label>
            <select className="fi fsel" value={preavis} onChange={e => setPreavis(e.target.value)}>
              {[0,2,6,12,24,48,72].map(n => <option key={n} value={n}>{n} h</option>)}
            </select>
          </div>
          <div className="fg" style={{ margin:0 }}>
            <label className="fl">Horizon (jours)</label>
            <select className="fi fsel" value={horizon} onChange={e => setHorizon(e.target.value)}>
              {[7,14,21,30,45,60,90].map(n => <option key={n} value={n}>{n} j</option>)}
            </select>
          </div>
        </div>
      )}

      <button className="btn btn-p" onClick={saveConfig} disabled={saving}>
        {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
      </button>
      {msg && (
        <div style={{ padding:'9px 12px', borderRadius:7, fontSize:13, marginTop:10,
          background: msg.ok ? '#ECFDF5' : '#FEF2F2',
          color: msg.ok ? '#065F46' : '#991B1B',
          border:`1px solid ${msg.ok ? '#A7F3D0' : '#FECACA'}` }}>{msg.text}</div>
      )}

      {/* ── Planning hebdo ── */}
      {active && (
        <div style={{ marginTop:24, borderTop:'1px solid var(--bdr)', paddingTop:20 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>📅 Planning hebdomadaire récurrent</div>
          <div style={{ fontSize:12, color:'var(--t3)', marginBottom:14 }}>
            Définissez vos plages disponibles chaque semaine. Les créneaux de {duree} min seront générés automatiquement.
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
            {JOURS.map((nom, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--bg)', borderRadius:8 }}>
                <div style={{ width:90, fontWeight:600, fontSize:13 }}>{nom}</div>
                <div style={{ flex:1, display:'flex', gap:6, flexWrap:'wrap' }}>
                  {dispoByJour[i].length === 0
                    ? <span style={{ fontSize:12, color:'var(--t3)', fontStyle:'italic' }}>Aucune disponibilité</span>
                    : dispoByJour[i].map(d => (
                      <span key={d.id} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 8px',
                        background:'var(--acc2)', color:'var(--acc3)', borderRadius:6, fontSize:12, fontWeight:600 }}>
                        {d.heure_debut} – {d.heure_fin}
                        <button onClick={() => delSlot(d.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--acc3)', padding:0, fontSize:14 }}>×</button>
                      </span>
                    ))
                  }
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'end', padding:'12px', background:'#f8fafc', borderRadius:10, border:'1px dashed var(--bdr)' }}>
            <div className="fg" style={{ margin:0, flex:1 }}>
              <label className="fl">Jour</label>
              <select className="fi fsel" value={newSlot.jour_semaine} onChange={e => setNewSlot(s => ({ ...s, jour_semaine:Number(e.target.value) }))}>
                {JOURS.map((j,i) => <option key={i} value={i}>{j}</option>)}
              </select>
            </div>
            <div className="fg" style={{ margin:0 }}>
              <label className="fl">De</label>
              <input className="fi" type="time" value={newSlot.heure_debut} onChange={e => setNewSlot(s => ({ ...s, heure_debut:e.target.value }))} />
            </div>
            <div className="fg" style={{ margin:0 }}>
              <label className="fl">À</label>
              <input className="fi" type="time" value={newSlot.heure_fin} onChange={e => setNewSlot(s => ({ ...s, heure_fin:e.target.value }))} />
            </div>
            <button className="btn btn-p" onClick={addSlot} disabled={busy}>+ Ajouter</button>
          </div>
        </div>
      )}

      {/* ── Exceptions ── */}
      {active && (
        <div style={{ marginTop:24, borderTop:'1px solid var(--bdr)', paddingTop:20 }}>
          <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>🚫 Exceptions (jours fermés / créneaux ponctuels)</div>

          {excs.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
              {excs.map(e => (
                <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 12px', background:'var(--bg)', borderRadius:8 }}>
                  <span style={{ fontWeight:600, fontSize:13, minWidth:100 }}>{new Date(e.date).toLocaleDateString('fr-FR')}</span>
                  <span style={{ padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600,
                    background: e.type==='ferme' ? '#fee2e2' : '#dcfce7', color: e.type==='ferme' ? '#991b1b' : '#166534' }}>
                    {e.type === 'ferme' ? 'Fermé' : `Ouvert ${e.heure_debut}–${e.heure_fin}`}
                  </span>
                  {e.motif && <span style={{ fontSize:12, color:'var(--t3)' }}>· {e.motif}</span>}
                  <button onClick={() => delExc(e.id)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#991b1b', fontSize:16 }}>×</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 2fr auto', gap:8, alignItems:'end', padding:'12px', background:'#f8fafc', borderRadius:10, border:'1px dashed var(--bdr)' }}>
            <div className="fg" style={{ margin:0 }}>
              <label className="fl">Date</label>
              <input className="fi" type="date" value={newExc.date} onChange={e => setNewExc(s => ({ ...s, date:e.target.value }))} />
            </div>
            <div className="fg" style={{ margin:0 }}>
              <label className="fl">Type</label>
              <select className="fi fsel" value={newExc.type} onChange={e => setNewExc(s => ({ ...s, type:e.target.value }))}>
                <option value="ferme">Fermé</option>
                <option value="ouvert">Ouvert (créneau spécial)</option>
              </select>
            </div>
            {newExc.type === 'ouvert' ? (
              <div className="fg" style={{ margin:0 }}>
                <label className="fl">De / À</label>
                <div style={{ display:'flex', gap:4 }}>
                  <input className="fi" type="time" value={newExc.heure_debut} onChange={e => setNewExc(s => ({ ...s, heure_debut:e.target.value }))} />
                  <input className="fi" type="time" value={newExc.heure_fin} onChange={e => setNewExc(s => ({ ...s, heure_fin:e.target.value }))} />
                </div>
              </div>
            ) : <div />}
            <div className="fg" style={{ margin:0 }}>
              <label className="fl">Motif (optionnel)</label>
              <input className="fi" placeholder="Vacances, formation…" value={newExc.motif} onChange={e => setNewExc(s => ({ ...s, motif:e.target.value }))} />
            </div>
            <button className="btn btn-p" onClick={addExc} disabled={busy}>+ Ajouter</button>
          </div>
        </div>
      )}
    </>
  );
}

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
  const { user, logout, loginWithToken, updateUser } = useAuth();
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

      {/* ── GOOGLE CALENDAR (coach uniquement) ───────────────────────── */}
      {user?.role === 'coach' && (
        <Section title="🗓️ Synchronisation Google Calendar">
          <GoogleCalendarSettings user={user} updateUser={updateUser} />
        </Section>
      )}

      {/* ── RÉSERVATION CLIENT (coach uniquement) ────────────────────── */}
      {user?.role === 'coach' && (
        <Section title="📅 Réservation de séances par le client">
          <ReservationSettings user={user} updateUser={updateUser} />
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
