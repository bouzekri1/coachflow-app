/**
 * Enqueue a request in the SW background-sync queue when offline,
 * or execute it immediately when online.
 *
 * Usage:
 *   const { enqueue } = useOfflineQueue();
 *   await enqueue('POST', '/api/portal/nutrition/journal/', { ...data }, token);
 */
export default function useOfflineQueue() {
  const enqueue = async (method, url, body, token) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
    };

    if (navigator.onLine) {
      return fetch(url, { method, headers, body: JSON.stringify(body) });
    }

    // Hors ligne → mettre en file d'attente dans le SW
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'QUEUE_REQUEST',
        payload: { url, method, headers, body: JSON.stringify(body) },
      });
      // Enregistrer un sync tag pour que le SW rejoue quand le réseau revient
      const reg = await navigator.serviceWorker.ready;
      if ('sync' in reg) {
        await reg.sync.register('coachflow-sync');
      }
    }
    throw new Error('Requête mise en file d\'attente (hors ligne)');
  };

  return { enqueue };
}
