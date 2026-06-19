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

test('creates a Chromium viewport as a child view', async () => {
  await window.evaluate(() => window.frame.addView('iphone-14'))
  const childCount = await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    return w.contentView.children.length
  })
  // 1 UI view + at least 1 viewport view
  expect(childCount).toBeGreaterThanOrEqual(2)
})

test('the child WebContentsView is attached to the window', async () => {
  const childCount = await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    return w.contentView.children.length
  })
  // 1 UI view + at least 1 viewport view
  expect(childCount).toBeGreaterThanOrEqual(2)
})

test('emulated mobile view reports a Mobile user agent', async () => {
  const ua = await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const last = w.contentView.children[w.contentView.children.length - 1] as WebContentsView
    return last.webContents.executeJavaScript('navigator.userAgent')
  })
  expect(ua).toMatch(/Mobile/)
})
