import { app, BaseWindow, WebContentsView } from 'electron'
import { join } from 'path'
import { ViewRegistry } from './views/ViewRegistry'
import { registerIpcHandlers } from './ipc/handlers'
import { CH } from './ipc/channels'
import { findPreset } from '../shared/presets'

// Ensure app name is always 'frame', regardless of launch context
app.setName('frame')

// Seed a useful default workspace so the app is immediately usable.
const DEFAULT_VIEW_PRESETS = ['iphone-14', 'ipad', 'desktop-1440']
const DEFAULT_URL = 'https://example.com'

let win: BaseWindow | null = null
let uiView: WebContentsView | null = null
let registry: ViewRegistry | null = null
let mirrorEnabled = false

function createWindow(): void {
  win = new BaseWindow({ width: 1440, height: 900 })

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
  registry.setNavigationListener((id, url) => {
    uiView?.webContents.send(CH.VIEW_NAVIGATED, { id, url })
  })

  // Seed default viewports + open a starter page so the window isn't empty.
  // Skipped under test so E2E specs start from a clean, empty workspace.
  if (process.env.NODE_ENV !== 'test') {
    for (const id of DEFAULT_VIEW_PRESETS) {
      const preset = findPreset(id)
      if (preset) registry.add(preset)
    }
    void registry.navigateAll(DEFAULT_URL)
  }

  win.on('closed', () => {
    registry?.destroyAll()
    uiView?.webContents.close()
    uiView = null
    win = null
    registry = null
  })
}

app.whenReady().then(() => {
  registerIpcHandlers(
    () => registry,
    () => mirrorEnabled,
    (v) => {
      mirrorEnabled = v
    }
  )
  createWindow()
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
