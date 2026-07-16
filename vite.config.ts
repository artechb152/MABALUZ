// Primary build config — MABALUZ is a plain Vite web app (desktop-oriented).
// `npm run dev` serves it; `npm run build` outputs static files to dist/.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  // Relative base so the built app works from any path (incl. file://).
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  }
})
