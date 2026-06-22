import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { WebContentsView } from 'electron'
import path from 'node:path'

let app: ElectronApplication
let window: Page

const CLICK_PAGE = `data:text/html,${encodeURIComponent(
  `<title>ready</title>
  <body style="margin:0">
    <button style="width:100vw;height:100vh" onclick="document.title='CLICKED'">x</button>
  </body>`
)}`

const TEXT_PAGE = `data:text/html,${encodeURIComponent(
  `<title>text</title>
  <body style="margin:0;padding:40px">
    <input id="field" style="width:240px;height:40px;font-size:20px" />
  </body>`
)}`

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })
  window = await app.firstWindow()
  await window.getByTestId('preset-select').selectOption('desktop-1440')
  await window.getByTestId('add-view').click()
  await window.getByTestId('add-view').click()
  await window.getByTestId('url-input').fill(CLICK_PAGE)
  await window.getByTestId('go').click()
  await window.getByTestId('mirror-toggle').locator('input').check()
  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['ready', 'ready'])
})

test.afterAll(async () => {
  await app.close()
})

test('a click in the focused view is mirrored to the other view', async () => {
  await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const first = w.contentView.children[1] as WebContentsView
    first.webContents.focus()
    first.webContents.sendInputEvent({
      type: 'mouseDown',
      x: 100,
      y: 100,
      button: 'left',
      clickCount: 1
    })
    first.webContents.sendInputEvent({
      type: 'mouseUp',
      x: 100,
      y: 100,
      button: 'left',
      clickCount: 1
    })
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const second = w.contentView.children[2] as WebContentsView
        return second.webContents.getTitle()
      })
    )
    .toBe('CLICKED')
})

test('typing in the focused view is mirrored to the other view', async () => {
  await window.getByTestId('url-input').fill(TEXT_PAGE)
  await window.getByTestId('go').click()
  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['text', 'text'])

  await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const first = w.contentView.children[1] as WebContentsView
    first.webContents.focus()
    first.webContents.sendInputEvent({
      type: 'mouseDown',
      x: 70,
      y: 60,
      button: 'left',
      clickCount: 1
    })
    first.webContents.sendInputEvent({
      type: 'mouseUp',
      x: 70,
      y: 60,
      button: 'left',
      clickCount: 1
    })
    first.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'H' })
    first.webContents.sendInputEvent({ type: 'char', keyCode: 'h' })
    first.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'H' })
    first.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'I' })
    first.webContents.sendInputEvent({ type: 'char', keyCode: 'i' })
    first.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'I' })
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const second = w.contentView.children[2] as WebContentsView
        return second.webContents.executeJavaScript(`document.querySelector('#field')?.value ?? ''`)
      })
    )
    .toBe('hi')
})

test('input value changes in the focused view are mirrored to the other view', async () => {
  await window.getByTestId('url-input').fill(TEXT_PAGE)
  await window.getByTestId('go').click()
  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['text', 'text'])

  await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const first = w.contentView.children[1] as WebContentsView
    first.webContents.focus()
    await first.webContents.executeJavaScript(`
      const field = document.querySelector('#field');
      field.focus();
      field.value = 'mirror';
      field.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'mirror' }));
    `)
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const second = w.contentView.children[2] as WebContentsView
        return second.webContents.executeJavaScript(`document.querySelector('#field')?.value ?? ''`)
      })
    )
    .toBe('mirror')
})
