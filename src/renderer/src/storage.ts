import { DEFAULT_SETTINGS, type AppSettings, type SaveLoadResult } from '../../shared/ipc'
import type { SaveSnapshotV1 } from '../../game/types'
import { parseSnapshot } from '../../game/validation'

const SAVE_KEY = 'brilliant-gems:save-v1'
const SETTINGS_KEY = 'brilliant-gems:settings'

export async function loadSave(): Promise<SaveLoadResult> {
  if (window.desktop) return window.desktop.loadSave()
  const raw = localStorage.getItem(SAVE_KEY)
  if (raw === null) return { status: 'missing' }
  try {
    const value: unknown = JSON.parse(raw)
    const version =
      typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'number'
        ? value.version
        : null
    if (version !== 1) return { status: 'incompatible', version }
    const parsed = parseSnapshot(value)
    return parsed ? { status: 'ok', snapshot: parsed } : { status: 'corrupt' }
  } catch {
    return { status: 'corrupt' }
  }
}

export async function saveGame(snapshot: SaveSnapshotV1): Promise<{ ok: boolean; error?: string }> {
  if (window.desktop) return window.desktop.saveGame(snapshot)
  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot))
  return { ok: true }
}

export async function clearSave(): Promise<void> {
  if (window.desktop) return window.desktop.clearSave()
  localStorage.removeItem(SAVE_KEY)
}

export async function loadSettings(): Promise<AppSettings> {
  if (window.desktop) return window.desktop.loadSettings()
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (window.desktop) return window.desktop.saveSettings(settings)
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}
