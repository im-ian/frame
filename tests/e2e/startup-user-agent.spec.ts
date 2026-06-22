import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import path from 'node:path'

interface RequestHeaders {
  userAgent: string
}

let app: ElectronApplication
let window: Page
let server: Server
let baseUrl = ''
const requests: RequestHeaders[] = []

test.beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = createServer((req, res) => {
      requests.push({
        userAgent: req.headers['user-agent'] ?? ''
      })
      res.end('<!doctype html><title>ua</title><h1>ua</h1>')
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
    env: {
      ...process.env,
      NODE_ENV: 'test'
    }
  })
  window = await app.firstWindow()
})

test.afterAll(async () => {
  await app.close()
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
})

test('mobile viewports send mobile UA on first navigation request', async () => {
  await window.evaluate(() => window.frame.addView('iphone-14'))
  await window.evaluate(() => window.frame.addView('ipad'))
  await window.evaluate(async (url) => {
    const group = (await window.frame.listGroups())[0]
    await window.frame.navigateGroup(group.id, url)
  }, baseUrl)

  await expect.poll(() => requests.length, { timeout: 10_000 }).toBeGreaterThanOrEqual(2)
  const observedRequests = JSON.stringify(requests, null, 2)

  expect(
    requests.some(
      (headers) => headers.userAgent.includes('iPhone') && headers.userAgent.includes('Mobile')
    ),
    observedRequests
  ).toBe(true)
  expect(
    requests.some(
      (headers) => headers.userAgent.includes('iPad') && headers.userAgent.includes('Mobile')
    ),
    observedRequests
  ).toBe(true)
})
