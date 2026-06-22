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

function selectorFor(el: Element): string | null {
  if (el.id) return `#${CSS.escape(el.id)}`
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.name) return `${el.tagName.toLowerCase()}[name="${CSS.escape(el.name)}"]`
  }

  const parts: string[] = []
  let current: Element | null = el
  while (current && current !== document.documentElement) {
    const parent = current.parentElement
    if (!parent) return null
    const tag = current.tagName.toLowerCase()
    const siblings = Array.from(parent.children) as Element[]
    const index =
      siblings.filter((child) => child.tagName === current?.tagName).indexOf(current) + 1
    parts.unshift(`${tag}:nth-of-type(${index})`)
    current = parent
  }
  return parts.length ? parts.join(' > ') : null
}

function editableValue(el: Element): {
  selector: string | null
  value: string
  selectionStart: number | null
  selectionEnd: number | null
} | null {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return {
      selector: selectorFor(el),
      value: el.value,
      selectionStart: el.selectionStart,
      selectionEnd: el.selectionEnd
    }
  }

  if (el instanceof HTMLElement && el.isContentEditable) {
    return {
      selector: selectorFor(el),
      value: el.textContent ?? '',
      selectionStart: null,
      selectionEnd: null
    }
  }

  return null
}

window.addEventListener(
  'input',
  (e) => {
    if (!document.hasFocus() || !(e.target instanceof Element)) return
    const value = editableValue(e.target)
    if (!value) return
    ipcRenderer.send('frame:mirror', {
      kind: 'text',
      ...value
    })
  },
  { capture: true, passive: true }
)
