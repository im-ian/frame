import type { View } from 'electron'
import type { DevicePreset, ViewId, ViewState } from '../../shared/types'
import { ChromiumView } from './ChromiumView'

export class ViewRegistry {
  private readonly parent: View
  private readonly views = new Map<ViewId, ChromiumView>()
  private onViewNavigated: ((state: ViewState) => void) | null = null
  private onAdded: ((view: ChromiumView) => void) | null = null
  private navigateAllDepth = 0
  private navigateAllUrl: string | null = null

  constructor(parent: View) {
    this.parent = parent
  }

  setNavigationListener(cb: (state: ViewState) => void): void {
    this.onViewNavigated = cb
  }

  setAddedListener(cb: (view: ChromiumView) => void): void {
    this.onAdded = cb
  }

  add(preset: DevicePreset): ChromiumView {
    const view = new ChromiumView(this.parent, preset)
    this.views.set(view.id, view)
    view.onNavigated(() => this.onViewNavigated?.(this.stateFor(view)))
    this.onAdded?.(view)
    return view
  }

  remove(id: ViewId): void {
    const view = this.views.get(id)
    if (!view) return
    view.destroy()
    this.views.delete(id)
  }

  get(id: ViewId): ChromiumView | undefined {
    return this.views.get(id)
  }

  list(): ChromiumView[] {
    return [...this.views.values()]
  }

  states(): ViewState[] {
    return this.list().map((v) => this.stateFor(v))
  }

  async goBack(id: ViewId): Promise<void> {
    await this.views.get(id)?.goBack()
  }

  async goForward(id: ViewId): Promise<void> {
    await this.views.get(id)?.goForward()
  }

  async reload(id: ViewId): Promise<void> {
    await this.views.get(id)?.reload()
  }

  isNavigatingAll(url: string): boolean {
    return this.navigateAllDepth > 0 && this.navigateAllUrl === url
  }

  private stateFor(v: ChromiumView): ViewState {
    return {
      id: v.id,
      presetId: v.presetId,
      width: v.width,
      height: v.height,
      url: v.lastUrl,
      canGoBack: v.canGoBack,
      canGoForward: v.canGoForward
    }
  }

  async navigateAll(url: string): Promise<void> {
    this.navigateAllDepth += 1
    this.navigateAllUrl = url
    try {
      await Promise.all(this.list().map((v) => v.loadURL(url)))
    } finally {
      this.navigateAllDepth -= 1
      if (this.navigateAllDepth === 0) this.navigateAllUrl = null
    }
  }

  destroyAll(): void {
    for (const v of this.list()) v.destroy()
    this.views.clear()
  }
}
