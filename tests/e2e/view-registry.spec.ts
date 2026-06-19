import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
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

test('registry adds views and lists their states', async () => {
  await window.evaluate(() => window.frame.addView('desktop-1440'))
  await window.evaluate(() => window.frame.addView('iphone-14'))
  const states = await window.evaluate(() => window.frame.listViews())
  expect(states.length).toBe(2)
  expect(states.map((s: any) => s.presetId)).toEqual(['desktop-1440', 'iphone-14'])
})

test('registry removes a view and closes its webContents', async () => {
  const states = await window.evaluate(() => window.frame.listViews())
  await window.evaluate((id: string) => window.frame.removeView(id), states[0].id)
  const after = await window.evaluate(() => window.frame.listViews())
  expect(after.length).toBe(1)
  expect(after[0].presetId).toBe('iphone-14')
})
