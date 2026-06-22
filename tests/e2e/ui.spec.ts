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

async function openAddViewModal(): Promise<void> {
  await window.getByTestId('add-view').click()
  await expect(window.getByTestId('add-view-modal')).toBeVisible()
}

async function addPresetView(presetId: string): Promise<void> {
  await openAddViewModal()
  await window.getByTestId('preset-select').selectOption(presetId)
  await window.getByTestId('confirm-add-view').click()
}

async function addCustomView(width: number, height: number): Promise<void> {
  await openAddViewModal()
  await window.getByTestId('mode-custom').click()
  await window.getByTestId('viewport-width').fill(String(width))
  await window.getByTestId('viewport-height').fill(String(height))
  await window.getByTestId('confirm-add-view').click()
}

test('toolbar controls are present', async () => {
  await expect(window.getByTestId('url-input')).toBeVisible()
  await expect(window.getByTestId('add-view')).toBeVisible()
  await expect(window.getByTestId('mirror-toggle')).toBeVisible()
  await expect(window.getByTestId('go')).toBeVisible()
  await expect(window.getByTestId('add-view-modal')).toHaveCount(0)
})

test('add view modal supports presets and custom pixels', async () => {
  await openAddViewModal()
  await expect(window.getByTestId('mode-preset')).toHaveAttribute('aria-pressed', 'true')
  await expect(window.getByTestId('preset-select')).toBeVisible()
  await expect(window.getByTestId('viewport-width')).toHaveCount(0)

  await window.getByTestId('mode-custom').click()
  await expect(window.getByTestId('mode-custom')).toHaveAttribute('aria-pressed', 'true')
  await expect(window.getByTestId('viewport-width')).toBeVisible()
  await expect(window.getByTestId('viewport-height')).toBeVisible()
  await expect(window.getByTestId('preset-select')).toHaveCount(0)
})

test('adding a preset from the modal renders a preset device frame', async () => {
  await addPresetView('iphone-14')
  await expect(window.getByTestId('device-frame')).toHaveCount(1)
  await expect(window.getByTestId('device-frame')).toContainText('iPhone 14')
  await expect(window.getByTestId('device-frame')).toContainText('390 × 844')
})

test('adding custom pixels from the modal renders a custom device frame', async () => {
  await addCustomView(412, 915)
  await expect(window.getByTestId('device-frame')).toHaveCount(1)
  await expect(window.getByTestId('device-frame')).toContainText('Custom')
  await expect(window.getByTestId('device-frame')).toContainText('412 × 915')
})

test('close button removes a device frame', async () => {
  await addCustomView(390, 844)

  await window.getByTestId('device-frame-drag-handle').hover()
  const close = window.getByRole('button', { name: 'Remove Custom viewport' })
  await expect(close).toHaveCSS('opacity', '1')
  await close.click()

  await expect(window.getByTestId('device-frame')).toHaveCount(0)
})

test('dragging a device frame shows a ghost preview', async () => {
  await addCustomView(390, 844)

  const handle = await window.getByTestId('device-frame-drag-handle').boundingBox()
  if (!handle) throw new Error('missing drag handle')

  await window.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await window.mouse.down()
  await window.mouse.move(handle.x + handle.width / 2 + 24, handle.y + handle.height / 2 + 18)

  const ghost = window.getByTestId('device-frame-drag-ghost')
  await expect(ghost).toBeVisible()
  await expect(ghost).toContainText('Custom')
  await expect(ghost).toContainText('390 × 844')

  await window.mouse.up()
  await expect(ghost).toHaveCount(0)
})

test('dragging over a device frame shows a drop placeholder', async () => {
  await addCustomView(390, 844)
  await addCustomView(768, 1024)

  const source = await window.getByTestId('device-frame-drag-handle').nth(1).boundingBox()
  const target = await window.getByTestId('device-frame-drag-handle').first().boundingBox()
  if (!source || !target) throw new Error('missing drag handles')

  await window.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await window.mouse.down()
  await window.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
    steps: 8
  })

  const placeholder = window.getByTestId('device-frame-drop-placeholder')
  await expect(placeholder).toBeVisible()

  const placeholderBox = await placeholder.boundingBox()
  const firstFrameBox = await window.getByTestId('device-frame').first().boundingBox()
  if (!placeholderBox || !firstFrameBox) throw new Error('missing placeholder or frame box')
  expect(placeholderBox.x).toBeLessThan(firstFrameBox.x)

  await window.mouse.up()
  await expect(placeholder).toHaveCount(0)
})

test('device frames can be dragged into a new order', async () => {
  await addCustomView(390, 844)
  await addCustomView(768, 1024)

  await expect(window.getByTestId('device-frame').first()).toContainText('390 × 844')

  const source = await window.getByTestId('device-frame-drag-handle').nth(1).boundingBox()
  const target = await window.getByTestId('device-frame-drag-handle').first().boundingBox()
  if (!source || !target) throw new Error('missing drag handles')

  await window.mouse.move(source.x + source.width / 2, source.y + source.height / 2)
  await window.mouse.down()
  await window.mouse.move(target.x + target.width / 2, target.y + target.height / 2, {
    steps: 8
  })
  await window.mouse.up()

  await expect(window.getByTestId('device-frame').first()).toContainText('768 × 1024')
})
