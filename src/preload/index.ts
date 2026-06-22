import { contextBridge, ipcRenderer } from 'electron'
import type {
  CanvasZoomWheel,
  PaneGroupId,
  PaneGroupState,
  ProjectId,
  ProjectState,
  ViewId,
  ViewLayout,
  ViewState,
  ViewStateUpdate,
  WorkspaceState
} from '../shared/types'

const api = {
  addProject: (name?: string): Promise<WorkspaceState> =>
    ipcRenderer.invoke('frame:add-project', name),
  addGroup: (projectId: ProjectId, name?: string): Promise<WorkspaceState> =>
    ipcRenderer.invoke('frame:add-group', projectId, name),
  listProjects: (): Promise<ProjectState[]> => ipcRenderer.invoke('frame:list-projects'),
  listGroups: (): Promise<PaneGroupState[]> => ipcRenderer.invoke('frame:list-groups'),
  listWorkspace: (): Promise<WorkspaceState> => ipcRenderer.invoke('frame:list-workspace'),
  addView: (presetId: string, groupId?: PaneGroupId): Promise<WorkspaceState> =>
    ipcRenderer.invoke('frame:add-view', presetId, groupId),
  addCustomView: (
    label: string,
    w: number,
    h: number,
    groupId?: PaneGroupId
  ): Promise<WorkspaceState> => ipcRenderer.invoke('frame:add-custom-view', label, w, h, groupId),
  removeView: (id: ViewId): Promise<WorkspaceState> => ipcRenderer.invoke('frame:remove-view', id),
  listViews: (): Promise<ViewState[]> => ipcRenderer.invoke('frame:list-views'),
  navigateAll: (url: string): Promise<WorkspaceState> =>
    ipcRenderer.invoke('frame:navigate-all', url),
  navigateGroup: (groupId: PaneGroupId, url: string): Promise<WorkspaceState> =>
    ipcRenderer.invoke('frame:navigate-group', groupId, url),
  goBack: (id: ViewId): Promise<WorkspaceState> => ipcRenderer.invoke('frame:go-back', id),
  goForward: (id: ViewId): Promise<WorkspaceState> => ipcRenderer.invoke('frame:go-forward', id),
  reload: (id: ViewId): Promise<WorkspaceState> => ipcRenderer.invoke('frame:reload', id),
  setLayout: (rects: ViewLayout[]): Promise<void> => ipcRenderer.invoke('frame:set-layout', rects),
  setNativeViewsOccluded: (occluded: boolean): Promise<void> =>
    ipcRenderer.invoke('frame:set-native-views-occluded', occluded),
  setMirror: (on: boolean): Promise<void> => ipcRenderer.invoke('frame:set-mirror', on),
  setPreset: (id: ViewId, presetId: string): Promise<WorkspaceState> =>
    ipcRenderer.invoke('frame:set-preset', id, presetId),
  onWorkspaceChanged: (cb: (workspace: WorkspaceState) => void): (() => void) => {
    const h = (_e: unknown, workspace: WorkspaceState): void => cb(workspace)
    ipcRenderer.on('frame:workspace-changed', h)
    return () => ipcRenderer.removeListener('frame:workspace-changed', h)
  },
  onCanvasZoomWheel: (cb: (wheel: CanvasZoomWheel) => void): (() => void) => {
    const h = (_e: unknown, wheel: CanvasZoomWheel): void => cb(wheel)
    ipcRenderer.on('frame:canvas-zoom-wheel', h)
    return () => ipcRenderer.removeListener('frame:canvas-zoom-wheel', h)
  },
  onViewsChanged: (cb: (states: ViewState[]) => void): (() => void) => {
    const h = (_e: unknown, states: ViewState[]): void => cb(states)
    ipcRenderer.on('frame:views-changed', h)
    return () => ipcRenderer.removeListener('frame:views-changed', h)
  },
  onViewNavigated: (cb: (state: ViewStateUpdate) => void): (() => void) => {
    const h = (_e: unknown, state: ViewStateUpdate): void => cb(state)
    ipcRenderer.on('frame:view-navigated', h)
    return () => ipcRenderer.removeListener('frame:view-navigated', h)
  }
}

contextBridge.exposeInMainWorld('frame', api)
export type FrameApi = typeof api
