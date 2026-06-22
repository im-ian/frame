import { describe, it, expect } from 'vitest'
import { DEFAULT_PRESET_GROUPS, DEFAULT_PRESETS, findPreset, parseCustomPreset } from './presets'

describe('DEFAULT_PRESETS', () => {
  it('includes desktop, tablet, and mobile presets with unique ids', () => {
    const ids = DEFAULT_PRESETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['desktop-1440', 'ipad', 'iphone-14']))
    expect(ids.length).toBeGreaterThanOrEqual(20)
  })

  it('mobile presets carry a mobile flag and a Mobile UA', () => {
    const iphone = findPreset('iphone-14')!
    expect(iphone.mobile).toBe(true)
    expect(iphone.userAgent).toMatch(/Mobile/)
    expect(iphone.dpr).toBeGreaterThan(1)
  })
})

describe('DEFAULT_PRESET_GROUPS', () => {
  it('groups presets under select headers', () => {
    expect(DEFAULT_PRESET_GROUPS.map((group) => group.label)).toEqual([
      'Phones',
      'Tablets',
      'Laptops',
      'Desktops'
    ])
    expect(DEFAULT_PRESET_GROUPS.every((group) => group.presets.length > 0)).toBe(true)
    expect(DEFAULT_PRESET_GROUPS.flatMap((group) => group.presets)).toEqual(DEFAULT_PRESETS)
  })
})

describe('findPreset', () => {
  it('returns undefined for an unknown id', () => {
    expect(findPreset('nope')).toBeUndefined()
  })
})

describe('parseCustomPreset', () => {
  it('builds a desktop-style preset from label + dimensions', () => {
    const p = parseCustomPreset('My View', 1000, 700)
    expect(p).toMatchObject({ label: 'My View', width: 1000, height: 700, mobile: false, dpr: 1 })
    expect(p.id).toMatch(/^custom-/)
  })

  it('throws on non-positive dimensions', () => {
    expect(() => parseCustomPreset('Bad', 0, 700)).toThrow(/positive/i)
    expect(() => parseCustomPreset('Bad', 800, -1)).toThrow(/positive/i)
  })
})
