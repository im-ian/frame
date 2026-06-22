import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { WebContentsView } from 'electron'
import path from 'node:path'

let app: ElectronApplication
let window: Page

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })
  window = await app.firstWindow()
})
test.afterAll(async () => {
  await app.close()
})

test('native view bounds follow the measured slot rect', async () => {
  await window.evaluate(() => window.frame.addCustomView('Custom', 414, 896))
  await expect(window.getByTestId('device-frame')).toHaveCount(1)

  // canvas 안에서 실제로 보이는 slot rect
  const slot = await window.evaluate(() => {
    const el = document.querySelector('.device-frame__slot') as HTMLElement
    const canvas = document.querySelector('[data-testid="canvas"]') as HTMLElement
    const slotRect = el.getBoundingClientRect()
    const canvasRect = canvas.getBoundingClientRect()
    const x = Math.max(slotRect.left, canvasRect.left)
    const y = Math.max(slotRect.top, canvasRect.top)
    const right = Math.min(slotRect.right, canvasRect.right)
    const bottom = Math.min(slotRect.bottom, canvasRect.bottom)
    return {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(right - x),
      h: Math.round(bottom - y)
    }
  })

  // 네이티브 뷰 bounds (메인 프로세스)
  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const last = w.contentView.children[w.contentView.children.length - 1] as WebContentsView
        const b = last.getBounds()
        return { x: b.x, y: b.y, w: b.width, h: b.height }
      })
    )
    .toEqual(slot)
})
