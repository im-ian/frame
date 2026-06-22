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

  // slot의 DOM rect
  const slot = await window.evaluate(() => {
    const el = document.querySelector('.device-frame__slot') as HTMLElement
    const r = el.getBoundingClientRect()
    return {
      x: Math.round(r.left),
      y: Math.round(r.top),
      w: Math.round(r.width),
      h: Math.round(r.height)
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
