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

test('navigateAll loads the same URL into every view', async () => {
  await window.getByTestId('preset-select').selectOption('desktop-1440')
  await window.getByTestId('add-view').click()
  await window.getByTestId('preset-select').selectOption('iphone-14')
  await window.getByTestId('add-view').click()

  const target = 'data:text/html,<title>nav</title><h1>navigated</h1>'
  await window.getByTestId('url-input').fill(target)
  await window.getByTestId('go').click()

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((c) =>
          c.webContents.getURL()
        )
      })
    )
    .toEqual([target, target])
})
