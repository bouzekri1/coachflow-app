import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './index.css';
import App from './App';
import { register } from './serviceWorkerRegistration';

if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.REACT_APP_SENTRY_ENVIRONMENT || 'production',
    release: process.env.REACT_APP_SENTRY_RELEASE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: parseFloat(process.env.REACT_APP_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    sendDefaultPii: true,
    beforeSend(event) {
      // Filtre les champs sensibles éventuellement capturés via les breadcrumbs fetch
      const req = event.request;
      if (req && typeof req.data === 'string') {
        try {
          const obj = JSON.parse(req.data);
          ['password', 'new_password', 'old_password', 'confirm', 'id_token', 'token'].forEach(k => {
            if (k in obj) obj[k] = '[Filtered]';
          });
          req.data = JSON.stringify(obj);
        } catch { /* not JSON */ }
      }
      return event;
    },
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);

register();
