import { forwardRef } from 'react'
import type { ViewState } from '../../../shared/types'
import { findPreset } from '../../../shared/presets'

interface Props {
  view: ViewState
  onRemove: (id: string) => void
  dragging: boolean
  onDragStart: (id: string, point: { x: number; y: number }) => void
  onDragEnterFrame: (id: string) => void
}

interface GhostProps {
  view: ViewState
  x: number
  y: number
}

interface DropPlaceholderProps {
  view: ViewState
}

export const DeviceFrame = forwardRef<HTMLDivElement, Props>(
  ({ view, onRemove, dragging, onDragStart, onDragEnterFrame }, ref) => {
    const name = findPreset(view.presetId)?.label ?? 'Custom'
    return (
      <div
        className={`device-frame${dragging ? ' device-frame--dragging' : ''}`}
        data-testid="device-frame"
        data-view-id={view.id}
        onPointerEnter={() => onDragEnterFrame(view.id)}
      >
        <div
          className="device-frame__bar"
          data-testid="device-frame-drag-handle"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.preventDefault()
            onDragStart(view.id, { x: e.clientX, y: e.clientY })
          }}
        >
          <button
            className="device-frame__close"
            onClick={() => onRemove(view.id)}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Remove ${name} viewport`}
            title="Remove viewport"
          >
            ✕
          </button>
          <span className="device-frame__name">{name}</span>
          <span className="device-frame__dims">
            {view.width} × {view.height}
          </span>
        </div>
        <div
          className="device-frame__slot"
          ref={ref}
          style={{ width: view.width, height: view.height }}
        />
      </div>
    )
  }
)
DeviceFrame.displayName = 'DeviceFrame'

export function DeviceFrameDragGhost({ view, x, y }: GhostProps): React.JSX.Element {
  const name = findPreset(view.presetId)?.label ?? 'Custom'
  return (
    <div
      className="device-frame-drag-ghost"
      data-testid="device-frame-drag-ghost"
      style={{ transform: `translate3d(${x + 16}px, ${y + 16}px, 0)` }}
    >
      <div className="device-frame-drag-ghost__bar">
        <span className="device-frame-drag-ghost__name">{name}</span>
        <span className="device-frame-drag-ghost__dims">
          {view.width} × {view.height}
        </span>
      </div>
      <div className="device-frame-drag-ghost__slot" />
    </div>
  )
}

export function DeviceFrameDropPlaceholder({ view }: DropPlaceholderProps): React.JSX.Element {
  const name = findPreset(view.presetId)?.label ?? 'Custom'
  return (
    <div
      className="device-frame-drop-placeholder"
      data-testid="device-frame-drop-placeholder"
      aria-label={`Drop ${name} viewport here`}
      style={{ width: view.width, height: view.height + 34 }}
    />
  )
}
