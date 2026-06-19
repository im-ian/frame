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
    canvas?.addEventListener('scroll', reportLayout)
    return () => {
      window.removeEventListener('resize', reportLayout)
      canvas?.removeEventListener('scroll', reportLayout)
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current)
        frameRef.current = null
      }
    }
  }, [reportLayout])

  return (
    <section className="canvas" data-testid="canvas" ref={canvasRef}>
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
