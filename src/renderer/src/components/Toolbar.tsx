import { useState } from 'react'
import { DEFAULT_PRESETS } from '../../../shared/presets'
import { DEFAULT_START_URL } from '../../../shared/defaults'
import { normalizeNavigationUrl } from '../../../shared/navigation'

interface Props {
  onNavigate: (url: string) => void
  onAddPresetView: (presetId: string) => void
  onAddCustomView: (width: number, height: number) => void
  onToggleMirror: (on: boolean) => void
}

type AddMode = 'preset' | 'custom'

interface AddViewModalProps {
  onAddPresetView: (presetId: string) => void
  onAddCustomView: (width: number, height: number) => void
  onClose: () => void
}

function isPositivePixelValue(value: string): boolean {
  return /^[1-9]\d*$/.test(value)
}

export function Toolbar({
  onNavigate,
  onAddPresetView,
  onAddCustomView,
  onToggleMirror
}: Props): React.JSX.Element {
  const [url, setUrl] = useState(DEFAULT_START_URL)
  const [mirror, setMirror] = useState(false)
  const [addingView, setAddingView] = useState(false)

  const submitUrl = (): void => {
    const normalized = normalizeNavigationUrl(url)
    if (!normalized) return
    setUrl(normalized)
    onNavigate(normalized)
  }

  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand__dot" />
        frame
      </div>

      <div className="urlbar">
        <input
          className="urlbar__input"
          data-testid="url-input"
          value={url}
          placeholder="Enter a URL"
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitUrl()
          }}
        />
        <button className="urlbar__go" data-testid="go" onClick={submitUrl}>
          Go
        </button>
      </div>

      <div className="toolbar__actions">
        <button
          className="btn btn--accent"
          data-testid="add-view"
          onClick={() => setAddingView(true)}
        >
          + View
        </button>
        <label className="switch" data-testid="mirror-toggle">
          <input
            className="switch__input"
            type="checkbox"
            checked={mirror}
            onChange={(e) => {
              setMirror(e.target.checked)
              onToggleMirror(e.target.checked)
            }}
          />
          <span className="switch__track" aria-hidden="true">
            <span className="switch__thumb" />
          </span>
          <span className="switch__text">Mirror</span>
        </label>
      </div>

      {addingView && (
        <AddViewModal
          onAddPresetView={(presetId) => {
            onAddPresetView(presetId)
            setAddingView(false)
          }}
          onAddCustomView={(width, height) => {
            onAddCustomView(width, height)
            setAddingView(false)
          }}
          onClose={() => setAddingView(false)}
        />
      )}
    </header>
  )
}

function AddViewModal({
  onAddPresetView,
  onAddCustomView,
  onClose
}: AddViewModalProps): React.JSX.Element {
  const [mode, setMode] = useState<AddMode>('preset')
  const [presetId, setPresetId] = useState(() => DEFAULT_PRESETS[0]?.id ?? '')
  const [viewportWidth, setViewportWidth] = useState('390')
  const [viewportHeight, setViewportHeight] = useState('844')
  const canAddCustom = isPositivePixelValue(viewportWidth) && isPositivePixelValue(viewportHeight)
  const canAdd = mode === 'preset' ? Boolean(presetId) : canAddCustom

  const submit = (): void => {
    if (!canAdd) return
    if (mode === 'preset') {
      onAddPresetView(presetId)
      return
    }
    const widthValue = Number.parseInt(viewportWidth, 10)
    const heightValue = Number.parseInt(viewportHeight, 10)
    onAddCustomView(widthValue, heightValue)
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        className="add-view-modal"
        data-testid="add-view-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add viewport"
      >
        <div className="add-view-modal__header">
          <h2 className="add-view-modal__title">Add View</h2>
          <button
            className="add-view-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close add view modal"
          >
            ✕
          </button>
        </div>

        <div className="segmented" role="group" aria-label="Viewport source">
          <button
            className={`segmented__button${mode === 'preset' ? ' segmented__button--active' : ''}`}
            data-testid="mode-preset"
            type="button"
            aria-pressed={mode === 'preset'}
            onClick={() => setMode('preset')}
          >
            Preset
          </button>
          <button
            className={`segmented__button${mode === 'custom' ? ' segmented__button--active' : ''}`}
            data-testid="mode-custom"
            type="button"
            aria-pressed={mode === 'custom'}
            onClick={() => setMode('custom')}
          >
            Custom
          </button>
        </div>

        {mode === 'preset' ? (
          <select
            className="select add-view-modal__control"
            data-testid="preset-select"
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
          >
            {DEFAULT_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        ) : (
          <div className="viewport-size add-view-modal__control" aria-label="Viewport size">
            <input
              className="viewport-size__input"
              data-testid="viewport-width"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              aria-label="Viewport width"
              value={viewportWidth}
              onChange={(e) => setViewportWidth(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
            <span className="viewport-size__separator">×</span>
            <input
              className="viewport-size__input"
              data-testid="viewport-height"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              aria-label="Viewport height"
              value={viewportHeight}
              onChange={(e) => setViewportHeight(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
              }}
            />
          </div>
        )}

        <div className="add-view-modal__actions">
          <button className="btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn--accent"
            data-testid="confirm-add-view"
            type="button"
            disabled={!canAdd}
            onClick={submit}
          >
            Add View
          </button>
        </div>
      </section>
    </div>
  )
}
