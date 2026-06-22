import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { WebContentsView } from 'electron'
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

async function nativeViewportBounds(index = 0): Promise<{
  x: number
  y: number
  width: number
  height: number
}> {
  return app.evaluate(async ({ BaseWindow }, childIndex) => {
    const w = BaseWindow.getAllWindows()[0]
    const view = w.contentView.children[childIndex + 1] as WebContentsView
    const bounds = view.getBounds()
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    }
  }, index)
}

async function nativeViewportMetrics(index = 0): Promise<{
  innerWidth: number
  innerHeight: number
  devicePixelRatio: number
  zoomFactor: number
}> {
  return app.evaluate(async ({ BaseWindow }, childIndex) => {
    const w = BaseWindow.getAllWindows()[0]
    const view = w.contentView.children[childIndex + 1] as WebContentsView
    const metrics = (await view.webContents.executeJavaScript(
      '({ innerWidth: window.innerWidth, innerHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio })'
    )) as { innerWidth: number; innerHeight: number; devicePixelRatio: number }
    return {
      ...metrics,
      zoomFactor: view.webContents.getZoomFactor()
    }
  }, index)
}

async function slotBounds(index = 0): Promise<{
  x: number
  y: number
  width: number
  height: number
}> {
  return window.evaluate((slotIndex) => {
    const slot = document.querySelectorAll('.device-frame__slot')[slotIndex] as HTMLElement
    const bounds = slot.getBoundingClientRect()
    return {
      x: Math.round(bounds.left),
      y: Math.round(bounds.top),
      width: Math.round(bounds.width),
      height: Math.round(bounds.height)
    }
  }, index)
}

async function visibleSlotBounds(index = 0): Promise<{
  x: number
  y: number
  width: number
  height: number
}> {
  return window.evaluate((slotIndex) => {
    const slot = document.querySelectorAll('.device-frame__slot')[slotIndex] as HTMLElement
    const canvas = document.querySelector('[data-testid="canvas"]') as HTMLElement
    const slotRect = slot.getBoundingClientRect()
    const canvasRect = canvas.getBoundingClientRect()
    const x = Math.max(slotRect.left, canvasRect.left)
    const y = Math.max(slotRect.top, canvasRect.top)
    const right = Math.min(slotRect.right, canvasRect.right)
    const bottom = Math.min(slotRect.bottom, canvasRect.bottom)

    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(right - x),
      height: Math.round(bottom - y)
    }
  }, index)
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

  const presetGroups = await window.getByTestId('preset-select').evaluate((select) =>
    [...select.querySelectorAll('optgroup')].map((group) => ({
      label: group.label,
      values: [...group.querySelectorAll('option')].map((option) => option.value)
    }))
  )
  expect(presetGroups.map((group) => group.label)).toEqual([
    'Phones',
    'Tablets',
    'Laptops',
    'Desktops'
  ])
  expect(presetGroups.flatMap((group) => group.values).length).toBeGreaterThanOrEqual(20)
  expect(presetGroups.flatMap((group) => group.values)).toEqual(
    expect.arrayContaining(['iphone-15-pro-max', 'pixel-8-pro', 'ipad-pro-129', 'desktop-1920'])
  )

  await window.getByTestId('mode-custom').click()
  await expect(window.getByTestId('mode-custom')).toHaveAttribute('aria-pressed', 'true')
  await expect(window.getByTestId('viewport-width')).toBeVisible()
  await expect(window.getByTestId('viewport-height')).toBeVisible()
  await expect(window.getByTestId('preset-select')).toHaveCount(0)
})

test('add view modal keeps native panes behind the overlay', async () => {
  await window.evaluate(() => window.frame.addCustomView('Custom', 1200, 900))
  await expect(window.getByTestId('device-frame')).toHaveCount(1)
  const visibleBounds = await nativeViewportBounds()
  expect(visibleBounds.width).toBeGreaterThan(1)

  await openAddViewModal()
  await expect
    .poll(() => nativeViewportBounds())
    .toEqual({
      x: -10000,
      y: -10000,
      width: 1,
      height: 1
    })

  await window.getByRole('button', { name: 'Close add view modal' }).click()
  await expect.poll(() => nativeViewportBounds()).toEqual(visibleBounds)
})

test('add view modal waits for native panes to be hidden before rendering', async () => {
  await window.evaluate(() => window.frame.addCustomView('Custom', 1200, 900))
  await expect(window.getByTestId('device-frame')).toHaveCount(1)

  await app.evaluate(async ({ BaseWindow, ipcMain }) => {
    ipcMain.removeHandler('frame:set-native-views-occluded')
    ipcMain.handle('frame:set-native-views-occluded', async (_event, occluded: boolean) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      const w = BaseWindow.getAllWindows()[0]
      for (const view of w.contentView.children.slice(1) as WebContentsView[]) {
        if (occluded) {
          view.setBounds({ x: -10000, y: -10000, width: 1, height: 1 })
        }
      }
    })
  })

  await window.getByTestId('add-view').click()
  await window.waitForTimeout(100)
  await expect(window.getByTestId('add-view-modal')).toHaveCount(0)
  await expect(window.getByTestId('add-view-modal')).toBeVisible()
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

test('dragging a device frame moves it on the grid', async () => {
  await addCustomView(390, 844)

  const frame = window.getByTestId('device-frame')
  const before = await frame.boundingBox()
  const handle = await window.getByTestId('device-frame-drag-handle').boundingBox()
  if (!before || !handle) throw new Error('missing frame or drag handle')

  await window.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await window.mouse.down()
  await window.mouse.move(handle.x + handle.width / 2 + 73, handle.y + handle.height / 2 + 61, {
    steps: 8
  })
  await window.mouse.up()

  const after = await frame.boundingBox()
  if (!after) throw new Error('missing frame after drag')
  expect(Math.round(after.x - before.x)).toBe(72)
  expect(Math.round(after.y - before.y)).toBe(72)
})

test('dragged device frame keeps the native pane aligned to its slot', async () => {
  await addCustomView(390, 844)

  const handle = await window.getByTestId('device-frame-drag-handle').boundingBox()
  if (!handle) throw new Error('missing drag handle')

  await window.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await window.mouse.down()
  await window.mouse.move(handle.x + handle.width / 2 + 96, handle.y + handle.height / 2 + 48, {
    steps: 8
  })
  await window.mouse.up()

  await expect.poll(() => nativeViewportBounds()).toEqual(await visibleSlotBounds())
})

test('new device frames are placed on the canvas without overlap', async () => {
  await addCustomView(390, 844)
  await addCustomView(768, 1024)

  const firstFrameBox = await window.getByTestId('device-frame').first().boundingBox()
  const secondFrameBox = await window.getByTestId('device-frame').nth(1).boundingBox()
  if (!firstFrameBox || !secondFrameBox) throw new Error('missing frame boxes')

  const overlap =
    firstFrameBox.x < secondFrameBox.x + secondFrameBox.width &&
    firstFrameBox.x + firstFrameBox.width > secondFrameBox.x &&
    firstFrameBox.y < secondFrameBox.y + secondFrameBox.height &&
    firstFrameBox.y + firstFrameBox.height > secondFrameBox.y
  expect(overlap).toBe(false)
})

test('zoom controls scale the canvas and native pane bounds', async () => {
  await addCustomView(390, 844)
  await expect(window.getByTestId('device-frame')).toHaveCount(1)

  const before = await slotBounds()
  await window.getByTestId('zoom-out').click()
  await expect(window.getByTestId('zoom-reset')).toHaveText('89%')

  const after = await slotBounds()
  expect(after.width).toBeLessThan(before.width)
  expect(after.height).toBeLessThan(before.height)

  await expect.poll(() => nativeViewportBounds()).toEqual(await visibleSlotBounds())
})

test('rapid zoom keeps the native pane matched to the final size', async () => {
  await addCustomView(1024, 768)
  await expect(window.getByTestId('device-frame')).toHaveCount(1)

  for (let i = 0; i < 7; i += 1) {
    await window.getByTestId('zoom-out').click()
  }
  await expect(window.getByTestId('zoom-reset')).toHaveText('45%')

  await expect.poll(() => nativeViewportBounds()).toEqual(await visibleSlotBounds())
})

test('zooming out scales the page without changing its emulated viewport', async () => {
  await addCustomView(1024, 768)
  await expect(window.getByTestId('device-frame')).toHaveCount(1)

  for (let i = 0; i < 7; i += 1) {
    await window.getByTestId('zoom-out').click()
  }
  await expect(window.getByTestId('zoom-reset')).toHaveText('45%')

  await expect
    .poll(async () => {
      const metrics = await nativeViewportMetrics()
      return {
        ...metrics,
        devicePixelRatio: Math.round(metrics.devicePixelRatio * 1000) / 1000,
        zoomFactor: Math.round(metrics.zoomFactor * 1000) / 1000
      }
    })
    .toEqual({
      innerWidth: 1024,
      innerHeight: 768,
      devicePixelRatio: 1,
      zoomFactor: 1
    })
})
