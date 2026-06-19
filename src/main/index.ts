import { app, BaseWindow, WebContentsView, ipcMain } from 'electron'
import { join } from 'path'
import { findPreset } from '../shared/presets'
import { ViewRegistry } from './views/ViewRegistry'

// Ensure app name is always 'frame', regardless of launch context
app.setName('frame')

let win: BaseWindow | null = null
let uiView: WebContentsView | null = null
let registry: ViewRegistry | null = null

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

ipcMain.handle('__addView', async (_e, presetId: string) => {
  if (!registry) throw new Error('no registry')
  const preset = findPreset(presetId)
  if (!preset) throw new Error('unknown preset')
  const v = registry.add(preset)
  v.setBounds({ x: 0, y: 60, width: v.width, height: v.height })
  // Load about:blank to give the webcontents a stable initial state and
  // let Playwright settle its CDP attachment to the new WebContentsView
  // before our applyPreset CDP session attaches, preventing conflicts.
  await v.loadURL('about:blank')
  // Now await applyPreset completion so emulation is applied before returning.
  await v.ready
  return registry.states()
})

ipcMain.handle('__removeView', (_e, id: string) => {
  registry?.remove(id)
  return registry?.states() ?? []
})

ipcMain.handle('__listViews', () => registry?.states() ?? [])

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BaseWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
