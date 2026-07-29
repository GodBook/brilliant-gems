import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { electronApp, is } from '@electron-toolkit/utils'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { DEFAULT_SETTINGS, IPC, type AppSettings, type SaveLoadResult } from '../shared/ipc'
import { parseSnapshot } from '../game/validation'
import type { SaveSnapshotV1 } from '../game/types'

let mainWindow: BrowserWindow | null = null
let forceClose = false
let gameActive = false

const settingsSchema = z.object({
  musicVolume: z.number().min(0).max(1),
  effectsVolume: z.number().min(0).max(1),
  reducedMotion: z.boolean(),
  fullscreen: z.boolean(),
  aiSpeed: z.union([z.literal(0), z.literal(1), z.literal(2)])
})

function dataPath(filename: string): string {
  return join(app.getPath('userData'), filename)
}

async function readJson(filename: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(dataPath(filename), 'utf8'))
  } catch {
    return null
  }
}

async function writeJsonAtomic(filename: string, value: unknown): Promise<void> {
  const target = dataPath(filename)
  const temporary = `${target}.tmp`
  await mkdir(app.getPath('userData'), { recursive: true })
  await writeFile(temporary, JSON.stringify(value), 'utf8')
  await rm(target, { force: true })
  await rename(temporary, target)
}

function createWindow(): void {
  const icon = join(__dirname, '../../resources/icon.png')
  mainWindow = new BrowserWindow({
    width: 1463,
    height: 914,
    minWidth: 1280,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#111315',
    title: '璀璨宝石',
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (event) => {
    if (forceClose || !gameActive) return
    const choice = dialog.showMessageBoxSync(mainWindow!, {
      type: 'question',
      title: '退出对局',
      message: '当前对局已经自动保存。确定退出游戏吗？',
      buttons: ['退出游戏', '继续对局'],
      defaultId: 1,
      cancelId: 1,
      noLink: true
    })
    if (choice === 1) event.preventDefault()
    else forceClose = true
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL()
    if (current && url !== current) event.preventDefault()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
  ipcMain.handle(IPC.loadSave, async (): Promise<SaveLoadResult> => {
    let raw: string
    try {
      raw = await readFile(dataPath('save-v1.json'), 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { status: 'missing' }
      return { status: 'corrupt' }
    }

    let value: unknown
    try {
      value = JSON.parse(raw)
    } catch {
      return { status: 'corrupt' }
    }

    const version =
      typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'number'
        ? value.version
        : null
    if (version !== 1) return { status: 'incompatible', version }
    const parsed = parseSnapshot(value)
    return parsed ? { status: 'ok', snapshot: parsed } : { status: 'corrupt' }
  })
  ipcMain.handle(IPC.saveGame, async (_event, snapshot: unknown) => {
    const parsed = parseSnapshot(snapshot)
    if (!parsed) return { ok: false, error: '存档数据校验失败' }
    try {
      await writeJsonAtomic('save-v1.json', parsed)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : '无法写入存档' }
    }
  })
  ipcMain.handle(IPC.clearSave, async () => {
    await rm(dataPath('save-v1.json'), { force: true })
  })
  ipcMain.handle(IPC.loadSettings, async (): Promise<AppSettings> => {
    const parsed = settingsSchema.safeParse(await readJson('settings.json'))
    return parsed.success ? parsed.data : DEFAULT_SETTINGS
  })
  ipcMain.handle(IPC.saveSettings, async (_event, settings: unknown) => {
    const parsed = settingsSchema.safeParse(settings)
    if (parsed.success) await writeJsonAtomic('settings.json', parsed.data)
  })
  ipcMain.handle(IPC.setFullscreen, (_event, enabled: boolean) => {
    mainWindow?.setFullScreen(Boolean(enabled))
  })
  ipcMain.handle(IPC.setGameActive, (_event, active: boolean) => {
    gameActive = Boolean(active)
  })
  ipcMain.handle(IPC.quit, () => {
    forceClose = true
    app.quit()
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.local.brilliantgems')
  registerIpc()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  if (!gameActive) forceClose = true
})

app.on('window-all-closed', () => {
  app.quit()
})
