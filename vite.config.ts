// Config for plain-browser dev (`npm run dev:web`) and any tool that reads the
// default vite config. The Electron build uses electron.vite.config.ts.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  }
})
