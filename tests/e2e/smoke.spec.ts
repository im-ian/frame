import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
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

test('renderer boots with toolbar', async () => {
  await expect(window.getByTestId('url-input')).toBeVisible()
})

test('app name is frame', async () => {
  const name = await app.evaluate(async ({ app }) => app.getName())
  expect(name).toBe('frame')
})

test('test windows stay hidden', async () => {
  const visible = await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    return w.isVisible()
  })
  expect(visible).toBe(false)
})
