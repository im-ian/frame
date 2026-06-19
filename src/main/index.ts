import { app, BaseWindow, WebContentsView, ipcMain } from 'electron'
import { join } from 'path'
import { ChromiumView } from './views/ChromiumView'
import { findPreset } from '../shared/presets'

// Ensure app name is always 'frame', regardless of launch context
app.setName('frame')

let win: BaseWindow | null = null
let uiView: WebContentsView | null = null
const testViews: ChromiumView[] = []

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

  win.on('closed', () => {
    for (const v of testViews) v.destroy()
    uiView?.webContents.close()
    uiView = null
    win = null
  })
}

// Test-only hook (replaced/extended by formal handler in Task 7)
ipcMain.handle('__createTestView', async (_e, presetId: string, url: string) => {
  if (!win) throw new Error('no window')
  const preset = findPreset(presetId)
  if (!preset) throw new Error('unknown preset')
  const view = new ChromiumView(win.contentView, preset)
  view.setBounds({ x: 0, y: 60, width: preset.width, height: preset.height })
  await view.loadURL(url)
  testViews.push(view)
  return { id: view.id, currentUrl: view.webContents.getURL() }
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
