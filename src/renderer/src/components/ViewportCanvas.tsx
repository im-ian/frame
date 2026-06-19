import { useRef } from 'react'
import type { ViewState } from '../../../shared/types'
import { DeviceFrame } from './DeviceFrame'

interface Props {
  views: ViewState[]
  onRemove: (id: string) => void
}

export function ViewportCanvas({ views, onRemove }: Props): React.JSX.Element {
  const slotRefs = useRef(new Map<string, HTMLDivElement>())
  return (
    <section className="canvas" data-testid="canvas">
      {views.map((v) => (
        <DeviceFrame
          key={v.id}
          view={v}
          onRemove={onRemove}
          ref={(el) => {
            if (el) slotRefs.current.set(v.id, el)
            else slotRefs.current.delete(v.id)
          }}
        />
      ))}
    </section>
  )
}
