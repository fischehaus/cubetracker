import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'
import { registerPwa } from './lib/pwa-register'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA-Service-Worker registrieren (nur PROD — siehe pwa-register.ts).
// Nach dem Render aufgerufen, damit die initiale Anzeige nicht wartet.
registerPwa()
