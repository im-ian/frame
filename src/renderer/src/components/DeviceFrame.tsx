import { forwardRef } from 'react'
import type { ViewState } from '../../../shared/types'
import { findPreset } from '../../../shared/presets'

interface Props {
  view: ViewState
  onRemove: (id: string) => void
}

export const DeviceFrame = forwardRef<HTMLDivElement, Props>(({ view, onRemove }, ref) => {
  const name = findPreset(view.presetId)?.label ?? 'Custom'
  return (
    <div className="device-frame" data-testid="device-frame" data-view-id={view.id}>
      <div className="device-frame__bar">
        <span className="device-frame__name">{name}</span>
        <span className="device-frame__dims">
          {view.width} × {view.height}
        </span>
        <button
          className="device-frame__close"
          onClick={() => onRemove(view.id)}
          aria-label="Remove viewport"
        >
          ✕
        </button>
      </div>
      <div
        className="device-frame__slot"
        ref={ref}
        style={{ width: view.width, height: view.height }}
      />
    </div>
  )
})
DeviceFrame.displayName = 'DeviceFrame'
