import { useState } from 'react'
import { DEFAULT_PRESETS } from '../../../shared/presets'

interface Props {
  onNavigate: (url: string) => void
  onAddView: (presetId: string) => void
  onToggleMirror: (on: boolean) => void
}

export function Toolbar({ onNavigate, onAddView, onToggleMirror }: Props): React.JSX.Element {
  const [url, setUrl] = useState('https://example.com')
  const [presetId, setPresetId] = useState(() => DEFAULT_PRESETS[0]?.id ?? '')
  const [mirror, setMirror] = useState(false)

  return (
    <header className="toolbar">
      <input
        data-testid="url-input"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onNavigate(url)
        }}
      />
      <button data-testid="go" onClick={() => onNavigate(url)}>
        Go
      </button>
      <select
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
      <button data-testid="add-view" onClick={() => onAddView(presetId)}>
        + View
      </button>
      <label data-testid="mirror-toggle">
        <input
          type="checkbox"
          checked={mirror}
          onChange={(e) => {
            setMirror(e.target.checked)
            onToggleMirror(e.target.checked)
          }}
        />
        Mirror
      </label>
    </header>
  )
}
