import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { WebContentsView } from 'electron'
import { createServer, type Server } from 'node:http'
import path from 'node:path'

let app: ElectronApplication
let window: Page
let server: Server
let baseUrl = ''
let hits: Map<string, number>

async function viewportUrls(): Promise<string[]> {
  return app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
      child.webContents.getURL()
    )
  })
}

test.beforeEach(async () => {
  hits = new Map()
  await new Promise<void>((resolve) => {
    server = createServer((req, res) => {
      const url = req.url ?? '/'
      hits.set(url, (hits.get(url) ?? 0) + 1)
      res.end(`<!doctype html><title>${url}</title><h1>${url}</h1>`)
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })

  app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })
  window = await app.firstWindow()
})

test.afterEach(async () => {
  await app.close()
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
})

test('device frame navigation buttons mirror inside their group', async () => {
  await window.evaluate(() => window.frame.addView('desktop-1440'))
  await window.evaluate(() => window.frame.addView('iphone-14'))
  await expect(window.getByTestId('device-frame')).toHaveCount(2)

  const firstPage = `${baseUrl}/first`
  const secondPage = `${baseUrl}/second`
  await window.evaluate(async (url) => {
    const group = (await window.frame.listGroups())[0]
    await window.frame.navigateGroup(group.id, url)
  }, firstPage)
  await window.evaluate(async (url) => {
    const group = (await window.frame.listGroups())[0]
    await window.frame.navigateGroup(group.id, url)
  }, secondPage)
  await expect.poll(viewportUrls).toEqual([secondPage, secondPage])

  const desktopBack = window.getByRole('button', {
    name: 'Go back in Desktop 1440 viewport'
  })
  await expect(desktopBack).toBeEnabled()
  await desktopBack.click()
  await expect.poll(viewportUrls).toEqual([firstPage, firstPage])

  const desktopForward = window.getByRole('button', {
    name: 'Go forward in Desktop 1440 viewport'
  })
  await expect(desktopForward).toBeEnabled()
  await desktopForward.click()
  await expect.poll(viewportUrls).toEqual([secondPage, secondPage])

  const beforeReload = hits.get('/second') ?? 0
  await window.getByRole('button', { name: 'Reload Desktop 1440 viewport' }).click()
  await expect.poll(() => hits.get('/second') ?? 0).toBeGreaterThan(beforeReload)
})
