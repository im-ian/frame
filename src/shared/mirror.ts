import type { MirrorEvent } from './types'
import { toFraction } from './coords'

export type Modifier = 'shift' | 'control' | 'alt' | 'meta'

export function buttonName(button: number): 'left' | 'middle' | 'right' {
  if (button === 1) return 'middle'
  if (button === 2) return 'right'
  return 'left'
}

export function makeMouseMirror(
  type: 'mouseDown' | 'mouseUp',
  e: { button: number; clientX: number; clientY: number; detail: number },
  viewport: { width: number; height: number }
): Extract<MirrorEvent, { kind: 'mouse' }> {
  return {
    kind: 'mouse',
    type,
    button: buttonName(e.button),
    fx: toFraction(e.clientX, viewport.width),
    fy: toFraction(e.clientY, viewport.height),
    clickCount: e.detail > 0 ? e.detail : 1
  }
}

export function makeKeyMirror(
  type: 'keyDown' | 'keyUp' | 'char',
  e: { code: string; shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }
): Extract<MirrorEvent, { kind: 'key' }> {
  const modifiers: Modifier[] = []
  if (e.shiftKey) modifiers.push('shift')
  if (e.ctrlKey) modifiers.push('control')
  if (e.altKey) modifiers.push('alt')
  if (e.metaKey) modifiers.push('meta')
  return { kind: 'key', type, keyCode: e.code, modifiers }
}
