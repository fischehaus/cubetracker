import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { registerPwa } from './lib/pwa-register'

// ErrorBoundary als letztes Netz (W.ops-hardening): unbehandelte Render-
// Fehler zeigen einen Reload-Screen statt eines stummen White-Screens.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// PWA-Service-Worker registrieren (nur PROD — siehe pwa-register.ts).
// Nach dem Render aufgerufen, damit die initiale Anzeige nicht wartet.
registerPwa()
