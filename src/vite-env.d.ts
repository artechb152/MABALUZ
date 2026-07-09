/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPPORT_PHONE?: string
  readonly VITE_APP_ENV?: string
  readonly VITE_ENABLE_REAL_AUTH?: string
  readonly VITE_ENABLE_MONGODB?: string
  readonly VITE_ENABLE_OUTLOOK?: string
  readonly VITE_ENABLE_AI_ANALYSIS?: string
}

interface Window {
  mabaluz?: {
    appName: string
    platform: string
  }
}
