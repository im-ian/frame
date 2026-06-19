import { ipcRenderer } from 'electron'

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
