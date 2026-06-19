import { forwardRef } from 'react'
import type { ViewState } from '../../../shared/types'

interface Props {
  view: ViewState
  onRemove: (id: string) => void
}

export const DeviceFrame = forwardRef<HTMLDivElement, Props>(({ view, onRemove }, ref) => {
  return (
    <div className="device-frame" data-testid="device-frame" data-view-id={view.id}>
      <div className="device-frame__bar">
        <span>
          {view.width}×{view.height}
        </span>
        <button onClick={() => onRemove(view.id)}>✕</button>
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
