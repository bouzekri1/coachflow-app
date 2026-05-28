import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const nav = useNavigate();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f8fafc', padding: 24,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px',
          background: 'linear-gradient(135deg,#065f46,#1D9E75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38,
        }}>⚡</div>
        <div style={{ fontSize: 72, fontWeight: 900, color: '#e2e8f0', lineHeight: 1, marginBottom: 8 }}>404</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Page introuvable</div>
        <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, marginBottom: 32 }}>
          Cette page n'existe pas ou a été déplacée.<br />
          Vérifiez l'URL ou retournez à l'accueil.
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => nav(-1)} style={{
            padding: '11px 22px', borderRadius: 10, border: '1px solid #e2e8f0',
            background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151',
          }}>← Retour</button>
          <button onClick={() => nav('/dashboard')} style={{
            padding: '11px 22px', borderRadius: 10, border: 'none',
            background: '#6366F1', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>Tableau de bord</button>
        </div>
      </div>
    </div>
  );
}
