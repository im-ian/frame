import type { View } from 'electron'
import { randomUUID } from 'crypto'
import type {
  DevicePreset,
  PaneGroupId,
  PaneGroupState,
  ProjectId,
  ProjectState,
  ViewId,
  ViewState,
  WorkspaceState
} from '../../shared/types'
import {
  DEFAULT_GROUP_ID,
  DEFAULT_PROJECT_ID,
  type PersistedWorkspace
} from '../workspace/persistence'
import { ChromiumView } from './ChromiumView'

export class ViewRegistry {
  private readonly parent: View
  private readonly views = new Map<ViewId, ChromiumView>()
  private readonly viewProjects = new Map<ViewId, ProjectId>()
  private readonly viewGroups = new Map<ViewId, PaneGroupId>()
  private readonly projects = new Map<ProjectId, ProjectState>()
  private readonly groups = new Map<PaneGroupId, PaneGroupState>()
  private onViewNavigated: ((state: ViewState) => void) | null = null
  private onAdded: ((view: ChromiumView) => void) | null = null
  private navigateAllDepth = 0
  private navigateAllUrl: string | null = null
  private readonly navigatingGroups = new Map<PaneGroupId, { url: string; depth: number }>()

  constructor(parent: View) {
    this.parent = parent
    const project = this.ensureProject(DEFAULT_PROJECT_ID, 'Project 1')
    this.ensureGroup(DEFAULT_GROUP_ID, project.id, 'Group 1')
  }

  setNavigationListener(cb: (state: ViewState) => void): void {
    this.onViewNavigated = cb
  }

  setAddedListener(cb: (view: ChromiumView) => void): void {
    this.onAdded = cb
  }

  addProject(name?: string, id: ProjectId = randomUUID()): ProjectState {
    const project = this.ensureProject(id, name ?? `Project ${this.projects.size + 1}`)
    if (!this.groupStates(project.id).length) {
      this.ensureGroup(randomUUID(), project.id, 'Group 1')
    }
    return project
  }

  getProject(id: ProjectId): ProjectState | undefined {
    return this.projects.get(id)
  }

  projectForView(id: ViewId): ProjectId | undefined {
    return this.viewProjects.get(id)
  }

  projectStates(): ProjectState[] {
    return [...this.projects.values()]
  }

  addGroup(
    projectId: ProjectId = DEFAULT_PROJECT_ID,
    name?: string,
    id: PaneGroupId = randomUUID(),
    url = 'about:blank'
  ): PaneGroupState {
    const project =
      this.projects.get(projectId) ?? this.ensureProject(DEFAULT_PROJECT_ID, 'Project 1')
    return this.ensureGroup(
      id,
      project.id,
      name ?? `Group ${this.groupStates(project.id).length + 1}`,
      url
    )
  }

  getGroup(id: PaneGroupId): PaneGroupState | undefined {
    return this.groups.get(id)
  }

  groupForView(id: ViewId): PaneGroupId | undefined {
    return this.viewGroups.get(id)
  }

  groupStates(projectId?: ProjectId): PaneGroupState[] {
    const groups = [...this.groups.values()]
    return projectId ? groups.filter((group) => group.projectId === projectId) : groups
  }

  resetWorkspace(projects: ProjectState[], groups: PaneGroupState[]): void {
    this.projects.clear()
    this.groups.clear()
    for (const project of projects) {
      this.ensureProject(project.id, project.name)
    }
    if (this.projects.size === 0) {
      this.ensureProject(DEFAULT_PROJECT_ID, 'Project 1')
    }
    for (const group of groups) {
      this.ensureGroup(group.id, group.projectId, group.name, group.url)
    }
    for (const project of this.projectStates()) {
      if (!this.groupStates(project.id).length)
        this.ensureGroup(randomUUID(), project.id, 'Group 1')
    }
  }

  add(preset: DevicePreset, groupId: PaneGroupId = DEFAULT_GROUP_ID): ChromiumView {
    const group = this.groups.get(groupId) ?? this.addGroup(DEFAULT_PROJECT_ID)
    const view = new ChromiumView(this.parent, preset)
    this.views.set(view.id, view)
    this.viewProjects.set(view.id, group.projectId)
    this.viewGroups.set(view.id, group.id)
    view.onNavigated(() => {
      this.updateGroupUrl(view.id, view.lastUrl)
      this.onViewNavigated?.(this.stateFor(view))
    })
    this.onAdded?.(view)
    return view
  }

  remove(id: ViewId): void {
    const view = this.views.get(id)
    if (!view) return
    view.destroy()
    this.views.delete(id)
    this.viewProjects.delete(id)
    this.viewGroups.delete(id)
  }

  get(id: ViewId): ChromiumView | undefined {
    return this.views.get(id)
  }

  list(): ChromiumView[] {
    return [...this.views.values()]
  }

  listByProject(projectId: ProjectId): ChromiumView[] {
    return this.list().filter((view) => this.viewProjects.get(view.id) === projectId)
  }

  listByGroup(groupId: PaneGroupId): ChromiumView[] {
    return this.list().filter((view) => this.viewGroups.get(view.id) === groupId)
  }

  states(): ViewState[] {
    return this.list().map((v) => this.stateFor(v))
  }

  workspaceState(): WorkspaceState {
    return {
      projects: this.projectStates(),
      groups: this.groupStates(),
      views: this.states()
    }
  }

  workspace(): PersistedWorkspace {
    return {
      version: 1,
      projects: this.projectStates(),
      groups: this.groupStates(),
      views: this.list().map((v) => ({
        preset: v.preset,
        url: v.lastUrl || 'about:blank',
        projectId: this.viewProjects.get(v.id) ?? DEFAULT_PROJECT_ID,
        groupId: this.viewGroups.get(v.id) ?? DEFAULT_GROUP_ID
      }))
    }
  }

  async goBack(id: ViewId): Promise<void> {
    await this.views.get(id)?.goBack()
  }

  async goForward(id: ViewId): Promise<void> {
    await this.views.get(id)?.goForward()
  }

  async reload(id: ViewId): Promise<void> {
    await this.views.get(id)?.reload()
  }

  setNativeViewsOccluded(occluded: boolean): void {
    for (const view of this.list()) view.setOccluded(occluded)
  }

  isNavigatingAll(url: string): boolean {
    return this.navigateAllDepth > 0 && this.navigateAllUrl === url
  }

  isNavigatingGroup(groupId: PaneGroupId, url: string): boolean {
    const state = this.navigatingGroups.get(groupId)
    return Boolean(state && state.depth > 0 && state.url === url)
  }

  private stateFor(v: ChromiumView): ViewState {
    return {
      id: v.id,
      projectId: this.viewProjects.get(v.id) ?? DEFAULT_PROJECT_ID,
      groupId: this.viewGroups.get(v.id) ?? DEFAULT_GROUP_ID,
      presetId: v.presetId,
      width: v.width,
      height: v.height,
      url: v.lastUrl,
      canGoBack: v.canGoBack,
      canGoForward: v.canGoForward
    }
  }

  private ensureProject(id: ProjectId, name: string): ProjectState {
    const existing = this.projects.get(id)
    if (existing) return existing
    const project = { id, name }
    this.projects.set(id, project)
    return project
  }

  private ensureGroup(
    id: PaneGroupId,
    projectId: ProjectId,
    name: string,
    url = 'about:blank'
  ): PaneGroupState {
    const existing = this.groups.get(id)
    if (existing) return existing
    const project =
      this.projects.get(projectId) ?? this.ensureProject(DEFAULT_PROJECT_ID, 'Project 1')
    const group = { id, projectId: project.id, name, url }
    this.groups.set(id, group)
    return group
  }

  private updateGroupUrl(viewId: ViewId, url: string): void {
    if (!url || url === 'about:blank') return
    const groupId = this.viewGroups.get(viewId)
    if (!groupId) return
    const group = this.groups.get(groupId)
    if (!group || group.url === url) return
    this.groups.set(groupId, { ...group, url })
  }

  private async loadViews(views: ChromiumView[], url: string): Promise<void> {
    const results = await Promise.allSettled(views.map((view) => view.loadURL(url)))
    const failure = results.find(
      (result) => result.status === 'rejected' && !this.isNavigationAbort(result.reason)
    )
    if (failure?.status === 'rejected') throw failure.reason
  }

  private isNavigationAbort(reason: unknown): boolean {
    return reason instanceof Error && reason.message.includes('ERR_ABORTED')
  }

  async navigateAll(url: string): Promise<void> {
    this.navigateAllDepth += 1
    this.navigateAllUrl = url
    try {
      await this.loadViews(this.list(), url)
    } finally {
      this.navigateAllDepth -= 1
      if (this.navigateAllDepth === 0) this.navigateAllUrl = null
    }
  }

  async navigateGroup(groupId: PaneGroupId, url: string): Promise<void> {
    const group = this.groups.get(groupId)
    if (!group) throw new Error(`unknown group id: ${groupId}`)
    const current = this.navigatingGroups.get(groupId)
    this.navigatingGroups.set(groupId, { url, depth: (current?.depth ?? 0) + 1 })
    this.groups.set(groupId, { ...group, url })
    try {
      await this.loadViews(this.listByGroup(groupId), url)
    } finally {
      const next = this.navigatingGroups.get(groupId)
      if (next && next.depth <= 1) {
        this.navigatingGroups.delete(groupId)
      } else if (next) {
        this.navigatingGroups.set(groupId, { ...next, depth: next.depth - 1 })
      }
    }
  }

  destroyAll(): void {
    for (const v of this.list()) v.destroy()
    this.views.clear()
    this.viewProjects.clear()
    this.viewGroups.clear()
  }
}
