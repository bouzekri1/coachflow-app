import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

const isSupported = () =>
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

export default function usePushNotifications() {
  const [permission, setPermission] = useState(
    isSupported() ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!isSupported()) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub));
    });
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported()) return;
    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== 'granted') return;

    const { publicKey } = await api.push.vapidKey();
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    const json = sub.toJSON();
    await api.push.subscribe({ endpoint: json.endpoint, keys: json.keys });
    setSubscribed(true);
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!isSupported()) return;
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await api.push.unsubscribe({ endpoint: sub.endpoint });
    await sub.unsubscribe();
    setSubscribed(false);
  }, []);

  return { permission, subscribed, subscribe, unsubscribe };
}
