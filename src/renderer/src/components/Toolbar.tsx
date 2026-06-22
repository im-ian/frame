import { useState } from 'react'
import { DEFAULT_PRESETS } from '../../../shared/presets'
import { DEFAULT_START_URL } from '../../../shared/defaults'
import { normalizeNavigationUrl } from '../../../shared/navigation'

interface Props {
  onNavigate: (url: string) => void
  onAddView: (presetId: string) => void
  onToggleMirror: (on: boolean) => void
}

export function Toolbar({ onNavigate, onAddView, onToggleMirror }: Props): React.JSX.Element {
  const [url, setUrl] = useState(DEFAULT_START_URL)
  const [presetId, setPresetId] = useState(() => DEFAULT_PRESETS[0]?.id ?? '')
  const [mirror, setMirror] = useState(false)
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
        <select
          className="select"
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
        <button
          className="btn btn--accent"
          data-testid="add-view"
          onClick={() => onAddView(presetId)}
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
    </header>
  )
}
