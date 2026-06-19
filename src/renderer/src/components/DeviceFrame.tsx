import { forwardRef } from 'react'
import type { ViewState } from '../../../shared/types'
import { findPreset } from '../../../shared/presets'

interface Props {
  view: ViewState
  onRemove: (id: string) => void
  dragging: boolean
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onDragEnterFrame: (id: string) => void
}

export const DeviceFrame = forwardRef<HTMLDivElement, Props>(
  ({ view, onRemove, dragging, onDragStart, onDragEnd, onDragEnterFrame }, ref) => {
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
            onDragStart(view.id)
          }}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
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
