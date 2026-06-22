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
  await window.getByTestId('viewport-width').fill('1440')
  await window.getByTestId('viewport-height').fill('900')
  await window.getByTestId('add-view').click()
  await window.getByTestId('url-input').fill(`${baseUrl}/set`)
  await window.getByTestId('go').click()

  await expect
    .poll(async () =>
      app.evaluate(async ({ session }) => {
        const cookies = await session.fromPartition('persist:frame').cookies.get({})
        return cookies.some((c) => c.name === 'frame_session' && c.value === 'yes')
      })
    )
    .toBe(true)

  await window.getByTestId('add-view').click()
  await window.getByTestId('url-input').fill(`${baseUrl}/`)
  await window.getByTestId('go').click()

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
