import { useViews } from './state/useViews'
import { Toolbar } from './components/Toolbar'
import { ViewportCanvas } from './components/ViewportCanvas'

function App(): React.JSX.Element {
  const {
    views,
    viewPositions,
    addView,
    addCustomView,
    removeView,
    goBack,
    goForward,
    reload,
    moveView
  } = useViews()
  return (
    <div className="app">
      <Toolbar
        onNavigate={(url) => void window.frame.navigateAll(url)}
        onAddPresetView={(presetId) => void addView(presetId)}
        onAddCustomView={(width, height) => void addCustomView(width, height)}
        onToggleMirror={(on) => void window.frame.setMirror(on)}
      />
      <ViewportCanvas
        views={views}
        viewPositions={viewPositions}
        onRemove={(id) => void removeView(id)}
        onBack={(id) => void goBack(id)}
        onForward={(id) => void goForward(id)}
        onReload={(id) => void reload(id)}
        onMove={moveView}
      />
    </div>
  )
}

export default App
