import { WebContentsView, type KeyboardInputEvent, type View, type WebContents } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { fromFraction } from '../../shared/coords'
import type { DevicePreset, MirrorEvent, Rect, ScrollState, ViewId } from '../../shared/types'
import { getFrameSession } from '../session/partition'

const VIEWPORT_PRELOAD = join(__dirname, '../preload/viewport.js')
const OCCLUDED_BOUNDS: Rect = { x: -10000, y: -10000, width: 1, height: 1 }
const MIN_DISPLAY_SCALE = 0.1

export class ChromiumView {
  readonly id: ViewId = randomUUID()
  private currentPresetId: string
  readonly ready: Promise<void>
  private readonly view: WebContentsView
  private readonly parent: View
  private attached = false
  private currentUrl = ''
  private currentPreset: DevicePreset
  private currentBounds: Rect
  private currentDisplayScale = 1
  private occluded = false
  private onNavigatedCb: ((url: string) => void) | null = null

  constructor(parent: View, preset: DevicePreset) {
    this.parent = parent
    this.currentPresetId = preset.id
    this.currentPreset = preset
    this.currentBounds = { x: 0, y: 0, width: preset.width, height: preset.height }
    this.view = new WebContentsView({
      webPreferences: {
        session: getFrameSession(),
        preload: VIEWPORT_PRELOAD,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    })
    this.view.setBackgroundColor('#ffffffff')
    parent.addChildView(this.view)
    this.attached = true
    // Defer applyPreset to avoid CDP session conflicts when called during an
    // active ipcRenderer.invoke (Playwright evaluate). setImmediate lets the
    // current event-loop tick finish before attaching the CDP debugger.
    this.ready = new Promise((resolve) => {
      setImmediate(() => {
        void this.applyPreset(preset).then(resolve, resolve)
      })
    })

    const emitNavigated = (): void => {
      this.currentUrl = this.webContents.getURL()
      this.onNavigatedCb?.(this.currentUrl)
    }
    this.webContents.on('did-navigate', emitNavigated)
    this.webContents.on('did-navigate-in-page', emitNavigated)
  }

  get presetId(): string {
    return this.currentPresetId
  }

  get preset(): DevicePreset {
    return this.currentPreset
  }

  get lastUrl(): string {
    return this.currentUrl
  }

  get canGoBack(): boolean {
    return this.webContents.navigationHistory.canGoBack()
  }

  get canGoForward(): boolean {
    return this.webContents.navigationHistory.canGoForward()
  }

  get width(): number {
    return this.currentPreset.width
  }

  get height(): number {
    return this.currentPreset.height
  }

  get webContents(): WebContents {
    return this.view.webContents
  }

  get webContentsId(): number {
    return this.webContents.id
  }

  onNavigated(cb: (url: string) => void): void {
    this.onNavigatedCb = cb
  }

  setBounds(rect: Rect): void {
    this.currentBounds = rect
    this.applyBounds()
  }

  setLayout(rect: Rect, scale: number): void {
    this.currentBounds = rect
    const nextScale = Math.max(MIN_DISPLAY_SCALE, Number.isFinite(scale) ? scale : 1)
    const scaleChanged = Math.abs(this.currentDisplayScale - nextScale) > 0.001
    if (scaleChanged) {
      this.currentDisplayScale = nextScale
      void this.applyPreset(this.currentPreset)
    }
    this.applyBounds()
  }

  setOccluded(occluded: boolean): void {
    if (this.occluded === occluded) return
    this.occluded = occluded
    this.applyBounds()
  }

  private applyBounds(): void {
    const rect = this.occluded ? OCCLUDED_BOUNDS : this.currentBounds
    this.view.setBounds({
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.max(1, Math.round(rect.width)),
      height: Math.max(1, Math.round(rect.height))
    })
  }

  async loadURL(url: string): Promise<void> {
    await this.webContents.loadURL(url)
    this.currentUrl = this.webContents.getURL()
  }

  async goBack(): Promise<void> {
    if (!this.canGoBack) return
    await this.runNavigationAction(() => this.webContents.navigationHistory.goBack())
  }

  async goForward(): Promise<void> {
    if (!this.canGoForward) return
    await this.runNavigationAction(() => this.webContents.navigationHistory.goForward())
  }

  async reload(): Promise<void> {
    await this.runNavigationAction(() => this.webContents.reload())
  }

  async applyScroll(s: ScrollState): Promise<void> {
    await this.webContents.executeJavaScript(
      `(() => {
        const scrollingElement = document.scrollingElement || document.documentElement;
        const maxX = Math.max(0, scrollingElement.scrollWidth - window.innerWidth);
        const maxY = Math.max(0, scrollingElement.scrollHeight - window.innerHeight);
        window.scrollTo(maxX * ${JSON.stringify(s.fx)}, maxY * ${JSON.stringify(s.fy)});
      })()`
    )
  }

  injectMirror(ev: MirrorEvent): void {
    if (ev.kind === 'mouse') {
      this.webContents.sendInputEvent({
        type: ev.type,
        x: fromFraction(ev.fx, this.width),
        y: fromFraction(ev.fy, this.height),
        button: ev.button,
        clickCount: ev.clickCount
      })
      return
    }

    if (ev.kind === 'text') {
      void this.applyTextMirror(ev)
      return
    }

    this.webContents.sendInputEvent({
      type: ev.type,
      keyCode: ev.keyCode,
      modifiers: ev.modifiers
    } as KeyboardInputEvent)
  }

  private async applyTextMirror(ev: Extract<MirrorEvent, { kind: 'text' }>): Promise<void> {
    await this.webContents.executeJavaScript(
      `(() => {
        const selector = ${JSON.stringify(ev.selector)};
        const value = ${JSON.stringify(ev.value)};
        const selectionStart = ${JSON.stringify(ev.selectionStart)};
        const selectionEnd = ${JSON.stringify(ev.selectionEnd)};
        const el = selector ? document.querySelector(selector) : document.activeElement;
        if (!el) return;
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          if (el.value === value) return;
          el.value = value;
          if (selectionStart != null && selectionEnd != null) {
            try {
              el.setSelectionRange(selectionStart, selectionEnd);
            } catch {
              // Some input types do not support selection ranges.
            }
          }
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
          return;
        }
        if (el instanceof HTMLElement && el.isContentEditable) {
          if (el.textContent === value) return;
          el.textContent = value;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
        }
      })()`
    )
  }

  async applyPreset(preset: DevicePreset): Promise<void> {
    this.currentPresetId = preset.id
    this.currentPreset = preset
    this.webContents.setZoomFactor(1)
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
        scale: this.currentDisplayScale,
        screenOrientation: { type: 'portraitPrimary', angle: 0 }
      })
      await dbg.sendCommand('Emulation.setTouchEmulationEnabled', {
        enabled: preset.mobile,
        // CDP requires maxTouchPoints in 1..16 even when touch is disabled.
        maxTouchPoints: preset.mobile ? 5 : 1
      })
      await dbg.sendCommand('Emulation.setUserAgentOverride', {
        userAgent: preset.userAgent,
        platform: preset.mobile ? 'iPhone' : 'MacIntel'
      })
    } catch (err) {
      console.error('applyPreset emulation failed', err)
    }
  }

  private async runNavigationAction(action: () => void): Promise<void> {
    await new Promise<void>((resolve) => {
      let settled = false
      const finish = (): void => {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        this.webContents.removeListener('did-finish-load', finish)
        this.webContents.removeListener('did-fail-load', finish)
        this.webContents.removeListener('did-stop-loading', finish)
        this.currentUrl = this.webContents.getURL()
        resolve()
      }
      const timeout = setTimeout(finish, 5000)
      this.webContents.once('did-finish-load', finish)
      this.webContents.once('did-fail-load', finish)
      this.webContents.once('did-stop-loading', finish)
      action()
    })
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
