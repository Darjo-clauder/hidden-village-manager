import { describe, it, expect } from 'vitest'
import { NATIONS, nationIdentity, isValidNation } from '../shared/constants/nations.js'

// WCAG AA contrast vs the game's dark surface (mirrors scripts/hudContrast.mjs).
const BG = '#0d0d0f'
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const lum = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]; return (hi + 0.05) / (lo + 0.05) }

describe('NATIONS palette', () => {
  it('has all 5 nations with required fields', () => {
    expect(Object.keys(NATIONS)).toHaveLength(5)
    for (const n of Object.values(NATIONS)) {
      expect(n.name).toBeTruthy()
      expect(n.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(n.pattern).toBeTruthy() // colorblind cue, never color-only
    }
  })
  it('every accent meets WCAG AA (>=4.5:1) on the dark surface', () => {
    for (const [id, n] of Object.entries(NATIONS))
      expect(ratio(n.accent, BG), `${id} accent ${n.accent}`).toBeGreaterThanOrEqual(4.5)
  })
  it('patterns are distinct across nations (colorblind disambiguation)', () => {
    const pats = Object.values(NATIONS).map(n => n.pattern)
    expect(new Set(pats).size).toBe(pats.length)
  })
})

describe('nationIdentity (I-NAT-1)', () => {
  it('returns the identity for a known id', () => {
    expect(nationIdentity('ember').name).toBe('Ember')
  })
  it('falls back to a neutral identity for unknown id', () => {
    const n = nationIdentity('atlantis')
    expect(n.name).toBe('Neutral')
    expect(n.accent).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

describe('isValidNation', () => {
  it('true for real nations', () => {
    for (const id of Object.keys(NATIONS)) expect(isValidNation(id)).toBe(true)
  })
  it('false for unknown / falsy', () => {
    expect(isValidNation('atlantis')).toBe(false)
    expect(isValidNation(undefined)).toBe(false)
  })
})
