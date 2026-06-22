import { contextBridge, ipcRenderer } from 'electron'
import type { Rect, ViewId, ViewState, ViewStateUpdate } from '../shared/types'

const api = {
  addView: (presetId: string): Promise<ViewState[]> =>
    ipcRenderer.invoke('frame:add-view', presetId),
  addCustomView: (label: string, w: number, h: number): Promise<ViewState[]> =>
    ipcRenderer.invoke('frame:add-custom-view', label, w, h),
  removeView: (id: ViewId): Promise<ViewState[]> => ipcRenderer.invoke('frame:remove-view', id),
  listViews: (): Promise<ViewState[]> => ipcRenderer.invoke('frame:list-views'),
  navigateAll: (url: string): Promise<ViewState[]> => ipcRenderer.invoke('frame:navigate-all', url),
  goBack: (id: ViewId): Promise<ViewState[]> => ipcRenderer.invoke('frame:go-back', id),
  goForward: (id: ViewId): Promise<ViewState[]> => ipcRenderer.invoke('frame:go-forward', id),
  reload: (id: ViewId): Promise<ViewState[]> => ipcRenderer.invoke('frame:reload', id),
  setLayout: (rects: Array<{ id: ViewId; rect: Rect }>): Promise<void> =>
    ipcRenderer.invoke('frame:set-layout', rects),
  setMirror: (on: boolean): Promise<void> => ipcRenderer.invoke('frame:set-mirror', on),
  setPreset: (id: ViewId, presetId: string): Promise<ViewState[]> =>
    ipcRenderer.invoke('frame:set-preset', id, presetId),
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
