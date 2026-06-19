function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function toFraction(value: number, extent: number): number {
  if (extent <= 0) return 0
  return clamp(value / extent, 0, 1)
}

export function fromFraction(fraction: number, extent: number): number {
  return clamp(Math.round(clamp(fraction, 0, 1) * extent), 0, extent)
}
