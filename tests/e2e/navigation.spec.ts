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

async function defaultGroupId(): Promise<string> {
  return window.evaluate(async () => (await window.frame.listGroups())[0].id)
}

test('navigateGroup loads the same URL into every pane in the group', async () => {
  await window.evaluate(() => window.frame.addCustomView('Custom', 1440, 900))
  await window.evaluate(() => window.frame.addCustomView('Custom', 390, 844))

  const target = 'data:text/html,<title>nav</title><h1>navigated</h1>'
  await window.evaluate(({ groupId, url }) => window.frame.navigateGroup(groupId, url), {
    groupId: await defaultGroupId(),
    url: target
  })

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

test('group navigation accepts hosts without a scheme', async () => {
  await window.evaluate(() => window.frame.addCustomView('Custom', 1440, 900))

  await window.evaluate(({ groupId, url }) => window.frame.navigateGroup(groupId, url), {
    groupId: await defaultGroupId(),
    url: `${baseUrl}/short`
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const child = w.contentView.children[1] as WebContentsView
        return child.webContents.getURL()
      })
    )
    .toBe(`http://${baseUrl}/short`)

  await expect
    .poll(async () =>
      window.evaluate(async () => {
        const group = (await window.frame.listGroups())[0]
        return group.url
      })
    )
    .toBe(`http://${baseUrl}/short`)
})

test('group address input shows the group URL and navigates on submit', async () => {
  await window.evaluate(() => window.frame.addCustomView('Custom', 1024, 768))
  const groupId = await defaultGroupId()
  const initialUrl = 'data:text/html,<title>group-url</title><h1>group url</h1>'
  await window.evaluate(({ id, url }) => window.frame.navigateGroup(id, url), {
    id: groupId,
    url: initialUrl
  })

  const input = window.getByTestId('group-url-input').first()
  await expect(input).toHaveValue(initialUrl)

  await input.fill(`${baseUrl}/from-input`)
  await input.press('Enter')

  await expect(input).toHaveValue(`http://${baseUrl}/from-input`)
  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const child = w.contentView.children[1] as WebContentsView
        return child.webContents.getURL()
      })
    )
    .toBe(`http://${baseUrl}/from-input`)
})

test('navigation events preserve viewport metadata when only URL changes', async () => {
  const before = await window.evaluate(() => window.frame.listViews())
  await window.evaluate(() => window.frame.addView('ipad'))
  await expect
    .poll(async () => (await window.evaluate(() => window.frame.listViews())).length)
    .toBe(before.length + 1)
  const states = await window.evaluate(() => window.frame.listViews())
  const state = states[states.length - 1]
  const frame = window.locator(`[data-view-id="${state.id}"]`)
  await expect(frame).toContainText('iPad')

  await app.evaluate(
    async ({ BaseWindow }, payload) => {
      const w = BaseWindow.getAllWindows()[0]
      const uiView = w.contentView.children[0] as WebContentsView
      uiView.webContents.send('frame:view-navigated', payload)
    },
    {
      id: state.id,
      presetId: null,
      width: null,
      height: null,
      url: 'https://example.com'
    }
  )

  await expect(frame).toContainText('iPad')
  await expect(frame).not.toContainText('Custom')
})
