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

test('window.frame bridge is exposed', async () => {
  const keys = await window.evaluate(() => Object.keys(window.frame ?? {}))
  expect(keys).toEqual(
    expect.arrayContaining([
      'addProject',
      'addGroup',
      'listProjects',
      'listWorkspace',
      'addView',
      'removeView',
      'navigateGroup',
      'setLayout',
      'setMirror'
    ])
  )
})

test('addView via bridge creates a child WebContentsView', async () => {
  const workspace = await window.evaluate(() => window.frame.addView('ipad'))
  expect(workspace.views.some((s) => s.presetId === 'ipad')).toBe(true)
  expect(workspace.projects.length).toBeGreaterThanOrEqual(1)
  expect(workspace.views.find((s) => s.presetId === 'ipad')?.groupId).toBe(workspace.groups[0].id)
  expect(workspace.views.find((s) => s.presetId === 'ipad')?.projectId).toBe(
    workspace.projects[0].id
  )
  const childCount = await app.evaluate(
    async ({ BaseWindow }) => BaseWindow.getAllWindows()[0].contentView.children.length
  )
  expect(childCount).toBeGreaterThanOrEqual(2)
})
