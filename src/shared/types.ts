export type ViewId = string
export type ProjectId = string
export type PaneGroupId = string

export interface DevicePreset {
  id: string
  label: string
  width: number
  height: number
  dpr: number
  mobile: boolean
  userAgent: string
}

export interface ViewState {
  id: ViewId
  projectId: ProjectId
  groupId: PaneGroupId
  presetId: string
  width: number
  height: number
  url: string
  canGoBack: boolean
  canGoForward: boolean
}

export type ViewStateUpdate = Pick<ViewState, 'id'> & Partial<Omit<ViewState, 'id'>>

export interface ProjectState {
  id: ProjectId
  name: string
}

export interface PaneGroupState {
  id: PaneGroupId
  projectId: ProjectId
  name: string
  url: string
}

export interface WorkspaceState {
  projects: ProjectState[]
  groups: PaneGroupState[]
  views: ViewState[]
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface ViewLayout {
  id: ViewId
  rect: Rect
  scale: number
}

export interface ViewportZoomWheel {
  deltaY: number
  fx: number
  fy: number
}

export interface CanvasZoomWheel {
  deltaY: number
  x: number
  y: number
}

export interface ScrollState {
  fx: number
  fy: number
}

export type MirrorEvent =
  | {
      kind: 'mouse'
      type: 'mouseDown' | 'mouseUp'
      button: 'left' | 'middle' | 'right'
      fx: number
      fy: number
      clickCount: number
    }
  | {
      kind: 'key'
      type: 'keyDown' | 'keyUp' | 'char'
      keyCode: string
      modifiers: string[]
    }
  | {
      kind: 'text'
      selector: string | null
      value: string
      selectionStart: number | null
      selectionEnd: number | null
    }
