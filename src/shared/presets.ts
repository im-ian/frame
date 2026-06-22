import type { DevicePreset } from './types'

const SAFARI_IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const SAFARI_IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const CHROME_ANDROID_PHONE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
const CHROME_ANDROID_TABLET_UA =
  'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
const DESKTOP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export interface DevicePresetGroup {
  label: string
  presets: DevicePreset[]
}

export const DEFAULT_PRESET_GROUPS: DevicePresetGroup[] = [
  {
    label: 'Phones',
    presets: [
      {
        id: 'iphone-se-3',
        label: 'iPhone SE',
        width: 375,
        height: 667,
        dpr: 2,
        mobile: true,
        userAgent: SAFARI_IPHONE_UA
      },
      {
        id: 'iphone-13-mini',
        label: 'iPhone 13 Mini',
        width: 375,
        height: 812,
        dpr: 3,
        mobile: true,
        userAgent: SAFARI_IPHONE_UA
      },
      {
        id: 'iphone-14',
        label: 'iPhone 14',
        width: 390,
        height: 844,
        dpr: 3,
        mobile: true,
        userAgent: SAFARI_IPHONE_UA
      },
      {
        id: 'iphone-15-pro',
        label: 'iPhone 15 Pro',
        width: 393,
        height: 852,
        dpr: 3,
        mobile: true,
        userAgent: SAFARI_IPHONE_UA
      },
      {
        id: 'iphone-15-pro-max',
        label: 'iPhone 15 Pro Max',
        width: 430,
        height: 932,
        dpr: 3,
        mobile: true,
        userAgent: SAFARI_IPHONE_UA
      },
      {
        id: 'galaxy-s24',
        label: 'Galaxy S24',
        width: 360,
        height: 780,
        dpr: 3,
        mobile: true,
        userAgent: CHROME_ANDROID_PHONE_UA
      },
      {
        id: 'galaxy-s24-ultra',
        label: 'Galaxy S24 Ultra',
        width: 384,
        height: 854,
        dpr: 3.5,
        mobile: true,
        userAgent: CHROME_ANDROID_PHONE_UA
      },
      {
        id: 'pixel-8',
        label: 'Pixel 8',
        width: 412,
        height: 915,
        dpr: 2.625,
        mobile: true,
        userAgent: CHROME_ANDROID_PHONE_UA
      },
      {
        id: 'pixel-8-pro',
        label: 'Pixel 8 Pro',
        width: 448,
        height: 998,
        dpr: 3,
        mobile: true,
        userAgent: CHROME_ANDROID_PHONE_UA
      },
      {
        id: 'galaxy-z-fold-5',
        label: 'Galaxy Z Fold 5',
        width: 344,
        height: 882,
        dpr: 3,
        mobile: true,
        userAgent: CHROME_ANDROID_PHONE_UA
      }
    ]
  },
  {
    label: 'Tablets',
    presets: [
      {
        id: 'ipad-mini',
        label: 'iPad Mini',
        width: 744,
        height: 1133,
        dpr: 2,
        mobile: true,
        userAgent: SAFARI_IPAD_UA
      },
      {
        id: 'ipad',
        label: 'iPad',
        width: 768,
        height: 1024,
        dpr: 2,
        mobile: true,
        userAgent: SAFARI_IPAD_UA
      },
      {
        id: 'ipad-air-11',
        label: 'iPad Air 11',
        width: 820,
        height: 1180,
        dpr: 2,
        mobile: true,
        userAgent: SAFARI_IPAD_UA
      },
      {
        id: 'ipad-pro-11',
        label: 'iPad Pro 11',
        width: 834,
        height: 1194,
        dpr: 2,
        mobile: true,
        userAgent: SAFARI_IPAD_UA
      },
      {
        id: 'ipad-pro-129',
        label: 'iPad Pro 12.9',
        width: 1024,
        height: 1366,
        dpr: 2,
        mobile: true,
        userAgent: SAFARI_IPAD_UA
      },
      {
        id: 'galaxy-tab-s9',
        label: 'Galaxy Tab S9',
        width: 800,
        height: 1280,
        dpr: 2,
        mobile: true,
        userAgent: CHROME_ANDROID_TABLET_UA
      }
    ]
  },
  {
    label: 'Laptops',
    presets: [
      {
        id: 'laptop-1366',
        label: 'Laptop 1366',
        width: 1366,
        height: 768,
        dpr: 1,
        mobile: false,
        userAgent: DESKTOP_UA
      },
      {
        id: 'macbook-air-13',
        label: 'MacBook Air 13',
        width: 1280,
        height: 832,
        dpr: 2,
        mobile: false,
        userAgent: DESKTOP_UA
      },
      {
        id: 'macbook-pro-14',
        label: 'MacBook Pro 14',
        width: 1512,
        height: 982,
        dpr: 2,
        mobile: false,
        userAgent: DESKTOP_UA
      },
      {
        id: 'macbook-pro-16',
        label: 'MacBook Pro 16',
        width: 1728,
        height: 1117,
        dpr: 2,
        mobile: false,
        userAgent: DESKTOP_UA
      }
    ]
  },
  {
    label: 'Desktops',
    presets: [
      {
        id: 'desktop-1024',
        label: 'Desktop 1024',
        width: 1024,
        height: 768,
        dpr: 1,
        mobile: false,
        userAgent: DESKTOP_UA
      },
      {
        id: 'desktop-1280',
        label: 'Desktop 1280',
        width: 1280,
        height: 720,
        dpr: 1,
        mobile: false,
        userAgent: DESKTOP_UA
      },
      {
        id: 'desktop-1440',
        label: 'Desktop 1440',
        width: 1440,
        height: 900,
        dpr: 1,
        mobile: false,
        userAgent: DESKTOP_UA
      },
      {
        id: 'desktop-1536',
        label: 'Desktop 1536',
        width: 1536,
        height: 864,
        dpr: 1,
        mobile: false,
        userAgent: DESKTOP_UA
      },
      {
        id: 'desktop-1920',
        label: 'Desktop 1920',
        width: 1920,
        height: 1080,
        dpr: 1,
        mobile: false,
        userAgent: DESKTOP_UA
      },
      {
        id: 'desktop-2560',
        label: 'Desktop 2560',
        width: 2560,
        height: 1440,
        dpr: 1,
        mobile: false,
        userAgent: DESKTOP_UA
      }
    ]
  }
]

export const DEFAULT_PRESETS: DevicePreset[] = DEFAULT_PRESET_GROUPS.flatMap(
  (group) => group.presets
)

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
    userAgent: DESKTOP_UA
  }
}
