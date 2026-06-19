import { app, BaseWindow, WebContentsView } from 'electron'
import { join } from 'path'
import { ViewRegistry } from './views/ViewRegistry'
import { registerIpcHandlers } from './ipc/handlers'

// Ensure app name is always 'frame', regardless of launch context
app.setName('frame')

let win: BaseWindow | null = null
let uiView: WebContentsView | null = null
let registry: ViewRegistry | null = null
let mirrorEnabled = false

function createWindow(): void {
  win = new BaseWindow({ width: 1280, height: 800 })

  // Main UI (toolbar + canvas) view
  uiView = new WebContentsView({
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })
  win.contentView.addChildView(uiView)
  uiView.setBounds({ x: 0, y: 0, width: 1280, height: 800 })

  if (process.env.ELECTRON_RENDERER_URL) {
    void uiView.webContents.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void uiView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registry = new ViewRegistry(win.contentView)

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
