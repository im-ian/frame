import type { DevicePreset } from './types'

const SAFARI_IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const SAFARI_IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export const DEFAULT_PRESETS: DevicePreset[] = [
  { id: 'desktop-1440', label: 'Desktop 1440', width: 1440, height: 900, dpr: 1, mobile: false, userAgent: DESKTOP_UA },
  { id: 'ipad', label: 'iPad', width: 768, height: 1024, dpr: 2, mobile: true, userAgent: SAFARI_IPAD_UA },
  { id: 'iphone-14', label: 'iPhone 14', width: 390, height: 844, dpr: 3, mobile: true, userAgent: SAFARI_IPHONE_UA },
]

export function findPreset(id: string): DevicePreset | undefined {
  return DEFAULT_PRESETS.find((p) => p.id === id)
}

let customCounter = 0

export function parseCustomPreset(label: string, width: number, height: number): DevicePreset {
  if (width <= 0 || height <= 0) {
    throw new Error('Custom preset dimensions must be positive')
  }
  customCounter += 1
  return {
    id: `custom-${customCounter}`,
    label,
    width,
    height,
    dpr: 1,
    mobile: false,
    userAgent: DESKTOP_UA,
  }
}
