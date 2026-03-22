import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// ── Service Worker (PWA) ──────────────────────────────────
// Solo registrar SW en producción. En desarrollo, desregistrar cualquier SW existente
// para que el HMR de Vite funcione sin interferencias.
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('SW registrado:', reg.scope))
        .catch((err) => console.warn('SW error:', err));
    });
  } else {
    // En desarrollo: desregistrar todos los service workers activos
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => {
        reg.unregister();
        console.log('SW desregistrado (modo dev)');
      });
    });
  }
}
