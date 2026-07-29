import { contextBridge, ipcRenderer } from 'electron'
import type { AppSettings, DesktopApi } from '../shared/ipc'
import { IPC } from '../shared/ipc'
import type { SaveSnapshotV1 } from '../game/types'

const api: DesktopApi = {
  loadSave: () => ipcRenderer.invoke(IPC.loadSave),
  saveGame: (snapshot: SaveSnapshotV1) => ipcRenderer.invoke(IPC.saveGame, snapshot),
  clearSave: () => ipcRenderer.invoke(IPC.clearSave),
  loadSettings: () => ipcRenderer.invoke(IPC.loadSettings),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke(IPC.saveSettings, settings),
  setFullscreen: (enabled: boolean) => ipcRenderer.invoke(IPC.setFullscreen, enabled),
  setGameActive: (active: boolean) => ipcRenderer.invoke(IPC.setGameActive, active),
  quit: () => ipcRenderer.invoke(IPC.quit)
}

contextBridge.exposeInMainWorld('desktop', api)
