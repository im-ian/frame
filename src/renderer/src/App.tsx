import { useWorkspace } from './state/useViews'
import { Toolbar } from './components/Toolbar'
import { ViewportCanvas } from './components/ViewportCanvas'

function App(): React.JSX.Element {
  const {
    views,
    projects,
    groups,
    activeProjectId,
    activeGroupId,
    viewPositions,
    addProject,
    addGroup,
    selectProject,
    selectGroup,
    addView,
    addCustomView,
    removeView,
    goBack,
    goForward,
    reload,
    navigateGroup,
    moveView
  } = useWorkspace()
  return (
    <div className="app">
      <Toolbar
        projects={projects}
        groups={groups}
        activeProjectId={activeProjectId}
        activeGroupId={activeGroupId}
        onSelectProject={selectProject}
        onSelectGroup={selectGroup}
        onAddProject={() => void addProject()}
        onAddGroup={() => void addGroup()}
        onAddPresetView={(presetId) => void addView(presetId)}
        onAddCustomView={(width, height) => void addCustomView(width, height)}
      />
      <ViewportCanvas
        views={views}
        groups={groups}
        activeProjectId={activeProjectId}
        activeGroupId={activeGroupId}
        viewPositions={viewPositions}
        onRemove={(id) => void removeView(id)}
        onBack={(id) => void goBack(id)}
        onForward={(id) => void goForward(id)}
        onReload={(id) => void reload(id)}
        onNavigateGroup={(id, url) => void navigateGroup(id, url)}
        onMove={moveView}
      />
    </div>
  )
}

export default App
