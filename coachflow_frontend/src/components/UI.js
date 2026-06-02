import { useState, useEffect, useRef } from 'react';

/* ── ICONS ───────────────────────────────────────────────────────────────── */
const IC = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  clients:   <><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><circle cx="19" cy="7" r="2"/><path d="M23 21v-1a3 3 0 0 0-2-2.83"/></>,
  progs:     <><path d="M4 6h16M4 10h16M4 14h8"/><rect x="14" y="12" width="8" height="8" rx="1"/></>,
  planning:  <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  revenus:   <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  messages:  <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></>,
  alertes:   <><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>,
  plus:      <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  x:         <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  check:     <><polyline points="20,6 9,17 4,12"/></>,
  back:      <><polyline points="15,18 9,12 15,6"/></>,
  send:      <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></>,
  cam:       <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></>,
  warn:      <><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  info:      <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
  logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></>,
  search:    <><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>,
  user:      <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
  target:    <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
  trend:     <><polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/></>,
  file:      <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></>,
  edit:      <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
  nutrition: <><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>,
  exercices: <><path d="M6.5 6.5h11"/><path d="M6.5 17.5h11"/><path d="M3 9.5h18"/><path d="M3 14.5h18"/></>,
};

export function Ic({ n, s = 16 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      {IC[n]}
    </svg>
  );
}

/* ── AVATAR ──────────────────────────────────────────────────────────────── */
const COLS = ['c0','c1','c2','c3','c4','c5'];
export function Av({ name = '?', src, size = 'md' }) {
  const ini = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const col = COLS[(name.charCodeAt(0) || 0) % COLS.length];
  return (
    <div className={`av av${size} ${src ? '' : col}`}>
      {src ? <img src={src} alt={name} /> : ini}
    </div>
  );
}

/* ── MODAL ───────────────────────────────────────────────────────────────── */
export function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="ov" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={wide ? { maxWidth:700, width:'95vw' } : {}}>
        <div className="mhd">
          <span className="mttl">{title}</span>
          <button className="btn btn-g btn-sm" onClick={onClose} style={{ padding: '4px 6px' }}><Ic n="x" s={15} /></button>
        </div>
        <div className="mbd">{children}</div>
        {footer && <div className="mft">{footer}</div>}
      </div>
    </div>
  );
}

/* ── LOADER ──────────────────────────────────────────────────────────────── */
export function Loader() {
  return <div className="ldr"><div className="spin" /></div>;
}

/* ── EMPTY STATE ─────────────────────────────────────────────────────────── */
export function Empty({ icon = 'user', title, desc, action }) {
  return (
    <div className="empty">
      <Ic n={icon} s={44} />
      <h3>{title}</h3>
      <p>{desc}</p>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  );
}

/* ── PROGRESS BAR ────────────────────────────────────────────────────────── */
export function PBar({ value = 0 }) {
  return (
    <div className="pb">
      <div className="pbf" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ── STATUS TAG ──────────────────────────────────────────────────────────── */
export function STag({ s }) {
  const M = {
    actif:['tg','Actif'], nouveau:['tb','Nouveau'], pause:['ta','En pause'], inactif:['tgr','Inactif'],
    payee:['tg','Payée'], envoyee:['tb','Envoyée'], retard:['tr','Retard'], brouillon:['tgr','Brouillon'],
    annulee:['tgr','Annulée'], realisee:['tg','Réalisée'], planifiee:['tb','Planifiée'], absence:['ta','Absence'],
    signe:['tg','Signé'], envoye:['tb','Envoyé'],
    haute:['tr','Haute'], moyenne:['ta','Moyenne'], basse:['tg','Basse'],
    en_cours:['tb','En cours'], atteint:['tg','Atteint'], abandonne:['tgr','Abandonné'],
  };
  const [cls, lbl] = M[s] || ['tgr', s];
  return <span className={`tag ${cls}`}>{lbl}</span>;
}

/* ── TOAST ───────────────────────────────────────────────────────────────── */
let _add = null;
export function Toasts() {
  const [list, setList] = useState([]);
  _add = (msg, type = 'ok') => {
    const id = Date.now();
    setList(l => [...l, { id, msg, type }]);
    setTimeout(() => setList(l => l.filter(x => x.id !== id)), 3200);
  };
  if (!list.length) return null;
  return (
    <div className="toast-wrap">
      {list.map(t => <div key={t.id} className={`toast t${t.type}`}>{t.msg}</div>)}
    </div>
  );
}
export const toast = (msg, type) => _add?.(msg, type);

/* ── AuthImg — charge une image via fetch avec le token ────────────────── */
export function AuthImg({ src, alt = '', style = {}, className = '' }) {
  const [blobUrl, setBlobUrl] = useState(null);
  useEffect(() => {
    if (!src) return;
    let active = true;
    fetch(src, { credentials: 'include' })
      .then(r => r.blob())
      .then(b => { if (active) setBlobUrl(URL.createObjectURL(b)); })
      .catch(() => {});
    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [src]); // eslint-disable-line
  if (!blobUrl) return <div style={{ background: 'var(--bg2)', ...style, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={className}><span style={{ fontSize: 24, opacity: 0.3 }}>📷</span></div>;
  return <img src={blobUrl} alt={alt} style={style} className={className} />;
}

/* ── LIGHTBOX ────────────────────────────────────────────────────────────── */
export function Lightbox({ src, alt = '', caption, onClose, onPrev, onNext }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && onNext) onNext();
      if (e.key === 'ArrowLeft'  && onPrev) onPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev]); // eslint-disable-line

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.88)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Fermer */}
      <button
        onClick={onClose}
        style={{
          position: 'absolute', top: 16, right: 20,
          background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%',
          width: 40, height: 40, cursor: 'pointer', color: '#fff', fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >×</button>

      {/* Flèche gauche */}
      {onPrev && (
        <button
          onClick={e => { e.stopPropagation(); onPrev(); }}
          style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%',
            width: 44, height: 44, cursor: 'pointer', color: '#fff', fontSize: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >‹</button>
      )}

      {/* Image */}
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        style={{
          maxHeight: '85vh', maxWidth: '90vw',
          objectFit: 'contain', borderRadius: 8,
          boxShadow: '0 8px 48px rgba(0,0,0,.6)',
        }}
      />

      {/* Légende */}
      {caption && (
        <div style={{
          marginTop: 14, color: 'rgba(255,255,255,.75)',
          fontSize: 13, textAlign: 'center', maxWidth: 500,
        }}>{caption}</div>
      )}

      {/* Flèche droite */}
      {onNext && (
        <button
          onClick={e => { e.stopPropagation(); onNext(); }}
          style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '50%',
            width: 44, height: 44, cursor: 'pointer', color: '#fff', fontSize: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >›</button>
      )}
    </div>
  );
}

/* ── EXERCISE IMAGE (yuhonas 2-frame animation) ───────────────────────────── */
export function ExerciseImg({ url, alt = '', width, height, style = {} }) {
  const isYuhonas = url && url.includes('yuhonas/free-exercise-db') && !url.endsWith('.jpg') && !url.endsWith('.gif');
  const [frame, setFrame] = useState(0);
  const [loaded0, setLoaded0] = useState(false);
  const [loaded1, setLoaded1] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isYuhonas || !loaded0 || !loaded1) return;
    timerRef.current = setInterval(() => setFrame(f => 1 - f), 800);
    return () => clearInterval(timerRef.current);
  }, [isYuhonas, loaded0, loaded1]);

  if (!url) return null;

  if (!isYuhonas) {
    return <img src={url} alt={alt} style={{ width, height, objectFit: 'cover', ...style }} />;
  }

  const bothLoaded = loaded0 && loaded1;
  return (
    <div style={{ position: 'relative', width, height, flexShrink: 0, overflow: 'hidden', ...style }}>
      <img src={`${url}/0.jpg`} alt={alt}
        onLoad={() => setLoaded0(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          opacity: (!bothLoaded || frame === 0) ? 1 : 0, transition: 'opacity 0.15s' }} />
      <img src={`${url}/1.jpg`} alt={alt}
        onLoad={() => setLoaded1(true)}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
          opacity: (bothLoaded && frame === 1) ? 1 : 0, transition: 'opacity 0.15s' }} />
    </div>
  );
}
