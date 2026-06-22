import { useEffect, useState } from 'react'
import { DEFAULT_PRESET_GROUPS, DEFAULT_PRESETS } from '../../../shared/presets'
import type { PaneGroupId, PaneGroupState, ProjectId, ProjectState } from '../../../shared/types'

interface Props {
  projects: ProjectState[]
  groups: PaneGroupState[]
  activeProjectId: ProjectId | null
  activeGroupId: PaneGroupId | null
  onSelectProject: (id: ProjectId) => void
  onSelectGroup: (id: PaneGroupId) => void
  onAddProject: () => void
  onAddGroup: () => void
  onAddPresetView: (presetId: string) => void
  onAddCustomView: (width: number, height: number) => void
}

type AddMode = 'preset' | 'custom'

interface AddViewModalProps {
  onAddPresetView: (presetId: string) => void
  onAddCustomView: (width: number, height: number) => void
  onClose: () => void
}

function isPositivePixelValue(value: string): boolean {
  return /^[1-9]\d*$/.test(value)
}

type FrameApiWithNativeOcclusion = typeof window.frame & {
  setNativeViewsOccluded?: (occluded: boolean) => Promise<void>
}

const HIDDEN_NATIVE_VIEW_RECT = { x: -10000, y: -10000, width: 1, height: 1 }

async function setNativePanesOccluded(occluded: boolean): Promise<void> {
  const frame = window.frame as FrameApiWithNativeOcclusion
  if (typeof frame.setNativeViewsOccluded === 'function') {
    await frame.setNativeViewsOccluded(occluded)
    return
  }

  const views = await frame.listViews()
  const rects = views.map((view) => {
    if (occluded) {
      return { id: view.id, rect: HIDDEN_NATIVE_VIEW_RECT, scale: 1 }
    }
    const slot = document.querySelector(`[data-view-id="${view.id}"] .device-frame__slot`)
    const bounds = slot?.getBoundingClientRect()
    return {
      id: view.id,
      rect: bounds
        ? { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height }
        : HIDDEN_NATIVE_VIEW_RECT,
      scale: 1
    }
  })
  await frame.setLayout(rects)
}

export function Toolbar({
  projects,
  groups,
  activeProjectId,
  activeGroupId,
  onSelectProject,
  onSelectGroup,
  onAddProject,
  onAddGroup,
  onAddPresetView,
  onAddCustomView
}: Props): React.JSX.Element {
  const [addingView, setAddingView] = useState(false)
  const projectGroups = groups.filter((group) => group.projectId === activeProjectId)

  useEffect(() => {
    return () => {
      void setNativePanesOccluded(false)
    }
  }, [])

  const setAddViewModalOpen = async (open: boolean): Promise<void> => {
    if (open) {
      await setNativePanesOccluded(true)
      setAddingView(true)
      return
    }
    setAddingView(false)
    await setNativePanesOccluded(false)
  }

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand__dot" />
        frame
      </div>

      <div className="toolbar__projects" role="tablist" aria-label="Projects">
        {projects.map((project) => {
          const active = project.id === activeProjectId
          return (
            <button
              key={project.id}
              className={`project-tab${active ? ' project-tab--active' : ''}`}
              data-testid="project-tab"
              data-project-id={project.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectProject(project.id)}
            >
              {project.name}
            </button>
          )
        })}
      </div>

      <div className="toolbar__groups" role="listbox" aria-label="Pane groups">
        {projectGroups.map((group) => {
          const active = group.id === activeGroupId
          return (
            <button
              key={group.id}
              className={`group-chip${active ? ' group-chip--active' : ''}`}
              data-testid="group-tab"
              data-group-id={group.id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelectGroup(group.id)}
              title={group.url}
            >
              {group.name}
            </button>
          )
        })}
      </div>

      <div className="toolbar__actions">
        <button className="btn" data-testid="add-project" type="button" onClick={onAddProject}>
          + Project
        </button>
        <button className="btn" data-testid="add-group" type="button" onClick={onAddGroup}>
          + Group
        </button>
        <button
          className="btn btn--accent"
          data-testid="add-view"
          type="button"
          disabled={!activeProjectId || !activeGroupId}
          onClick={() => void setAddViewModalOpen(true)}
        >
          + Pane
        </button>
      </div>

      {addingView && (
        <AddViewModal
          onAddPresetView={(presetId) => {
            onAddPresetView(presetId)
            void setAddViewModalOpen(false)
          }}
          onAddCustomView={(width, height) => {
            onAddCustomView(width, height)
            void setAddViewModalOpen(false)
          }}
          onClose={() => void setAddViewModalOpen(false)}
        />
      )}
    </header>
  )
}

function AddViewModal({
  onAddPresetView,
  onAddCustomView,
  onClose
}: AddViewModalProps): React.JSX.Element {
  const [mode, setMode] = useState<AddMode>('preset')
  const [presetId, setPresetId] = useState(() => DEFAULT_PRESETS[0]?.id ?? '')
  const [viewportWidth, setViewportWidth] = useState('390')
  const [viewportHeight, setViewportHeight] = useState('844')
  const canAddCustom = isPositivePixelValue(viewportWidth) && isPositivePixelValue(viewportHeight)
  const canAdd = mode === 'preset' ? Boolean(presetId) : canAddCustom

  const submit = (): void => {
    if (!canAdd) return
    if (mode === 'preset') {
      onAddPresetView(presetId)
      return
    }
    const widthValue = Number.parseInt(viewportWidth, 10)
    const heightValue = Number.parseInt(viewportHeight, 10)
    onAddCustomView(widthValue, heightValue)
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        className="add-view-modal"
        data-testid="add-view-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add pane"
      >
        <div className="add-view-modal__header">
          <h2 className="add-view-modal__title">Add Pane</h2>
          <button
            className="add-view-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close add pane modal"
          >
            ✕
          </button>
        </div>

        <div className="segmented" role="group" aria-label="Viewport source">
          <button
            className={`segmented__button${mode === 'preset' ? ' segmented__button--active' : ''}`}
            data-testid="mode-preset"
            type="button"
            aria-pressed={mode === 'preset'}
            onClick={() => setMode('preset')}
          >
            Preset
          </button>
          <button
            className={`segmented__button${mode === 'custom' ? ' segmented__button--active' : ''}`}
            data-testid="mode-custom"
            type="button"
            aria-pressed={mode === 'custom'}
            onClick={() => setMode('custom')}
          >
            Custom
          </button>
        </div>

        {mode === 'preset' ? (
          <select
            className="select add-view-modal__control"
            data-testid="preset-select"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {DEFAULT_PRESET_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        ) : (
          <div className="viewport-size add-view-modal__control" aria-label="Viewport size">
            <input
              className="viewport-size__input"
              data-testid="viewport-width"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              aria-label="Viewport width"
              value={viewportWidth}
              onChange={(e) => setViewportWidth(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
            <span className="viewport-size__separator">×</span>
            <input
              className="viewport-size__input"
              data-testid="viewport-height"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              aria-label="Viewport height"
              value={viewportHeight}
              onChange={(e) => setViewportHeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
          </div>
        )}

        <div className="add-view-modal__actions">
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--accent"
            data-testid="confirm-add-view"
            type="button"
            disabled={!canAdd}
            onClick={submit}
          >
            Add Pane
          </button>
        </div>
      </section>
    </div>
  )
}
