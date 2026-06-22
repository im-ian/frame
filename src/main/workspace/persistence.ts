import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { DevicePreset, PaneGroupId, ProjectId } from '../../shared/types'

export const DEFAULT_PROJECT_ID = 'project-default'
export const DEFAULT_GROUP_ID = 'pane-group-default'

export interface PersistedWorkspaceProject {
  id: ProjectId
  name: string
}

export interface PersistedWorkspaceGroup {
  id: PaneGroupId
  projectId: ProjectId
  name: string
  url: string
}

export interface PersistedWorkspaceView {
  preset: DevicePreset
  url: string
  projectId: ProjectId
  groupId: PaneGroupId
}

export interface PersistedWorkspace {
  version: 1
  projects: PersistedWorkspaceProject[]
  groups: PersistedWorkspaceGroup[]
  views: PersistedWorkspaceView[]
}

function isPreset(value: unknown): value is DevicePreset {
  if (!value || typeof value !== 'object') return false
  const preset = value as Partial<DevicePreset>
  return (
    typeof preset.id === 'string' &&
    typeof preset.label === 'string' &&
    typeof preset.width === 'number' &&
    typeof preset.height === 'number' &&
    typeof preset.dpr === 'number' &&
    typeof preset.mobile === 'boolean' &&
    typeof preset.userAgent === 'string'
  )
}

export function readWorkspace(path: string): PersistedWorkspace | null {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<PersistedWorkspace>
    if (parsed.version !== 1 || !Array.isArray(parsed.views)) return null
    const oldGroups: unknown[] = Array.isArray(parsed.groups) ? parsed.groups : []
    const projects = Array.isArray(parsed.projects)
      ? parsed.projects
          .filter(
            (project): project is PersistedWorkspaceProject =>
              Boolean(project) &&
              typeof project === 'object' &&
              typeof (project as Partial<PersistedWorkspaceProject>).id === 'string' &&
              typeof (project as Partial<PersistedWorkspaceProject>).name === 'string'
          )
          .map((project) => ({ id: project.id, name: project.name }))
      : oldGroups
          .filter(
            (group): group is PersistedWorkspaceProject =>
              Boolean(group) &&
              typeof group === 'object' &&
              typeof (group as Partial<PersistedWorkspaceProject>).id === 'string' &&
              typeof (group as Partial<PersistedWorkspaceProject>).name === 'string'
          )
          .map((group, index) => ({
            id: group.id,
            name: group.name.replace(/^Group\b/, 'Project') || `Project ${index + 1}`
          }))
    const normalizedProjects: PersistedWorkspaceProject[] =
      projects.length > 0 ? projects : [{ id: DEFAULT_PROJECT_ID, name: 'Project 1' }]
    const knownProjectIds = new Set(normalizedProjects.map((project) => project.id))
    const oldProjectUrl = (projectId: string): string => {
      const oldGroup = oldGroups.find(
        (group) =>
          Boolean(group) &&
          typeof group === 'object' &&
          (group as { id?: unknown }).id === projectId &&
          typeof (group as { url?: unknown }).url === 'string'
      )
      return typeof (oldGroup as { url?: unknown } | undefined)?.url === 'string'
        ? ((oldGroup as { url: string }).url ?? 'about:blank')
        : 'about:blank'
    }
    const groups =
      Array.isArray(parsed.projects) && oldGroups.length > 0
        ? oldGroups
            .filter(
              (group): group is PersistedWorkspaceGroup =>
                Boolean(group) &&
                typeof group === 'object' &&
                typeof (group as Partial<PersistedWorkspaceGroup>).id === 'string' &&
                typeof (group as Partial<PersistedWorkspaceGroup>).projectId === 'string' &&
                typeof (group as Partial<PersistedWorkspaceGroup>).name === 'string' &&
                typeof (group as Partial<PersistedWorkspaceGroup>).url === 'string'
            )
            .map((group) => ({
              id: group.id,
              projectId: knownProjectIds.has(group.projectId)
                ? group.projectId
                : DEFAULT_PROJECT_ID,
              name: group.name,
              url: group.url
            }))
        : normalizedProjects.map((project, index) => ({
            id: index === 0 ? DEFAULT_GROUP_ID : `pane-group-${project.id}`,
            projectId: project.id,
            name: 'Group 1',
            url: oldProjectUrl(project.id)
          }))
    const normalizedGroups: PersistedWorkspaceGroup[] =
      groups.length > 0
        ? groups
        : [
            {
              id: DEFAULT_GROUP_ID,
              projectId: normalizedProjects[0].id,
              name: 'Group 1',
              url: 'about:blank'
            }
          ]
    const knownGroupIds = new Set(normalizedGroups.map((group) => group.id))
    const defaultGroupByProject = new Map<ProjectId, PaneGroupId>()
    for (const group of normalizedGroups) {
      if (!defaultGroupByProject.has(group.projectId))
        defaultGroupByProject.set(group.projectId, group.id)
    }
    return {
      version: 1,
      projects: normalizedProjects,
      groups: normalizedGroups,
      views: parsed.views
        .filter(
          (view): view is PersistedWorkspaceView =>
            Boolean(view) &&
            typeof view === 'object' &&
            isPreset((view as Partial<PersistedWorkspaceView>).preset) &&
            typeof (view as Partial<PersistedWorkspaceView>).url === 'string'
        )
        .map((view) => {
          const rawProjectId = (view as Partial<PersistedWorkspaceView>).projectId
          const oldProjectId = (view as Partial<PersistedWorkspaceView>).groupId
          const candidateProjectId: ProjectId =
            typeof rawProjectId === 'string'
              ? rawProjectId
              : typeof oldProjectId === 'string'
                ? oldProjectId
                : DEFAULT_PROJECT_ID
          const projectId: ProjectId = knownProjectIds.has(candidateProjectId)
            ? candidateProjectId
            : normalizedProjects[0].id
          const rawGroupId = (view as Partial<PersistedWorkspaceView>).groupId
          const fallbackGroupId = defaultGroupByProject.get(projectId) ?? normalizedGroups[0].id
          const candidateGroupId: PaneGroupId =
            typeof rawGroupId === 'string' && knownGroupIds.has(rawGroupId)
              ? rawGroupId
              : fallbackGroupId
          const groupId: PaneGroupId = knownGroupIds.has(candidateGroupId)
            ? candidateGroupId
            : fallbackGroupId
          return {
            preset: view.preset,
            url: view.url,
            projectId,
            groupId
          }
        })
    }
  } catch {
    return null
  }
}

export function writeWorkspace(path: string, workspace: PersistedWorkspace): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(workspace, null, 2)}\n`, 'utf8')
}
