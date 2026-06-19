import { useViews } from './state/useViews'
import { Toolbar } from './components/Toolbar'
import { ViewportCanvas } from './components/ViewportCanvas'

function App(): React.JSX.Element {
  const { views, addView, removeView } = useViews()
  return (
    <div className="app">
      <Toolbar
        onNavigate={(url) => void window.frame.navigateAll(url)}
        onAddView={(presetId) => void addView(presetId)}
        onToggleMirror={(on) => void window.frame.setMirror(on)}
      />
      <ViewportCanvas views={views} onRemove={(id) => void removeView(id)} />
    </div>
  )
}

export default App
