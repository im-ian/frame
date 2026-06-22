import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { WebContentsView } from 'electron'
import { createServer, type Server } from 'node:http'
import path from 'node:path'

let app: ElectronApplication
let window: Page
let server: Server
let baseUrl = ''

test.beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = createServer((_req, res) => {
      res.end('<!doctype html><title>short-url</title><h1>short url</h1>')
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      baseUrl = `127.0.0.1:${port}`
      resolve()
    })
  })

  app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })
  window = await app.firstWindow()
})

test.afterAll(async () => {
  await app.close()
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
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

test('url input accepts hosts without a scheme', async () => {
  await window.getByTestId('preset-select').selectOption('desktop-1440')
  await window.getByTestId('add-view').click()

  await window.getByTestId('url-input').fill(`${baseUrl}/short`)
  await window.getByTestId('go').click()

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const child = w.contentView.children[1] as WebContentsView
        return child.webContents.getURL()
      })
    )
    .toBe(`http://${baseUrl}/short`)

  await expect(window.getByTestId('url-input')).toHaveValue(`http://${baseUrl}/short`)
})
