import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { WebContentsView } from 'electron'
import path from 'node:path'

let app: ElectronApplication
let window: Page

const TALL = `data:text/html,${encodeURIComponent(
  '<title>scroll</title><body style="margin:0"><div style="height:5000px;background:linear-gradient(#fff,#ddd)"></div></body>'
)}`

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })
  window = await app.firstWindow()
  await window.getByTestId('viewport-width').fill('1440')
  await window.getByTestId('viewport-height').fill('900')
  await window.getByTestId('add-view').click()
  await window.getByTestId('add-view').click()
  await window.getByTestId('url-input').fill(TALL)
  await window.getByTestId('go').click()
})

test.afterAll(async () => {
  await app.close()
})

test('scrolling the focused view scrolls the others', async () => {
  await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const first = w.contentView.children[1] as WebContentsView
    first.webContents.focus()
    await first.webContents.executeJavaScript(`
      window.scrollTo(0, 2000);
      window.dispatchEvent(new Event('scroll'));
    `)
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const second = w.contentView.children[2] as WebContentsView
        return second.webContents.executeJavaScript('Math.round(window.scrollY)')
      })
    )
    .toBeGreaterThan(100)
})
