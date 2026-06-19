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

test('toolbar controls are present', async () => {
  await expect(window.getByTestId('url-input')).toBeVisible()
  await expect(window.getByTestId('add-view')).toBeVisible()
  await expect(window.getByTestId('mirror-toggle')).toBeVisible()
  await expect(window.getByTestId('go')).toBeVisible()
  await expect(window.getByTestId('preset-select')).toBeVisible()
})

test('adding a view renders a device frame', async () => {
  await window.getByTestId('preset-select').selectOption('iphone-14')
  await window.getByTestId('add-view').click()
  await expect(window.getByTestId('device-frame')).toHaveCount(1)
})
