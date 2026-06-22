import { ipcMain } from 'electron'
import type { ViewId, ViewLayout } from '../../shared/types'
import { findPreset, parseCustomPreset } from '../../shared/presets'
import { normalizeNavigationUrl } from '../../shared/navigation'
import type { ViewRegistry } from '../views/ViewRegistry'
import { CH } from './channels'

export function registerIpcHandlers(
  getRegistry: () => ViewRegistry | null,
  _getMirror: () => boolean,
  setMirror: (v: boolean) => void,
  onWorkspaceChanged: () => void = () => undefined
): void {
  ipcMain.handle(CH.ADD_VIEW, async (_e, presetId: string) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    const preset = findPreset(presetId)
    if (!preset) throw new Error(`unknown preset: ${presetId}`)
    const view = registry.add(preset)
    view.setBounds({ x: 0, y: 60, width: view.width, height: view.height })
    // Load about:blank so Playwright can stably attach CDP before applyPreset
    // attaches its own debugger session, avoiding CDP session conflicts.
    await view.loadURL('about:blank')
    // Await applyPreset completion so emulation is applied before returning.
    await view.ready
    onWorkspaceChanged()
    return registry.states()
  })

  ipcMain.handle(CH.ADD_CUSTOM_VIEW, async (_e, label: string, w: number, h: number) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    const preset = parseCustomPreset(label, w, h)
    const view = registry.add(preset)
    view.setBounds({ x: 0, y: 60, width: view.width, height: view.height })
    await view.loadURL('about:blank')
    await view.ready
    onWorkspaceChanged()
    return registry.states()
  })

  ipcMain.handle(CH.REMOVE_VIEW, (_e, id: ViewId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    registry.remove(id)
    onWorkspaceChanged()
    return registry.states()
  })

  ipcMain.handle(CH.LIST_VIEWS, () => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    return registry.states()
  })

  ipcMain.handle(CH.NAVIGATE_ALL, async (_e, url: string) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    await registry.navigateAll(normalizeNavigationUrl(url))
    onWorkspaceChanged()
    return registry.states()
  })

  ipcMain.handle(CH.GO_BACK, async (_e, id: ViewId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    await registry.goBack(id)
    onWorkspaceChanged()
    return registry.states()
  })

  ipcMain.handle(CH.GO_FORWARD, async (_e, id: ViewId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    await registry.goForward(id)
    onWorkspaceChanged()
    return registry.states()
  })

  ipcMain.handle(CH.RELOAD, async (_e, id: ViewId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    await registry.reload(id)
    onWorkspaceChanged()
    return registry.states()
  })

  ipcMain.handle(CH.SET_LAYOUT, (_e, rects: ViewLayout[]) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    for (const { id, rect, scale } of rects) registry.get(id)?.setLayout(rect, scale)
  })

  ipcMain.handle(CH.SET_NATIVE_VIEWS_OCCLUDED, (_e, occluded: boolean) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    registry.setNativeViewsOccluded(Boolean(occluded))
  })

  ipcMain.handle(CH.SET_MIRROR, (_e, on: boolean) => {
    setMirror(on)
  })

  ipcMain.handle(CH.SET_PRESET, async (_e, id: ViewId, presetId: string) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    const preset = findPreset(presetId)
    if (!preset) throw new Error(`unknown preset: ${presetId}`)
    const view = registry.get(id)
    if (!view) throw new Error(`unknown view id: ${id}`)
    await view.applyPreset(preset)
    onWorkspaceChanged()
    return registry.states()
  })
}
