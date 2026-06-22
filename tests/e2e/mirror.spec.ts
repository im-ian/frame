import { test, expect, _electron as electron } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import type { WebContentsView } from 'electron'
import { createServer, type Server } from 'node:http'
import path from 'node:path'

let app: ElectronApplication
let window: Page
let server: Server
let navSourceUrl = ''

const CLICK_PAGE = `data:text/html,${encodeURIComponent(
  `<title>ready</title>
  <body style="margin:0">
    <button style="width:100vw;height:100vh" onclick="document.title='CLICKED'">x</button>
  </body>`
)}`

const TEXT_PAGE = `data:text/html,${encodeURIComponent(
  `<title>text</title>
  <body style="margin:0;padding:40px">
    <input id="field" style="width:240px;height:40px;font-size:20px" />
  </body>`
)}`

test.beforeAll(async () => {
  await new Promise<void>((resolve) => {
    server = createServer((req, res) => {
      if (req.url === '/source') {
        res.end(`<!doctype html>
          <title>nav-source</title>
          <body style="margin:0;padding:40px">
            <a id="go" href="/target" style="display:block;width:220px;height:120px">go</a>
          </body>`)
        return
      }
      if (req.url === '/target') {
        res.end('<!doctype html><title>nav-target</title><h1>target</h1>')
        return
      }
      res.end(
        '<!doctype html><title>nav-blank</title><body style="margin:0;padding:40px">blank</body>'
      )
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      navSourceUrl = `http://127.0.0.1:${port}/source`
      resolve()
    })
  })

  app = await electron.launch({
    args: [path.join(__dirname, '..', '..', 'out', 'main', 'index.js')],
    env: { ...process.env, NODE_ENV: 'test' }
  })
  window = await app.firstWindow()
  await window.evaluate(() => window.frame.addCustomView('Custom', 1440, 900))
  await window.evaluate(() => window.frame.addCustomView('Custom', 1440, 900))
  await window.evaluate(async (url) => {
    const group = (await window.frame.listGroups())[0]
    await window.frame.navigateGroup(group.id, url)
  }, CLICK_PAGE)
  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['ready', 'ready'])
})

test.afterAll(async () => {
  await app.close()
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()))
  })
})

test('a click in the focused view is mirrored to the other view', async () => {
  await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const first = w.contentView.children[1] as WebContentsView
    first.webContents.focus()
    first.webContents.sendInputEvent({
      type: 'mouseDown',
      x: 100,
      y: 100,
      button: 'left',
      clickCount: 1
    })
    first.webContents.sendInputEvent({
      type: 'mouseUp',
      x: 100,
      y: 100,
      button: 'left',
      clickCount: 1
    })
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const second = w.contentView.children[2] as WebContentsView
        return second.webContents.getTitle()
      })
    )
    .toBe('CLICKED')
})

test('typing in the focused view is mirrored to the other view', async () => {
  await window.evaluate(async (url) => {
    const group = (await window.frame.listGroups())[0]
    await window.frame.navigateGroup(group.id, url)
  }, TEXT_PAGE)
  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['text', 'text'])

  await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const first = w.contentView.children[1] as WebContentsView
    first.webContents.focus()
    first.webContents.sendInputEvent({
      type: 'mouseDown',
      x: 70,
      y: 60,
      button: 'left',
      clickCount: 1
    })
    first.webContents.sendInputEvent({
      type: 'mouseUp',
      x: 70,
      y: 60,
      button: 'left',
      clickCount: 1
    })
    first.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'H' })
    first.webContents.sendInputEvent({ type: 'char', keyCode: 'h' })
    first.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'H' })
    first.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'I' })
    first.webContents.sendInputEvent({ type: 'char', keyCode: 'i' })
    first.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'I' })
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const second = w.contentView.children[2] as WebContentsView
        return second.webContents.executeJavaScript(`document.querySelector('#field')?.value ?? ''`)
      })
    )
    .toBe('hi')
})

test('input value changes in the focused view are mirrored to the other view', async () => {
  await window.evaluate(async (url) => {
    const group = (await window.frame.listGroups())[0]
    await window.frame.navigateGroup(group.id, url)
  }, TEXT_PAGE)
  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['text', 'text'])

  await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const first = w.contentView.children[1] as WebContentsView
    first.webContents.focus()
    await first.webContents.executeJavaScript(`
      const field = document.querySelector('#field');
      field.focus();
      field.value = 'mirror';
      field.dispatchEvent(new InputEvent('input', { bubbles: true, data: 'mirror' }));
    `)
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        const second = w.contentView.children[2] as WebContentsView
        return second.webContents.executeJavaScript(`document.querySelector('#field')?.value ?? ''`)
      })
    )
    .toBe('mirror')
})

test('navigation from the focused view is mirrored inside its group', async () => {
  await window.evaluate(async (url) => {
    const group = (await window.frame.listGroups())[0]
    await window.frame.navigateGroup(group.id, url)
  }, navSourceUrl)

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['nav-source', 'nav-source'])

  await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const first = w.contentView.children[1] as WebContentsView
    first.webContents.focus()
    first.webContents.sendInputEvent({
      type: 'mouseDown',
      x: 70,
      y: 60,
      button: 'left',
      clickCount: 1
    })
    first.webContents.sendInputEvent({
      type: 'mouseUp',
      x: 70,
      y: 60,
      button: 'left',
      clickCount: 1
    })
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['nav-target', 'nav-target'])
})

test('mirror events stay inside their group', async () => {
  await window.evaluate(async (url) => {
    const project = (await window.frame.listProjects())[0]
    const groups = await window.frame.listGroups()
    const primaryGroupId = groups[0].id
    const workspace = await window.frame.addGroup(project.id)
    const secondaryGroupId = workspace.groups[workspace.groups.length - 1].id
    await window.frame.addCustomView('Custom', 1440, 900, secondaryGroupId)
    await window.frame.navigateGroup(primaryGroupId, url)
    await window.frame.navigateGroup(secondaryGroupId, url)
  }, CLICK_PAGE)

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['ready', 'ready', 'ready'])

  await app.evaluate(async ({ BaseWindow }) => {
    const w = BaseWindow.getAllWindows()[0]
    const first = w.contentView.children[1] as WebContentsView
    first.webContents.focus()
    first.webContents.sendInputEvent({
      type: 'mouseDown',
      x: 100,
      y: 100,
      button: 'left',
      clickCount: 1
    })
    first.webContents.sendInputEvent({
      type: 'mouseUp',
      x: 100,
      y: 100,
      button: 'left',
      clickCount: 1
    })
  })

  await expect
    .poll(async () =>
      app.evaluate(async ({ BaseWindow }) => {
        const w = BaseWindow.getAllWindows()[0]
        return (w.contentView.children.slice(1) as WebContentsView[]).map((child) =>
          child.webContents.getTitle()
        )
      })
    )
    .toEqual(['CLICKED', 'CLICKED', 'ready'])
})
