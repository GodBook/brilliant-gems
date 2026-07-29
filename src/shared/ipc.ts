import type { SaveSnapshotV1 } from '../game/types'

export type SaveLoadResult =
  | { status: 'ok'; snapshot: SaveSnapshotV1 }
  | { status: 'missing' }
  | { status: 'corrupt' }
  | { status: 'incompatible'; version: number | null }

export interface AppSettings {
  musicVolume: number
  effectsVolume: number
  reducedMotion: boolean
  fullscreen: boolean
  aiSpeed: 1 | 2 | 0
}

export const DEFAULT_SETTINGS: AppSettings = {
  musicVolume: 0.18,
  effectsVolume: 0.55,
  reducedMotion: false,
  fullscreen: false,
  aiSpeed: 1
}

export interface DesktopApi {
  loadSave: () => Promise<SaveLoadResult>
  saveGame: (snapshot: SaveSnapshotV1) => Promise<{ ok: boolean; error?: string }>
  clearSave: () => Promise<void>
  loadSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<void>
  setFullscreen: (enabled: boolean) => Promise<void>
  setGameActive: (active: boolean) => Promise<void>
  quit: () => Promise<void>
}

export const IPC = {
  loadSave: 'save:load',
  saveGame: 'save:write',
  clearSave: 'save:clear',
  loadSettings: 'settings:load',
  saveSettings: 'settings:write',
  setFullscreen: 'window:fullscreen',
  setGameActive: 'game:active',
  quit: 'app:quit'
} as const
