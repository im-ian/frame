import type { MirrorEvent, ScrollState, ViewId } from '../../shared/types'
import type { ViewRegistry } from '../views/ViewRegistry'
import type { ChromiumView } from '../views/ChromiumView'

export class SyncBus {
  private readonly registry: ViewRegistry
  private readonly wcIdToViewId = new Map<number, ViewId>()
  private readonly suppressedMirrorUntil = new Map<ViewId, number>()
  private readonly suppressedNavigationUntil = new Map<ViewId, { url: string; until: number }>()

  constructor(registry: ViewRegistry) {
    this.registry = registry
  }

  bindWebContentsId(id: ViewId, wcId: number): void {
    this.wcIdToViewId.set(wcId, id)
  }

  handleScroll(senderWcId: number, s: ScrollState): void {
    const originId = this.wcIdToViewId.get(senderWcId)
    if (!originId) return

    for (const view of this.mirrorTargets(originId)) {
      if (view.id === originId) continue
      void view.applyScroll(s)
    }
  }

  handleMirror(senderWcId: number, ev: MirrorEvent): void {
    const originId = this.wcIdToViewId.get(senderWcId)
    if (!originId) return
    if (this.isSuppressed(originId)) return

    for (const view of this.mirrorTargets(originId)) {
      if (view.id === originId) continue
      this.suppressEchoFrom(view.id)
      view.injectMirror(ev)
    }
  }

  handleNavigation(originId: ViewId, url: string): void {
    if (!url || url === 'about:blank') return
    const groupId = this.registry.groupForView(originId)
    if (!groupId) return
    if (this.registry.isNavigatingAll(url)) return
    if (this.registry.isNavigatingGroup(groupId, url)) return
    if (this.isNavigationSuppressed(originId, url)) return

    for (const view of this.registry.listByGroup(groupId)) {
      if (view.id === originId || view.lastUrl === url) continue
      this.suppressNavigationFrom(view.id, url)
      void view.loadURL(url)
    }
  }

  private mirrorTargets(originId: ViewId): ChromiumView[] {
    const groupId = this.registry.groupForView(originId)
    if (!groupId) return []
    return this.registry.listByGroup(groupId)
  }

  private suppressEchoFrom(id: ViewId): void {
    this.suppressedMirrorUntil.set(id, Date.now() + 250)
  }

  private isSuppressed(id: ViewId): boolean {
    const until = this.suppressedMirrorUntil.get(id)
    if (!until) return false
    if (until < Date.now()) {
      this.suppressedMirrorUntil.delete(id)
      return false
    }
    return true
  }

  private suppressNavigationFrom(id: ViewId, url: string): void {
    this.suppressedNavigationUntil.set(id, { url, until: Date.now() + 5000 })
  }

  private isNavigationSuppressed(id: ViewId, url: string): boolean {
    const suppressed = this.suppressedNavigationUntil.get(id)
    if (!suppressed) return false
    if (suppressed.until < Date.now()) {
      this.suppressedNavigationUntil.delete(id)
      return false
    }
    if (suppressed.url !== url) return false
    this.suppressedNavigationUntil.delete(id)
    return true
  }
}
