import { app, BaseWindow, ipcMain, WebContentsView } from 'electron'
import { join } from 'path'
import { ViewRegistry } from './views/ViewRegistry'
import { registerIpcHandlers } from './ipc/handlers'
import { CH } from './ipc/channels'
import { SyncBus } from './sync/SyncBus'
import { findPreset } from '../shared/presets'
import { DEFAULT_START_URL } from '../shared/defaults'

// Ensure app name is always 'frame', regardless of launch context
app.setName('frame')

// Seed a useful default workspace so the app is immediately usable.
const DEFAULT_VIEW_PRESETS = ['iphone-14', 'ipad', 'desktop-1440']
const START_URL = process.env.FRAME_START_URL ?? DEFAULT_START_URL

let win: BaseWindow | null = null
let uiView: WebContentsView | null = null
let registry: ViewRegistry | null = null
let syncBus: SyncBus | null = null
let mirrorEnabled = false

function createWindow(): void {
  win = new BaseWindow({ width: 1440, height: 900, show: process.env.NODE_ENV !== 'test' })

  // Main UI (toolbar + canvas) view, kept sized to the window.
  uiView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.contentView.addChildView(uiView)

  const syncUiBounds = (): void => {
    if (!win || !uiView) return
    const { width, height } = win.getContentBounds()
    uiView.setBounds({ x: 0, y: 0, width, height })
  }
  syncUiBounds()
  win.on('resize', syncUiBounds)

  if (process.env.ELECTRON_RENDERER_URL) {
    void uiView.webContents.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void uiView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registry = new ViewRegistry(win.contentView)
  syncBus = new SyncBus(registry)
  registry.setAddedListener((view) => syncBus?.bindWebContentsId(view.id, view.webContentsId))
  registry.setNavigationListener((state) => {
    uiView?.webContents.send(CH.VIEW_NAVIGATED, state)
  })

  // Seed default viewports + open a starter page so the window isn't empty.
  // Skipped under test so E2E specs start from a clean, empty workspace.
  if (process.env.NODE_ENV !== 'test') {
    void seedDefaultWorkspace(registry)
  }

  win.on('closed', () => {
    registry?.destroyAll()
    uiView?.webContents.close()
    uiView = null
    win = null
    registry = null
    syncBus = null
  })
}

async function seedDefaultWorkspace(activeRegistry: ViewRegistry): Promise<void> {
  for (const id of DEFAULT_VIEW_PRESETS) {
    const preset = findPreset(id)
    if (!preset) continue
    activeRegistry.add(preset)
  }
  await activeRegistry.navigateAll(START_URL)
}

app.whenReady().then(() => {
  registerIpcHandlers(
    () => registry,
    () => mirrorEnabled,
    (v) => {
      mirrorEnabled = v
    }
  )
  ipcMain.on(CH.SCROLL, (event, s) => {
    syncBus?.handleScroll(event.sender.id, s)
  })
  ipcMain.on(CH.MIRROR, (event, ev) => {
    syncBus?.handleMirror(event.sender.id, ev, mirrorEnabled)
  })
  createWindow()
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
