import { session, type Session } from 'electron'

export const FRAME_PARTITION = 'persist:frame'

export function getFrameSession(): Session {
  return session.fromPartition(FRAME_PARTITION)
}

export async function clearFrameSession(): Promise<void> {
  await getFrameSession().clearData({ dataTypes: ['cookies', 'localStorage'] })
}
