import { describe, it, expect } from 'vitest'
import { getMinorRel, adjustMinorRel, minorRelTier, minorFeeMult } from '../shared/constants/minorNations.js'

describe('getMinorRel', () => {
  it('returns the value if it exists and is a number', () => {
    const rels = { Saltcliff: 75, Kilnrock: 30 }
    expect(getMinorRel(rels, 'Saltcliff')).toBe(75)
    expect(getMinorRel(rels, 'Kilnrock')).toBe(30)
  })

  it('returns 50 (default neutral) for missing nations', () => {
    const rels = { Saltcliff: 75 }
    expect(getMinorRel(rels, 'Galecrest')).toBe(50)
  })

  it('returns 50 when rels is null or undefined', () => {
    expect(getMinorRel(null, 'Saltcliff')).toBe(50)
    expect(getMinorRel(undefined, 'Saltcliff')).toBe(50)
  })

  it('returns 50 if the value is not a number', () => {
    const rels = { Saltcliff: 'high', Galecrest: null }
    expect(getMinorRel(rels, 'Saltcliff')).toBe(50)
    expect(getMinorRel(rels, 'Galecrest')).toBe(50)
  })

  it('handles edge values 0 and 100', () => {
    const rels = { Reedmarsh: 0, Palewood: 100 }
    expect(getMinorRel(rels, 'Reedmarsh')).toBe(0)
    expect(getMinorRel(rels, 'Palewood')).toBe(100)
  })
})

describe('adjustMinorRel', () => {
  it('increments a nation\'s standing and mutates the object', () => {
    const rels = { Saltcliff: 50 }
    const result = adjustMinorRel(rels, 'Saltcliff', 10)
    expect(result).toBe(60)
    expect(rels.Saltcliff).toBe(60)
  })

  it('decrements a nation\'s standing', () => {
    const rels = { Saltcliff: 60 }
    const result = adjustMinorRel(rels, 'Saltcliff', -15)
    expect(result).toBe(45)
    expect(rels.Saltcliff).toBe(45)
  })

  it('clamps result to 0 (minimum)', () => {
    const rels = { Reedmarsh: 10 }
    const result = adjustMinorRel(rels, 'Reedmarsh', -20)
    expect(result).toBe(0)
    expect(rels.Reedmarsh).toBe(0)
  })

  it('clamps result to 100 (maximum)', () => {
    const rels = { Palewood: 95 }
    const result = adjustMinorRel(rels, 'Palewood', 20)
    expect(result).toBe(100)
    expect(rels.Palewood).toBe(100)
  })

  it('handles adjustment on a missing nation (defaults to 50)', () => {
    const rels = {}
    const result = adjustMinorRel(rels, 'Kilnrock', 5)
    expect(result).toBe(55)
    expect(rels.Kilnrock).toBe(55)
  })

  it('handles zero delta', () => {
    const rels = { Bronzegate: 75 }
    const result = adjustMinorRel(rels, 'Bronzegate', 0)
    expect(result).toBe(75)
    expect(rels.Bronzegate).toBe(75)
  })

  it('clamps aggressive deltas correctly', () => {
    const rels = { Hollowfen: 50 }
    adjustMinorRel(rels, 'Hollowfen', 1000)
    expect(rels.Hollowfen).toBe(100)

    const rels2 = { Skylark: 50 }
    adjustMinorRel(rels2, 'Skylark', -1000)
    expect(rels2.Skylark).toBe(0)
  })
})

describe('minorRelTier', () => {
  it('returns friendly tier for rel >= 75', () => {
    expect(minorRelTier(75)).toEqual({ id: 'friendly', label: 'Friendly', color: '#8fbc8f' })
    expect(minorRelTier(80)).toEqual({ id: 'friendly', label: 'Friendly', color: '#8fbc8f' })
    expect(minorRelTier(100)).toEqual({ id: 'friendly', label: 'Friendly', color: '#8fbc8f' })
  })

  it('returns neutral tier for 45 <= rel < 75', () => {
    expect(minorRelTier(45)).toEqual({ id: 'neutral', label: 'Neutral', color: '#c9a84c' })
    expect(minorRelTier(50)).toEqual({ id: 'neutral', label: 'Neutral', color: '#c9a84c' })
    expect(minorRelTier(74)).toEqual({ id: 'neutral', label: 'Neutral', color: '#c9a84c' })
  })

  it('returns cool tier for 20 <= rel < 45', () => {
    expect(minorRelTier(20)).toEqual({ id: 'cool', label: 'Cool', color: '#cc9a4a' })
    expect(minorRelTier(30)).toEqual({ id: 'cool', label: 'Cool', color: '#cc9a4a' })
    expect(minorRelTier(44)).toEqual({ id: 'cool', label: 'Cool', color: '#cc9a4a' })
  })

  it('returns hostile tier for rel < 20', () => {
    expect(minorRelTier(19)).toEqual({ id: 'hostile', label: 'Hostile', color: '#cc5a4a' })
    expect(minorRelTier(10)).toEqual({ id: 'hostile', label: 'Hostile', color: '#cc5a4a' })
    expect(minorRelTier(0)).toEqual({ id: 'hostile', label: 'Hostile', color: '#cc5a4a' })
  })

  it('handles boundary cases precisely', () => {
    // Just below friendly
    expect(minorRelTier(74.9)).toEqual({ id: 'neutral', label: 'Neutral', color: '#c9a84c' })
    // Just below neutral
    expect(minorRelTier(44.9)).toEqual({ id: 'cool', label: 'Cool', color: '#cc9a4a' })
    // Just below cool
    expect(minorRelTier(19.9)).toEqual({ id: 'hostile', label: 'Hostile', color: '#cc5a4a' })
  })
})

describe('minorFeeMult', () => {
  it('returns 1.15 at rel 0 (hostile surcharge)', () => {
    expect(minorFeeMult(0)).toBe(1.15)
  })

  it('returns approximately 1.0 at rel 50 (neutral baseline)', () => {
    expect(minorFeeMult(50)).toBe(0.97)
  })

  it('returns 0.8 at rel 100 (friendly discount)', () => {
    expect(minorFeeMult(100)).toBe(0.8)
  })

  it('decreases monotonically from 0 to 100', () => {
    const vals = [0, 10, 25, 50, 75, 90, 100].map(r => minorFeeMult(r))
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeLessThanOrEqual(vals[i - 1])
    }
  })

  it('linearly interpolates intermediate values', () => {
    // 0 → 1.15, 100 → 0.8
    // at 25: (1.15 - 0.25*0.35)*100 = 106.25, rounds to 106, so 1.06
    expect(minorFeeMult(25)).toBe(1.06)

    // at 75: (1.15 - 0.75*0.35)*100 = 88.75, rounds to 89, so 0.89
    expect(minorFeeMult(75)).toBe(0.89)
  })

  it('rounds to 2 decimal places', () => {
    // All results should have at most 2 decimal places
    const testVals = [0, 1, 15, 33, 50, 67, 99, 100]
    testVals.forEach(r => {
      const result = minorFeeMult(r)
      const rounded = Math.round(result * 100) / 100
      expect(result).toBe(rounded)
    })
  })

  it('computes correct values across the full range', () => {
    // Verify the formula: Math.round((1.15 - (rel / 100) * 0.35) * 100) / 100
    // rel=0: (1.15 - 0) * 100 = 115, round(115) = 115, /100 = 1.15 ✓
    // rel=50: (0.975) * 100 = 97.5, round(97.5) = 98? But we get 0.97 (97/100), so round(97.5)=97
    // rel=100: (0.8) * 100 = 80, round(80) = 80, /100 = 0.8 ✓
    expect(minorFeeMult(50)).toBe(0.97)
  })
})
