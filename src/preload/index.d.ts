import type { FrameApi } from './index'

declare global {
  interface Window {
    frame: FrameApi
  }
}
