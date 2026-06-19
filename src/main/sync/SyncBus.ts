import type { ScrollState, ViewId } from '../../shared/types'
import type { ViewRegistry } from '../views/ViewRegistry'

export class SyncBus {
  private readonly registry: ViewRegistry
  private readonly wcIdToViewId = new Map<number, ViewId>()

  constructor(registry: ViewRegistry) {
    this.registry = registry
  }

  bindWebContentsId(id: ViewId, wcId: number): void {
    this.wcIdToViewId.set(wcId, id)
  }

  handleScroll(senderWcId: number, s: ScrollState): void {
    const originId = this.wcIdToViewId.get(senderWcId)
    if (!originId) return

    for (const view of this.registry.list()) {
      if (view.id === originId) continue
      void view.applyScroll(s)
    }
  }
}
