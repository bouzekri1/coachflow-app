export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => {
          reg.addEventListener('updatefound', () => {
            const newSW = reg.installing;
            newSW?.addEventListener('statechange', () => {
              if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                // Nouveau SW en attente : la bannière InstallPWA prend le relais
                window.dispatchEvent(new CustomEvent('sw-update-available'));
              }
            });
          });
        })
        .catch(err => console.error('SW registration failed:', err));

      // Recharge quand le nouveau SW prend réellement le contrôle (après SKIP_WAITING)
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(reg => reg.unregister())
      .catch(err => console.error(err));
  }
}
