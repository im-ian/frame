import type { View } from 'electron'
import type { DevicePreset, ViewId, ViewState } from '../../shared/types'
import { ChromiumView } from './ChromiumView'

export class ViewRegistry {
  private readonly parent: View
  private readonly views = new Map<ViewId, ChromiumView>()
  private onViewNavigated: ((id: ViewId, url: string) => void) | null = null
  private onAdded: ((view: ChromiumView) => void) | null = null

  constructor(parent: View) {
    this.parent = parent
  }

  setNavigationListener(cb: (id: ViewId, url: string) => void): void {
    this.onViewNavigated = cb
  }

  setAddedListener(cb: (view: ChromiumView) => void): void {
    this.onAdded = cb
  }

  add(preset: DevicePreset): ChromiumView {
    const view = new ChromiumView(this.parent, preset)
    view.onNavigated((url) => this.onViewNavigated?.(view.id, url))
    this.views.set(view.id, view)
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
    return this.list().map((v) => ({
      id: v.id,
      presetId: v.presetId,
      width: v.width,
      height: v.height,
      url: v.lastUrl
    }))
  }

  async navigateAll(url: string): Promise<void> {
    await Promise.all(this.list().map((v) => v.loadURL(url)))
  }

  destroyAll(): void {
    for (const v of this.list()) v.destroy()
    this.views.clear()
  }
}
