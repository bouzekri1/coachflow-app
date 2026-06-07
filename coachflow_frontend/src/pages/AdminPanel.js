import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, useNavigate, useParams, Navigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../components/UI';

const fmtMoney = (n) => `${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €`;
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/* ─── LAYOUT ──────────────────────────────────────────────────────────────── */
export default function AdminPanel() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <AdminHeader />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px' }}>
        <Routes>
          <Route path="/"                element={<AdminDashboard />} />
          <Route path="/coachs"          element={<AdminCoachs />} />
          <Route path="/coachs/:id"      element={<AdminCoachDetail />} />
          <Route path="/feedbacks"       element={<AdminFeedbacks />} />
          <Route path="*"                element={<Navigate to="" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function AdminHeader() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b, #4338ca)',
      color: '#fff', padding: '0 24px',
      display: 'flex', alignItems: 'center', gap: 18, height: 64,
      boxShadow: '0 2px 8px rgba(0,0,0,.15)', position: 'sticky', top: 0, zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'rgba(255,255,255,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18,
        }}>👑</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px' }}>TrainFlow Admin</div>
          <div style={{ fontSize: 10, opacity: .75 }}>Super-administration plateforme</div>
        </div>
      </div>

      <nav style={{ display: 'flex', gap: 2, flex: 1, marginLeft: 18 }}>
        {[
          { to: '',           label: '📊 Dashboard',  end: true },
          { to: 'coachs',     label: '👥 Coachs' },
          { to: 'feedbacks',  label: '📩 Feedbacks' },
        ].map(t => (
          <NavLink key={t.to} to={t.to} end={t.end}
            style={({ isActive }) => ({
              padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              color: '#fff', textDecoration: 'none',
              background: isActive ? 'rgba(255,255,255,.18)' : 'transparent',
              transition: 'all .12s',
            })}>{t.label}</NavLink>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => nav('/dashboard')} style={{
          padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,.15)',
          color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
        }}>← Vue coach</button>
        <div style={{ fontSize: 12, opacity: .9 }}>{user?.email}</div>
        <button onClick={logout} style={{
          padding: '6px 12px', borderRadius: 8, background: 'transparent',
          color: '#fff', border: '1px solid rgba(255,255,255,.3)', cursor: 'pointer',
          fontSize: 12,
        }}>Déco</button>
      </div>
    </div>
  );
}

/* ─── DASHBOARD ──────────────────────────────────────────────────────────── */
function AdminDashboard() {
  const [data, setData] = useState(null);
  useEffect(() => { api.admin.dashboard().then(setData).catch(e => toast(e.message, 'err')); }, []);

  if (!data) return <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Chargement…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Vue d'ensemble plateforme</h1>

      {/* Hero KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <Kpi icon="💰" label="MRR total"           value={fmtMoney(data.mrr.total)}        color="#1D9E75" sub={`ARR estimé : ${fmtMoney(data.mrr.arr_estime)}`} />
        <Kpi icon="👥" label="Coachs"              value={data.coachs.total}                color="#6366f1" sub={`${data.coachs.pros} Pro · ${data.coachs.frees} Free`} />
        <Kpi icon="🏃" label="Clients"             value={data.clients.total}               color="#ec4899" sub={`${data.clients.actifs} actifs`} />
        <Kpi icon="📅" label="Séances 7j"          value={data.activite.seances_7j}         color="#f59e0b" sub={`${data.activite.seances_30j} sur 30j`} />
      </div>

      {/* Cards secondaires */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        <Card title="📈 Acquisition">
          <Row label="Signups 7 jours"   value={data.coachs.signups_7j} />
          <Row label="Signups 30 jours"  value={data.coachs.signups_30j} />
          <Row label="Coachs actifs 30j" value={data.coachs.actifs} />
          <Row label="Coachs inactifs"   value={data.coachs.inactifs} muted />
        </Card>

        <Card title="🤖 IA">
          <Row label="Générations 30j"   value={data.activite.ia_generations_30j} />
          <Row label="Coachs Pro"        value={data.coachs.pros} />
          <Row label="Coachs Free"       value={data.coachs.frees} />
        </Card>

        <Card title="📩 Support" badge={data.support.feedbacks_ouverts > 0 ? { value: data.support.feedbacks_ouverts, color: '#dc2626' } : null}>
          <Row label="Feedbacks ouverts"        value={data.support.feedbacks_ouverts} />
          <Row label="Bugs critiques ouverts"   value={data.support.bugs_critiques_ouverts} alert={data.support.bugs_critiques_ouverts > 0} />
          <NavLink to="feedbacks" style={{ display: 'block', marginTop: 8, fontSize: 12, color: 'var(--acc)', fontWeight: 600 }}>
            Voir les feedbacks →
          </NavLink>
        </Card>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, color, sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '16px 18px',
      border: '1px solid var(--bdr)', boxShadow: 'var(--sh)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--t3)', textTransform:'uppercase', letterSpacing:.5, fontWeight:700 }}>
        <span>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color, marginTop: 6, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Card({ title, children, badge }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, padding: '16px 18px',
      border: '1px solid var(--bdr)', boxShadow: 'var(--sh)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        {badge && <span style={{ background: badge.color, color: '#fff', borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 800 }}>{badge.value}</span>}
      </div>
      {children}
    </div>
  );
}

function Row({ label, value, muted, alert }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: '1px dashed var(--bdr)', fontSize: 13,
    }}>
      <span style={{ color: muted ? 'var(--t3)' : 'var(--t2)' }}>{label}</span>
      <span style={{
        fontWeight: 700,
        color: alert ? '#dc2626' : muted ? 'var(--t3)' : 'var(--t1)',
      }}>{value}</span>
    </div>
  );
}

/* ─── COACHS LIST ────────────────────────────────────────────────────────── */
function AdminCoachs() {
  const [list, setList] = useState(null);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const nav = useNavigate();

  const load = () => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (plan)   q.set('plan', plan);
    api.admin.coachs(q.toString()).then(setList).catch(e => toast(e.message, 'err'));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [search, plan]); // eslint-disable-line

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 16 }}>Coachs</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input className="fi" placeholder="🔍 Recherche (nom, email)"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 260px', maxWidth: 360 }} />
        <select className="fi" value={plan} onChange={e => setPlan(e.target.value)} style={{ width: 140 }}>
          <option value="">Tous les plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
      </div>

      {!list ? <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Chargement…</div> :
       list.length === 0 ? <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Aucun coach trouvé.</div> :
        <div style={{ background:'#fff', border:'1px solid var(--bdr)', borderRadius:12, overflow:'hidden', boxShadow:'var(--sh)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', color: 'var(--t3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: .5 }}>
                  <th style={th}>Coach</th>
                  <th style={th}>Plan</th>
                  <th style={thNum}>Clients</th>
                  <th style={thNum}>MRR</th>
                  <th style={thNum}>Séances 30j</th>
                  <th style={thNum}>IA</th>
                  <th style={th}>Inscrit</th>
                </tr>
              </thead>
              <tbody>
                {list.map(c => (
                  <tr key={c.id}
                    onClick={() => nav(c.id)}
                    style={{ cursor: 'pointer', borderTop: '1px solid var(--bdr)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <td style={td}>
                      <div style={{ fontWeight: 700 }}>{c.first_name} {c.last_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)' }}>{c.email}</div>
                    </td>
                    <td style={td}>
                      <span style={{
                        display:'inline-block', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700,
                        background: c.plan === 'pro' ? '#DBEAFE' : '#F3F4F6',
                        color: c.plan === 'pro' ? '#1E40AF' : '#6B7280',
                      }}>{c.plan === 'pro' ? 'Pro' : 'Free'}</span>
                      {!c.is_active && <span style={{ marginLeft: 6, fontSize: 10, color:'#dc2626', fontWeight:700 }}>désactivé</span>}
                    </td>
                    <td style={tdNum}>{c.clients_actifs}<span style={{ color:'var(--t3)', fontSize:11 }}> / {c.clients_total}</span></td>
                    <td style={tdNum}>{fmtMoney(c.mrr_mensuel)}</td>
                    <td style={tdNum}>{c.seances_30j}</td>
                    <td style={tdNum}>{c.ia_utilise}<span style={{ color:'var(--t3)', fontSize:11 }}> / {c.ia_quota}</span></td>
                    <td style={td}>{fmtDate(c.date_joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  );
}

const th    = { padding: '12px 14px', textAlign: 'left',  fontWeight: 700 };
const thNum = { padding: '12px 14px', textAlign: 'right', fontWeight: 700 };
const td    = { padding: '12px 14px', textAlign: 'left'  };
const tdNum = { padding: '12px 14px', textAlign: 'right', fontWeight: 600 };

/* ─── COACH DETAIL ───────────────────────────────────────────────────────── */
function AdminCoachDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [coach, setCoach] = useState(null);
  const [busy, setBusy] = useState(false);
  const [quotaInput, setQuotaInput] = useState('');

  const load = () => api.admin.coach(id).then(c => { setCoach(c); setQuotaInput(String(c.ia_quota_mensuel)); }).catch(e => toast(e.message, 'err'));
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  if (!coach) return <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Chargement…</div>;

  const togglePlan = async () => {
    setBusy(true);
    try {
      await api.admin.updateCoach(id, { plan: coach.plan === 'pro' ? 'free' : 'pro' });
      toast(`Plan changé en ${coach.plan === 'pro' ? 'Free' : 'Pro'}`);
      load();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  const saveQuota = async () => {
    setBusy(true);
    try {
      await api.admin.updateCoach(id, { ia_quota_mensuel: parseInt(quotaInput) });
      toast('Quota IA mis à jour');
      load();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  const toggleActive = async () => {
    if (!window.confirm(coach.is_active ? 'Désactiver ce compte coach ?' : 'Réactiver ce compte coach ?')) return;
    setBusy(true);
    try {
      await api.admin.updateCoach(id, { is_active: !coach.is_active });
      toast(coach.is_active ? 'Compte désactivé' : 'Compte réactivé');
      load();
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  const impersonate = async () => {
    if (!window.confirm(`Te connecter en tant que ${coach.first_name} ${coach.last_name} ?\n\nTu seras déconnecté de ton compte admin. Pour revenir, déconnecte-toi puis reconnecte-toi avec ton mail admin.`)) return;
    setBusy(true);
    try {
      const r = await api.admin.impersonate(id);
      // L'impersonation backend retourne le token coach ; on doit recharger l'auth.
      // Approche simple : on fait un logout admin puis un re-login via token cookie.
      // Comme on n'a pas de mécanisme cookie-by-token côté client, on prévient l'utilisateur.
      toast(`Token d'impersonation généré. Ouvre une fenêtre privée et appelle l'API avec : ${r.impersonation_token.slice(0,12)}…`, 'info');
      // TODO Phase 2 : auto-substitution de cookie via endpoint dédié
    } catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };

  return (
    <div>
      <button onClick={() => nav('/admin-panel/coachs')} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)',
        fontSize: 13, marginBottom: 12, padding: 0,
      }}>← Retour à la liste</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14,
          background: 'linear-gradient(135deg, #6366f1, #4338ca)',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 800,
        }}>{(coach.first_name?.[0] || '') + (coach.last_name?.[0] || '') || '?'}</div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{coach.first_name} {coach.last_name}</h1>
          <div style={{ fontSize: 13, color: 'var(--t3)' }}>{coach.email} · @{coach.username}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-s" onClick={impersonate} disabled={busy || !coach.is_active}>👤 Impersonate</button>
          <button className="btn btn-s" onClick={toggleActive} disabled={busy}
            style={{ color: coach.is_active ? '#dc2626' : '#16a34a', borderColor: coach.is_active ? '#dc2626' : '#16a34a' }}>
            {coach.is_active ? '🚫 Désactiver' : '✓ Réactiver'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <Card title="💰 Plan & facturation">
          <Row label="Plan actuel" value={coach.plan === 'pro' ? 'Pro' : 'Free'} />
          <Row label="MRR mensuel" value={fmtMoney(coach.mrr_mensuel)} />
          <Row label="Expire le"   value={fmtDate(coach.plan_expires_at)} muted />
          <button className="btn btn-p btn-sm" style={{ marginTop: 10, width: '100%' }}
            onClick={togglePlan} disabled={busy}>
            Passer en {coach.plan === 'pro' ? 'Free' : 'Pro'}
          </button>
        </Card>

        <Card title="🤖 Quota IA">
          <Row label="Utilisé ce mois" value={coach.ia_generations_count_mois} />
          <Row label="Quota mensuel" value={coach.ia_quota_mensuel} />
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <input className="fi" type="number" min={0} max={1000} value={quotaInput}
              onChange={e => setQuotaInput(e.target.value)} style={{ flex: 1 }} />
            <button className="btn btn-p btn-sm" onClick={saveQuota} disabled={busy}>Maj</button>
          </div>
        </Card>

        <Card title="📊 Activité">
          <Row label="Clients (actifs / total)" value={`${coach.clients_actifs} / ${coach.clients_total}`} />
          <Row label="Séances 30 derniers j"   value={coach.seances_30j} />
          <Row label="Inscrit le"               value={fmtDate(coach.date_joined)} />
          <Row label="Dernière connexion"       value={fmtDate(coach.last_login)} muted />
        </Card>

        <Card title="👤 Profil">
          <Row label="Email vérifié" value={coach.email_verified ? '✓' : '✗'} />
          <Row label="Actif"        value={coach.is_active ? '✓' : '✗'} />
          <Row label="Ville"        value={coach.ville || '—'} muted />
          {coach.bio && <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 8, padding: '8px 10px', background: 'var(--bg)', borderRadius: 6 }}>{coach.bio}</div>}
        </Card>
      </div>
    </div>
  );
}

/* ─── FEEDBACKS ──────────────────────────────────────────────────────────── */
function AdminFeedbacks() {
  const [list, setList] = useState(null);
  const [type, setType] = useState('');
  const [statusF, setStatusF] = useState('open');

  const load = () => {
    const q = new URLSearchParams();
    if (type) q.set('type', type);
    if (statusF) q.set('status', statusF);
    api.admin.feedbacks(q.toString()).then(setList).catch(e => toast(e.message, 'err'));
  };
  useEffect(() => { load(); }, [type, statusF]); // eslint-disable-line

  const updateStatus = async (id, newStatus) => {
    try {
      await api.admin.updateFeedback(id, { status: newStatus });
      toast('Statut mis à jour');
      load();
    } catch (e) { toast(e.message, 'err'); }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, marginBottom: 16 }}>Feedbacks</h1>

      <div style={{ display:'flex', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <select className="fi" value={type} onChange={e => setType(e.target.value)} style={{ width:140 }}>
          <option value="">Tous types</option>
          <option value="bug">🐛 Bug</option>
          <option value="suggestion">💡 Suggestion</option>
          <option value="question">❓ Question</option>
        </select>
        <select className="fi" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ width:160 }}>
          <option value="">Tous statuts</option>
          <option value="open">Ouverts</option>
          <option value="in_progress">En cours</option>
          <option value="resolved">Résolus</option>
          <option value="rejected">Rejetés</option>
        </select>
      </div>

      {!list ? <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Chargement…</div> :
       list.length === 0 ? <div style={{ textAlign:'center', padding:40, color:'var(--t3)' }}>Aucun feedback.</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.map(f => {
            const icon = f.type === 'bug' ? '🐛' : f.type === 'suggestion' ? '💡' : '❓';
            const sevColor = f.severity === 'high' ? '#dc2626' : f.severity === 'medium' ? '#ca8a04' : '#16a34a';
            return (
              <div key={f.id} style={{
                background: '#fff', border: '1px solid var(--bdr)', borderRadius: 12, padding: '14px 16px', boxShadow: 'var(--sh)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 18 }}>{icon}</span>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{f.title}</span>
                      {f.severity && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: `${sevColor}22`, color: sevColor, fontWeight: 700 }}>{f.severity.toUpperCase()}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>
                      {f.user_email || 'Anonyme'} · {f.user_role || '—'} · {fmtDate(f.created_at)}
                      {f.url && <> · <a href={f.url} target="_blank" rel="noreferrer" style={{ color: 'var(--acc)' }}>{f.url}</a></>}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 8, whiteSpace: 'pre-wrap' }}>{f.description}</div>
                  </div>
                  <select value={f.status} onChange={e => updateStatus(f.id, e.target.value)} style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: '1.5px solid var(--bdr)', background: '#fff', cursor: 'pointer',
                  }}>
                    <option value="open">Ouvert</option>
                    <option value="in_progress">En cours</option>
                    <option value="resolved">Résolu</option>
                    <option value="rejected">Rejeté</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}
