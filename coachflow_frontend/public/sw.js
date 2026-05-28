const CACHE = 'coachflow-v4';
const OFFLINE = '/offline.html';
const SYNC_QUEUE = 'coachflow-sync-queue';

/* ── INSTALL : cache le shell ──────────────────────────────────────────────── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(['/', OFFLINE]))
    // Ne pas appeler skipWaiting() ici : le nouveau SW attend que
    // l'utilisateur confirme la mise à jour via la bannière InstallPWA.
  );
});

/* ── ACTIVATE : nettoie les anciens caches ─────────────────────────────────── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── FETCH ─────────────────────────────────────────────────────────────────── */
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // API Django → network-first, mise en cache pour offline
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(networkFirst(request));
    return;
  }

  // Navigation SPA → toujours servir index.html depuis réseau, sinon cache
  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .catch(() => caches.match('/') ?? caches.match(OFFLINE))
    );
    return;
  }

  // Assets statiques (JS, CSS, images) → cache-first
  e.respondWith(cacheFirst(request));
});

async function networkFirst(req) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return caches.match(req) ?? new Response(
      JSON.stringify({ detail: 'Hors ligne' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch {
    return caches.match(OFFLINE) ?? new Response('Offline', { status: 503 });
  }
}

/* ── BACKGROUND SYNC ───────────────────────────────────────────────────────── */
self.addEventListener('sync', e => {
  if (e.tag === 'coachflow-sync') {
    e.waitUntil(flushQueue());
  }
});

async function flushQueue() {
  const db = await openQueue();
  const tx = db.transaction(SYNC_QUEUE, 'readwrite');
  const store = tx.objectStore(SYNC_QUEUE);
  const items = await storeGetAll(store);
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });
      if (res.ok) {
        const delTx = db.transaction(SYNC_QUEUE, 'readwrite');
        delTx.objectStore(SYNC_QUEUE).delete(item.id);
        await txDone(delTx);
      }
    } catch {
      // réseau indisponible — on réessaiera au prochain sync
    }
  }
}

function openQueue() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('coachflow-sync', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore(SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}
function storeGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

/* ── MESSAGES depuis l'app ──────────────────────────────────────────────────── */
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') {
    // L'utilisateur a cliqué "Recharger" dans la bannière de mise à jour
    self.skipWaiting();
    return;
  }
  if (e.data?.type === 'QUEUE_REQUEST') {
    openQueue().then(db => {
      const tx = db.transaction(SYNC_QUEUE, 'readwrite');
      tx.objectStore(SYNC_QUEUE).add(e.data.payload);
    });
  }
});

/* ── PUSH NOTIFICATIONS (base) ─────────────────────────────────────────────── */
self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'CoachFlow', {
      body: data.body || '',
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const url = e.notification.data?.url || '/';
      const existing = list.find(c => c.url === url && 'focus' in c);
      return existing ? existing.focus() : clients.openWindow(url);
    })
  );
});
