import { useEffect, useState, useCallback } from 'react'
import type { ViewState } from '../../../shared/types'

export function useViews(): {
  views: ViewState[]
  addView: (presetId: string) => Promise<void>
  removeView: (id: string) => Promise<void>
  refresh: () => Promise<void>
} {
  const [views, setViews] = useState<ViewState[]>([])

  const refresh = useCallback(async () => {
    setViews(await window.frame.listViews())
  }, [])

  const addView = useCallback(async (presetId: string) => {
    setViews(await window.frame.addView(presetId))
  }, [])

  const removeView = useCallback(async (id: string) => {
    setViews(await window.frame.removeView(id))
  }, [])

  useEffect(() => {
    let active = true
    void window.frame.listViews().then((states) => {
      if (active) setViews(states)
    })
    const offViewsChanged = window.frame.onViewsChanged(setViews)
    const offNavigated = window.frame.onViewNavigated(({ id, url }) => {
      setViews((current) => current.map((view) => (view.id === id ? { ...view, url } : view)))
    })
    return () => {
      active = false
      offViewsChanged()
      offNavigated()
    }
  }, [])

  return { views, addView, removeView, refresh }
}
