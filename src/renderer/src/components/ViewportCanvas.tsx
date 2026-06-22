import { Fragment, useRef, useEffect, useCallback, useState } from 'react'
import type { ViewState } from '../../../shared/types'
import { DeviceFrame, DeviceFrameDragGhost, DeviceFrameDropPlaceholder } from './DeviceFrame'

interface Props {
  views: ViewState[]
  onRemove: (id: string) => void
  onBack: (id: string) => void
  onForward: (id: string) => void
  onReload: (id: string) => void
  onReorder: (sourceId: string, targetId: string) => void
}

interface DragGhost {
  id: string
  x: number
  y: number
}

export function ViewportCanvas({
  views,
  onRemove,
  onBack,
  onForward,
  onReload,
  onReorder
}: Props): React.JSX.Element {
  const slotRefs = useRef(new Map<string, HTMLDivElement>())
  const frameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dragGhost, setDragGhost] = useState<DragGhost | null>(null)

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

  useEffect(() => {
    if (!draggingId) return
    const moveGhost = (e: PointerEvent): void => {
      setDragGhost((current) =>
        current && current.id === draggingId ? { ...current, x: e.clientX, y: e.clientY } : current
      )
    }
    const stopDragging = (): void => {
      if (dropTargetId && dropTargetId !== draggingId) {
        onReorder(draggingId, dropTargetId)
      }
      setDraggingId(null)
      setDropTargetId(null)
      setDragGhost(null)
    }
    window.addEventListener('pointermove', moveGhost)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    return () => {
      window.removeEventListener('pointermove', moveGhost)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [draggingId, dropTargetId, onReorder])

  useEffect(() => {
    reportLayout()
  }, [draggingId, dropTargetId, reportLayout])

  const ghostView = dragGhost ? views.find((v) => v.id === dragGhost.id) : null
  const draggedView = draggingId ? views.find((v) => v.id === draggingId) : null
  const draggingIndex = draggingId ? views.findIndex((v) => v.id === draggingId) : -1
  const dropTargetIndex = dropTargetId ? views.findIndex((v) => v.id === dropTargetId) : -1
  const showDropPlaceholder = Boolean(
    draggedView && draggingIndex >= 0 && dropTargetIndex >= 0 && draggingIndex !== dropTargetIndex
  )
  const placeholderAfterTarget =
    showDropPlaceholder && draggingIndex >= 0 && dropTargetIndex >= 0
      ? draggingIndex < dropTargetIndex
      : false

  return (
    <section className="canvas" data-testid="canvas" ref={canvasRef}>
      {views.length === 0 && (
        <div className="canvas__empty">
          <strong>No viewports yet</strong>
          <span>Pick a device and hit “+ View” to start.</span>
        </div>
      )}
      {views.map((v) => {
        const insertPlaceholder = showDropPlaceholder && draggedView && v.id === dropTargetId
        return (
          <Fragment key={v.id}>
            {insertPlaceholder && !placeholderAfterTarget && (
              <DeviceFrameDropPlaceholder view={draggedView} />
            )}
            <DeviceFrame
              view={v}
              onRemove={onRemove}
              onBack={onBack}
              onForward={onForward}
              onReload={onReload}
              dragging={draggingId === v.id}
              onDragStart={(id, point) => {
                setDraggingId(id)
                setDropTargetId(null)
                setDragGhost({ id, ...point })
              }}
              onDragEnterFrame={(targetId) => {
                if (!draggingId) return
                setDropTargetId(targetId === draggingId ? null : targetId)
              }}
              ref={(el) => {
                if (el) slotRefs.current.set(v.id, el)
                else slotRefs.current.delete(v.id)
              }}
            />
            {insertPlaceholder && placeholderAfterTarget && (
              <DeviceFrameDropPlaceholder view={draggedView} />
            )}
          </Fragment>
        )
      })}
      {ghostView && dragGhost && (
        <DeviceFrameDragGhost view={ghostView} x={dragGhost.x} y={dragGhost.y} />
      )}
    </section>
  )
}
