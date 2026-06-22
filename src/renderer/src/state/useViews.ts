import { useEffect, useRef, useState, useCallback } from 'react'
import type {
  PaneGroupId,
  PaneGroupState,
  ProjectId,
  ProjectState,
  ViewState,
  ViewStateUpdate,
  WorkspaceState
} from '../../../shared/types'

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
      if (placedView?.projectId !== view.projectId) return null
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

const EMPTY_WORKSPACE: WorkspaceState = { projects: [], groups: [], views: [] }

export function useWorkspace(): {
  projects: ProjectState[]
  groups: PaneGroupState[]
  views: ViewState[]
  activeProjectId: ProjectId | null
  activeGroupId: PaneGroupId | null
  viewPositions: ViewPositions
  addProject: () => Promise<void>
  addGroup: () => Promise<void>
  selectProject: (id: ProjectId) => void
  selectGroup: (id: PaneGroupId) => void
  addView: (presetId: string) => Promise<void>
  addCustomView: (width: number, height: number) => Promise<void>
  removeView: (id: string) => Promise<void>
  goBack: (id: string) => Promise<void>
  goForward: (id: string) => Promise<void>
  reload: (id: string) => Promise<void>
  navigateGroup: (id: PaneGroupId, url: string) => Promise<void>
  moveView: (id: string, x: number, y: number) => void
  refresh: () => Promise<void>
} {
  const [workspace, setWorkspace] = useState<WorkspaceState>(EMPTY_WORKSPACE)
  const [activeProjectId, setActiveProjectId] = useState<ProjectId | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<PaneGroupId | null>(null)
  const [viewPositions, setViewPositions] = useState<ViewPositions>({})
  const requestedProjectIdRef = useRef<ProjectId | null>(null)

  const applyWorkspace = useCallback(
    (nextWorkspace: WorkspaceState, preferredProjectId?: ProjectId | null) => {
      const requestedProjectId =
        preferredProjectId ?? requestedProjectIdRef.current ?? activeProjectId
      const nextProjectId =
        requestedProjectId &&
        nextWorkspace.projects.some((project) => project.id === requestedProjectId)
          ? requestedProjectId
          : (nextWorkspace.projects[0]?.id ?? null)

      setWorkspace(nextWorkspace)
      setViewPositions((current) => reconcileViewPositions(nextWorkspace.views, current))
      setActiveProjectId(nextProjectId)
      setActiveGroupId((current) => {
        if (
          current &&
          nextWorkspace.groups.some(
            (group) => group.id === current && group.projectId === nextProjectId
          )
        ) {
          return current
        }
        return nextWorkspace.groups.find((group) => group.projectId === nextProjectId)?.id ?? null
      })
    },
    [activeProjectId]
  )

  const refresh = useCallback(async () => {
    applyWorkspace(await window.frame.listWorkspace())
  }, [applyWorkspace])

  const addProject = useCallback(async () => {
    const nextWorkspace = await window.frame.addProject()
    const created = nextWorkspace.projects.at(-1)
    if (!created) return
    requestedProjectIdRef.current = created.id
    applyWorkspace(nextWorkspace, created.id)
  }, [applyWorkspace])

  const addGroup = useCallback(async () => {
    if (!activeProjectId) return
    const nextWorkspace = await window.frame.addGroup(activeProjectId)
    applyWorkspace(nextWorkspace)
    const projectGroups = nextWorkspace.groups.filter(
      (group) => group.projectId === activeProjectId
    )
    const created = projectGroups.at(-1)
    if (created) setActiveGroupId(created.id)
  }, [activeProjectId, applyWorkspace])

  const addView = useCallback(
    async (presetId: string) => {
      if (!activeGroupId) return
      applyWorkspace(await window.frame.addView(presetId, activeGroupId))
    },
    [activeGroupId, applyWorkspace]
  )

  const addCustomView = useCallback(
    async (width: number, height: number) => {
      if (!activeGroupId) return
      applyWorkspace(await window.frame.addCustomView('Custom', width, height, activeGroupId))
    },
    [activeGroupId, applyWorkspace]
  )

  const removeView = useCallback(
    async (id: string) => {
      applyWorkspace(await window.frame.removeView(id))
    },
    [applyWorkspace]
  )

  const goBack = useCallback(
    async (id: string) => {
      applyWorkspace(await window.frame.goBack(id))
    },
    [applyWorkspace]
  )

  const goForward = useCallback(
    async (id: string) => {
      applyWorkspace(await window.frame.goForward(id))
    },
    [applyWorkspace]
  )

  const reload = useCallback(
    async (id: string) => {
      applyWorkspace(await window.frame.reload(id))
    },
    [applyWorkspace]
  )

  const navigateGroup = useCallback(
    async (id: PaneGroupId, url: string) => {
      applyWorkspace(await window.frame.navigateGroup(id, url))
    },
    [applyWorkspace]
  )

  const moveView = useCallback((id: string, x: number, y: number) => {
    setViewPositions((current) => {
      if (!current[id]) return current
      const next = { x: snapToGrid(x), y: snapToGrid(y) }
      if (current[id].x === next.x && current[id].y === next.y) return current
      return { ...current, [id]: next }
    })
  }, [])

  const selectProject = useCallback(
    (id: ProjectId) => {
      requestedProjectIdRef.current = id
      setActiveProjectId(id)
      setActiveGroupId((current) => {
        if (
          current &&
          workspace.groups.some((group) => group.id === current && group.projectId === id)
        ) {
          return current
        }
        return workspace.groups.find((group) => group.projectId === id)?.id ?? null
      })
    },
    [workspace.groups]
  )

  const selectGroup = useCallback((id: PaneGroupId) => {
    setActiveGroupId(id)
  }, [])

  useEffect(() => {
    let active = true
    const syncWorkspace = (): void => {
      void window.frame.listWorkspace().then((nextWorkspace) => {
        if (active) applyWorkspace(nextWorkspace)
      })
    }

    void window.frame.listWorkspace().then((nextWorkspace) => {
      if (active) applyWorkspace(nextWorkspace)
    })
    const offWorkspaceChanged = window.frame.onWorkspaceChanged(applyWorkspace)
    const offViewsChanged = window.frame.onViewsChanged((views) => {
      setWorkspace((current) => ({ ...current, views }))
      setViewPositions((current) => reconcileViewPositions(views, current))
    })
    const offNavigated = window.frame.onViewNavigated((state) => {
      setWorkspace((current) => ({
        ...current,
        views: mergeViewStateUpdate(current.views, state)
      }))
      syncWorkspace()
    })
    return () => {
      active = false
      offWorkspaceChanged()
      offViewsChanged()
      offNavigated()
    }
  }, [applyWorkspace])

  return {
    projects: workspace.projects,
    groups: workspace.groups,
    views: workspace.views,
    activeProjectId,
    activeGroupId,
    selectProject,
    selectGroup,
    viewPositions,
    addProject,
    addGroup,
    addView,
    addCustomView,
    removeView,
    goBack,
    goForward,
    reload,
    navigateGroup,
    moveView,
    refresh
  }
}
