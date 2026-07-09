import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from '@/app/App'
// Self-hosted fonts (offline-safe, no CDN). Assistant = body/subhead, Heebo =
// display headings, Cherry Bomb One = MABALUZ wordmark.
import '@fontsource/assistant/300.css'
import '@fontsource/assistant/400.css'
import '@fontsource/assistant/500.css'
import '@fontsource/assistant/600.css'
import '@fontsource/assistant/700.css'
import '@fontsource/heebo/300.css'
import '@fontsource/heebo/400.css'
import '@fontsource/heebo/500.css'
import '@fontsource/heebo/700.css'
import '@fontsource/cherry-bomb-one/400.css'
import '@/styles/index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
