import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID;

export default function GoogleLoginButton() {
  const divRef = useRef(null);
  const { loginWithToken } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function initGoogle() {
      if (!window.google || !divRef.current) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: async (response) => {
          setErr('');
          setBusy(true);
          try {
            const data = await api.googleLogin(response.credential);
            loginWithToken(data.token, data.user);
            nav('/dashboard');
          } catch (e) {
            setErr(e.message || 'Erreur Google');
          } finally {
            setBusy(false);
          }
        },
      });
      window.google.accounts.id.renderButton(divRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        locale: 'fr',
        width: divRef.current.offsetWidth || 340,
      });
    }

    if (window.google) {
      initGoogle();
    } else {
      const existing = document.getElementById('gsi-script');
      if (existing) {
        existing.addEventListener('load', initGoogle);
      } else {
        const s = document.createElement('script');
        s.id = 'gsi-script';
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.onload = initGoogle;
        document.head.appendChild(s);
      }
    }
  }, [loginWithToken, nav]);

  if (!CLIENT_ID) return null;

  return (
    <div>
      <div
        ref={divRef}
        style={{ width: '100%', minHeight: 44, opacity: busy ? 0.6 : 1, pointerEvents: busy ? 'none' : 'auto' }}
      />
      {err && (
        <div style={{ background: '#FEF2F2', color: '#991B1B', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginTop: 8 }}>
          {err}
        </div>
      )}
    </div>
  );
}
