import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { DevicePreset } from '../../shared/types'

export interface PersistedWorkspaceView {
  preset: DevicePreset
  url: string
}

export interface PersistedWorkspace {
  version: 1
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
    return {
      version: 1,
      views: parsed.views
        .filter(
          (view): view is PersistedWorkspaceView =>
            Boolean(view) &&
            typeof view === 'object' &&
            isPreset((view as Partial<PersistedWorkspaceView>).preset) &&
            typeof (view as Partial<PersistedWorkspaceView>).url === 'string'
        )
        .map((view) => ({ preset: view.preset, url: view.url }))
    }
  } catch {
    return null
  }
}

export function writeWorkspace(path: string, workspace: PersistedWorkspace): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(workspace, null, 2)}\n`, 'utf8')
}
