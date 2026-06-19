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
    void refresh()
    return window.frame.onViewsChanged(setViews)
  }, [refresh])

  return { views, addView, removeView, refresh }
}
