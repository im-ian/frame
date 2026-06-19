import { WebContentsView, type View, type WebContents } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { DevicePreset, Rect, ViewId } from '../../shared/types'
import { getFrameSession } from '../session/partition'

const VIEWPORT_PRELOAD = join(__dirname, '../preload/viewport.js')

export class ChromiumView {
  readonly id: ViewId = randomUUID()
  private readonly view: WebContentsView
  private readonly parent: View
  private attached = false

  constructor(parent: View, preset: DevicePreset) {
    this.parent = parent
    this.view = new WebContentsView({
      webPreferences: {
        session: getFrameSession(),
        preload: VIEWPORT_PRELOAD,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    })
    this.view.setBackgroundColor('#ffffffff')
    parent.addChildView(this.view)
    this.attached = true
    // Defer applyPreset to avoid CDP session conflicts when called during an
    // active ipcRenderer.invoke (Playwright evaluate). setImmediate lets the
    // current event-loop tick finish before attaching the CDP debugger.
    setImmediate(() => { void this.applyPreset(preset) })
  }

  get webContents(): WebContents {
    return this.view.webContents
  }

  setBounds(rect: Rect): void {
    this.view.setBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    })
  }

  async loadURL(url: string): Promise<void> {
    await this.webContents.loadURL(url)
  }

  async applyPreset(preset: DevicePreset): Promise<void> {
    const dbg = this.webContents.debugger
    if (!dbg.isAttached()) {
      try {
        dbg.attach('1.3')
      } catch (err) {
        console.error('debugger attach failed', err)
        return
      }
    }
    try {
      await dbg.sendCommand('Emulation.setDeviceMetricsOverride', {
        width: preset.width,
        height: preset.height,
        deviceScaleFactor: preset.dpr,
        mobile: preset.mobile,
        screenOrientation: { type: 'portraitPrimary', angle: 0 },
      })
      await dbg.sendCommand('Emulation.setTouchEmulationEnabled', {
        enabled: preset.mobile,
        maxTouchPoints: preset.mobile ? 5 : 0,
      })
      await dbg.sendCommand('Emulation.setUserAgentOverride', {
        userAgent: preset.userAgent,
        platform: preset.mobile ? 'iPhone' : 'MacIntel',
      })
    } catch (err) {
      console.error('applyPreset emulation failed', err)
    }
  }

  destroy(): void {
    if (this.attached) {
      this.parent.removeChildView(this.view)
      this.attached = false
    }
    if (this.webContents.debugger.isAttached()) {
      try {
        this.webContents.debugger.detach()
      } catch {
        // already detached
      }
    }
    this.webContents.close()
  }
}
