import { contextBridge } from 'electron'

// Keep the bridge surface minimal; business logic stays in the renderer so a
// future web refactor does not depend on Electron.
const api = {
  appName: 'Mabaluz',
  platform: process.platform
}

contextBridge.exposeInMainWorld('mabaluz', api)

export type MabaluzBridge = typeof api
