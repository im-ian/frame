import { useRef, useEffect, useCallback } from 'react'
import type { ViewState } from '../../../shared/types'
import { DeviceFrame } from './DeviceFrame'

interface Props {
  views: ViewState[]
  onRemove: (id: string) => void
}

export function ViewportCanvas({ views, onRemove }: Props): React.JSX.Element {
  const slotRefs = useRef(new Map<string, HTMLDivElement>())
  const frameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLElement>(null)

  const reportLayout = useCallback(() => {
    if (frameRef.current != null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      const rects = views
        .map((v) => {
          const el = slotRefs.current.get(v.id)
          if (!el) return null
          const r = el.getBoundingClientRect()
          return { id: v.id, rect: { x: r.left, y: r.top, width: r.width, height: r.height } }
        })
        .filter(
          (x): x is { id: string; rect: { x: number; y: number; width: number; height: number } } =>
            x !== null
        )
      void window.frame.setLayout(rects)
    })
  }, [views])

  useEffect(() => {
    reportLayout()
    window.addEventListener('resize', reportLayout)
    const canvas = canvasRef.current

    // Translate vertical wheel into horizontal panning so a plain mouse wheel
    // can move across viewports (native views capture the wheel over
    // themselves, so this fires over the canvas chrome/gaps).
    const onWheel = (e: WheelEvent): void => {
      if (!canvas) return
      if (e.deltaX === 0 && e.deltaY !== 0) {
        canvas.scrollLeft += e.deltaY
        e.preventDefault()
      }
    }
    canvas?.addEventListener('scroll', reportLayout)
    canvas?.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('resize', reportLayout)
      canvas?.removeEventListener('scroll', reportLayout)
      canvas?.removeEventListener('wheel', onWheel)
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [reportLayout])

  return (
    <section className="canvas" data-testid="canvas" ref={canvasRef}>
      {views.length === 0 && (
        <div className="canvas__empty">
          <strong>No viewports yet</strong>
          <span>Pick a device and hit “+ View” to start.</span>
        </div>
      )}
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
