import { useRef, useEffect, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Rect, ViewLayout, ViewState } from '../../../shared/types'
import type { ViewPositions } from '../state/useViews'
import { DeviceFrame } from './DeviceFrame'

interface Props {
  views: ViewState[]
  viewPositions: ViewPositions
  onRemove: (id: string) => void
  onBack: (id: string) => void
  onForward: (id: string) => void
  onReload: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
}

interface DragState {
  id: string
  originX: number
  originY: number
  pointerX: number
  pointerY: number
}

interface PanState {
  pointerX: number
  pointerY: number
  scrollLeft: number
  scrollTop: number
}

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2
const ZOOM_STEP = 1.12
const GRID_SIZE = 24
const FRAME_BAR_HEIGHT = 34
const FRAME_BORDER_WIDTH = 1
const WORLD_EDGE_PADDING = 96
const WORLD_MIN_WIDTH = 0
const WORLD_MIN_HEIGHT = 0
const FALLBACK_POSITION = { x: WORLD_EDGE_PADDING, y: WORLD_EDGE_PADDING }
const HIDDEN_NATIVE_VIEW_RECT: Rect = { x: -10000, y: -10000, width: 1, height: 1 }

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
}

function roundedZoom(value: number): number {
  return Math.round(value * 1000) / 1000
}

function intersectRect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  const width = right - x
  const height = bottom - y

  if (width <= 0 || height <= 0) return null
  return { x, y, width, height }
}

export function ViewportCanvas({
  views,
  viewPositions,
  onRemove,
  onBack,
  onForward,
  onReload,
  onMove
}: Props): React.JSX.Element {
  const frameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLElement>(null)
  const [zoom, setZoom] = useState(1)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [panState, setPanState] = useState<PanState | null>(null)

  const publishLayout = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const canvasBounds = canvas.getBoundingClientRect()
    const clipRect: Rect = {
      x: canvasBounds.left,
      y: canvasBounds.top,
      width: canvasBounds.width,
      height: canvasBounds.height
    }
    const rects: ViewLayout[] = views.map((view) => {
      const position = viewPositions[view.id] ?? FALLBACK_POSITION
      const rawRect: Rect = {
        x: canvasBounds.left - canvas.scrollLeft + (position.x + FRAME_BORDER_WIDTH) * zoom,
        y:
          canvasBounds.top -
          canvas.scrollTop +
          (position.y + FRAME_BORDER_WIDTH + FRAME_BAR_HEIGHT) * zoom,
        width: view.width * zoom,
        height: view.height * zoom
      }

      return {
        id: view.id,
        rect: intersectRect(rawRect, clipRect) ?? HIDDEN_NATIVE_VIEW_RECT,
        scale: zoom
      }
    })

    void window.frame.setLayout(
      rects.map(({ id, rect, scale }) => {
        return {
          id,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          },
          scale
        }
      })
    )
  }, [viewPositions, views, zoom])

  const reportLayout = useCallback(() => {
    if (frameRef.current != null) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null
      publishLayout()
    })
  }, [publishLayout])

  const zoomAt = useCallback(
    (nextZoom: number, anchor?: { x: number; y: number }) => {
      const canvas = canvasRef.current
      setZoom((currentZoom) => {
        const boundedZoom = roundedZoom(clampZoom(nextZoom))
        if (boundedZoom === currentZoom) return currentZoom

        if (canvas && anchor) {
          const canvasRect = canvas.getBoundingClientRect()
          const anchorX = anchor.x - canvasRect.left
          const anchorY = anchor.y - canvasRect.top
          const worldX = (canvas.scrollLeft + anchorX) / currentZoom
          const worldY = (canvas.scrollTop + anchorY) / currentZoom

          requestAnimationFrame(() => {
            canvas.scrollLeft = worldX * boundedZoom - anchorX
            canvas.scrollTop = worldY * boundedZoom - anchorY
            reportLayout()
          })
        }

        return boundedZoom
      })
    },
    [reportLayout]
  )

  const worldSize = useMemo(() => {
    const bounds = views.reduce(
      (acc, view) => {
        const position = viewPositions[view.id] ?? FALLBACK_POSITION
        return {
          width: Math.max(acc.width, position.x + view.width + WORLD_EDGE_PADDING),
          height: Math.max(
            acc.height,
            position.y + view.height + FRAME_BAR_HEIGHT + WORLD_EDGE_PADDING
          )
        }
      },
      { width: WORLD_MIN_WIDTH, height: WORLD_MIN_HEIGHT }
    )

    return {
      width: Math.ceil(bounds.width / GRID_SIZE) * GRID_SIZE,
      height: Math.ceil(bounds.height / GRID_SIZE) * GRID_SIZE
    }
  }, [viewPositions, views])

  useEffect(() => {
    reportLayout()
    window.addEventListener('resize', reportLayout)
    const canvas = canvasRef.current

    const onWheel = (event: WheelEvent): void => {
      if (!canvas) return
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP
        zoomAt(zoom * factor, { x: event.clientX, y: event.clientY })
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
  }, [reportLayout, zoom, zoomAt])

  useLayoutEffect(() => {
    publishLayout()
  }, [publishLayout, viewPositions, worldSize, zoom])

  useEffect(() => {
    if (!dragState) return

    const moveView = (event: PointerEvent): void => {
      const nextX = dragState.originX + (event.clientX - dragState.pointerX) / zoom
      const nextY = dragState.originY + (event.clientY - dragState.pointerY) / zoom
      onMove(dragState.id, nextX, nextY)
    }

    const stopDragging = (event: PointerEvent): void => {
      moveView(event)
      setDragState(null)
      requestAnimationFrame(() => {
        publishLayout()
        void window.frame.setNativeViewsOccluded(false)
      })
    }

    window.addEventListener('pointermove', moveView)
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    return () => {
      window.removeEventListener('pointermove', moveView)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [dragState, onMove, publishLayout, zoom])

  useEffect(() => {
    if (!panState) return

    const panCanvas = (event: PointerEvent): void => {
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.scrollLeft = panState.scrollLeft - (event.clientX - panState.pointerX)
      canvas.scrollTop = panState.scrollTop - (event.clientY - panState.pointerY)
    }

    const stopPanning = (): void => setPanState(null)

    window.addEventListener('pointermove', panCanvas)
    window.addEventListener('pointerup', stopPanning)
    window.addEventListener('pointercancel', stopPanning)
    return () => {
      window.removeEventListener('pointermove', panCanvas)
      window.removeEventListener('pointerup', stopPanning)
      window.removeEventListener('pointercancel', stopPanning)
    }
  }, [panState])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.metaKey || event.ctrlKey)) return
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        zoomAt(zoom * ZOOM_STEP)
      } else if (event.key === '-') {
        event.preventDefault()
        zoomAt(zoom / ZOOM_STEP)
      } else if (event.key === '0') {
        event.preventDefault()
        zoomAt(1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [zoom, zoomAt])

  return (
    <section
      className={`canvas${panState ? ' canvas--panning' : ''}`}
      data-testid="canvas"
      ref={canvasRef}
      onPointerDown={(event) => {
        const target = event.target
        const isFrameEvent = target instanceof Element && target.closest('.device-frame')
        const isControlEvent = target instanceof Element && target.closest('.canvas-controls')
        if (isFrameEvent || isControlEvent) return
        if (event.button !== 0 && event.button !== 1) return
        event.preventDefault()
        setPanState({
          pointerX: event.clientX,
          pointerY: event.clientY,
          scrollLeft: event.currentTarget.scrollLeft,
          scrollTop: event.currentTarget.scrollTop
        })
      }}
    >
      {views.length === 0 && (
        <div className="canvas__empty">
          <strong>No viewports yet</strong>
          <span>Pick a device and hit “+ View” to start.</span>
        </div>
      )}
      <div
        className="canvas__surface"
        style={
          {
            width: worldSize.width * zoom,
            height: worldSize.height * zoom,
            '--grid-size': `${GRID_SIZE * zoom}px`
          } as CSSProperties
        }
      >
        <div
          className="canvas__world"
          style={{
            width: worldSize.width,
            height: worldSize.height,
            transform: `scale(${zoom})`
          }}
        >
          {views.map((view) => {
            const position = viewPositions[view.id] ?? FALLBACK_POSITION
            return (
              <div
                className="canvas__pane"
                key={view.id}
                style={{ left: position.x, top: position.y }}
              >
                <DeviceFrame
                  view={view}
                  onRemove={onRemove}
                  onBack={onBack}
                  onForward={onForward}
                  onReload={onReload}
                  dragging={dragState?.id === view.id}
                  onDragStart={(id, point) => {
                    const currentPosition = viewPositions[id] ?? FALLBACK_POSITION
                    setDragState({
                      id,
                      originX: currentPosition.x,
                      originY: currentPosition.y,
                      pointerX: point.x,
                      pointerY: point.y
                    })
                    void window.frame.setNativeViewsOccluded(true)
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div className="canvas-controls" data-testid="canvas-zoom-controls">
        <button
          className="canvas-controls__button"
          type="button"
          data-testid="zoom-out"
          onClick={() => zoomAt(zoom / ZOOM_STEP)}
          aria-label="Zoom out"
        >
          −
        </button>
        <button
          className="canvas-controls__value"
          type="button"
          data-testid="zoom-reset"
          onClick={() => zoomAt(1)}
          aria-label="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          className="canvas-controls__button"
          type="button"
          data-testid="zoom-in"
          onClick={() => zoomAt(zoom * ZOOM_STEP)}
          aria-label="Zoom in"
        >
          +
        </button>
      </div>
    </section>
  )
}
