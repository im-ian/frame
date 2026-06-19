import { describe, it, expect } from 'vitest'
import { buttonName, makeMouseMirror, makeKeyMirror } from './mirror'

describe('buttonName', () => {
  it('maps DOM button numbers to names', () => {
    expect(buttonName(0)).toBe('left')
    expect(buttonName(1)).toBe('middle')
    expect(buttonName(2)).toBe('right')
    expect(buttonName(99)).toBe('left')
  })
})

describe('makeMouseMirror', () => {
  it('normalizes a click into viewport fractions', () => {
    const ev = makeMouseMirror(
      'mouseDown',
      { button: 0, clientX: 100, clientY: 50, detail: 1 },
      { width: 400, height: 200 }
    )
    expect(ev).toEqual({
      kind: 'mouse',
      type: 'mouseDown',
      button: 'left',
      fx: 0.25,
      fy: 0.25,
      clickCount: 1
    })
  })
  it('defaults clickCount to 1 when detail is 0', () => {
    const ev = makeMouseMirror(
      'mouseUp',
      { button: 2, clientX: 0, clientY: 0, detail: 0 },
      { width: 400, height: 200 }
    )
    expect(ev).toMatchObject({ button: 'right', clickCount: 1 })
  })
})

describe('makeKeyMirror', () => {
  it('captures key code and active modifiers', () => {
    const ev = makeKeyMirror('keyDown', {
      code: 'KeyA',
      shiftKey: true,
      ctrlKey: false,
      altKey: false,
      metaKey: true
    })
    expect(ev).toEqual({
      kind: 'key',
      type: 'keyDown',
      keyCode: 'KeyA',
      modifiers: ['shift', 'meta']
    })
  })
  it('produces an empty modifier list when none are pressed', () => {
    const ev = makeKeyMirror('char', {
      code: 'KeyB',
      shiftKey: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false
    })
    expect(ev).toMatchObject({ type: 'char', modifiers: [] })
  })
})
