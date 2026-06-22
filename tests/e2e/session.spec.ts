import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { Server } from 'node:http'
import type { WebContentsView } from 'electron'
import path from 'node:path'
import { startFixture } from './fixtures/server'

let app: ElectronApplication
let window: Page
let server: Server
let baseUrl: string

test.beforeAll(async () => {
  const fixture = await startFixture()
  server = fixture.server
  baseUrl = fixture.url

  app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })
  window = await app.firstWindow()
  await app.evaluate(async ({ session }) => {
    await session
      .fromPartition('persist:frame')
      .clearData({ dataTypes: ['cookies', 'localStorage'] })
  })
})

test.afterAll(async () => {
  await app.close()
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
})

test('a cookie set in one view is visible to a newly added view', async () => {
  await window.evaluate(() => window.frame.addCustomView('Custom', 1440, 900))
  await window.evaluate(async (url) => {
    const group = (await window.frame.listGroups())[0]
    await window.frame.navigateGroup(group.id, url)
  }, `${baseUrl}/set`)

  await expect
    .poll(async () =>
      app.evaluate(async ({ session }) => {
        const cookies = await session.fromPartition('persist:frame').cookies.get({})
        return cookies.some((c) => c.name === 'frame_session' && c.value === 'yes')
      })
    )
    .toBe(true)

  await window.evaluate(() => window.frame.addCustomView('Custom', 1440, 900))
  await window.evaluate(async (url) => {
    const group = (await window.frame.listGroups())[0]
    await window.frame.navigateGroup(group.id, url)
  }, `${baseUrl}/`)

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const last = w.contentView.children[w.contentView.children.length - 1] as WebContentsView
        return last.webContents.getTitle()
      })
    )
    .toBe('HAS_COOKIE')
})
