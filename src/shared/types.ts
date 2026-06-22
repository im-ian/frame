export type ViewId = string

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
  presetId: string
  width: number
  height: number
  url: string
  canGoBack: boolean
  canGoForward: boolean
}

export type ViewStateUpdate = Pick<ViewState, 'id'> & Partial<Omit<ViewState, 'id'>>

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
