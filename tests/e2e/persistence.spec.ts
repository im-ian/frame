import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

let server: Server
let baseUrl = ''
let tempDir = ''
let workspacePath = ''

async function launch(): Promise<{ app: ElectronApplication; window: Page }> {
  const userDataPath = await mkdtemp(path.join(tempDir, 'user-data-'))
  const app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      FRAME_WORKSPACE_PATH: workspacePath,
      FRAME_USER_DATA_PATH: userDataPath
    }
  })
  const window = await app.firstWindow()
  await window.waitForFunction(() => typeof window.frame?.listViews === 'function')
  return { app, window }
}

test.beforeAll(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), 'frame-workspace-'))
  workspacePath = path.join(tempDir, 'workspace.json')

  await new Promise<void>((resolve) => {
    server = createServer((_req, res) => {
      res.end('<!doctype html><title>saved</title><h1>saved</h1>')
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      baseUrl = `http://127.0.0.1:${port}`
      resolve()
    })
  })
})

test.afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
  await rm(tempDir, { recursive: true, force: true })
})

test('restores the last open viewports and URLs after restart', async () => {
  const firstRun = await launch()
  await firstRun.window.evaluate(() => window.frame.addView('ipad'))
  await firstRun.window.evaluate(() => window.frame.addView('desktop-1440'))
  await firstRun.window.evaluate((url) => window.frame.navigateAll(url), `${baseUrl}/saved`)
  await expect
    .poll(() => firstRun.window.evaluate(() => window.frame.listViews()))
    .toMatchObject([
      { presetId: 'ipad', url: `${baseUrl}/saved` },
      { presetId: 'desktop-1440', url: `${baseUrl}/saved` }
    ])
  await firstRun.app.close()

  const secondRun = await launch()
  await expect(secondRun.window.getByTestId('device-frame')).toHaveCount(2)
  await expect(secondRun.window.getByTestId('device-frame').nth(0)).toContainText('iPad')
  await expect(secondRun.window.getByTestId('device-frame').nth(1)).toContainText('Desktop 1440')
  await expect
    .poll(() => secondRun.window.evaluate(() => window.frame.listViews()))
    .toMatchObject([
      { presetId: 'ipad', url: `${baseUrl}/saved` },
      { presetId: 'desktop-1440', url: `${baseUrl}/saved` }
    ])
  await secondRun.app.close()
})
