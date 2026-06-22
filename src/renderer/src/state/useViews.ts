import { useEffect, useState, useCallback } from 'react'
import type { ViewState, ViewStateUpdate } from '../../../shared/types'

export interface ViewPosition {
  x: number
  y: number
}

export type ViewPositions = Record<string, ViewPosition>

const GRID_SIZE = 24
const FRAME_BAR_HEIGHT = 34
const INITIAL_POSITION = 96
const DEFAULT_GAP = 48
const DEFAULT_ROW_WIDTH = 2400

function mergeViewStateUpdate(current: ViewState[], update: ViewStateUpdate): ViewState[] {
  const definedUpdate = Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined && value !== null)
  ) as ViewStateUpdate
  return current.map((view) => (view.id === update.id ? { ...view, ...definedUpdate } : view))
}

function snapToGrid(value: number): number {
  return Math.max(0, Math.round(value / GRID_SIZE) * GRID_SIZE)
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

function nextAvailablePosition(
  view: ViewState,
  views: ViewState[],
  positions: ViewPositions
): ViewPosition {
  const occupied = Object.entries(positions)
    .map(([id, position]) => {
      const placedView = views.find((candidate) => candidate.id === id)
      if (!placedView) return null
      return {
        x: position.x - DEFAULT_GAP,
        y: position.y - DEFAULT_GAP,
        width: placedView.width + DEFAULT_GAP * 2,
        height: placedView.height + FRAME_BAR_HEIGHT + DEFAULT_GAP * 2
      }
    })
    .filter((rect): rect is { x: number; y: number; width: number; height: number } => rect != null)

  const candidateSize = {
    width: view.width,
    height: view.height + FRAME_BAR_HEIGHT
  }
  const maxY = Math.max(
    INITIAL_POSITION,
    ...occupied.map((rect) => rect.y + rect.height + DEFAULT_GAP)
  )

  for (let y = INITIAL_POSITION; y <= maxY + candidateSize.height; y += GRID_SIZE) {
    for (let x = INITIAL_POSITION; x <= DEFAULT_ROW_WIDTH; x += GRID_SIZE) {
      const candidate = { x, y, ...candidateSize }
      if (!occupied.some((rect) => rectsOverlap(candidate, rect))) {
        return { x, y }
      }
    }
  }

  return {
    x: INITIAL_POSITION,
    y: snapToGrid(maxY + DEFAULT_GAP)
  }
}

function reconcileViewPositions(
  views: ViewState[],
  currentPositions: ViewPositions
): ViewPositions {
  let changed = false
  const nextPositions: ViewPositions = {}

  for (const view of views) {
    const existing = currentPositions[view.id]
    if (existing) {
      nextPositions[view.id] = existing
    } else {
      nextPositions[view.id] = nextAvailablePosition(view, views, nextPositions)
      changed = true
    }
  }

  if (Object.keys(currentPositions).length !== Object.keys(nextPositions).length) changed = true
  return changed ? nextPositions : currentPositions
}

export function useViews(): {
  views: ViewState[]
  viewPositions: ViewPositions
  addView: (presetId: string) => Promise<void>
  addCustomView: (width: number, height: number) => Promise<void>
  removeView: (id: string) => Promise<void>
  goBack: (id: string) => Promise<void>
  goForward: (id: string) => Promise<void>
  reload: (id: string) => Promise<void>
  moveView: (id: string, x: number, y: number) => void
  refresh: () => Promise<void>
} {
  const [views, setViews] = useState<ViewState[]>([])
  const [viewPositions, setViewPositions] = useState<ViewPositions>({})

  const applyViews = useCallback((nextViews: ViewState[]) => {
    setViews(nextViews)
    setViewPositions((current) => reconcileViewPositions(nextViews, current))
  }, [])

  const refresh = useCallback(async () => {
    applyViews(await window.frame.listViews())
  }, [applyViews])

  const addView = useCallback(
    async (presetId: string) => {
      applyViews(await window.frame.addView(presetId))
    },
    [applyViews]
  )

  const addCustomView = useCallback(
    async (width: number, height: number) => {
      applyViews(await window.frame.addCustomView('Custom', width, height))
    },
    [applyViews]
  )

  const removeView = useCallback(
    async (id: string) => {
      applyViews(await window.frame.removeView(id))
    },
    [applyViews]
  )

  const goBack = useCallback(
    async (id: string) => {
      applyViews(await window.frame.goBack(id))
    },
    [applyViews]
  )

  const goForward = useCallback(
    async (id: string) => {
      applyViews(await window.frame.goForward(id))
    },
    [applyViews]
  )

  const reload = useCallback(
    async (id: string) => {
      applyViews(await window.frame.reload(id))
    },
    [applyViews]
  )

  const moveView = useCallback((id: string, x: number, y: number) => {
    setViewPositions((current) => {
      if (!current[id]) return current
      const next = { x: snapToGrid(x), y: snapToGrid(y) }
      if (current[id].x === next.x && current[id].y === next.y) return current
      return { ...current, [id]: next }
    })
  }, [])

  useEffect(() => {
    let active = true
    const syncViews = (): void => {
      void window.frame.listViews().then((states) => {
        if (active) applyViews(states)
      })
    }

    void window.frame.listViews().then((states) => {
      if (active) applyViews(states)
    })
    const offViewsChanged = window.frame.onViewsChanged(applyViews)
    const offNavigated = window.frame.onViewNavigated((state) => {
      setViews((current) => mergeViewStateUpdate(current, state))
      syncViews()
    })
    return () => {
      active = false
      offViewsChanged()
      offNavigated()
    }
  }, [applyViews])

  return {
    views,
    viewPositions,
    addView,
    addCustomView,
    removeView,
    goBack,
    goForward,
    reload,
    moveView,
    refresh
  }
}
