import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

export default function VerifyEmail() {
  const [params]   = useSearchParams();
  const nav        = useNavigate();
  const { loginWithUser } = useAuth();
  const [state, setState] = useState('loading'); // loading | success | error | already
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setState('error'); setErrMsg('Lien de vérification invalide.'); return; }

    api.verifyEmail(token)
      .then(data => {
        if (data.status === 'already_verified') {
          setState('already');
          return;
        }
        loginWithUser(data.user);
        setState('success');
        setTimeout(() => nav('/dashboard'), 2000);
      })
      .catch(e => { setState('error'); setErrMsg(e.message); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const icons   = { loading: '⏳', success: '✅', error: '❌', already: '✅' };
  const titles  = {
    loading: 'Vérification en cours…',
    success: 'Email confirmé !',
    error:   'Lien invalide',
    already: 'Déjà vérifié',
  };
  const bodies  = {
    loading: 'Merci de patienter…',
    success: 'Votre compte est activé. Redirection vers le tableau de bord…',
    error:   errMsg,
    already: 'Votre email est déjà confirmé.',
  };

  return (
    <div className="lg-pg">
      <div className="lg-box" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>{icons[state]}</div>
        <div className="lg-h1" style={{ marginBottom: 8 }}>{titles[state]}</div>
        <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6 }}>{bodies[state]}</p>
        {(state === 'error' || state === 'already') && (
          <Link to="/login" style={{ color: '#6366F1', fontSize: 14, textDecoration: 'none', display: 'block', marginTop: 24 }}>
            ← Aller à la connexion
          </Link>
        )}
      </div>
    </div>
  );
}
