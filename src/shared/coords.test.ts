import { describe, it, expect } from 'vitest'
import { toFraction, fromFraction } from './coords'

describe('toFraction', () => {
  it('maps a pixel value to a 0..1 fraction of the extent', () => {
    expect(toFraction(50, 200)).toBe(0.25)
  })
  it('clamps out-of-range values', () => {
    expect(toFraction(-10, 200)).toBe(0)
    expect(toFraction(500, 200)).toBe(1)
  })
  it('returns 0 when extent is 0 (avoids divide-by-zero)', () => {
    expect(toFraction(50, 0)).toBe(0)
  })
})

describe('fromFraction', () => {
  it('maps a fraction back to a rounded pixel value on the target extent', () => {
    expect(fromFraction(0.25, 800)).toBe(200)
  })
  it('clamps and rounds', () => {
    expect(fromFraction(1.5, 800)).toBe(800)
    expect(fromFraction(-0.2, 800)).toBe(0)
    expect(fromFraction(0.3334, 1000)).toBe(333)
  })
})
