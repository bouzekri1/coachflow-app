import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import usePushNotifications from '../hooks/usePushNotifications';
import { Loader, Empty, STag, PBar, Modal, toast, Lightbox, ExerciseImg } from '../components/UI';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';

/* ── HELPERS ─────────────────────────────────────────────────────────────── */
const fmtDay  = (dt) => new Date(dt).toLocaleDateString('fr-FR', { day: 'numeric' });
const fmtMon  = (dt) => new Date(dt).toLocaleDateString('fr-FR', { month: 'short' });
const fmtTime = (dt) => new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtFull = (dt) => new Date(dt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

const METRICS = [
  { key: 'poids_kg',        label: 'Poids',          unit: 'kg', color: '#1D9E75', bg: '#E8F8F2', tc: '#065f46' },
  { key: 'tour_taille_cm',  label: 'Tour de taille', unit: 'cm', color: '#3B82F6', bg: '#EFF6FF', tc: '#1E40AF' },
  { key: 'tour_hanches_cm', label: 'Tour de hanches',unit: 'cm', color: '#F59E0B', bg: '#FFFBEB', tc: '#92400E' },
  { key: 'masse_grasse_pct',label: 'Masse grasse',   unit: '%',  color: '#EF4444', bg: '#FEF2F2', tc: '#991B1B' },
];

/* ── DATE BADGE ──────────────────────────────────────────────────────────── */
function DateBadge({ dt, color = '#3B82F6', bg = '#EFF6FF' }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: 12, background: bg, color,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flexShrink: 0,
    }}>
      <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{fmtDay(dt)}</div>
      <div style={{ fontSize: 9, textTransform: 'uppercase', fontWeight: 700 }}>{fmtMon(dt)}</div>
    </div>
  );
}

/* ── LAYOUT PORTAIL ───────────────────────────────────────────────────────── */
/* ── ICÔNES BOTTOM NAV ───────────────────────────────────────────────────── */
const NAV_ICONS = {
  dashboard: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></>,
  seances:   <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  carnet:    <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  mesures:   <><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/></>,
  messages:  <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  nutrition: <><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>,
  checkin:   <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>,
  photos:    <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
};

function NavIcon({ name }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {NAV_ICONS[name]}
    </svg>
  );
}

export function ClientPortalLayout() {
  const [tab, setTab] = useState('dashboard');
  const [unread, setUnread] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const { user, logout } = useAuth();
  const { permission, subscribed, subscribe, unsubscribe } = usePushNotifications();
  const ini = (`${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`).toUpperCase()
    || user?.username?.[0]?.toUpperCase() || '?';

  useEffect(() => {
    const poll = () => api.portal.unreadMessages().then(d => setUnread(d.count || 0)).catch(() => {});
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, []);

  // Récupère les nouveaux badges au chargement et affiche un toast pour chacun
  useEffect(() => {
    api.gamification.portalSummary().then(d => {
      (d.nouveaux_badges || []).forEach((b, i) => {
        setTimeout(() => toast(`${b.icone} Nouveau succès : ${b.nom} !`), i * 1500);
      });
    }).catch(() => {});
  }, []);

  const switchTab = (key) => {
    setTab(key);
    setShowMore(false);
    if (key === 'messages') setUnread(0);
  };

  const TABS = [
    { key: 'dashboard',  label: '🏠 Accueil' },
    { key: 'seances',    label: '📅 Séances' },
    { key: 'programme',  label: '🏋️ Programme' },
    { key: 'carnet',     label: '💪 Carnet' },
    { key: 'mesures',    label: '📊 Mesures' },
    { key: 'nutrition',  label: '🥗 Nutrition' },
    { key: 'checkin',    label: '📋 Check-in' },
    { key: 'photos',     label: '📸 Photos' },
    { key: 'badges',     label: '🏆 Succès' },
    { key: 'messages',   label: '💬 Messages' },
  ];

  /* Tabs bottom nav mobile : 5 principaux + "Plus" */
  const MAIN_TABS  = ['dashboard','seances','carnet','mesures','messages'];
  const MAIN_LBLS  = { dashboard:'Accueil', seances:'Séances', carnet:'Carnet', mesures:'Mesures', messages:'Messages' };
  const MORE_TABS  = ['programme','nutrition','checkin','photos','badges'];
  const MORE_LBLS  = { programme:'Programme', nutrition:'Nutrition', checkin:'Check-in', photos:'Photos', badges:'Succès' };
  const moreActive = MORE_TABS.includes(tab);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header desktop + mobile compact ── */}
      <div className="phdr" style={{
        background: '#fff', borderBottom: '1px solid var(--bdr)',
        padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16, height: 58,
        boxShadow: '0 1px 4px rgba(0,0,0,.06)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9,
            background: 'linear-gradient(135deg, #065f46, #1D9E75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#fff', flexShrink: 0,
          }}>⚡</div>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>TrainFlow</div>
        </div>

        {/* Tabs desktop */}
        <div className="phdr-tabs" style={{ display: 'flex', gap: 2, flex: 1 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => switchTab(t.key)} style={{
              padding: '6px 14px', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all .12s',
              background: tab === t.key ? 'var(--acc2)' : 'transparent',
              color: tab === t.key ? 'var(--acc3)' : 'var(--t2)',
              position: 'relative', whiteSpace: 'nowrap',
            }}>
              {t.label}
              {t.key === 'messages' && unread > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  minWidth: 16, height: 16, borderRadius: 8,
                  background: 'var(--red)', color: '#fff',
                  fontSize: 10, fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 4px',
                }}>{unread > 9 ? '9+' : unread}</span>
              )}
            </button>
          ))}
        </div>

        {/* User desktop */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg, #065f46, #1D9E75)',
            color: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0,
          }}>{ini}</div>
          <div className="phdr-name">
            <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.first_name} {user?.last_name}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)' }}>Espace client</div>
          </div>
          {permission !== 'denied' && (
            <button onClick={subscribed ? unsubscribe : subscribe} title={subscribed ? 'Désactiver les notifications' : 'Activer les notifications'} style={{
              padding: '5px 8px', border: '1px solid var(--bdr)',
              borderRadius: 8, background: subscribed ? 'var(--acc2)' : 'transparent',
              cursor: 'pointer', fontSize: 15, lineHeight: 1,
            }}>{subscribed ? '🔔' : '🔕'}</button>
          )}
          <button onClick={logout} style={{
            marginLeft: 6, padding: '5px 10px', border: '1px solid var(--bdr)',
            borderRadius: 8, background: 'transparent', cursor: 'pointer',
            fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap',
          }}>Déco</button>
        </div>
      </div>

      {/* ── Contenu ── */}
      <div className="pcontent" style={{ maxWidth: 880, margin: '0 auto', padding: '20px 16px' }}>
        {tab === 'dashboard'  && <PortalDashboard onGoMessages={() => switchTab('messages')} />}
        {tab === 'seances'    && <PortalSeances />}
        {tab === 'programme'  && <PortalProgramme />}
        {tab === 'carnet'     && <PortalCarnet />}
        {tab === 'mesures'    && <PortalMesures />}
        {tab === 'nutrition'  && <PortalNutrition />}
        {tab === 'checkin'    && <PortalCheckin />}
        {tab === 'photos'     && <PortalPhotos />}
        {tab === 'badges'     && <PortalBadges />}
        {tab === 'messages'   && <PortalMessages />}
      </div>

      {/* ── Bottom nav mobile ── */}
      <nav className="pnav">
        {MAIN_TABS.map(key => (
          <button key={key} className={`pnav-item${tab === key ? ' on' : ''}`}
            onClick={() => switchTab(key)}>
            <NavIcon name={key} />
            {MAIN_LBLS[key]}
            {key === 'messages' && unread > 0 && (
              <span className="pnav-badge">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>
        ))}
        {/* Bouton Plus */}
        <button className={`pnav-item${moreActive ? ' on' : ''}`}
          onClick={() => setShowMore(v => !v)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>
          </svg>
          Plus
        </button>
      </nav>

      {/* ── More drawer ── */}
      {showMore && (
        <>
          <div className="pmore-overlay" onClick={() => setShowMore(false)} />
          <div className="pmore-sheet">
            {MORE_TABS.map(key => (
              <button key={key} className={`pmore-btn${tab === key ? ' on' : ''}`}
                onClick={() => switchTab(key)}>
                <NavIcon name={key} />
                {MORE_LBLS[key]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── STAT BOX ────────────────────────────────────────────────────────────── */
function StatBox({ icon, value, label, color, bg }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--bdr)', borderRadius: 14,
      padding: '12px 10px', boxShadow: 'var(--sh)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2, lineHeight: 1.3 }}>{label}</div>
      </div>
    </div>
  );
}

/* ── DASHBOARD CLIENT ─────────────────────────────────────────────────────── */
function ProgrammePlan({ jours, openDay, setOpenDay }) {
  const semaines = jours.reduce((acc, j) => {
    const s = j.semaine || 1; acc[s] = acc[s] || []; acc[s].push(j); return acc;
  }, {});
  if (jours.length === 0) return (
    <div style={{ textAlign:'center', padding:'32px 0', color:'var(--t3)', fontSize:13 }}>
      Le plan détaillé n'a pas encore été renseigné par votre coach.
    </div>
  );
  return Object.keys(semaines).sort((a,b) => a-b).map(sem => (
    <div key={sem} style={{ marginBottom:16 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>
        Semaine {sem}
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {semaines[sem].map(jour => {
          const isOpen = openDay === jour.id;
          return (
            <div key={jour.id} className="card" style={{ padding:'12px 14px' }}>
              <button onClick={() => setOpenDay(isOpen ? null : jour.id)} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                width:'100%', background:'none', border:'none', cursor:'pointer', padding:0,
              }}>
                <div style={{ textAlign:'left' }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>
                    {JOURS_LABELS_P[jour.jour]}{jour.titre ? ` — ${jour.titre}` : ''}
                  </div>
                  <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>
                    {jour.exercices?.length || 0} exercice{(jour.exercices?.length || 0) !== 1 ? 's' : ''}
                  </div>
                </div>
                <span style={{ fontSize:18, color:'var(--t3)', transition:'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
              </button>
              {isOpen && (
                <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
                  {(jour.exercices || []).length === 0
                    ? <div style={{ fontSize:13, color:'var(--t3)', fontStyle:'italic' }}>Aucun exercice renseigné.</div>
                    : jour.exercices.map((ex, i) => (
                      <div key={ex.id} style={{ display:'flex', alignItems:'center', gap:12, background:'var(--bg)', borderRadius:10, padding:'10px 12px' }}>
                        <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, background:'linear-gradient(135deg,#065f46,#1D9E75)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }}>{i+1}</div>
                        {ex.exercice_gif && (
                          <img src={ex.exercice_gif} alt={ex.nom_affiche} style={{ width:36, height:36, objectFit:'cover', borderRadius:7, flexShrink:0 }} onError={e => { e.target.style.display='none'; }} />
                        )}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:600, fontSize:13 }}>{ex.nom_affiche}</div>
                          <div style={{ fontSize:12, color:'var(--t3)', marginTop:1 }}>{ex.series} séries × {ex.reps} · repos {ex.repos_sec}s</div>
                          {ex.notes && <div style={{ fontSize:11, color:'var(--t2)', marginTop:1, fontStyle:'italic' }}>{ex.notes}</div>}
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ));
}

function ProgrammeDetailModal({ onClose }) {
  const [programmes, setProgrammes] = useState(null);
  const [selected, setSelected]     = useState(null);
  const [openDay, setOpenDay]       = useState(null);

  useEffect(() => {
    api.portal.programme()
      .then(d => setProgrammes(Array.isArray(d) ? d : [d]))
      .catch(() => {});
  }, []);

  const prog = selected !== null ? programmes?.[selected] : null;

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()} style={{ zIndex:1100 }}>
      <div className="modal" style={{ maxWidth:640, width:'95vw', maxHeight:'90vh', display:'flex', flexDirection:'column' }}>

        {/* En-tête */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, flexShrink:0 }}>
          {prog && (
            <button onClick={() => { setSelected(null); setOpenDay(null); }}
              style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--t3)', lineHeight:1, padding:'0 4px' }}>
              ←
            </button>
          )}
          <div style={{ fontSize:18, fontWeight:800, flex:1 }}>
            {prog ? prog.assignation.programme_nom : 'Mes programmes'}
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'var(--t3)', lineHeight:1 }}>×</button>
        </div>

        {/* Contenu */}
        {!programmes ? <Loader /> : programmes.length === 0 ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'var(--t3)' }}>Aucun programme actif.</div>

        ) : !prog ? (
          /* Liste des programmes */
          <div style={{ display:'flex', flexDirection:'column', gap:10, overflowY:'auto' }}>
            {programmes.map((p, i) => {
              const a = p.assignation;
              const pct = a.progression_pct || 0;
              return (
                <div key={i} onClick={() => setSelected(i)} style={{
                  padding:'14px 16px', borderRadius:12, border:'1px solid var(--bdr)',
                  cursor:'pointer', transition:'background .12s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <div style={{ fontWeight:700, fontSize:15 }}>🏋️ {a.programme_nom}</div>
                    <div style={{ fontWeight:800, fontSize:15, color: pct >= 70 ? '#1D9E75' : pct >= 30 ? '#F59E0B' : 'var(--t2)' }}>{pct}%</div>
                  </div>
                  <div style={{ height:6, borderRadius:3, background:'var(--bdr)', overflow:'hidden', marginBottom:6 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background:'var(--acc)', borderRadius:3, transition:'width .4s' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--t3)' }}>
                    <span>{a.programme_duree_semaines} sem. · {a.programme_seances_par_semaine} séances/sem.</span>
                    <span>{a.seances_realisees}/{a.seances_total} séances · Voir le plan →</span>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (
          /* Détail du programme sélectionné */
          <>
            <div style={{ marginBottom:12, flexShrink:0, fontSize:12, color:'var(--t3)' }}>
              {prog.assignation.programme_duree_semaines} sem. · {prog.assignation.programme_seances_par_semaine} séances/sem.
              {' · '}{prog.assignation.seances_realisees}/{prog.assignation.seances_total} séances réalisées
            </div>
            <div style={{ overflowY:'auto', flex:1 }}>
              <ProgrammePlan jours={prog.jours} openDay={openDay} setOpenDay={setOpenDay} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PortalDashboard({ onGoMessages }) {
  const [data, setData] = useState(null);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [showProg, setShowProg] = useState(false);
  const [gami, setGami] = useState(null);

  useEffect(() => {
    api.portal.dashboard().then(setData).catch(() => {});
    api.portal.unreadMessages().then(d => setUnreadMsgs(d.count || 0)).catch(() => {});
    api.gamification.portalSummary().then(setGami).catch(() => {});
  }, []);
  if (!data) return <Loader />;

  const { client, prochaines_seances, programmes_actifs = [], objectifs } = data;
  const doneObj = objectifs.filter(o => o.statut === 'atteint').length;
  const hour = new Date().getHours();
  const greeting = hour < 18 ? 'Bonjour' : 'Bonsoir';

  return (
    <div>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #065f46 0%, #1D9E75 100%)',
        borderRadius: 16, padding: '24px 28px', marginBottom: 22, color: '#fff',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 30px rgba(29,158,117,.25)',
      }}>
        <div style={{
          position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)',
          fontSize: 110, opacity: 0.08, lineHeight: 1, pointerEvents: 'none',
        }}>💪</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
          {greeting}, {client.prenom} 👋
        </div>
        <div style={{ fontSize: 13, opacity: 0.75 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {programmes_actifs.length > 0 && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {programmes_actifs.map(pa => (
              <div key={pa.id} onClick={() => setShowProg(true)}
                style={{ background: 'rgba(255,255,255,.18)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'background .15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.26)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.18)'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6 }}>🏋️ {pa.programme_nom}</div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,.3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#fff', borderRadius: 3, width: `${Math.min(100, pa.progression_pct)}%`, transition: 'width .6s ease' }} />
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7, marginTop: 5 }}>
                    {pa.seances_realisees}/{pa.seances_total} séances · Semaine {pa.semaine_courante}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 900 }}>{pa.progression_pct}%</div>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>Voir →</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bandeau gamification */}
      {gami && (gami.streak_actif > 0 || gami.badges_acquis > 0) && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:10, marginBottom:16 }}>
          {gami.streak_actif > 0 && (
            <div style={{ background:'linear-gradient(135deg, #f97316, #ea580c)', borderRadius:12, padding:'12px 14px', color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:26 }}>🔥</div>
              <div>
                <div style={{ fontSize:18, fontWeight:900, lineHeight:1 }}>{gami.streak_actif} jour{gami.streak_actif > 1 ? 's' : ''}</div>
                <div style={{ fontSize:10, opacity:.9, marginTop:3, fontWeight:600 }}>Streak actif</div>
              </div>
            </div>
          )}
          {gami.streak_seances > 0 && (
            <div style={{ background:'linear-gradient(135deg, #059669, #047857)', borderRadius:12, padding:'12px 14px', color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:26 }}>💪</div>
              <div>
                <div style={{ fontSize:18, fontWeight:900, lineHeight:1 }}>{gami.streak_seances}</div>
                <div style={{ fontSize:10, opacity:.9, marginTop:3, fontWeight:600 }}>Séances d'affilée</div>
              </div>
            </div>
          )}
          <div style={{ background:'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius:12, padding:'12px 14px', color:'#fff', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ fontSize:26 }}>🏆</div>
            <div>
              <div style={{ fontSize:18, fontWeight:900, lineHeight:1 }}>{gami.badges_acquis}<span style={{ fontSize:12, opacity:.8 }}> / {gami.badges_total}</span></div>
              <div style={{ fontSize:10, opacity:.9, marginTop:3, fontWeight:600 }}>Succès débloqués</div>
            </div>
          </div>
        </div>
      )}

      {/* Bannière messages non lus */}
      {unreadMsgs > 0 && (
        <div onClick={onGoMessages} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: 12,
          padding: '12px 16px', marginBottom: 16, cursor: 'pointer',
          transition: 'background .12s',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: '#3B82F6',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
          }}>💬</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>
              {unreadMsgs} nouveau{unreadMsgs > 1 ? 'x' : ''} message{unreadMsgs > 1 ? 's' : ''} de votre coach
            </div>
            <div style={{ fontSize: 11, color: '#3B82F6', marginTop: 1 }}>Cliquez pour lire</div>
          </div>
          <span style={{
            minWidth: 24, height: 24, borderRadius: 12, background: '#EF4444',
            color: '#fff', fontSize: 12, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px',
          }}>{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>
          <span style={{ fontSize: 16, color: '#3B82F6' }}>→</span>
        </div>
      )}

      {/* Stat boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10, marginBottom: 18 }}>
        <StatBox icon="📅" value={prochaines_seances.length} label="Séances à venir" color="#3B82F6" bg="#EFF6FF" />
        <StatBox icon="🏋️"
          value={programmes_actifs.length > 0 ? programmes_actifs.reduce((s, p) => s + (p.seances_realisees || 0), 0) + '/' + programmes_actifs.reduce((s, p) => s + (p.seances_total || 0), 0) : '—'}
          label="Séances réalisées" color="#1D9E75" bg="#E8F8F2" />
        <StatBox icon="🎯"
          value={objectifs.length ? `${doneObj}/${objectifs.length}` : '—'}
          label="Objectifs atteints" color="#F59E0B" bg="#FFFBEB" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 16 }}>
        {/* Prochaines séances */}
        <div className="card">
          <div className="card-t">Prochaines séances</div>
          {prochaines_seances.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--t3)', padding: '8px 0' }}>Aucune séance planifiée</div>
            : prochaines_seances.slice(0, 3).map(s => (
              <div key={s.id} style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--bdr)',
              }}>
                <DateBadge dt={s.date_heure} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {s.titre || 'Séance'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>
                    {fmtTime(s.date_heure)} · {s.duree_minutes} min
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        {/* Objectifs */}
        <div className="card">
          <div className="card-t">Mes objectifs</div>
          {objectifs.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--t3)', padding: '8px 0' }}>Aucun objectif défini</div>
            : objectifs.slice(0, 4).map(o => (
              <div key={o.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid var(--bdr)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {o.statut === 'atteint' ? '✅ ' : ''}{o.titre}
                  </div>
                  <PBar value={o.progression_pct} />
                </div>
                <STag s={o.statut} />
                {o.statut === 'en_cours' && (
                  <button
                    className="btn btn-s btn-sm"
                    style={{ fontSize: 11, whiteSpace: 'nowrap' }}
                    onClick={async () => {
                      try {
                        await api.portal.updateObjectif(o.id, { statut: 'atteint' });
                        setData(d => ({ ...d, objectifs: d.objectifs.map(x => x.id === o.id ? { ...x, statut: 'atteint' } : x) }));
                        toast('🎉 Objectif atteint !');
                      } catch (e) { toast(e.message, 'err'); }
                    }}
                  >✓ Atteint</button>
                )}
              </div>
            ))
          }
        </div>
      </div>
      {showProg && <ProgrammeDetailModal onClose={() => setShowProg(false)} />}
    </div>
  );
}

/* ── SÉANCES CLIENT ───────────────────────────────────────────────────────── */
function ReserverModal({ onClose, onDone }) {
  const [data, setData]         = useState(null);
  const [selectedDay, setSelDay] = useState(null);
  const [selectedSlot, setSelSlot] = useState(null);
  const [busy, setBusy]         = useState(false);
  const today = new Date();
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });

  useEffect(() => {
    const dStart = new Date(); dStart.setHours(0,0,0,0);
    const dEnd = new Date(); dEnd.setDate(dEnd.getDate() + 60);
    const fmt = d => d.toISOString().slice(0,10);
    api.reservation.portalSlots(`?date_debut=${fmt(dStart)}&date_fin=${fmt(dEnd)}`)
      .then(setData).catch(() => setData({ active:false, slots:[] }));
  }, []);

  const reserver = async () => {
    if (!selectedSlot) return;
    setBusy(true);
    try {
      await api.reservation.portalReserver({ date_heure: selectedSlot });
      toast('Séance réservée !');
      onDone();
    } catch (e) { toast(e.message, 'err'); setBusy(false); }
  };

  if (!data) return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:500 }}>
        <div className="mhd"><div className="mttl">📅 Réserver une séance</div></div>
        <div className="mbd" style={{ textAlign:'center', padding:'40px 20px' }}>
          <div className="spin" style={{ margin:'0 auto' }} />
        </div>
      </div>
    </div>
  );

  if (!data.active) return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:460 }}>
        <div className="mhd">
          <div className="mttl">📅 Réservation indisponible</div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--t3)' }}>×</button>
        </div>
        <div className="mbd" style={{ textAlign:'center', padding:'30px 20px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📵</div>
          <div style={{ fontWeight:600, marginBottom:8 }}>Votre coach n'a pas activé la réservation</div>
          <div style={{ fontSize:13, color:'var(--t3)' }}>Contactez-le pour planifier votre prochaine séance.</div>
        </div>
        <div className="mft"><button className="btn btn-p" onClick={onClose}>Fermer</button></div>
      </div>
    </div>
  );

  // Index des slots par jour YYYY-MM-DD
  const slotsByDay = {};
  data.slots.forEach(s => {
    const d = new Date(s.date_heure);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!slotsByDay[key]) slotsByDay[key] = [];
    slotsByDay[key].push(s);
  });

  const { year, month } = calMonth;
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedKey = selectedDay
    ? `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
    : null;
  const slotsForDay = selectedKey ? (slotsByDay[selectedKey] || []) : [];

  const prevMonth = () => { setSelDay(null); setSelSlot(null); setCalMonth(({year:y,month:m}) => m===0 ? {year:y-1,month:11} : {year:y,month:m-1}); };
  const nextMonth = () => { setSelDay(null); setSelSlot(null); setCalMonth(({year:y,month:m}) => m===11 ? {year:y+1,month:0} : {year:y,month:m+1}); };

  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:540 }}>
        <div className="mhd">
          <div>
            <div className="mttl">📅 Réserver une séance</div>
            <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>
              Durée : {data.duree_min} min · Préavis : {data.preavis_h}h
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:20, color:'var(--t3)' }}>×</button>
        </div>

        <div className="mbd">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <button onClick={prevMonth} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--bdr)', background:'transparent', cursor:'pointer' }}>‹</button>
            <div style={{ fontSize:15, fontWeight:700, textTransform:'capitalize' }}>{monthLabel}</div>
            <button onClick={nextMonth} style={{ width:32, height:32, borderRadius:8, border:'1px solid var(--bdr)', background:'transparent', cursor:'pointer' }}>›</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
            {DAYS_FR.map(d => <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'var(--t3)', padding:'4px 0' }}>{d}</div>)}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} />;
              const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const daySlots = slotsByDay[key] || [];
              const isToday = key === todayKey;
              const isSelected = day === selectedDay;
              const hasSlots = daySlots.length > 0;
              return (
                <button key={day} onClick={() => { if (hasSlots) { setSelDay(isSelected ? null : day); setSelSlot(null); } }}
                  style={{
                    border: isSelected ? '2px solid var(--acc)' : isToday ? '2px solid #1D9E75' : '1px solid transparent',
                    borderRadius:9, padding:'6px 2px 5px', minHeight:46,
                    background: isSelected ? 'var(--acc2)' : hasSlots ? '#dcfce7' : 'transparent',
                    cursor: hasSlots ? 'pointer' : 'default', opacity: hasSlots ? 1 : 0.45,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                  }}>
                  <span style={{ fontSize:13, fontWeight: isToday || isSelected ? 800 : 500, color: isSelected ? 'var(--acc3)' : 'var(--t1)' }}>{day}</span>
                  {hasSlots && <span style={{ fontSize:9, fontWeight:700, color:'#166534' }}>{daySlots.length}</span>}
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <div style={{ marginTop:18, borderTop:'1px solid var(--bdr)', paddingTop:14 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>
                Créneaux du {new Date(year, month, selectedDay).toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
              </div>
              {slotsForDay.length === 0
                ? <div style={{ fontSize:12, color:'var(--t3)' }}>Aucun créneau disponible.</div>
                : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(80px, 1fr))', gap:6 }}>
                    {slotsForDay.map(s => {
                      const dt = new Date(s.date_heure);
                      const lbl = dt.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
                      const isSel = selectedSlot === s.date_heure;
                      return (
                        <button key={s.date_heure} onClick={() => setSelSlot(s.date_heure)}
                          style={{
                            padding:'8px 4px', borderRadius:8, fontSize:13, fontWeight:600,
                            border:`2px solid ${isSel ? 'var(--acc)' : 'var(--bdr)'}`,
                            background: isSel ? 'var(--acc2)' : 'var(--bg)',
                            color: isSel ? 'var(--acc3)' : 'var(--t1)', cursor:'pointer',
                          }}>{lbl}</button>
                      );
                    })}
                  </div>
                )
              }
            </div>
          )}

          {data.slots.length === 0 && (
            <div style={{ marginTop:18, padding:'20px', textAlign:'center', background:'var(--bg)', borderRadius:10 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>😴</div>
              <div style={{ fontSize:13, color:'var(--t3)' }}>Aucun créneau disponible pour le moment.</div>
            </div>
          )}
        </div>

        <div className="mft">
          <button className="btn btn-s" onClick={onClose}>Annuler</button>
          <button className="btn btn-p" onClick={reserver} disabled={!selectedSlot || busy}>
            {busy ? 'Réservation…' : selectedSlot ? `✓ Réserver ${new Date(selectedSlot).toLocaleString('fr-FR', { weekday:'short', day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}` : 'Choisir un créneau'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PortalSeances() {
  const [seances, setSeances] = useState(null);
  const [demandes, setDemandes] = useState({});
  const [view, setView] = useState('calendar');
  const [selectedCarnet, setSelectedCarnet] = useState(null);
  const [showReserver, setShowReserver] = useState(false);
  const today = new Date();
  const [calMonth, setCalMonth] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDay, setSelectedDay] = useState(null);

  const load = () => api.portal.seances().then(d => setSeances(d.results || d)).catch(() => setSeances([]));
  useEffect(() => { load(); }, []);

  const demanderAnnulation = async (s) => {
    if (demandes[s.id]) return;
    try {
      await api.portal.demanderAnnulation(s.id);
      setDemandes(d => ({ ...d, [s.id]: true }));
      toast('Demande envoyée à votre coach');
    } catch (e) { toast(e.message, 'err'); }
  };

  if (!seances) return <Loader />;

  const futures = seances.filter(s => s.statut === 'planifiee');
  const passees = seances.filter(s => s.statut === 'realisee');

  const SeanceRow = ({ s, showCancel }) => (
    <div style={{
      display: 'flex', gap: 14, padding: '12px 0',
      borderBottom: '1px solid var(--bdr)', alignItems: 'center',
    }}>
      <DateBadge dt={s.date_heure}
        color={s.statut === 'planifiee' ? '#3B82F6' : '#065f46'}
        bg={s.statut === 'planifiee' ? '#EFF6FF' : '#E8F8F2'} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{s.titre || 'Séance'}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
          {fmtTime(s.date_heure)} · {s.duree_minutes} min · {s.type_seance}
        </div>
      </div>
      <STag s={s.statut} />
      <button className="btn btn-p btn-sm" style={{ fontSize: 11, whiteSpace: 'nowrap' }}
        onClick={() => setSelectedCarnet(s.id)}>
        💪 Carnet
      </button>
      {showCancel && (
        demandes[s.id]
          ? <span style={{ fontSize: 11, color: 'var(--t3)' }}>Demande envoyée</span>
          : <button className="btn btn-sm"
              style={{ fontSize: 11, color: 'var(--red)', border: '1px solid var(--red)', background: 'transparent' }}
              onClick={() => demanderAnnulation(s)}>
              Annuler
            </button>
      )}
    </div>
  );

  const Badge = ({ n, color, bg }) => (
    <span style={{ background: bg, color, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>{n}</span>
  );

  /* ── Calendrier ── */
  const { year, month } = calMonth;
  const firstDay = new Date(year, month, 1).getDay(); // 0=dim
  const startOffset = (firstDay + 6) % 7; // lundi=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  // index séances par date locale "YYYY-MM-DD"
  const seancesByDay = {};
  seances.forEach(s => {
    const d = new Date(s.date_heure);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (!seancesByDay[key]) seancesByDay[key] = [];
    seancesByDay[key].push(s);
  });

  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const prevMonth = () => setCalMonth(({ year: y, month: m }) => m === 0 ? { year: y-1, month: 11 } : { year: y, month: m-1 });
  const nextMonth = () => setCalMonth(({ year: y, month: m }) => m === 11 ? { year: y+1, month: 0 } : { year: y, month: m+1 });

  const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedKey = selectedDay
    ? `${year}-${String(month+1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}`
    : null;
  const selectedSeances = selectedKey ? (seancesByDay[selectedKey] || []) : [];

  const CalView = () => (
    <div className="card">
      {/* En-tête mois */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={prevMonth} style={{
          width: 32, height: 32, borderRadius: 8, border: '1px solid var(--bdr)',
          background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--t2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</button>
        <div style={{ fontSize: 15, fontWeight: 700, textTransform: 'capitalize' }}>{monthLabel}</div>
        <button onClick={nextMonth} style={{
          width: 32, height: 32, borderRadius: 8, border: '1px solid var(--bdr)',
          background: 'transparent', cursor: 'pointer', fontSize: 16, color: 'var(--t2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>›</button>
      </div>

      {/* En-tête jours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAYS_FR.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'var(--t3)', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Grille */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const key = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const daySeances = seancesByDay[key] || [];
          const isToday = key === todayKey;
          const isSelected = day === selectedDay;
          const hasPlan = daySeances.some(s => s.statut === 'planifiee');
          const hasDone = daySeances.some(s => s.statut === 'realisee');

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              style={{
                border: isSelected ? '2px solid #3B82F6' : isToday ? '2px solid #1D9E75' : '1px solid transparent',
                borderRadius: 9,
                background: isSelected ? '#EFF6FF' : isToday ? '#E8F8F2' : daySeances.length ? 'var(--bg2)' : 'transparent',
                cursor: daySeances.length ? 'pointer' : 'default',
                padding: '6px 2px 5px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                minHeight: 44,
              }}
            >
              <span style={{
                fontSize: 13, fontWeight: isToday || isSelected ? 800 : 500,
                color: isSelected ? '#3B82F6' : isToday ? '#065f46' : 'var(--t1)',
              }}>{day}</span>
              {/* points */}
              {(hasPlan || hasDone) && (
                <div style={{ display: 'flex', gap: 3 }}>
                  {hasDone && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75' }} />}
                  {hasPlan && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6' }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div style={{ display: 'flex', gap: 14, marginTop: 14, fontSize: 11, color: 'var(--t3)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3B82F6', display: 'inline-block' }} />
          Planifiée
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />
          Réalisée
        </span>
      </div>

      {/* Détail jour sélectionné */}
      {selectedDay && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--bdr)', paddingTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--t2)' }}>
            {new Date(year, month, selectedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          {selectedSeances.length === 0
            ? <div style={{ fontSize: 12, color: 'var(--t3)' }}>Aucune séance ce jour</div>
            : selectedSeances.map(s => <SeanceRow key={s.id} s={s} showCancel={s.statut === 'planifiee'} />)
          }
        </div>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>Mes séances</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button onClick={() => setShowReserver(true)} className="btn btn-p btn-sm" style={{ fontSize: 12 }}>
            ➕ Réserver
          </button>
          {[['calendar','📅'],['list','📋']].map(([v, lbl]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 10px', border: '1px solid var(--bdr)', borderRadius: 8,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: view === v ? 'var(--acc2)' : 'transparent',
              color: view === v ? 'var(--acc3)' : 'var(--t2)',
            }}>{lbl}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>
        {futures.length > 0 ? `${futures.length} séance${futures.length > 1 ? 's' : ''} planifiée${futures.length > 1 ? 's' : ''}` : 'Aucune séance à venir'}
      </div>

      {view === 'calendar' ? <CalView /> : (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-t">
              À venir <Badge n={futures.length} color="#3B82F6" bg="#EFF6FF" />
            </div>
            {futures.length === 0
              ? <Empty icon="planning" title="Aucune séance planifiée" desc="Votre coach n'a pas encore planifié de séance" />
              : futures.map(s => <SeanceRow key={s.id} s={s} showCancel />)
            }
          </div>

          <div className="card">
            <div className="card-t">
              Passées <Badge n={passees.length} color="#065f46" bg="#E8F8F2" />
            </div>
            {passees.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--t3)', padding: '8px 0' }}>Aucune séance réalisée pour l'instant</div>
              : passees.map(s => <SeanceRow key={s.id} s={s} showCancel={false} />)
            }
          </div>
        </>
      )}

      {selectedCarnet && <CarnetModal seanceId={selectedCarnet} onClose={() => setSelectedCarnet(null)} />}
      {showReserver && <ReserverModal onClose={() => setShowReserver(false)} onDone={() => { setShowReserver(false); load(); }} />}
    </div>
  );
}

/* ── MESURES CLIENT ───────────────────────────────────────────────────────── */
function MesureTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--bdr)', borderRadius: 8,
      padding: '8px 12px', fontSize: 12, boxShadow: 'var(--sh-md)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{payload[0].value} {unit}</div>
    </div>
  );
}

function PortalMesures() {
  const [mesures, setMesures] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [metric, setMetric] = useState('poids_kg');
  const [f, setF] = useState({ date: '', poids_kg: '', tour_taille_cm: '', tour_hanches_cm: '', masse_grasse_pct: '' });
  const [busy, setBusy] = useState(false);
  const sf = (k, v) => setF(x => ({ ...x, [k]: v }));

  const load = () => api.portal.mesures().then(d => setMesures(d.results || d)).catch(() => setMesures([]));
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!f.date) return toast('La date est requise', 'err');
    setBusy(true);
    try {
      const payload = { ...f };
      ['poids_kg', 'tour_taille_cm', 'tour_hanches_cm', 'masse_grasse_pct'].forEach(k => {
        if (!payload[k]) delete payload[k]; else payload[k] = Number(payload[k]);
      });
      await api.portal.addMesure(payload);
      toast('Mesure enregistrée ✓ Votre coach a été notifié');
      setShowForm(false);
      setF({ date: '', poids_kg: '', tour_taille_cm: '', tour_hanches_cm: '', masse_grasse_pct: '' });
      load();
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  if (!mesures) return <Loader />;

  const m = METRICS.find(x => x.key === metric);
  const sorted = [...mesures].sort((a, b) => new Date(a.date) - new Date(b.date));
  const chartData = sorted
    .filter(x => x[metric] != null)
    .map(x => ({
      date: new Date(x.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      value: parseFloat(x[metric]),
    }));

  const first = chartData[0]?.value;
  const last  = chartData[chartData.length - 1]?.value;
  const delta = first != null && last != null && chartData.length > 1 ? last - first : null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Mes mesures</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2 }}>Suivez l'évolution de votre corps dans le temps</div>
        </div>
        <button className="btn btn-p" onClick={() => setShowForm(true)}>+ Ajouter</button>
      </div>

      {mesures.length === 0 ? (
        <Empty icon="trend" title="Aucune mesure enregistrée"
          desc="Ajoutez vos premières mesures pour suivre votre évolution"
          action={<button className="btn btn-p" onClick={() => setShowForm(true)}>+ Ajouter une mesure</button>} />
      ) : (
        <>
          {/* Chart card */}
          <div className="card" style={{ marginBottom: 16 }}>
            {/* Metric selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
              {METRICS.map(met => (
                <button key={met.key} onClick={() => setMetric(met.key)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: '1.5px solid', cursor: 'pointer', transition: 'all .12s',
                  borderColor: metric === met.key ? met.color : 'var(--bdr)',
                  background: metric === met.key ? met.color : '#fff',
                  color: metric === met.key ? '#fff' : 'var(--t2)',
                }}>
                  {met.label}
                </button>
              ))}
            </div>

            {/* Trend summary */}
            {delta != null && (
              <div style={{
                display: 'flex', gap: 24, alignItems: 'center', marginBottom: 18,
                background: 'var(--bg)', borderRadius: 12, padding: '14px 18px',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>Début</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {first}
                    <span style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 500, marginLeft: 4 }}>{m.unit}</span>
                  </div>
                </div>
                <div style={{ fontSize: 20, color: 'var(--bdr)' }}>→</div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>Actuel</div>
                  <div style={{ fontSize: 22, fontWeight: 800 }}>
                    {last}
                    <span style={{ fontSize: 13, color: 'var(--t3)', fontWeight: 500, marginLeft: 4 }}>{m.unit}</span>
                  </div>
                </div>
                <div style={{ marginLeft: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>Évolution</div>
                  <div style={{
                    fontSize: 22, fontWeight: 800,
                    color: delta < 0 ? '#059669' : delta > 0 ? '#EF4444' : 'var(--t2)',
                  }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                    <span style={{ fontSize: 13, fontWeight: 500, marginLeft: 4 }}>{m.unit}</span>
                  </div>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 32 }}>
                  {delta < 0 ? '📉' : delta > 0 ? '📈' : '➡️'}
                </div>
              </div>
            )}

            {/* Chart */}
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-measure" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={m.color} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={m.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--t3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--t3)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<MesureTooltip unit={m.unit} />} />
                  <Area type="monotone" dataKey="value" stroke={m.color} strokeWidth={2.5}
                    fill="url(#grad-measure)"
                    dot={{ r: 5, fill: m.color, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--t3)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                {chartData.length === 0
                  ? 'Aucune donnée pour cette mesure'
                  : 'Ajoutez au moins 2 mesures pour voir le graphique'}
              </div>
            )}
          </div>

          {/* Historique table */}
          <div className="card">
            <div className="card-t">Historique complet</div>
            <div className="twrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Poids</th><th>Tour taille</th><th>Tour hanches</th><th>Masse grasse</th>
                  </tr>
                </thead>
                <tbody>
                  {[...mesures].sort((a, b) => new Date(b.date) - new Date(a.date)).map(r => (
                    <tr key={r.id}>
                      <td className="fw6">
                        {new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td>{r.poids_kg        ? `${r.poids_kg} kg`        : '—'}</td>
                      <td>{r.tour_taille_cm  ? `${r.tour_taille_cm} cm`  : '—'}</td>
                      <td>{r.tour_hanches_cm ? `${r.tour_hanches_cm} cm` : '—'}</td>
                      <td>{r.masse_grasse_pct? `${r.masse_grasse_pct} %` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {showForm && (
        <Modal title="Ajouter une mesure" onClose={() => setShowForm(false)} footer={
          <>
            <button className="btn btn-s" onClick={() => setShowForm(false)}>Annuler</button>
            <button className="btn btn-p" onClick={submit} disabled={busy}>{busy ? 'Envoi...' : 'Enregistrer'}</button>
          </>
        }>
          <div className="fg">
            <label className="fl">Date *</label>
            <input className="fi" type="date" value={f.date} onChange={e => sf('date', e.target.value)} />
          </div>
          <div className="fr2">
            <div className="fg">
              <label className="fl">Poids (kg)</label>
              <input className="fi" type="number" step="0.1" placeholder="ex: 75.5" value={f.poids_kg} onChange={e => sf('poids_kg', e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Masse grasse (%)</label>
              <input className="fi" type="number" step="0.1" placeholder="ex: 18.5" value={f.masse_grasse_pct} onChange={e => sf('masse_grasse_pct', e.target.value)} />
            </div>
          </div>
          <div className="fr2">
            <div className="fg">
              <label className="fl">Tour de taille (cm)</label>
              <input className="fi" type="number" step="0.1" placeholder="ex: 82" value={f.tour_taille_cm} onChange={e => sf('tour_taille_cm', e.target.value)} />
            </div>
            <div className="fg">
              <label className="fl">Tour de hanches (cm)</label>
              <input className="fi" type="number" step="0.1" placeholder="ex: 96" value={f.tour_hanches_cm} onChange={e => sf('tour_hanches_cm', e.target.value)} />
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
            Votre coach sera automatiquement notifié lorsque vous enregistrez une mesure.
          </p>
        </Modal>
      )}
    </div>
  );
}

/* ── CARNET D'ENTRAÎNEMENT ────────────────────────────────────────────────── */
function PortalCarnet() {
  const [seances, setSeances] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.portal.seances().then(d => setSeances(d.results || d)).catch(() => setSeances([]));
  }, []);

  if (!seances) return <Loader />;

  const actives = seances.filter(s => ['planifiee', 'realisee'].includes(s.statut));

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Carnet d'entraînement</div>
      <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>Enregistrez vos séries en temps réel pendant la séance</div>

      {actives.length === 0
        ? <Empty icon="planning" title="Aucune séance" desc="Aucune séance planifiée ou réalisée pour l'instant" />
        : <div style={{ display: 'grid', gap: 10 }}>
            {actives.map(s => (
              <div key={s.id} style={{
                background: '#fff', border: '1px solid var(--bdr)', borderRadius: 14,
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: 'var(--sh)',
              }}>
                <DateBadge dt={s.date_heure}
                  color={s.statut === 'planifiee' ? '#3B82F6' : '#065f46'}
                  bg={s.statut === 'planifiee' ? '#EFF6FF' : '#E8F8F2'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{s.titre || 'Séance'}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                    {fmtTime(s.date_heure)} · {s.duree_minutes} min
                  </div>
                </div>
                <STag s={s.statut} />
                <button className="btn btn-p" style={{ fontSize: 12 }} onClick={() => setSelected(s.id)}>
                  💪 Carnet
                </button>
              </div>
            ))}
          </div>
      }

      {selected && <CarnetModal seanceId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

const GROUPE_LABELS = {
  pectoraux:'Pectoraux', dorsaux:'Dorsaux', epaules:'Épaules',
  biceps:'Biceps', triceps:'Triceps', abdominaux:'Abdominaux',
  quadriceps:'Quadriceps', ischio:'Ischio-jambiers', fessiers:'Fessiers',
  mollets:'Mollets', full_body:'Full body', cardio:'Cardio',
};

function ExerciceSearchInput({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
    setOpen(false);
    setResults([]);
  }, [value]);

  const search = (q) => {
    setQuery(q);
    clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const data = await api.portal.exercices(q);
        setResults(data || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 250);
  };

  const select = (nom) => {
    setQuery(nom);
    onChange(nom);
    setOpen(false);
    setResults([]);
  };

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        className="fi"
        placeholder="Rechercher ou saisir un exercice…"
        value={query}
        onChange={e => search(e.target.value)}
        onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
        autoComplete="off"
      />
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: '#fff', border: '1px solid var(--bdr)', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,.14)', zIndex: 200,
          maxHeight: 220, overflowY: 'auto',
        }}>
          {loading && (
            <div style={{ padding: '10px 14px', color: 'var(--t3)', fontSize: 13 }}>Recherche…</div>
          )}
          {!loading && results.map(ex => (
            <button key={ex.id} onMouseDown={() => select(ex.nom)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 14px', background: 'none', border: 'none',
              borderBottom: '1px solid var(--bdr)', cursor: 'pointer', textAlign: 'left',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{ex.nom}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{GROUPE_LABELS[ex.groupe] || ex.groupe}</div>
              </div>
            </button>
          ))}
          {!loading && query.trim() && (
            <button onMouseDown={() => select(query.trim())} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 14px', background: '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>✏️</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>"{query.trim()}"</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>Exercice personnalisé</div>
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CarnetModal({ seanceId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [logs, setLogs] = useState([]);
  const [exo, setExo] = useState('');
  const [serie, setSerie] = useState('');
  const [poids, setPoids] = useState('');
  const [reps, setReps] = useState('');
  const [duree, setDuree] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.portal.seanceDetail(seanceId).then(d => {
      setDetail(d);
      setLogs(d.series_log || []);
    }).catch(() => {});

  useEffect(() => { load(); }, [seanceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const nextSerieNum = (nom) => logs.filter(l => l.exercice_nom.toLowerCase() === nom.toLowerCase()).length + 1;

  const prefill = (nom) => { setExo(nom); setSerie(String(nextSerieNum(nom))); };

  const submit = async () => {
    if (!exo.trim()) return toast('Nom de l\'exercice requis', 'err');
    setBusy(true);
    try {
      const payload = {
        exercice_nom: exo.trim(),
        serie_numero: parseInt(serie) || nextSerieNum(exo.trim()),
      };
      if (poids) payload.poids_kg = parseFloat(poids);
      if (reps) payload.repetitions = parseInt(reps);
      if (duree) payload.duree_secondes = parseInt(duree);
      if (notes.trim()) payload.notes = notes.trim();
      await api.portal.logSerie(seanceId, payload);
      toast('Série enregistrée ✓');
      setSerie(''); setPoids(''); setReps(''); setDuree(''); setNotes('');
      load();
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const deleteSerie = async (logId) => {
    try {
      await api.portal.deleteSerie(seanceId, logId);
      setLogs(l => l.filter(x => x.id !== logId));
    } catch (e) { toast(e.message, 'err'); }
  };

  const grouped = logs.reduce((acc, l) => {
    if (!acc[l.exercice_nom]) acc[l.exercice_nom] = [];
    acc[l.exercice_nom].push(l);
    return acc;
  }, {});

  const exercicesPlanifies = detail?.exercices_planifies || [];
  const plannedExos = exercicesPlanifies.length > 0
    ? exercicesPlanifies.map(e => e.exercice_details?.nom || 'Exercice')
    : (detail?.exercices || []).map(e => (typeof e === 'string' ? e : e?.nom || '')).filter(Boolean);

  if (!detail) return <Modal title="Carnet d'entraînement" onClose={onClose}><Loader /></Modal>;

  return (
    <Modal
      title={`💪 ${detail.titre || 'Séance'} — ${fmtFull(detail.date_heure)}`}
      onClose={onClose}
      footer={<button className="btn btn-s" onClick={onClose}>Fermer</button>}
    >
      {/* Exercices planifiés avec GIFs */}
      {exercicesPlanifies.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Programme du jour
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {exercicesPlanifies.map((item, idx) => {
              const ex = item.exercice_details;
              const nom = ex?.nom || 'Exercice';
              const isSelected = exo === nom;
              return (
                <button key={item.id} onClick={() => prefill(nom)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
                  borderRadius: 10, border: `1.5px solid ${isSelected ? 'var(--acc)' : 'var(--bdr)'}`,
                  background: isSelected ? 'var(--acc)11' : 'var(--bg)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
                }}>
                  {ex?.gif_url && (
                    <ExerciseImg url={ex.gif_url} alt={nom} width={48} height={48} style={{ borderRadius: 6 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--acc)' : 'var(--t1)' }}>{nom}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                      {item.series} séries
                      {item.repetitions ? ` × ${item.repetitions} reps` : ''}
                      {item.poids_kg ? ` @ ${item.poids_kg} kg` : ''}
                      {item.repos_sec ? ` · repos ${item.repos_sec}s` : ''}
                    </div>
                    {item.notes && <div style={{ fontSize: 11, color: 'var(--t3)', fontStyle: 'italic', marginTop: 2 }}>{item.notes}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--acc)', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                    {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fallback: free-text exercices (old system) */}
      {exercicesPlanifies.length === 0 && plannedExos.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.4px' }}>
            Exercices prévus
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {plannedExos.map((nom, i) => (
              <button key={i} onClick={() => prefill(nom)} style={{
                padding: '5px 13px', borderRadius: 20,
                border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .12s',
                borderColor: exo === nom ? 'var(--acc)' : 'var(--bdr)',
                background: exo === nom ? 'var(--acc)' : 'var(--bg)',
                color: exo === nom ? '#fff' : 'var(--t2)',
              }}>
                {nom}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire */}
      <div style={{ background: 'var(--bg)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)', marginBottom: 12 }}>Enregistrer une série</div>
        <div className="fg" style={{ marginBottom: 10 }}>
          <ExerciceSearchInput
            value={exo}
            onChange={nom => { setExo(nom); setSerie(String(nextSerieNum(nom))); }}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[
            { label: 'Série #',      val: serie, set: setSerie, type: 'number', ph: '1',  min: 1 },
            { label: 'Répétitions',  val: reps,  set: setReps,  type: 'number', ph: '10', min: 1 },
            { label: 'Poids (kg)',   val: poids, set: setPoids, type: 'number', ph: '60', step: 0.5 },
            { label: 'Durée (sec)',  val: duree, set: setDuree, type: 'number', ph: '30', min: 1 },
          ].map(({ label, val, set, ...inp }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>{label}</div>
              <input className="fi" {...inp} value={val} onChange={e => set(e.target.value)} style={{ textAlign: 'center' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="fi" style={{ flex: 1 }} placeholder="Note (optionnelle)" value={notes}
            onChange={e => setNotes(e.target.value)} />
          <button className="btn btn-p" onClick={submit} disabled={busy || !exo.trim()}>
            {busy ? '...' : '+ Ajouter'}
          </button>
        </div>
      </div>

      {/* Log groupé */}
      {Object.keys(grouped).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t3)', fontSize: 13 }}>
          Aucune série enregistrée. Commencez à logger vos exercices !
        </div>
      ) : (
        Object.entries(grouped).map(([nom, series]) => (
          <div key={nom} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              {nom}
              <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 400 }}>{series.length} série{series.length > 1 ? 's' : ''}</span>
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              {series.map(l => (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: '#fff', border: '1px solid var(--bdr)', borderRadius: 8,
                  padding: '8px 12px', fontSize: 13,
                }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 6, background: 'var(--acc2)',
                    color: 'var(--acc3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, flexShrink: 0,
                  }}>S{l.serie_numero}</span>
                  {l.repetitions  && <span style={{ fontWeight: 600 }}>{l.repetitions} reps</span>}
                  {l.poids_kg     && <span style={{ color: '#059669', fontWeight: 700 }}>{l.poids_kg} kg</span>}
                  {l.duree_secondes && <span style={{ color: '#3B82F6', fontWeight: 600 }}>{l.duree_secondes}s</span>}
                  {l.notes        && <span style={{ color: 'var(--t3)', fontSize: 11 }}>— {l.notes}</span>}
                  <button onClick={() => deleteSerie(l.id)} style={{
                    marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--t3)', fontSize: 14, padding: '0 4px', lineHeight: 1,
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {logs.length > 0 && (
        <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--bdr)' }}>
          {logs.length} série{logs.length > 1 ? 's' : ''} enregistrée{logs.length > 1 ? 's' : ''} · visible par votre coach
        </div>
      )}
    </Modal>
  );
}

/* ── NUTRITION CLIENT ─────────────────────────────────────────────────────── */
const REPAS_LABELS = {
  petit_dejeuner: 'Petit-déjeuner',
  collation_matin: 'Collation matin',
  dejeuner: 'Déjeuner',
  collation_soir: 'Collation soir',
  diner: 'Dîner',
};

function MacroPill({ label, value, color, bg }) {
  return (
    <span style={{
      background: bg, color, fontSize: 11, fontWeight: 700,
      padding: '3px 8px', borderRadius: 6, display: 'inline-flex', gap: 3,
    }}>
      <span style={{ opacity: 0.7 }}>{label}</span> {value}
    </span>
  );
}

/* ── CHECK-IN ────────────────────────────────────────────────────────────── */
const CI_METRICS = [
  { key: 'energie',         label: 'Énergie',          emoji: '⚡', desc: 'Niveau d\'énergie général' },
  { key: 'sommeil',         label: 'Sommeil',           emoji: '😴', desc: 'Qualité du sommeil' },
  { key: 'motivation',      label: 'Motivation',        emoji: '🔥', desc: 'Envie de s\'entraîner' },
  { key: 'stress',          label: 'Stress',            emoji: '🧘', desc: 'Niveau de stress (10 = très calme)' },
  { key: 'recuperation',    label: 'Récupération',      emoji: '💪', desc: 'Récupération musculaire' },
  { key: 'humeur',          label: 'Humeur',            emoji: '😊', desc: 'Moral et état émotionnel' },
  { key: 'alimentation',    label: 'Alimentation',      emoji: '🥗', desc: 'Respect du plan nutritionnel' },
  { key: 'hydratation',     label: 'Hydratation',       emoji: '💧', desc: 'Consommation d\'eau quotidienne' },
  { key: 'confort_physique',label: 'Confort physique',  emoji: '🩹', desc: 'Absence de douleurs / blessures (10 = aucune douleur)' },
];

const SCORE_LEVELS = [
  { emoji: '😞', label: 'Très faible', max: 2,  color: '#EF4444', bg: '#FEF2F2' },
  { emoji: '😕', label: 'Faible',      max: 4,  color: '#F97316', bg: '#FFF7ED' },
  { emoji: '😐', label: 'Moyen',       max: 6,  color: '#F59E0B', bg: '#FFFBEB' },
  { emoji: '🙂', label: 'Bien',        max: 8,  color: '#84CC16', bg: '#F7FEE7' },
  { emoji: '😄', label: 'Excellent',   max: 10, color: '#1D9E75', bg: '#ECFDF5' },
];
const getLevel = (val) => SCORE_LEVELS.find(l => val <= l.max) || SCORE_LEVELS[4];
const scoreColor = (s) => s >= 7 ? '#1D9E75' : s >= 4 ? '#F59E0B' : '#EF4444';

function ScoreSelector({ value, onChange }) {
  const val = value ?? 5;
  const level = getLevel(val);
  return (
    <div>
      <div style={{ display:'flex', gap:4 }}>
        {SCORE_LEVELS.map((l, i) => {
          const active = l === level;
          return (
            <button key={i} onClick={() => onChange(l.max)}
              style={{
                flex:1, padding:'8px 2px', borderRadius:10, cursor:'pointer',
                border:`2px solid ${active ? l.color : 'var(--bdr)'}`,
                background: active ? l.bg : 'transparent',
                display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                transition:'all .15s',
              }}>
              <span style={{ fontSize:22 }}>{l.emoji}</span>
              <span style={{ fontSize:9, fontWeight:600, color: active ? l.color : 'var(--t3)', lineHeight:1.2, textAlign:'center' }}>
                {l.label}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
        <input type="range" min={1} max={10} value={val}
          onChange={e => onChange(Number(e.target.value))}
          style={{ flex:1, accentColor: level.color }} />
        <span style={{ fontWeight:800, fontSize:18, color: level.color, minWidth:28, textAlign:'center' }}>{val}</span>
      </div>
    </div>
  );
}

function PortalCheckin() {
  const [data, setData]           = useState(null);
  const [form, setForm]           = useState({ energie:5, sommeil:5, motivation:5, stress:5, recuperation:5, humeur:5, alimentation:5, hydratation:5, confort_physique:5, poids_kg:'', commentaire:'' });
  const [busy, setBusy]           = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing]     = useState(false);

  const load = () => api.portal.checkin().then(d => {
    setData(d);
    if (d.checkin_semaine) {
      const c = d.checkin_semaine;
      setForm({
        energie: c.energie ?? 5, sommeil: c.sommeil ?? 5, motivation: c.motivation ?? 5,
        stress: c.stress ?? 5, recuperation: c.recuperation ?? 5,
        humeur: c.humeur ?? 5, alimentation: c.alimentation ?? 5,
        hydratation: c.hydratation ?? 5, confort_physique: c.confort_physique ?? 5,
        poids_kg: c.poids_kg ?? '', commentaire: c.commentaire ?? '',
      });
      setSubmitted(true); setEditing(false);
    }
  }).catch(() => {});
  useEffect(() => { load(); }, []); // eslint-disable-line

  const sf = (k, v) => setForm(x => ({ ...x, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      const payload = { ...form };
      if (!payload.poids_kg) delete payload.poids_kg;
      await api.portal.submitCheckin(payload);
      toast('Check-in envoyé ✓');
      load();
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  if (!data) return <Loader />;

  const lundi    = new Date(data.semaine_courante);
  const dimanche = new Date(lundi); dimanche.setDate(lundi.getDate() + 6);
  const periodeLabel = `${lundi.toLocaleDateString('fr-FR', { day:'numeric', month:'long' })} – ${dimanche.toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}`;

  const streak = (() => {
    const hist = data.historique || [];
    if (!hist.length) return 0;
    let s = 0;
    const now = new Date();
    const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const curMon = new Date(now); curMon.setDate(now.getDate() - day); curMon.setHours(0,0,0,0);
    for (let i = 0; i < hist.length; i++) {
      const expected = new Date(curMon); expected.setDate(curMon.getDate() - i * 7);
      if (Math.abs(new Date(hist[i].semaine) - expected) < 86400000 * 2) s++;
      else break;
    }
    return s;
  })();

  const scoreMoyen = data.checkin_semaine?.score_moyen;
  const radarData  = CI_METRICS.map(m => ({ subject: m.label, value: form[m.key] ?? 0, fullMark: 10 }));

  return (
    <div>
      {/* En-tête */}
      <div style={{ marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div>
          <div style={{ fontSize:20, fontWeight:800 }}>Check-in hebdomadaire</div>
          <div style={{ fontSize:13, color:'var(--t3)', marginTop:4 }}>Semaine du {periodeLabel}</div>
        </div>
        {streak >= 2 && (
          <div style={{ textAlign:'center', background:'#FFF7ED', borderRadius:12, padding:'8px 14px', border:'2px solid #F97316' }}>
            <div style={{ fontSize:22 }}>🔥</div>
            <div style={{ fontSize:11, fontWeight:800, color:'#F97316' }}>{streak} sem. consécutives</div>
          </div>
        )}
      </div>

      {/* Résumé post-soumission */}
      {submitted && !editing && (
        <div className="card" style={{ marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'#1D9E75' }}>✅ Check-in envoyé</div>
              {scoreMoyen != null && (
                <div style={{ fontSize:13, color:'var(--t3)', marginTop:2 }}>
                  Score global : <strong style={{ color: scoreColor(scoreMoyen) }}>{scoreMoyen}/10</strong>
                  {' — '}{getLevel(scoreMoyen).emoji} {getLevel(scoreMoyen).label}
                </div>
              )}
            </div>
            <button className="btn" onClick={() => setEditing(true)} style={{ fontSize:13, padding:'6px 14px' }}>✏️ Modifier</button>
          </div>

          {/* Scores par métrique */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:16 }}>
            {CI_METRICS.map(m => {
              const val = form[m.key] ?? 0;
              const lvl = getLevel(val);
              return (
                <div key={m.key} style={{ background:'var(--bg)', borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:20 }}>{m.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11, color:'var(--t3)', marginBottom:4 }}>{m.label}</div>
                    <div style={{ height:6, borderRadius:3, background:'var(--bdr)', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${val * 10}%`, background: lvl.color, borderRadius:3, transition:'width .4s' }} />
                    </div>
                  </div>
                  <span style={{ fontWeight:800, color: lvl.color, fontSize:15, minWidth:20, textAlign:'right' }}>{val}</span>
                </div>
              );
            })}
            {form.poids_kg && (
              <div style={{ background:'var(--bg)', borderRadius:10, padding:'10px 12px', display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>⚖️</span>
                <div style={{ flex:1, fontSize:11, color:'var(--t3)' }}>Poids</div>
                <span style={{ fontWeight:800, fontSize:15 }}>{form.poids_kg} kg</span>
              </div>
            )}
          </div>

          {/* Radar chart */}
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--bdr)" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:'var(--t2)' }} />
              <Radar dataKey="value" stroke="#1D9E75" fill="#1D9E75" fillOpacity={0.25} dot={{ r:3, fill:'#1D9E75' }} />
            </RadarChart>
          </ResponsiveContainer>

          {form.commentaire && (
            <div style={{ marginTop:12, padding:'10px 12px', background:'var(--bg)', borderRadius:10, borderLeft:'3px solid #1D9E75' }}>
              <div style={{ fontSize:11, color:'var(--t3)', marginBottom:4 }}>💬 Note de la semaine</div>
              <div style={{ fontSize:13, color:'var(--t2)', fontStyle:'italic' }}>"{form.commentaire}"</div>
            </div>
          )}
        </div>
      )}

      {/* Formulaire */}
      {(!submitted || editing) && (
        <div className="card" style={{ marginBottom:20 }}>
          <div className="card-t" style={{ marginBottom:16 }}>
            {editing ? '✏️ Modifier mon check-in' : '📋 Remplir mon check-in'}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
            {CI_METRICS.map(m => (
              <div key={m.key}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{m.emoji} {m.label}</div>
                  <div style={{ fontSize:11, color:'var(--t3)' }}>{m.desc}</div>
                </div>
                <ScoreSelector value={form[m.key]} onChange={v => sf(m.key, v)} />
              </div>
            ))}

            <div style={{ borderTop:'1px solid var(--bdr)', paddingTop:16 }}>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>
                ⚖️ Poids ce matin <span style={{ fontWeight:400, color:'var(--t3)', fontSize:12 }}>(optionnel)</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input className="fi" type="number" step="0.1" placeholder="ex: 73.5"
                  value={form.poids_kg} onChange={e => sf('poids_kg', e.target.value)}
                  style={{ maxWidth:140 }} />
                <span style={{ fontSize:13, color:'var(--t3)' }}>kg</span>
              </div>
            </div>

            <div>
              <div style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>
                💬 Note de la semaine <span style={{ fontWeight:400, color:'var(--t3)', fontSize:12 }}>(optionnel)</span>
              </div>
              <textarea className="fi" rows={3} placeholder="Comment s'est passée votre semaine ? Réussites, difficultés..."
                value={form.commentaire} onChange={e => sf('commentaire', e.target.value)}
                style={{ resize:'vertical' }} />
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-p" onClick={submit} disabled={busy}>
                {busy ? 'Envoi...' : editing ? '💾 Mettre à jour' : '📤 Envoyer mon check-in'}
              </button>
              {editing && <button className="btn" onClick={() => setEditing(false)}>Annuler</button>}
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      {data.historique.length > 1 && (
        <div className="card">
          <div className="card-t" style={{ marginBottom:12 }}>📊 Historique des check-ins</div>
          <div style={{ display:'flex', flexDirection:'column' }}>
            {data.historique.slice(1).map((c, idx) => {
              const prev  = data.historique[idx + 2];
              const trend = c.score_moyen != null && prev?.score_moyen != null
                ? (c.score_moyen - prev.score_moyen) : null;
              const lun   = new Date(c.semaine);
              const lvl   = c.score_moyen != null ? getLevel(c.score_moyen) : null;
              return (
                <div key={c.id} style={{ padding:'10px 0', borderBottom:'1px solid var(--bdr)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                    <div style={{ fontSize:12, color:'var(--t3)', minWidth:72 }}>
                      {lun.toLocaleDateString('fr-FR', { day:'numeric', month:'short' })}
                    </div>
                    {lvl && (
                      <div style={{ fontWeight:800, fontSize:14, color: lvl.color }}>
                        {lvl.emoji} {c.score_moyen}/10
                      </div>
                    )}
                    {trend !== null && (
                      <span style={{ fontSize:12, color: trend > 0 ? '#1D9E75' : trend < 0 ? '#EF4444' : 'var(--t3)' }}>
                        {trend > 0 ? `↑ +${trend.toFixed(1)}` : trend < 0 ? `↓ ${trend.toFixed(1)}` : '→'}
                      </span>
                    )}
                    {c.poids_kg && (
                      <span style={{ fontSize:11, color:'var(--t3)', marginLeft:'auto' }}>⚖️ {c.poids_kg} kg</span>
                    )}
                  </div>
                  <div style={{ display:'flex', gap:4 }}>
                    {CI_METRICS.map(m => {
                      const v = c[m.key];
                      if (v == null) return null;
                      const lv = getLevel(v);
                      return (
                        <div key={m.key} style={{ flex:1 }} title={`${m.label} : ${v}/10`}>
                          <div style={{ fontSize:9, color:'var(--t3)', textAlign:'center', marginBottom:2 }}>{m.emoji}</div>
                          <div style={{ height:4, borderRadius:2, background:'var(--bdr)' }}>
                            <div style={{ height:'100%', width:`${v * 10}%`, background: lv.color, borderRadius:2 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {c.commentaire && (
                    <div style={{ fontSize:11, color:'var(--t3)', marginTop:6, fontStyle:'italic', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      💬 {c.commentaire}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── PHOTOS ─────────────────────────────────────────────────────────────── */
const ANGLE_LABELS = { face: 'Face', profil: 'Profil', dos: 'Dos' };

function PortalPhotos() {
  const [photos, setPhotos]   = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [lightbox, setLightbox] = useState(null); // index dans la liste plate
  const [angle, setAngle]     = useState('face');
  const [legende, setLegende] = useState('');
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10));
  const [preview, setPreview] = useState(null);
  const [file, setFile]       = useState(null);
  const [busy, setBusy]       = useState(false);
  const inputRef              = useRef();

  const load = () => api.portal.photos().then(setPhotos).catch(() => setPhotos([]));
  useEffect(() => { load(); }, []); // eslint-disable-line

  const onFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const upload = async () => {
    if (!file) return toast('Sélectionnez une photo', 'err');
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('date', date);
      fd.append('angle', angle);
      fd.append('legende', legende);
      await api.portal.uploadPhoto(fd);
      toast('Photo ajoutée ✓');
      setShowAdd(false); setFile(null); setPreview(null); setLegende('');
      load();
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Supprimer cette photo ?')) return;
    try {
      await api.portal.deletePhoto(id);
      setPhotos(p => p.filter(x => x.id !== id));
      toast('Photo supprimée');
    } catch (e) { toast(e.message, 'err'); }
  };

  const allPhotos = photos || [];
  const byAngle = allPhotos.reduce((acc, p) => {
    if (!acc[p.angle]) acc[p.angle] = [];
    acc[p.angle].push(p);
    return acc;
  }, {});

  const lbPhoto = lightbox != null ? allPhotos[lightbox] : null;

  if (!photos) return <Loader />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Mes photos de progression</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 2 }}>{photos.length} photo{photos.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-p" onClick={() => setShowAdd(true)}>📸 Ajouter</button>
      </div>

      {photos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>📸</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Aucune photo de progression</div>
          <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>Ajoutez vos premières photos pour suivre votre transformation</div>
          <button className="btn btn-p" onClick={() => setShowAdd(true)}>Ajouter une photo</button>
        </div>
      ) : (
        Object.entries(byAngle).map(([ang, list]) => (
          <div key={ang} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--t2)' }}>
              {ANGLE_LABELS[ang] || ang} ({list.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {list.map(p => (
                <div key={p.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: 'var(--bg2)', boxShadow: 'var(--sh)' }}>
                  <img
                    src={p.image_url}
                    alt={p.legende || ang}
                    onClick={() => setLightbox(allPhotos.findIndex(x => x.id === p.id))}
                    style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                  />
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{new Date(p.date).toLocaleDateString('fr-FR')}</div>
                    {p.legende && <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.legende}</div>}
                  </div>
                  <button
                    onClick={() => del(p.id)}
                    style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', color: '#fff', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >×</button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showAdd && (
        <Modal title="Ajouter une photo" onClose={() => { setShowAdd(false); setPreview(null); setFile(null); }} footer={
          <><button className="btn btn-s" onClick={() => { setShowAdd(false); setPreview(null); setFile(null); }}>Annuler</button>
            <button className="btn btn-p" onClick={upload} disabled={busy || !file}>{busy ? 'Envoi...' : 'Envoyer'}</button></>
        }>
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onFile} />
          {preview ? (
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <img src={preview} alt="preview" style={{ width: '100%', maxHeight: 300, objectFit: 'contain', borderRadius: 8 }} />
              <button onClick={() => { setPreview(null); setFile(null); inputRef.current.value = ''; }}
                style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.5)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', color: '#fff', fontSize: 14 }}>×</button>
            </div>
          ) : (
            <div onClick={() => inputRef.current.click()} style={{ border: '2px dashed var(--bdr)', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Cliquez pour choisir une photo</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>JPG, PNG, WEBP</div>
            </div>
          )}
          <div className="fr2">
            <div className="fg"><label className="fl">Date</label>
              <input className="fi" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
            <div className="fg"><label className="fl">Angle</label>
              <select className="fi fsel" value={angle} onChange={e => setAngle(e.target.value)}>
                <option value="face">Face</option>
                <option value="profil">Profil</option>
                <option value="dos">Dos</option>
              </select></div>
          </div>
          <div className="fg"><label className="fl">Légende (optionnel)</label>
            <input className="fi" placeholder="ex: Semaine 4..." value={legende} onChange={e => setLegende(e.target.value)} /></div>
        </Modal>
      )}

      {lbPhoto && (
        <Lightbox
          src={lbPhoto.image_url}
          alt={lbPhoto.legende || lbPhoto.angle}
          caption={[
            lbPhoto.legende,
            new Date(lbPhoto.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
            ANGLE_LABELS[lbPhoto.angle] || lbPhoto.angle,
          ].filter(Boolean).join(' · ')}
          onClose={() => setLightbox(null)}
          onPrev={lightbox > 0 ? () => setLightbox(i => i - 1) : null}
          onNext={lightbox < allPhotos.length - 1 ? () => setLightbox(i => i + 1) : null}
        />
      )}
    </div>
  );
}

const PORTAL_RECIPE_TAGS = [
  { slug:'vegan',           label:'Vegan',          icon:'🌱', color:'#16a34a', bg:'#dcfce7' },
  { slug:'vegetarien',      label:'Végétarien',     icon:'🥗', color:'#65a30d', bg:'#ecfccb' },
  { slug:'sans_gluten',     label:'Sans gluten',    icon:'🌾', color:'#ca8a04', bg:'#fef9c3' },
  { slug:'sans_lactose',    label:'Sans lactose',   icon:'🥛', color:'#0891b2', bg:'#cffafe' },
  { slug:'low_fodmap',      label:'Low-FODMAP',     icon:'🫀', color:'#9333ea', bg:'#f3e8ff' },
  { slug:'riche_proteines', label:'Riche protéines',icon:'💪', color:'#dc2626', bg:'#fee2e2' },
  { slug:'low_carb',        label:'Low-carb',       icon:'🥩', color:'#ea580c', bg:'#ffedd5' },
];

function RecetteCard({ recette }) {
  const [open, setOpen] = useState(false);
  const m = recette.macros_par_portion || {};
  const hasMacro = m.calories || m.proteines || m.glucides || m.lipides;
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        {/* Photo bannière 16:9 */}
        {recette.photo_url ? (
          <img src={recette.photo_url} alt={recette.nom}
            style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', background: '#F1F5F9' }} />
        ) : (
          <div style={{ width: '100%', aspectRatio: '16/9', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
            🍽️
          </div>
        )}

        <div style={{ padding: '12px 14px' }}>
          {/* Ligne titre + chevron */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {recette.nom}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>
                {recette.ingredients?.length || 0} ingrédient{recette.ingredients?.length !== 1 ? 's' : ''} · {recette.portions} portion{recette.portions > 1 ? 's' : ''}
              </div>
            </div>
            <span style={{ fontSize: 14, color: 'var(--t3)', flexShrink: 0, paddingTop: 2 }}>{open ? '▲' : '▼'}</span>
          </div>

          {/* Macros */}
          {hasMacro && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {m.calories && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#065f46', background: '#E8F8F2', borderRadius: 6, padding: '3px 8px' }}>
                  {Math.round(m.calories)} kcal
                </span>
              )}
              {m.proteines && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1E40AF', background: '#EFF6FF', borderRadius: 6, padding: '3px 8px' }}>
                  P {Math.round(m.proteines)}g
                </span>
              )}
              {m.glucides && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E', background: '#FFFBEB', borderRadius: 6, padding: '3px 8px' }}>
                  G {Math.round(m.glucides)}g
                </span>
              )}
              {m.lipides && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#991B1B', background: '#FEF2F2', borderRadius: 6, padding: '3px 8px' }}>
                  L {Math.round(m.lipides)}g
                </span>
              )}
            </div>
          )}

          {/* Tags */}
          {recette.tags && recette.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
              {recette.tags.map(t => {
                const meta = PORTAL_RECIPE_TAGS.find(x => x.slug === t);
                if (!meta) return null;
                return (
                  <span key={t} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 600, background: meta.bg, color: meta.color, whiteSpace: 'nowrap' }}>
                    {meta.icon} {meta.label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {open && (
        <div style={{ padding: '12px 14px 14px', borderTop:'1px solid var(--bdr)' }}>
          {recette.description && (
            <div style={{ fontSize:13, color:'var(--t2)', marginBottom:10 }}>{recette.description}</div>
          )}
          {(recette.ingredients || []).length > 0 && (
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>Ingrédients (par portion)</div>
              {recette.ingredients.map(ing => {
                const qpp = ing.quantite_g / (recette.portions || 1);
                return (
                  <div key={ing.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--bdr)', fontSize:13 }}>
                    <span>{ing.aliment_nom || ing.aliment?.nom}</span>
                    <span style={{ color:'var(--t3)', fontWeight:600 }}>{Math.round(qpp)}g</span>
                  </div>
                );
              })}
            </div>
          )}
          {recette.instructions && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6 }}>Préparation</div>
              <div style={{ fontSize:13, color:'var(--t2)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{recette.instructions}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PortalNutrition() {
  const [plan, setPlan]         = useState(null);
  const [journal, setJournal]   = useState([]);
  const [eau, setEau]           = useState({ entries: [], total_ml: 0 });
  const [recettes, setRecettes]     = useState(null);
  const [recettePage, setRecettePage] = useState(1);
  const [recetteTags, setRecetteTags] = useState([]);
  const [recetteQ, setRecetteQ]     = useState('');
  const [tab, setTab]           = useState('plan');
  const [date, setDate]         = useState(new Date().toISOString().slice(0, 10));
  const [showAdd, setShowAdd]   = useState(false);
  const [aliments, setAliments] = useState([]);
  const [search, setSearch]     = useState('');
  const [selAl, setSelAl]       = useState(null);
  const [qty, setQty]           = useState('100');
  const [repasType, setRepasType] = useState('dejeuner');
  const [busy, setBusy]         = useState(false);
  const [loading, setLoading]   = useState(true);
  const [externs, setExterns]   = useState(null); // null = pas cherché, [] vide, [...] résultats
  const [externBusy, setExternBusy] = useState(false);
  const [importing, setImporting] = useState(null); // source_id en cours d'import

  const loadPlan    = () => api.nutrition.portalPlan().then(setPlan).catch(() => setPlan(null));
  const loadJournal = (d) => api.nutrition.portalJournal(d).then(r => setJournal(r.entries || [])).catch(() => setJournal([]));
  const loadEau     = (d) => api.nutrition.portalEau(d).then(setEau).catch(() => setEau({ entries: [], total_ml: 0 }));

  const loadRecettes = (tags = recetteTags, q = recetteQ) => {
    const params = new URLSearchParams();
    if (tags.length > 0) params.set('tags', tags.join(','));
    if (q.trim()) params.set('q', q.trim());
    const qs = params.toString() ? '?' + params.toString() : '';
    return api.portal.recettes(qs).then(setRecettes).catch(() => setRecettes([]));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPlan(), loadJournal(date), loadEau(date)]).finally(() => setLoading(false));
    loadRecettes();
    // eslint-disable-next-line
  }, []);

  // Debounce sur la recherche
  useEffect(() => {
    const t = setTimeout(() => { setRecettePage(1); loadRecettes(recetteTags, recetteQ); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [recetteQ]);

  const toggleRecetteTag = (slug) => {
    const next = recetteTags.includes(slug) ? recetteTags.filter(t => t !== slug) : [...recetteTags, slug];
    setRecetteTags(next);
    setRecettePage(1);
    loadRecettes(next, recetteQ);
  };

  useEffect(() => { loadJournal(date); loadEau(date); }, [date]);

  const addEau = async (ml) => {
    try {
      await api.nutrition.portalEauAdd({ date, quantite_ml: ml });
      loadEau(date);
    } catch (e) { toast(e.message, 'err'); }
  };

  const deleteEauEntry = async (id) => {
    try {
      await api.nutrition.portalEauDelete(id);
      loadEau(date);
    } catch (e) { toast(e.message, 'err'); }
  };

  const searchAliments = async (q) => {
    setExterns(null);
    if (q.length < 2) { setAliments([]); return; }
    const res = await api.nutrition.aliments(`?q=${encodeURIComponent(q)}`);
    setAliments(res.results || res);
  };

  const searchExterne = async () => {
    if (search.trim().length < 2) return;
    setExternBusy(true);
    try {
      const data = await api.nutrition.searchAlimentExterne(search.trim());
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
      setSelAl(created);
      setSearch(created.nom);
      setAliments([]);
      setExterns(null);
    } catch (e) {
      toast(e.message || 'Erreur import', 'err');
    } finally {
      setImporting(null);
    }
  };

  const addEntry = async () => {
    if (!selAl || !qty) return;
    setBusy(true);
    try {
      await api.nutrition.portalJournalAdd({
        aliment: selAl.id,
        quantite_g: parseFloat(qty),
        type_repas: repasType,
        date,
      });
      toast('Ajouté au journal ✓');
      setShowAdd(false);
      setSelAl(null); setSearch(''); setQty('100');
      loadJournal(date);
    } catch (e) { toast(e.message, 'err'); }
    finally { setBusy(false); }
  };

  const deleteEntry = async (id) => {
    try {
      await api.nutrition.portalJournalDelete(id);
      setJournal(j => j.filter(e => e.id !== id));
    } catch (e) { toast(e.message, 'err'); }
  };

  const totals = journal.reduce((acc, e) => {
    const m = e.macros || {};
    return {
      kcal: acc.kcal + (m.calories || 0),
      prot: acc.prot + (m.proteines || 0),
      gluc: acc.gluc + (m.glucides || 0),
      lip:  acc.lip  + (m.lipides  || 0),
    };
  }, { kcal: 0, prot: 0, gluc: 0, lip: 0 });

  const byRepas = journal.reduce((acc, e) => {
    if (!acc[e.type_repas]) acc[e.type_repas] = [];
    acc[e.type_repas].push(e);
    return acc;
  }, {});

  const planMacros      = plan?.plan?.macros_total;
  const caloTarget      = plan?.assignation?.calories_objectif || plan?.plan?.objectif_calories || planMacros?.calories;
  const proteinesTarget = plan?.plan?.objectif_proteines_g || planMacros?.proteines;
  const glucidesTarget  = plan?.plan?.objectif_glucides_g  || planMacros?.glucides;
  const lipidesTarget   = plan?.plan?.objectif_lipides_g   || planMacros?.lipides;

  const TABS_N = [
    { key: 'plan',       label: '🎯 Mes objectifs' },
    { key: 'journal',    label: '📝 Journal' },
    { key: 'recettes',   label: '👨‍🍳 Recettes' },
    { key: 'graphiques', label: '📈 Graphiques' },
  ];

  if (loading) return <Loader />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Nutrition</div>
      <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 20 }}>Suivez votre alimentation et votre plan nutritionnel</div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--bdr)', paddingBottom: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS_N.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0,
            borderBottom: tab === t.key ? '2px solid var(--acc)' : '2px solid transparent',
            color: tab === t.key ? 'var(--acc)' : 'var(--t2)',
            transition: 'all .12s', marginBottom: -1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── MES OBJECTIFS ── */}
      {tab === 'plan' && (() => {
        // 1. Aucun plan assigné
        if (!plan?.plan) {
          return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🥗</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>Aucun plan alimentaire actif</div>
              <div style={{ fontSize: 13, color: 'var(--t3)' }}>Votre coach n'a pas encore défini d'objectifs pour vous</div>
            </div>
          );
        }

        // 2. Plan assigné mais sans aucun objectif chiffré
        const hasTargets = caloTarget || proteinesTarget || glucidesTarget || lipidesTarget;
        if (!hasTargets) {
          return (
            <div>
              <div style={{
                background: 'linear-gradient(135deg, #1D9E75 0%, #065f46 100%)',
                borderRadius: 16, padding: '16px 20px', marginBottom: 18, color: '#fff',
              }}>
                <div style={{ fontSize: 16, fontWeight: 800 }}>{plan.plan.nom}</div>
              </div>
              <div style={{ textAlign: 'center', padding: '40px 20px', background:'#FEF9C3', borderRadius: 12, border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#854D0E', marginBottom: 4 }}>
                  Objectifs en attente
                </div>
                <div style={{ fontSize: 13, color: '#854D0E', opacity: .8, maxWidth: 320, margin: '0 auto' }}>
                  Votre coach n'a pas encore renseigné de cibles caloriques.<br/>
                  Vous pouvez quand même tracker vos repas dans le Journal.
                </div>
                <button className="btn btn-p btn-sm" style={{ marginTop: 14 }} onClick={() => setTab('journal')}>
                  → Aller au Journal
                </button>
              </div>
            </div>
          );
        }

        const macros = [
          { val: caloTarget,      label: 'kcal / jour', icon: '🔥' },
          { val: proteinesTarget, label: 'Protéines',   icon: '💪', suffix: 'g' },
          { val: glucidesTarget,  label: 'Glucides',    icon: '🌾', suffix: 'g' },
          { val: lipidesTarget,   label: 'Lipides',     icon: '🥑', suffix: 'g' },
        ].filter(m => m.val);

        return (
          <div>
            {/* 1. Header compact — 4 mini cards en grille auto */}
            <div style={{
              background: 'linear-gradient(135deg, #1D9E75 0%, #065f46 100%)',
              borderRadius: 16, padding: '16px 18px', marginBottom: 18, color: '#fff',
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, opacity: .95 }}>
                🎯 {plan.plan.nom}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                gap: 8,
              }}>
                {macros.map(m => (
                  <div key={m.label} style={{
                    background: 'rgba(255,255,255,.18)', borderRadius: 10,
                    padding: '10px 8px', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.1 }}>
                      {Math.round(m.val)}{m.suffix || ''}
                    </div>
                    <div style={{ fontSize: 10, opacity: .8, marginTop: 3, fontWeight: 600 }}>
                      {m.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. CTA — Aujourd'hui */}
            {plan.progression_jour ? (
              <div className="card" style={{
                marginBottom: 18, padding: 0, overflow: 'hidden',
                border: '1.5px solid var(--acc)',
              }}>
                <div style={{
                  padding: '10px 14px', background:'var(--acc2)',
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color:'var(--acc3)' }}>
                    📊 Aujourd'hui
                  </div>
                  <button onClick={() => setTab('journal')} style={{
                    background:'var(--acc)', border:'none', cursor:'pointer',
                    color:'#fff', fontSize: 12, fontWeight: 700,
                    padding:'5px 12px', borderRadius: 8,
                  }}>
                    + Ajouter un repas
                  </button>
                </div>
                <div style={{ padding: '14px' }}>
                  {[
                    { key:'calories',  label:'Calories',  unit:'kcal', color:'#065f46', bg:'#E8F8F2' },
                    { key:'proteines', label:'Protéines', unit:'g',    color:'#1E40AF', bg:'#EFF6FF' },
                    { key:'glucides',  label:'Glucides',  unit:'g',    color:'#92400E', bg:'#FFFBEB' },
                    { key:'lipides',   label:'Lipides',   unit:'g',    color:'#991B1B', bg:'#FEF2F2' },
                  ].map(m => {
                    const consomme = plan.progression_jour.consomme[m.key] || 0;
                    const objectif = plan.progression_jour.objectifs[m.key];
                    if (!objectif) return null;
                    const pct = Math.min(100, Math.round(consomme / objectif * 100));
                    const overflow = consomme > objectif;
                    return (
                      <div key={m.key} style={{ marginBottom: 12 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: m.color }}>{m.label}</span>
                          <span style={{ fontSize: 12, color:'var(--t3)' }}>
                            <strong style={{ color: overflow ? '#991B1B' : 'var(--t1)' }}>{Math.round(consomme)}</strong>
                            {' / '}{Math.round(objectif)} {m.unit}
                          </span>
                        </div>
                        <div style={{ height: 8, background: m.bg, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            background: overflow ? '#DC2626' : m.color,
                            borderRadius: 4, transition: 'width .3s',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                  {!plan.progression_jour.consomme.calories && (
                    <div style={{ fontSize: 12, color:'var(--t3)', textAlign:'center', padding:'4px 0 0' }}>
                      Pas encore de repas enregistré aujourd'hui.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card" style={{
                marginBottom: 18, textAlign:'center', padding:'18px',
                border: '1.5px dashed var(--bdr)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                  Tu n'as encore rien tracké aujourd'hui
                </div>
                <button className="btn btn-p btn-sm" onClick={() => setTab('journal')}>
                  + Commencer le journal
                </button>
              </div>
            )}

            {/* Idées repas */}
            {(plan.idees_repas || []).length > 0 && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>💡 Idées de repas</div>
                  <button onClick={() => setTab('recettes')} style={{
                    background:'none', border:'none', cursor:'pointer',
                    color: 'var(--acc)', fontSize: 12, fontWeight: 600,
                  }}>
                    Voir toutes →
                  </button>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 12,
                }}>
                  {plan.idees_repas.map(r => <RecetteCard key={r.id} recette={r} />)}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── JOURNAL ── */}
      {tab === 'journal' && (
        <div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 200 }}>
              <div style={{
                border: '1px solid var(--bdr)', borderRadius: 8, padding: '8px 12px',
                fontSize: 14, fontWeight: 600, color: 'var(--t1)', background: '#fff',
                pointerEvents: 'none',
              }}>
                {new Date(date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
            </div>
            <button className="btn btn-p" onClick={() => setShowAdd(true)}>+ Ajouter</button>
          </div>

          {/* Totaux du jour */}
          {journal.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 18,
            }}>
              {[
                { label: 'Calories', val: `${Math.round(totals.kcal)} kcal`, color: '#065f46', bg: '#E8F8F2',
                  pct: caloTarget ? Math.round(totals.kcal / caloTarget * 100) : null },
                { label: 'Protéines', val: `${Math.round(totals.prot)}g`, color: '#1E40AF', bg: '#EFF6FF',
                  pct: proteinesTarget ? Math.round(totals.prot / proteinesTarget * 100) : null },
                { label: 'Glucides',  val: `${Math.round(totals.gluc)}g`, color: '#92400E', bg: '#FFFBEB',
                  pct: glucidesTarget ? Math.round(totals.gluc / glucidesTarget * 100) : null },
                { label: 'Lipides',   val: `${Math.round(totals.lip)}g`,  color: '#991B1B', bg: '#FEF2F2',
                  pct: lipidesTarget ? Math.round(totals.lip / lipidesTarget * 100) : null },
              ].map(m => (
                <div key={m.label} style={{
                  background: m.bg, borderRadius: 12, padding: '12px 14px',
                  border: `1px solid ${m.color}22`,
                }}>
                  <div style={{ fontSize: 11, color: m.color, fontWeight: 700, marginBottom: 4, opacity: 0.8 }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: m.color }}>{m.val}</div>
                  {m.pct !== null && (
                    <div style={{ fontSize: 10, color: m.color, opacity: 0.7, marginTop: 2 }}>{m.pct}% de l'objectif</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Eau */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 20 }}>💧</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Hydratation</div>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>Objectif : 2 000 ml / jour</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#0369A1' }}>{eau.total_ml} ml</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{Math.round(eau.total_ml / 2000 * 100)}% de l'objectif</div>
              </div>
            </div>
            {/* Barre de progression */}
            <div style={{ background: '#E0F2FE', borderRadius: 8, height: 8, marginBottom: 12 }}>
              <div style={{ background: '#0369A1', borderRadius: 8, height: 8, width: `${Math.min(eau.total_ml / 2000 * 100, 100)}%`, transition: 'width .3s' }} />
            </div>
            {/* Boutons rapides */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[150, 250, 330, 500].map(ml => (
                <button key={ml} className="btn btn-s btn-sm" onClick={() => addEau(ml)}
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                  💧 +{ml} ml
                </button>
              ))}
            </div>
            {/* Historique du jour */}
            {eau.entries.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {eau.entries.map(e => (
                  <div key={e.id} style={{
                    background: '#E0F2FE', borderRadius: 20, padding: '3px 10px',
                    fontSize: 12, color: '#0369A1', display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {e.quantite_ml} ml
                    <button onClick={() => deleteEauEntry(e.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369A1', padding: 0, fontSize: 13, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Entrées par repas */}
          {journal.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🍽️</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Aucun aliment enregistré</div>
              <div style={{ fontSize: 12 }}>Ajoutez vos repas pour suivre vos apports</div>
            </div>
          ) : (
            Object.entries(REPAS_LABELS).map(([repasKey, repasLabel]) => {
              const entries = byRepas[repasKey] || [];
              if (!entries.length) return null;
              return (
                <div key={repasKey} className="card" style={{ marginBottom: 12 }}>
                  <div className="card-t">{repasLabel}</div>
                  {entries.map(e => {
                    const m = e.macros || {};
                    return (
                      <div key={e.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0', borderBottom: '1px solid var(--bdr)',
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{e.aliment_nom}</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{e.quantite_g}g</div>
                        </div>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {m.calories && <MacroPill label="kcal" value={Math.round(m.calories)} color="#065f46" bg="#E8F8F2" />}
                          {m.proteines && <MacroPill label="P" value={`${Math.round(m.proteines)}g`} color="#1E40AF" bg="#EFF6FF" />}
                        </div>
                        <button onClick={() => deleteEntry(e.id)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--t3)', fontSize: 16, lineHeight: 1, padding: '0 4px',
                        }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}

          {/* Modal ajout aliment */}
          {showAdd && (
            <Modal title="Ajouter au journal" onClose={() => { setShowAdd(false); setSelAl(null); setSearch(''); setExterns(null); setAliments([]); }}
              footer={<>
                <button className="btn btn-s" onClick={() => { setShowAdd(false); setSelAl(null); setSearch(''); setExterns(null); setAliments([]); }}>Annuler</button>
                <button className="btn btn-p" onClick={addEntry} disabled={busy || !selAl}>
                  {busy ? 'Ajout...' : 'Ajouter'}
                </button>
              </>}
            >
              <div className="fg">
                <label className="fl">Repas</label>
                <select className="fi" value={repasType} onChange={e => setRepasType(e.target.value)}>
                  {Object.entries(REPAS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="fl">Rechercher un aliment</label>
                <input className="fi" placeholder="ex: Blanc de poulet..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); searchAliments(e.target.value); }} />
              </div>
              {aliments.length > 0 && !selAl && (
                <div style={{
                  border: '1px solid var(--bdr)', borderRadius: 8, maxHeight: 180,
                  overflowY: 'auto', marginBottom: 12,
                }}>
                  {aliments.map(a => (
                    <div key={a.id} onClick={() => { setSelAl(a); setSearch(a.nom); setAliments([]); setExterns(null); }}
                      style={{
                        padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid var(--bdr)',
                        fontSize: 13,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <div style={{ fontWeight: 600 }}>{a.nom}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                        {a.calories_100g} kcal · P: {a.proteines_100g}g · G: {a.glucides_100g}g · L: {a.lipides_100g}g (pour 100g)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bouton Open Food Facts */}
              {!selAl && search.trim().length >= 2 && externs === null && (
                <div style={{ marginBottom: 12, textAlign:'center' }}>
                  <button className="btn btn-s btn-sm" onClick={searchExterne} disabled={externBusy}>
                    {externBusy ? '🔍 Recherche...' : aliments.length === 0
                      ? `🌍 Pas trouvé ? Chercher "${search.trim()}" sur Open Food Facts`
                      : `🌍 Élargir avec Open Food Facts`}
                  </button>
                </div>
              )}

              {/* Résultats Open Food Facts */}
              {externs !== null && !selAl && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display:'flex', justifyContent:'space-between' }}>
                    <span>🌍 Suggestions Open Food Facts ({externs.length})</span>
                    <button onClick={() => setExterns(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--t3)', fontSize:11 }}>Fermer</button>
                  </div>
                  {externs.length === 0 ? (
                    <div style={{ padding: 14, textAlign:'center', color:'var(--t3)', fontSize: 12, background:'var(--bg)', borderRadius: 8 }}>
                      Aucun résultat. Essaie un autre mot-clé.
                    </div>
                  ) : (
                    <div style={{ border:'1px solid var(--bdr)', borderRadius: 8, maxHeight: 220, overflowY:'auto' }}>
                      {externs.map(c => (
                        <div key={c.source_id} style={{ display:'flex', alignItems:'center', gap: 10, padding:'9px 12px', borderBottom:'1px solid var(--bdr)' }}>
                          {c.image
                            ? <img src={c.image} alt="" style={{ width: 36, height: 36, objectFit:'cover', borderRadius: 6, flexShrink: 0 }} />
                            : <div style={{ width: 36, height: 36, borderRadius: 6, background:'var(--bg)', flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.nom}</div>
                            <div style={{ fontSize: 10, color:'var(--t3)' }}>
                              {Math.round(c.calories_100g)} kcal · P {c.proteines_100g} G {c.glucides_100g} L {c.lipides_100g} (100g)
                            </div>
                          </div>
                          <button className="btn btn-p btn-sm" style={{ fontSize: 11, flexShrink: 0 }}
                            onClick={() => importExterne(c)} disabled={importing === c.source_id}>
                            {importing === c.source_id ? '⏳' : '+'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selAl && (
                <div style={{ background: '#E8F8F2', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>✓ {selAl.nom}</div>
                  <div style={{ fontSize: 11, color: '#065f46', opacity: 0.8 }}>
                    {selAl.calories_100g} kcal / 100g · P {selAl.proteines_100g}g · G {selAl.glucides_100g}g · L {selAl.lipides_100g}g
                  </div>
                </div>
              )}
              <div className="fg">
                <label className="fl">Quantité (grammes)</label>
                <input className="fi" type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} placeholder="100" />
              </div>
              {selAl && qty && (
                <div style={{ fontSize: 12, color: 'var(--t3)', padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                  Pour {qty}g : <strong>{Math.round(selAl.calories_100g * qty / 100)} kcal</strong> ·
                  P: {Math.round(selAl.proteines_100g * qty / 100)}g ·
                  G: {Math.round(selAl.glucides_100g * qty / 100)}g ·
                  L: {Math.round(selAl.lipides_100g * qty / 100)}g
                </div>
              )}
            </Modal>
          )}
        </div>
      )}

      {/* ── RECETTES ── */}
      {tab === 'recettes' && (
        <div>
          {/* Filtres */}
          <div className="card" style={{ marginBottom:14, padding:'12px 14px' }}>
            <input className="fi" placeholder="🔍 Rechercher..." value={recetteQ}
              onChange={e => setRecetteQ(e.target.value)} style={{ marginBottom:10 }} />
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {PORTAL_RECIPE_TAGS.map(t => {
                const active = recetteTags.includes(t.slug);
                return (
                  <button key={t.slug} onClick={() => toggleRecetteTag(t.slug)} style={{
                    fontSize:11, fontWeight:600, padding:'4px 9px', borderRadius:14, cursor:'pointer',
                    border:`1.5px solid ${active ? t.color : 'var(--bdr)'}`,
                    background: active ? t.bg : 'transparent',
                    color: active ? t.color : 'var(--t2)',
                  }}>
                    {t.icon} {t.label}
                  </button>
                );
              })}
            </div>
          </div>
          {!recettes
            ? <Loader />
            : recettes.length === 0
              ? <div style={{ textAlign:'center', padding:'60px 20px' }}>
                  <div style={{ fontSize:48, marginBottom:12 }}>👨‍🍳</div>
                  <div style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>
                    {recetteTags.length || recetteQ ? 'Aucune recette correspondante' : 'Aucune recette disponible'}
                  </div>
                  <div style={{ fontSize:13, color:'var(--t3)' }}>
                    {recetteTags.length || recetteQ ? 'Modifie tes filtres ou la recherche' : 'Votre coach n\'a pas encore créé de recettes'}
                  </div>
                </div>
              : (() => {
                  const PAGE_SIZE = 8;
                  const totalPages = Math.ceil(recettes.length / PAGE_SIZE);
                  const page = Math.min(recettePage, totalPages);
                  const slice = recettes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
                  return (
                    <>
                      <div style={{ fontSize:12, color:'var(--t3)', marginBottom:10 }}>
                        {recettes.length} recette{recettes.length > 1 ? 's' : ''}
                      </div>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                        gap: 12,
                      }}>
                        {slice.map(r => <RecetteCard key={r.id} recette={r} />)}
                      </div>
                      {totalPages > 1 && (() => {
                        // Calcule la liste compacte des pages : [1, '…', p-1, p, p+1, '…', total]
                        const pages = new Set([1, totalPages, page, page - 1, page + 1, page - 2, page + 2]);
                        const sorted = [...pages].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
                        const items = [];
                        let prev = 0;
                        for (const n of sorted) {
                          if (n - prev > 1) items.push('gap-' + n);
                          items.push(n);
                          prev = n;
                        }
                        const btnBase = {
                          minWidth: 36, height: 36, padding: 0, fontSize: 14, fontWeight: 600,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          borderRadius: 8, border: '1px solid var(--bdr)', background: '#fff',
                          color: 'var(--t2)', cursor: 'pointer', flexShrink: 0,
                        };
                        return (
                          <div style={{
                            display:'flex', alignItems:'center', justifyContent:'center',
                            gap:6, marginTop:20, flexWrap:'wrap',
                          }}>
                            <button style={{ ...btnBase, opacity: page <= 1 ? .4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                              disabled={page <= 1} onClick={() => setRecettePage(p => p - 1)}>‹</button>
                            {items.map(it => typeof it === 'string'
                              ? <span key={it} style={{ color:'var(--t3)', padding:'0 4px', fontSize: 14 }}>…</span>
                              : (
                                <button key={it} onClick={() => setRecettePage(it)}
                                  style={{
                                    ...btnBase,
                                    background: it === page ? 'var(--acc)' : '#fff',
                                    color:      it === page ? '#fff' : 'var(--t2)',
                                    borderColor: it === page ? 'var(--acc)' : 'var(--bdr)',
                                    fontWeight: it === page ? 800 : 600,
                                  }}>
                                  {it}
                                </button>
                              )
                            )}
                            <button style={{ ...btnBase, opacity: page >= totalPages ? .4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
                              disabled={page >= totalPages} onClick={() => setRecettePage(p => p + 1)}>›</button>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()
          }
        </div>
      )}

      {/* ── GRAPHIQUES ── */}
      {tab === 'graphiques' && (
        <PortalNutritionCharts />
      )}

    </div>
  );
}

function fmtAxisDate(d) {
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function PortalNutritionCharts() {
  const [histo, setHisto] = useState(null);
  const [days, setDays]   = useState(30);

  useEffect(() => {
    setHisto(null);
    api.nutrition.portalHistorique(days).then(setHisto).catch(() => setHisto([]));
  }, [days]);

  if (!histo) return <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Chargement…</div>;
  if (histo.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 0', color:'var(--t3)' }}>
      <div style={{ fontSize:36, marginBottom:8 }}>📊</div>
      <div style={{ fontSize:14, fontWeight:600 }}>Aucune donnée sur cette période</div>
      <div style={{ fontSize:13, marginTop:6 }}>Commencez à remplir votre journal alimentaire !</div>
    </div>
  );

  const tooltipStyle = { background:'#fff', border:'1px solid var(--bdr)', borderRadius:8, fontSize:12 };
  const periodBtn = (d, label) => (
    <button key={d}
      onClick={() => setDays(d)}
      style={{
        padding:'6px 14px', border:'none', borderRadius:0, cursor:'pointer', fontSize:13, fontWeight:600,
        background: days === d ? 'var(--acc2)' : 'transparent',
        color: days === d ? 'var(--acc3)' : 'var(--t2)',
      }}>{label}</button>
  );

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', border:'1px solid var(--bdr)', borderRadius:8, overflow:'hidden', alignSelf:'flex-start' }}>
        {periodBtn(7,'7 j')} {periodBtn(14,'14 j')} {periodBtn(30,'30 j')} {periodBtn(60,'60 j')}
      </div>

      {/* Calories */}
      <div className="card">
        <div className="card-t">🔥 Calories (kcal/jour)</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={histo} margin={{ top:10, right:10, left:0, bottom:0 }}>
            <defs>
              <linearGradient id="pCal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#1D9E75" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
            <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} width={45} />
            <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} kcal`, 'Calories']} labelFormatter={fmtAxisDate} />
            <Area type="monotone" dataKey="calories" stroke="#1D9E75" fill="url(#pCal)" strokeWidth={2} dot={false} activeDot={{ r:4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Macros */}
      <div className="card">
        <div className="card-t">🥩 Macronutriments (g/jour)</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={histo} margin={{ top:10, right:10, left:0, bottom:0 }}>
            <defs>
              {[['pProt','#3B82F6'],['pGluc','#F59E0B'],['pLip','#EF4444']].map(([id,c]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={c} stopOpacity={0.2}/>
                  <stop offset="95%" stopColor={c} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
            <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize:10 }} />
            <YAxis tick={{ fontSize:10 }} width={35} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v,n) => [`${v}g`, n]} labelFormatter={fmtAxisDate} />
            <Legend wrapperStyle={{ fontSize:12 }} />
            <Area type="monotone" dataKey="proteines" name="Protéines" stroke="#3B82F6" fill="url(#pProt)" strokeWidth={2} dot={false} activeDot={{ r:4 }} />
            <Area type="monotone" dataKey="glucides"  name="Glucides"  stroke="#F59E0B" fill="url(#pGluc)" strokeWidth={2} dot={false} activeDot={{ r:4 }} />
            <Area type="monotone" dataKey="lipides"   name="Lipides"   stroke="#EF4444" fill="url(#pLip)"  strokeWidth={2} dot={false} activeDot={{ r:4 }} />
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
            <Tooltip contentStyle={tooltipStyle} formatter={v => [`${v} ml`, 'Eau']} labelFormatter={fmtAxisDate} />
            <ReferenceLine y={2000} stroke="#0369A1" strokeDasharray="4 4" label={{ value:'2L', fill:'#0369A1', fontSize:10, position:'insideTopRight' }} />
            <Bar dataKey="eau_ml" name="Eau" fill="#38BDF8" radius={[3,3,0,0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── MESSAGES CLIENT ──────────────────────────────────────────────────────── */
const JOURS_LABELS_P = { '1':'Lundi','2':'Mardi','3':'Mercredi','4':'Jeudi','5':'Vendredi','6':'Samedi','7':'Dimanche' };

function PortalProgramme() {
  const [programmes, setProgrammes] = useState(null);
  const [selected, setSelected]     = useState(null);
  const [openDay, setOpenDay]       = useState(null);

  useEffect(() => {
    api.portal.programme()
      .then(d => setProgrammes(Array.isArray(d) ? d : [d]))
      .catch(() => setProgrammes([]));
  }, []);

  if (!programmes) return <Loader />;
  if (programmes.length === 0) return (
    <div style={{ textAlign:'center', padding:'60px 20px' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>🏋️</div>
      <div style={{ fontWeight:700, fontSize:18, marginBottom:6 }}>Aucun programme actif</div>
      <div style={{ color:'var(--t3)', fontSize:14 }}>Votre coach n'a pas encore assigné de programme.</div>
    </div>
  );

  /* ── Détail d'un programme sélectionné ── */
  if (selected !== null) {
    const { assignation, jours } = programmes[selected];
    const pct = assignation.progression_pct || 0;
    return (
      <div>
        <button onClick={() => { setSelected(null); setOpenDay(null); }}
          style={{ background:'none', border:'none', cursor:'pointer', color:'var(--acc)', fontSize:14, fontWeight:600, padding:0, marginBottom:16, display:'flex', alignItems:'center', gap:6 }}>
          ← Retour aux programmes
        </button>
        <div className="card" style={{ marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:17, fontWeight:800 }}>{assignation.programme_nom}</div>
              <div style={{ fontSize:13, color:'var(--t3)', marginTop:2 }}>
                {assignation.programme_duree_semaines} sem. · {assignation.programme_seances_par_semaine} séances/sem.
              </div>
            </div>
            <span style={{ background:'var(--acc2)', color:'var(--acc3)', fontSize:12, fontWeight:700, borderRadius:8, padding:'4px 10px', whiteSpace:'nowrap' }}>En cours</span>
          </div>
          <div style={{ fontSize:12, color:'var(--t3)', marginBottom:8 }}>
            Du {new Date(assignation.date_debut).toLocaleDateString('fr-FR')}
            {assignation.date_fin_prevue ? ` au ${new Date(assignation.date_fin_prevue).toLocaleDateString('fr-FR')}` : ''}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, height:8, background:'var(--bdr)', borderRadius:4, overflow:'hidden' }}>
              <div style={{ width:`${pct}%`, height:'100%', background:'var(--acc)', borderRadius:4, transition:'width .4s' }} />
            </div>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--acc)', whiteSpace:'nowrap' }}>{pct}%</span>
          </div>
          <div style={{ fontSize:11, color:'var(--t3)', marginTop:4 }}>
            {assignation.seances_realisees} / {assignation.seances_total} séances réalisées
          </div>
        </div>
        <ProgrammePlan jours={jours} openDay={openDay} setOpenDay={setOpenDay} />
      </div>
    );
  }

  /* ── Liste des programmes ── */
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {programmes.map(({ assignation }, idx) => {
        const pct = assignation.progression_pct || 0;
        return (
          <div key={assignation.id} className="card" onClick={() => setSelected(idx)}
            style={{ cursor:'pointer', transition:'box-shadow .15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:16 }}>🏋️ {assignation.programme_nom}</div>
              <div style={{ fontWeight:900, fontSize:18, color: pct >= 70 ? '#1D9E75' : pct >= 30 ? '#F59E0B' : 'var(--t2)' }}>{pct}%</div>
            </div>
            <div style={{ height:8, borderRadius:4, background:'var(--bdr)', overflow:'hidden', marginBottom:8 }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'var(--acc)', borderRadius:4, transition:'width .4s' }} />
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--t3)' }}>
              <span>{assignation.programme_duree_semaines} sem. · {assignation.programme_seances_par_semaine} séances/sem.</span>
              <span>{assignation.seances_realisees}/{assignation.seances_total} séances · <strong style={{ color:'var(--acc)' }}>Voir le plan →</strong></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PortalMessages() {
  const [msgs, setMsgs]       = useState(null);
  const [txt, setTxt]         = useState('');
  const [sending, setSending] = useState(false);
  const [newBanner, setNewBanner] = useState(false);
  const bot      = useRef();
  const chatRef  = useRef();
  const fileRef  = useRef();
  const msgsRef  = useRef([]);
  const pollRef  = useRef(null);

  msgsRef.current = msgs ?? [];

  const isAtBottom = () => {
    const el = chatRef.current;
    return !el || (el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };
  const scrollBottom = (smooth = true) =>
    bot.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });

  const startPoll = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      if (document.hidden) return;
      const cur    = msgsRef.current;
      const lastId = cur.length ? cur[cur.length - 1].id : null;
      try {
        const news = lastId ? await api.portal.conversation(lastId) : [];
        const arr = Array.isArray(news) ? news : (news.results ?? []);
        if (!arr.length) return;
        setMsgs(prev => {
          const ids = new Set((prev ?? []).map(m => m.id));
          return [...(prev ?? []), ...arr.filter(m => !ids.has(m.id))];
        });
        if (isAtBottom()) setTimeout(() => scrollBottom(), 60);
        else setNewBanner(true);
      } catch { /* réseau */ }
    }, 3000);
  };

  useEffect(() => {
    api.portal.conversation()
      .then(d => { const arr = d.results ?? d; setMsgs(arr); setTimeout(() => scrollBottom(false), 80); })
      .catch(() => setMsgs([]));
    startPoll();
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, []); // eslint-disable-line

  const send = async () => {
    if (!txt.trim() || sending) return;
    setSending(true);
    try {
      const msg = await api.portal.sendMessage(txt);
      setTxt('');
      setMsgs(prev => [...(prev ?? []), msg]);
      setTimeout(() => scrollBottom(), 60);
    } catch (e) { toast(e.message, 'err'); }
    finally { setSending(false); }
  };

  const sendImage = async (file) => {
    if (!file || sending) return;
    setSending(true);
    try {
      const msg = await api.portal.sendImage(file);
      setMsgs(prev => [...(prev ?? []), msg]);
      setTimeout(() => scrollBottom(), 60);
    } catch (e) { toast(e.message, 'err'); }
    finally { setSending(false); }
  };

  if (!msgs) return <Loader />;

  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Messages avec mon coach</div>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', padding: 0, overflow: 'hidden', position: 'relative' }}>
        <div ref={chatRef} onScroll={() => { if (isAtBottom()) setNewBanner(false); }}
          style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {msgs.length === 0
            ? <Empty icon="messages" title="Aucun message" desc="Commencez la conversation avec votre coach" />
            : msgs.map((m, idx) => {
                const isMe = m.expediteur_role === 'client';
                const time = new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                const prevRole = idx > 0 ? msgs[idx - 1].expediteur_role : null;
                const showSender = !isMe && prevRole !== m.expediteur_role;
                return (
                  <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginTop: prevRole !== m.expediteur_role && idx > 0 ? 10 : 0 }}>
                    {showSender && (
                      <div style={{ fontSize:11, fontWeight:600, color:'var(--t3)', marginBottom:3, marginLeft:6 }}>
                        {m.expediteur_nom || 'Coach'}
                      </div>
                    )}
                    {m.image_url ? (
                      <img src={m.image_url} alt="" style={{ maxWidth: 220, borderRadius: 12, display: 'block' }} />
                    ) : m.contenu ? (
                      <div style={{
                        maxWidth: '72%',
                        padding: '9px 13px',
                        fontSize: 13,
                        lineHeight: 1.5,
                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        background: isMe ? 'var(--acc)' : 'var(--bg3)',
                        color: isMe ? '#fff' : 'var(--t1)',
                        wordBreak: 'break-word',
                      }}>{m.contenu}</div>
                    ) : null}
                    <div style={{ fontSize:10, color:'var(--t3)', marginTop:2, paddingLeft: isMe ? 0 : 4, paddingRight: isMe ? 4 : 0 }}>{time}</div>
                  </div>
                );
              })
          }
          <div ref={bot} />
        </div>
        {newBanner && (
          <div onClick={() => { scrollBottom(); setNewBanner(false); }} style={{
            position:'absolute', bottom:72, left:'50%', transform:'translateX(-50%)',
            background:'var(--acc)', color:'#fff', borderRadius:20, padding:'6px 16px',
            fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 12px rgba(0,0,0,.2)',
            display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap',
          }}>↓ Nouveau message</div>
        )}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--bdr)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <button onClick={() => fileRef.current.click()} style={{
            width: 38, height: 38, borderRadius: 10, border: '1px solid var(--bdr)',
            background: '#fff', cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>📎</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) sendImage(f); e.target.value = ''; }} />
          <textarea className="fi"
            style={{ flex: 1, minHeight: 36, maxHeight: 100, resize: 'none' }}
            placeholder="Écrire un message..."
            value={txt}
            onChange={e => setTxt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          />
          <button className="btn btn-p" onClick={send} disabled={sending} style={{ flexShrink: 0, height: 38 }}>
            {sending ? '...' : '➤'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── BADGES & STREAKS ────────────────────────────────────────────────────── */
const BADGE_CAT_LABELS = {
  assiduite: 'Assiduité', regularite: 'Régularité', suivi: 'Suivi',
  nutrition: 'Nutrition', objectifs: 'Objectifs', special: 'Spéciaux',
};
const BADGE_CAT_ORDER = ['assiduite','regularite','suivi','nutrition','objectifs','special'];

function PortalBadges() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.gamification.portalBadges().then(setData).catch(() => setData({ badges:[], streaks:{} }));
  }, []);

  if (!data) return <Loader />;

  const { badges, streaks } = data;
  const acquis = badges.filter(b => b.acquis).length;
  const grouped = BADGE_CAT_ORDER.map(cat => ({
    cat, label: BADGE_CAT_LABELS[cat],
    items: badges.filter(b => b.categorie === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div>
      <div style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Mes succès</div>
      <div style={{ fontSize:13, color:'var(--t3)', marginBottom:20 }}>
        {acquis} / {badges.length} succès débloqués
      </div>

      {/* Streaks */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:10, marginBottom:24 }}>
        <div style={{ background:'linear-gradient(135deg, #f97316, #ea580c)', borderRadius:14, padding:'18px', color:'#fff' }}>
          <div style={{ fontSize:11, fontWeight:700, opacity:.9, textTransform:'uppercase', letterSpacing:'.5px' }}>🔥 Streak actif</div>
          <div style={{ fontSize:32, fontWeight:900, marginTop:6 }}>{streaks.streak_actif || 0}<span style={{ fontSize:14, fontWeight:600, opacity:.85, marginLeft:4 }}>jours</span></div>
          <div style={{ fontSize:11, opacity:.85, marginTop:4 }}>Record : {streaks.best_streak_actif || 0} jours</div>
        </div>
        <div style={{ background:'linear-gradient(135deg, #059669, #047857)', borderRadius:14, padding:'18px', color:'#fff' }}>
          <div style={{ fontSize:11, fontWeight:700, opacity:.9, textTransform:'uppercase', letterSpacing:'.5px' }}>💪 Séances d'affilée</div>
          <div style={{ fontSize:32, fontWeight:900, marginTop:6 }}>{streaks.streak_seances || 0}<span style={{ fontSize:14, fontWeight:600, opacity:.85, marginLeft:4 }}>séances</span></div>
          <div style={{ fontSize:11, opacity:.85, marginTop:4 }}>Sans absence</div>
        </div>
      </div>

      {/* Badges groupés par catégorie */}
      {grouped.map(g => (
        <div key={g.cat} className="card" style={{ marginBottom:14 }}>
          <div className="card-t">{g.label}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(140px, 1fr))', gap:10, marginTop:12 }}>
            {g.items.map(b => (
              <div key={b.slug} style={{
                background: b.acquis ? 'linear-gradient(135deg, #fef3c7, #fde68a)' : 'var(--bg)',
                border: `1px solid ${b.acquis ? '#fbbf24' : 'var(--bdr)'}`,
                borderRadius: 12, padding:'14px 10px', textAlign:'center',
                opacity: b.acquis ? 1 : 0.65,
              }}>
                <div style={{ fontSize:34, marginBottom:6, filter: b.acquis ? 'none' : 'grayscale(1)' }}>{b.icone}</div>
                <div style={{ fontSize:12, fontWeight:700, color: b.acquis ? '#92400e' : 'var(--t2)', marginBottom:3 }}>{b.nom}</div>
                <div style={{ fontSize:10, color:'var(--t3)', lineHeight:1.4, marginBottom:6 }}>{b.description}</div>
                {b.acquis ? (
                  <div style={{ fontSize:10, fontWeight:700, color:'#065f46' }}>✓ Débloqué</div>
                ) : (
                  <>
                    <div style={{ height:4, background:'var(--bdr)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${b.progression*100}%`, background:'var(--acc)', transition:'width .4s' }} />
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
