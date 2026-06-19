import { ipcRenderer } from 'electron'
import { makeKeyMirror, makeMouseMirror } from '../shared/mirror'

function maxScroll(): { x: number; y: number } {
  const scrollingElement = document.scrollingElement || document.documentElement
  const x = scrollingElement.scrollWidth - window.innerWidth
  const y = scrollingElement.scrollHeight - window.innerHeight
  return { x: Math.max(0, x), y: Math.max(0, y) }
}

window.addEventListener(
  'scroll',
  () => {
    if (!document.hasFocus()) return
    const m = maxScroll()
    ipcRenderer.send('frame:scroll', {
      fx: m.x > 0 ? window.scrollX / m.x : 0,
      fy: m.y > 0 ? window.scrollY / m.y : 0
    })
  },
  { capture: true, passive: true }
)

function viewportSize(): { width: number; height: number } {
  return { width: window.innerWidth, height: window.innerHeight }
}

for (const type of ['mousedown', 'mouseup'] as const) {
  window.addEventListener(
    type,
    (e) => {
      if (!document.hasFocus()) return
      ipcRenderer.send(
        'frame:mirror',
        makeMouseMirror(type === 'mousedown' ? 'mouseDown' : 'mouseUp', e, viewportSize())
      )
    },
    { capture: true, passive: true }
  )
}

for (const type of ['keydown', 'keyup'] as const) {
  window.addEventListener(
    type,
    (e) => {
      if (!document.hasFocus()) return
      ipcRenderer.send('frame:mirror', makeKeyMirror(type === 'keydown' ? 'keyDown' : 'keyUp', e))
    },
    { capture: true, passive: true }
  )
}

window.addEventListener(
  'keypress',
  (e) => {
    if (!document.hasFocus() || e.key.length !== 1) return
    ipcRenderer.send(
      'frame:mirror',
      makeKeyMirror('char', {
        code: e.key,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        metaKey: e.metaKey
      })
    )
  },
  { capture: true, passive: true }
)
