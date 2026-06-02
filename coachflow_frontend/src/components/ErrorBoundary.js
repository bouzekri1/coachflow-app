import { Component } from 'react';
import * as Sentry from '@sentry/react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { crashed: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[CoachFlow] Erreur non gérée :', error, info);
    if (process.env.REACT_APP_SENTRY_DSN) {
      Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
    }
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f8fafc', padding: 24,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20, margin: '0 auto 24px',
            background: 'linear-gradient(135deg,#065f46,#1D9E75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38,
          }}>⚡</div>
          <div style={{ fontSize: 72, fontWeight: 900, color: '#e2e8f0', lineHeight: 1, marginBottom: 8 }}>500</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Une erreur est survenue</div>
          <div style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, marginBottom: 32 }}>
            Quelque chose s'est mal passé de notre côté.<br />
            Rechargez la page pour réessayer.
          </div>
          {this.state.error?.message && (
            <div style={{
              background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
              padding: '10px 14px', fontSize: 13, color: '#991B1B',
              fontFamily: 'monospace', marginBottom: 24, textAlign: 'left', wordBreak: 'break-word',
            }}>
              {this.state.error.message}
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={() => this.setState({ crashed: false, error: null })} style={{
              padding: '11px 22px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#374151',
            }}>Réessayer</button>
            <button onClick={() => window.location.href = '/dashboard'} style={{
              padding: '11px 22px', borderRadius: 10, border: 'none',
              background: '#6366F1', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>Retour à l'accueil</button>
          </div>
        </div>
      </div>
    );
  }
}
