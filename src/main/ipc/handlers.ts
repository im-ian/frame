import { ipcMain } from 'electron'
import type { Rect, ViewId } from '../../shared/types'
import { findPreset, parseCustomPreset } from '../../shared/presets'
import type { ViewRegistry } from '../views/ViewRegistry'
import { CH } from './channels'

export function registerIpcHandlers(
  getRegistry: () => ViewRegistry | null,
  _getMirror: () => boolean,
  setMirror: (v: boolean) => void
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
    return registry.states()
  })

  ipcMain.handle(CH.REMOVE_VIEW, (_e, id: ViewId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    registry.remove(id)
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
    await registry.navigateAll(url)
    return registry.states()
  })

  ipcMain.handle(CH.SET_LAYOUT, (_e, rects: Array<{ id: ViewId; rect: Rect }>) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    for (const { id, rect } of rects) registry.get(id)?.setBounds(rect)
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
    return registry.states()
  })
}
