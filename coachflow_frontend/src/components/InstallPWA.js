import { useState, useEffect } from 'react';

export default function InstallPWA() {
  const [prompt, setPrompt] = useState(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-install-dismissed') === '1'
  );

  useEffect(() => {
    const onPrompt = e => { e.preventDefault(); setPrompt(e); };
    const onUpdate = () => setUpdateReady(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('sw-update-available', onUpdate);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('sw-update-available', onUpdate);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setPrompt(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  const reload = async () => {
    const reg = await navigator.serviceWorker?.ready;
    if (reg?.waiting) {
      reg.waiting.postMessage('SKIP_WAITING');
    } else {
      window.location.reload();
    }
  };

  const base = {
    position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)',
    zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
    background: '#0f172a', color: '#fff',
    borderRadius: 14, padding: '12px 16px',
    boxShadow: '0 8px 32px rgba(0,0,0,.28)',
    fontSize: 13, maxWidth: 'calc(100vw - 32px)', width: 380,
    animation: 'slideUp .25s ease',
  };

  if (updateReady) return (
    <div style={base}>
      <span style={{ fontSize: 20 }}>🔄</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700 }}>Mise à jour disponible</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Rechargez pour obtenir la dernière version</div>
      </div>
      <button onClick={reload} style={{
        background: '#1D9E75', border: 'none', borderRadius: 9,
        color: '#fff', padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
      }}>Recharger</button>
      <button onClick={() => setUpdateReady(false)} style={{
        background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, padding: 0,
      }}>×</button>
    </div>
  );

  if (!prompt || dismissed) return null;

  return (
    <>
      <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(80px); opacity:0 } to { transform: translateX(-50%) translateY(0); opacity:1 } }`}</style>
      <div style={base}>
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, #065f46, #1D9E75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>⚡</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700 }}>Installer TrainFlow</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Accès rapide depuis l'écran d'accueil</div>
        </div>
        <button onClick={install} style={{
          background: '#1D9E75', border: 'none', borderRadius: 9,
          color: '#fff', padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
        }}>Installer</button>
        <button onClick={dismiss} style={{
          background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18, padding: 0,
        }}>×</button>
      </div>
    </>
  );
}
