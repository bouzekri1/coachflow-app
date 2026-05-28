import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Av, Loader, PBar } from '../components/UI';
import OnboardingWizard from '../components/OnboardingWizard';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

/* ── METRIC CARD ──────────────────────────────────────────────────────────── */
const MET_COLORS = {
  green:  { bg: 'linear-gradient(135deg,#d1fae5,#6ee7b7)', shadow: 'rgba(22,163,127,.2)' },
  blue:   { bg: 'linear-gradient(135deg,#dbeafe,#93c5fd)', shadow: 'rgba(59,130,246,.2)' },
  amber:  { bg: 'linear-gradient(135deg,#fef3c7,#fcd34d)', shadow: 'rgba(245,158,11,.2)' },
  purple: { bg: 'linear-gradient(135deg,#ede9fe,#c4b5fd)', shadow: 'rgba(139,92,246,.2)' },
  red:    { bg: 'linear-gradient(135deg,#fee2e2,#fca5a5)', shadow: 'rgba(239,68,68,.2)' },
};

function Met({ icon, label, value, delta, up = true, color = 'green', onClick }) {
  const c = MET_COLORS[color] || MET_COLORS.green;
  return (
    <div className="met" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div className="met-icon" style={{
          width: 44, height: 44, borderRadius: 12,
          background: c.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          boxShadow: `0 4px 12px ${c.shadow}`, flexShrink: 0,
        }}>{icon}</div>
        <div className="met-l">{label}</div>
      </div>
      <div className="met-v">{value}</div>
      {delta && <div className={`met-d ${up ? 'up' : 'tc3'}`}>{delta}</div>}
    </div>
  );
}

/* ── TOOLTIP CUSTOMISÉ ────────────────────────────────────────────────────── */
const TIP = { borderRadius: 10, border: '1px solid var(--bdr)', fontSize: 12, padding: '8px 12px' };

/* ── DASHBOARD ────────────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [data, setData]           = useState(null);
  const [err, setErr]             = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuth();
  const nav = useNavigate();

  const load = () => {
    setErr(null);
    api.dashboard().then(setData).catch(e => setErr(e.message || 'Erreur'));
  };

  useEffect(() => { load(); }, []);

  // Afficher le wizard si l'onboarding n'est pas encore complété
  useEffect(() => {
    if (user && user.onboarding_completed === false) {
      setShowOnboarding(true);
    }
  }, [user]);

  if (err) {
    const isThrottle = err.includes('alenti') || err.includes('Disponible');
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{isThrottle ? '⏱️' : '⚠️'}</div>
        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--t1)' }}>
          {isThrottle ? 'Trop de requêtes' : 'Impossible de charger le tableau de bord'}
        </div>
        {isThrottle && (
          <div style={{ fontSize: 13, marginBottom: 16, maxWidth: 320, margin: '0 auto 16px' }}>
            {err}<br />
            <span style={{ fontSize: 12 }}>Redémarrez le serveur Django ou attendez quelques minutes.</span>
          </div>
        )}
        <button className="btn btn-p" onClick={load}>Réessayer</button>
      </div>
    );
  }
  if (!data) return <Loader />;

  const hr = new Date().getHours();
  const greet = hr < 12 ? 'Bonjour' : hr < 18 ? 'Bon après-midi' : 'Bonsoir';

  /* cumul clients mois par mois */
  let cumul = 0;
  const clientsData = (data.clients_par_mois || []).map(d => {
    cumul += d.clients;
    return { ...d, cumul };
  });

  const STATUT_COLORS = { actif: '#1D9E75', nouveau: '#1D9E75', prospect: '#3B82F6', pause: '#F59E0B', inactif: '#D1D5DB' };
  const STATUT_LABELS = { actif: 'Actifs', nouveau: 'Nouveaux', prospect: 'Prospects', pause: 'En pause', inactif: 'Inactifs' };
  const repartition = (data.repartition_clients || []).map(d => ({
    name: STATUT_LABELS[d.statut] || d.statut,
    value: d.n,
    color: STATUT_COLORS[d.statut] || '#9CA3AF',
  }));

  return (
    <div>
      {showOnboarding && (
        <OnboardingWizard user={user} onDone={() => setShowOnboarding(false)} />
      )}

      {/* En-tête */}
      <div className="mb20">
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.4px' }}>{greet} 👋</h1>
        <p className="tc3 t13 mt4">Vue d'ensemble de votre activité coaching</p>
      </div>

      {/* KPIs */}
      <div className="mets">
        <Met icon="👥" label="Clients actifs"  value={data.clients_actifs} color="green"
          delta={(() => { const p = data.repartition_clients?.find(r=>r.statut==='prospect')?.n||0; return p > 0 ? `+ ${p} prospect${p>1?'s':''}` : 'actifs & nouveaux'; })()}
          onClick={() => nav('/clients')} />
        <Met icon="📅" label="Séances semaine" value={data.seances_semaine} color="blue"
          delta={`${data.seances_restantes} restante${data.seances_restantes!==1?'s':''}`} up={false}
          onClick={() => nav('/planning')} />
        <Met icon="💶" label="Revenus du mois" color="amber"
          value={`${Number(data.revenus_mois||0).toLocaleString('fr-FR')} €`}
          delta={data.revenus_par_mois?.length >= 2
            ? (() => { const [prev, cur] = data.revenus_par_mois.slice(-2); return prev.revenus > 0 ? `${cur.revenus >= prev.revenus ? '+' : ''}${Math.round((cur.revenus - prev.revenus) / prev.revenus * 100)}% vs mois préc.` : null; })()
            : null}
          onClick={() => nav('/revenus')} />
        <Met icon="🏆" label="Taux complétion" value={`${data.taux_completion}%`} color="purple" delta="programmes en cours" up={false} />
      </div>

      {/* Graphiques */}
      <div className="g2 mb16">

        {/* Croissance clients */}
        <div className="card">
          <div className="card-t">
            📈 Croissance clients
            <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>12 derniers mois</span>
          </div>
          {clientsData.every(d => d.cumul === 0)
            ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--t3)', fontSize: 13 }}>Aucune donnée disponible</div>
            : <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={clientsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gClients" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1D9E75" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
                  <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={TIP} formatter={(v) => [v, 'Total clients']} />
                  <Area type="monotone" dataKey="cumul" stroke="#1D9E75" fill="url(#gClients)" strokeWidth={2} dot={false} name="Total clients" />
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Revenus mensuels */}
        <div className="card">
          <div className="card-t">
            💶 Revenus mensuels
            <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>6 derniers mois</span>
          </div>
          {(data.revenus_par_mois || []).every(d => d.revenus === 0)
            ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--t3)', fontSize: 13 }}>Aucun revenu enregistré</div>
            : <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.revenus_par_mois || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
                  <XAxis dataKey="mois" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={TIP} formatter={v => [`${v} €`, 'Revenus']} />
                  <Bar dataKey="revenus" fill="#1D9E75" radius={[6, 6, 0, 0]} name="Revenus (€)" />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Séances par semaine */}
        <div className="card">
          <div className="card-t">
            🏋️ Séances — 8 semaines
            <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>réalisées vs planifiées</span>
          </div>
          {(data.seances_par_semaine || []).every(d => d.planifiees === 0)
            ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--t3)', fontSize: 13 }}>Aucune séance sur la période</div>
            : <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.seances_par_semaine || []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--bdr)" />
                  <XAxis dataKey="semaine" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={TIP} />
                  <Bar dataKey="planifiees" fill="#D1FAE5" radius={[4, 4, 0, 0]} name="Planifiées" />
                  <Bar dataKey="realisees"  fill="#1D9E75" radius={[4, 4, 0, 0]} name="Réalisées" />
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Répartition clients */}
        <div className="card">
          <div className="card-t">
            👥 Répartition clients
            <button className="btn btn-g btn-sm" onClick={() => nav('/clients')}>Voir tout →</button>
          </div>
          {repartition.length === 0 || repartition.every(d => d.value === 0)
            ? <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--t3)', fontSize: 13 }}>Aucun client enregistré</div>
            : <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={repartition} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                      dataKey="value" paddingAngle={3}>
                      {repartition.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TIP} formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
                  {repartition.map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                      <span style={{ color: 'var(--t2)' }}>{d.name}</span>
                      <span style={{ fontWeight: 700 }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
          }
        </div>
      </div>

      {/* Avancement & Séances */}
      <div className="g2 mb16">
        <div className="card">
          <div className="card-t">
            Avancement programmes
            <button className="btn btn-g btn-sm" onClick={() => nav('/clients')}>Voir tout →</button>
          </div>
          {!data.clients_avancement?.length
            ? <p className="t13 tc3">Aucun client actif</p>
            : data.clients_avancement.map(c => {
              const p = c.programme_actif;
              return (
                <div key={c.id} onClick={() => nav(`/clients/${c.id}`)}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom:'1px solid var(--bdr)', cursor:'pointer' }}>
                  <Av name={c.nom_complet} size="sm" />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="fw6 t13 trunc">{c.nom_complet}</div>
                    <div className="t11 tc3">{p ? `${p.nom} — sem. ${p.semaine_courante}/${p.duree_semaines}` : 'Pas de programme'}</div>
                  </div>
                  {p && (
                    <div style={{ width: 80 }}>
                      <div className="t11 tc3 tright mb8">{p.progression_pct}%</div>
                      <PBar value={p.progression_pct} />
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>

        <div className="card">
          <div className="card-t">
            Prochaines séances
            <button className="btn btn-g btn-sm" onClick={() => nav('/planning')}>Planning →</button>
          </div>
          {!data.prochaines_seances?.length
            ? <p className="t13 tc3">Aucune séance planifiée</p>
            : data.prochaines_seances.slice(0, 6).map(s => {
              const dt = new Date(s.date_heure);
              const col = s.type_seance === 'presentiel' ? 'dg' : s.type_seance === 'visio' ? 'db' : 'da';
              return (
                <div key={s.id} className="si">
                  <div className="si-t">{dt.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' })}</div>
                  <div className={`dot ${col}`} />
                  <div style={{ flex: 1 }}>
                    <div className="si-n">{s.client_nom}</div>
                    <div className="si-s">{s.type_seance} · {s.duree_minutes}min</div>
                  </div>
                </div>
              );
            })
          }
        </div>
      </div>

      {/* Alertes */}
      {data.messages_non_lus > 0 && (
        <div className="alrt ai" style={{ cursor:'pointer', marginBottom:10 }} onClick={() => nav('/messages')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <div style={{ flex:1 }}>
            <div className="alrt-t">{data.messages_non_lus} message{data.messages_non_lus>1?'s':''} non lu{data.messages_non_lus>1?'s':''}</div>
            <div className="alrt-s">Cliquez pour consulter</div>
          </div>
          <span style={{ minWidth:22, height:22, borderRadius:11, background:'var(--red)', color:'#fff', fontSize:11, fontWeight:800, display:'inline-flex', alignItems:'center', justifyContent:'center', padding:'0 5px' }}>{data.messages_non_lus>9?'9+':data.messages_non_lus}</span>
          <span style={{ fontSize:18 }}>→</span>
        </div>
      )}
      {data.alertes_non_lues > 0 && (
        <div className="alrt aw" style={{ cursor:'pointer' }} onClick={() => nav('/alertes')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div style={{ flex:1 }}>
            <div className="alrt-t">{data.alertes_non_lues} alerte{data.alertes_non_lues>1?'s':''} en attente</div>
            <div className="alrt-s">Cliquez pour traiter</div>
          </div>
          <span style={{ fontSize:18 }}>→</span>
        </div>
      )}

    </div>
  );
}
