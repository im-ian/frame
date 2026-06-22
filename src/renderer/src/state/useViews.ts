import { useEffect, useState, useCallback } from 'react'
import type { ViewState, ViewStateUpdate } from '../../../shared/types'

function mergeViewStateUpdate(current: ViewState[], update: ViewStateUpdate): ViewState[] {
  const definedUpdate = Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined && value !== null)
  ) as ViewStateUpdate
  return current.map((view) => (view.id === update.id ? { ...view, ...definedUpdate } : view))
}

export function useViews(): {
  views: ViewState[]
  addView: (presetId: string) => Promise<void>
  addCustomView: (width: number, height: number) => Promise<void>
  removeView: (id: string) => Promise<void>
  goBack: (id: string) => Promise<void>
  goForward: (id: string) => Promise<void>
  reload: (id: string) => Promise<void>
  reorderViews: (sourceId: string, targetId: string) => void
  refresh: () => Promise<void>
} {
  const [views, setViews] = useState<ViewState[]>([])

  const refresh = useCallback(async () => {
    setViews(await window.frame.listViews())
  }, [])

  const addView = useCallback(async (presetId: string) => {
    setViews(await window.frame.addView(presetId))
  }, [])

  const addCustomView = useCallback(async (width: number, height: number) => {
    setViews(await window.frame.addCustomView('Custom', width, height))
  }, [])

  const removeView = useCallback(async (id: string) => {
    setViews(await window.frame.removeView(id))
  }, [])

  const goBack = useCallback(async (id: string) => {
    setViews(await window.frame.goBack(id))
  }, [])

  const goForward = useCallback(async (id: string) => {
    setViews(await window.frame.goForward(id))
  }, [])

  const reload = useCallback(async (id: string) => {
    setViews(await window.frame.reload(id))
  }, [])

  const reorderViews = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return
    setViews((current) => {
      const sourceIndex = current.findIndex((view) => view.id === sourceId)
      const targetIndex = current.findIndex((view) => view.id === targetId)
      if (sourceIndex === -1 || targetIndex === -1) return current

      const next = [...current]
      const [source] = next.splice(sourceIndex, 1)
      next.splice(targetIndex, 0, source)
      return next
    })
  }, [])

  useEffect(() => {
    let active = true
    const syncViews = (): void => {
      void window.frame.listViews().then((states) => {
        if (active) setViews(states)
      })
    }

    void window.frame.listViews().then((states) => {
      if (active) setViews(states)
    })
    const offViewsChanged = window.frame.onViewsChanged(setViews)
    const offNavigated = window.frame.onViewNavigated((state) => {
      setViews((current) => mergeViewStateUpdate(current, state))
      syncViews()
    })
    return () => {
      active = false
      offViewsChanged()
      offNavigated()
    }
  }, [])

  return {
    views,
    addView,
    addCustomView,
    removeView,
    goBack,
    goForward,
    reload,
    reorderViews,
    refresh
  }
}
