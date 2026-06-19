import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import path from 'node:path'

let app: ElectronApplication
let window: Page

test.beforeEach(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })
  window = await app.firstWindow()
})

test.afterEach(async () => {
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

test('close button removes a device frame', async () => {
  await window.getByTestId('preset-select').selectOption('iphone-14')
  await window.getByTestId('add-view').click()

  await window.getByTestId('device-frame').hover()
  const close = window.getByRole('button', { name: 'Remove iPhone 14 viewport' })
  await expect(close).toHaveCSS('opacity', '1')
  await close.click()

  await expect(window.getByTestId('device-frame')).toHaveCount(0)
})

test('device frames can be dragged into a new order', async () => {
  await window.getByTestId('preset-select').selectOption('iphone-14')
  await window.getByTestId('add-view').click()
  await window.getByTestId('preset-select').selectOption('ipad')
  await window.getByTestId('add-view').click()

  await expect(window.getByTestId('device-frame').first()).toContainText('iPhone 14')

  const source = await window.getByTestId('device-frame-drag-handle').nth(1).boundingBox()
  const target = await window.getByTestId('device-frame-drag-handle').first().boundingBox()
  if (!source || !target) throw new Error('missing drag handles')

  await window.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await window.mouse.down()
  await window.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
    steps: 8
  })
  await window.mouse.up()

  await expect(window.getByTestId('device-frame').first()).toContainText('iPad')
})
