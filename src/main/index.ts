import { app, BaseWindow, ipcMain, WebContentsView } from 'electron'
import { join } from 'path'
import { ViewRegistry } from './views/ViewRegistry'
import type { ChromiumView } from './views/ChromiumView'
import { registerIpcHandlers } from './ipc/handlers'
import { CH } from './ipc/channels'
import { SyncBus } from './sync/SyncBus'
import { readWorkspace, writeWorkspace, type PersistedWorkspace } from './workspace/persistence'
import { findPreset } from '../shared/presets'
import { DEFAULT_START_URL } from '../shared/defaults'

if (process.env.FRAME_USER_DATA_PATH) {
  app.setPath('userData', process.env.FRAME_USER_DATA_PATH)
}

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
let restoringWorkspace = false

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

  loadUi()

  registry = new ViewRegistry(win.contentView)
  syncBus = new SyncBus(registry)
  registry.setAddedListener((view) => syncBus?.bindWebContentsId(view.id, view.webContentsId))
  registry.setNavigationListener((state) => {
    uiView?.webContents.send(CH.VIEW_NAVIGATED, state)
    syncBus?.handleNavigation(state.id, state.url, mirrorEnabled)
    persistWorkspace()
  })

  const activeRegistry = registry
  void whenUiLoaded().then(async () => {
    if (!activeRegistry) return
    try {
      await initializeWorkspace(activeRegistry)
    } catch (err) {
      console.error('workspace initialize failed', err)
    } finally {
      uiView?.webContents.send(CH.VIEWS_CHANGED, activeRegistry.states())
    }
  })

  win.on('closed', () => {
    persistWorkspace()
    registry?.destroyAll()
    uiView?.webContents.close()
    uiView = null
    win = null
    registry = null
    syncBus = null
  })
}

function loadUi(): void {
  if (!uiView) return
  if (process.env.ELECTRON_RENDERER_URL) {
    void uiView.webContents.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void uiView.webContents.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function whenUiLoaded(): Promise<void> {
  const view = uiView
  if (!view) return Promise.resolve()
  if (view.webContents.getURL() && !view.webContents.isLoading()) return Promise.resolve()

  return new Promise((resolve) => {
    const finish = (): void => {
      view.webContents.removeListener('did-finish-load', finish)
      view.webContents.removeListener('did-fail-load', finish)
      resolve()
    }
    view.webContents.once('did-finish-load', finish)
    view.webContents.once('did-fail-load', finish)
  })
}

function workspacePath(): string {
  return process.env.FRAME_WORKSPACE_PATH ?? join(app.getPath('userData'), 'workspace.json')
}

function shouldPersistWorkspace(): boolean {
  return process.env.NODE_ENV !== 'test' || Boolean(process.env.FRAME_WORKSPACE_PATH)
}

function persistWorkspace(): void {
  if (!shouldPersistWorkspace()) return
  if (restoringWorkspace) return
  if (!registry) return
  writeWorkspace(workspacePath(), registry.workspace())
}

async function initializeWorkspace(activeRegistry: ViewRegistry): Promise<void> {
  const saved = shouldPersistWorkspace() ? readWorkspace(workspacePath()) : null
  if (saved) {
    restoreWorkspace(activeRegistry, saved)
    return
  }

  // Seed default viewports + open a starter page so the window isn't empty.
  // Skipped under test so E2E specs start from a clean, empty workspace.
  if (process.env.NODE_ENV !== 'test') {
    await seedDefaultWorkspace(activeRegistry)
  }
}

function restoreWorkspace(activeRegistry: ViewRegistry, workspace: PersistedWorkspace): void {
  restoringWorkspace = true
  const restores: Promise<void>[] = []
  for (const saved of workspace.views) {
    const view = activeRegistry.add(saved.preset)
    view.setBounds({ x: 0, y: 60, width: view.width, height: view.height })
    restores.push(restoreViewUrl(view, saved.url))
  }
  void Promise.all(restores).finally(() => {
    restoringWorkspace = false
    persistWorkspace()
    uiView?.webContents.send(CH.VIEWS_CHANGED, activeRegistry.states())
  })
}

async function restoreViewUrl(view: ChromiumView, savedUrl: string): Promise<void> {
  try {
    await view.loadURL('about:blank')
    await view.ready
    if (savedUrl && savedUrl !== 'about:blank') {
      await view.loadURL(savedUrl)
    }
  } catch (err) {
    console.error('workspace view restore failed', err)
  }
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
    },
    persistWorkspace
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
