import { forwardRef } from 'react'
import type { ViewState } from '../../../shared/types'
import { findPreset } from '../../../shared/presets'

interface Props {
  view: ViewState
  onRemove: (id: string) => void
  onBack: (id: string) => void
  onForward: (id: string) => void
  onReload: (id: string) => void
  dragging: boolean
  onDragStart: (id: string, point: { x: number; y: number }) => void
}

export const DeviceFrame = forwardRef<HTMLDivElement, Props>(
  ({ view, onRemove, onBack, onForward, onReload, dragging, onDragStart }, ref) => {
    const name = findPreset(view.presetId)?.label ?? 'Custom'
    const stopBarDrag = (e: React.PointerEvent<HTMLButtonElement>): void => e.stopPropagation()
    return (
      <div
        className={`device-frame${dragging ? ' device-frame--dragging' : ''}`}
        data-testid="device-frame"
        data-view-id={view.id}
      >
        <div
          className="device-frame__bar"
          data-testid="device-frame-drag-handle"
          onPointerDown={(e) => {
            if (e.button !== 0) return
            e.preventDefault()
            e.currentTarget.setPointerCapture(e.pointerId)
            onDragStart(view.id, { x: e.clientX, y: e.clientY })
          }}
        >
          <button
            className="device-frame__close"
            onClick={() => onRemove(view.id)}
            onPointerDown={stopBarDrag}
            aria-label={`Remove ${name} viewport`}
            title="Remove viewport"
          >
            ✕
          </button>
          <div className="device-frame__nav" aria-label={`${name} viewport navigation`}>
            <button
              className="device-frame__nav-button"
              onClick={() => onBack(view.id)}
              onPointerDown={stopBarDrag}
              disabled={!view.canGoBack}
              aria-label={`Go back in ${name} viewport`}
              title="Back"
            >
              ←
            </button>
            <button
              className="device-frame__nav-button"
              onClick={() => onForward(view.id)}
              onPointerDown={stopBarDrag}
              disabled={!view.canGoForward}
              aria-label={`Go forward in ${name} viewport`}
              title="Forward"
            >
              →
            </button>
            <button
              className="device-frame__nav-button"
              onClick={() => onReload(view.id)}
              onPointerDown={stopBarDrag}
              aria-label={`Reload ${name} viewport`}
              title="Reload"
            >
              ↻
            </button>
          </div>
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
