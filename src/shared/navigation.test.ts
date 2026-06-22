import { describe, expect, it } from 'vitest'
import { normalizeNavigationUrl } from './navigation'

describe('normalizeNavigationUrl', () => {
  it('keeps absolute and special URLs unchanged', () => {
    expect(normalizeNavigationUrl('https://example.com')).toBe('https://example.com')
    expect(normalizeNavigationUrl('http://example.com')).toBe('http://example.com')
    expect(normalizeNavigationUrl('about:blank')).toBe('about:blank')
    expect(normalizeNavigationUrl('data:text/html,<h1>ok</h1>')).toBe('data:text/html,<h1>ok</h1>')
  })

  it('defaults ordinary host input to https', () => {
    expect(normalizeNavigationUrl('google.com')).toBe('https://google.com')
    expect(normalizeNavigationUrl('www.google.com/search?q=frame')).toBe(
      'https://www.google.com/search?q=frame'
    )
  })

  it('uses http for local development hosts', () => {
    expect(normalizeNavigationUrl('localhost:5173')).toBe('http://localhost:5173')
    expect(normalizeNavigationUrl('127.0.0.1:3000/page')).toBe('http://127.0.0.1:3000/page')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeNavigationUrl('  google.com  ')).toBe('https://google.com')
  })
})
