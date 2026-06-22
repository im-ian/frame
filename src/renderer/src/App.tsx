import { useViews } from './state/useViews'
import { Toolbar } from './components/Toolbar'
import { ViewportCanvas } from './components/ViewportCanvas'

function App(): React.JSX.Element {
  const { views, addView, removeView, goBack, goForward, reload, reorderViews } = useViews()
  return (
    <div className="app">
      <Toolbar
        onNavigate={(url) => void window.frame.navigateAll(url)}
        onAddView={(presetId) => void addView(presetId)}
        onToggleMirror={(on) => void window.frame.setMirror(on)}
      />
      <ViewportCanvas
        views={views}
        onRemove={(id) => void removeView(id)}
        onBack={(id) => void goBack(id)}
        onForward={(id) => void goForward(id)}
        onReload={(id) => void reload(id)}
        onReorder={reorderViews}
      />
    </div>
  )
}

export default App
