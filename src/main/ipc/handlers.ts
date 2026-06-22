import { ipcMain } from 'electron'
import type { PaneGroupId, ProjectId, ViewId, ViewLayout } from '../../shared/types'
import { findPreset, parseCustomPreset } from '../../shared/presets'
import { normalizeNavigationUrl } from '../../shared/navigation'
import type { ViewRegistry } from '../views/ViewRegistry'
import type { ChromiumView } from '../views/ChromiumView'
import { CH } from './channels'

export function registerIpcHandlers(
  getRegistry: () => ViewRegistry | null,
  onWorkspaceChanged: () => void = () => undefined
): void {
  const initializeView = async (view: ChromiumView, url: string): Promise<void> => {
    view.setBounds({ x: 0, y: 60, width: view.width, height: view.height })
    // Load about:blank so Playwright can stably attach CDP before applyPreset
    // attaches its own debugger session, avoiding CDP session conflicts.
    await view.loadURL('about:blank')
    // Await applyPreset completion so emulation is applied before returning.
    await view.ready
    if (url && url !== 'about:blank') {
      await view.loadURL(url)
    }
  }

  ipcMain.handle(CH.ADD_PROJECT, (_e, name?: string) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    registry.addProject(name)
    onWorkspaceChanged()
    return registry.workspaceState()
  })

  ipcMain.handle(CH.ADD_GROUP, (_e, projectId: ProjectId, name?: string) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    registry.addGroup(projectId, name)
    onWorkspaceChanged()
    return registry.workspaceState()
  })

  ipcMain.handle(CH.LIST_PROJECTS, () => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    return registry.projectStates()
  })

  ipcMain.handle(CH.LIST_GROUPS, () => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    return registry.groupStates()
  })

  ipcMain.handle(CH.LIST_WORKSPACE, () => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    return registry.workspaceState()
  })

  ipcMain.handle(CH.ADD_VIEW, async (_e, presetId: string, groupId?: PaneGroupId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    const preset = findPreset(presetId)
    if (!preset) throw new Error(`unknown preset: ${presetId}`)
    const targetGroupId = groupId ?? registry.groupStates()[0]?.id
    const group = targetGroupId ? registry.getGroup(targetGroupId) : undefined
    if (!group) throw new Error(`unknown group id: ${targetGroupId}`)
    const view = registry.add(preset, group.id)
    await initializeView(view, group.url)
    onWorkspaceChanged()
    return registry.workspaceState()
  })

  ipcMain.handle(
    CH.ADD_CUSTOM_VIEW,
    async (_e, label: string, w: number, h: number, groupId?: PaneGroupId) => {
      const registry = getRegistry()
      if (!registry) throw new Error('no active window')
      const preset = parseCustomPreset(label, w, h)
      const targetGroupId = groupId ?? registry.groupStates()[0]?.id
      const group = targetGroupId ? registry.getGroup(targetGroupId) : undefined
      if (!group) throw new Error(`unknown group id: ${targetGroupId}`)
      const view = registry.add(preset, group.id)
      await initializeView(view, group.url)
      onWorkspaceChanged()
      return registry.workspaceState()
    }
  )

  ipcMain.handle(CH.REMOVE_VIEW, (_e, id: ViewId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    registry.remove(id)
    onWorkspaceChanged()
    return registry.workspaceState()
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
    return registry.workspaceState()
  })

  ipcMain.handle(CH.NAVIGATE_GROUP, async (_e, groupId: PaneGroupId, url: string) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    await registry.navigateGroup(groupId, normalizeNavigationUrl(url))
    onWorkspaceChanged()
    return registry.workspaceState()
  })

  ipcMain.handle(CH.GO_BACK, async (_e, id: ViewId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    await registry.goBack(id)
    onWorkspaceChanged()
    return registry.workspaceState()
  })

  ipcMain.handle(CH.GO_FORWARD, async (_e, id: ViewId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    await registry.goForward(id)
    onWorkspaceChanged()
    return registry.workspaceState()
  })

  ipcMain.handle(CH.RELOAD, async (_e, id: ViewId) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    await registry.reload(id)
    onWorkspaceChanged()
    return registry.workspaceState()
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

  ipcMain.handle(CH.SET_MIRROR, () => undefined)

  ipcMain.handle(CH.SET_PRESET, async (_e, id: ViewId, presetId: string) => {
    const registry = getRegistry()
    if (!registry) throw new Error('no active window')
    const preset = findPreset(presetId)
    if (!preset) throw new Error(`unknown preset: ${presetId}`)
    const view = registry.get(id)
    if (!view) throw new Error(`unknown view id: ${id}`)
    await view.applyPreset(preset)
    onWorkspaceChanged()
    return registry.workspaceState()
  })
}
