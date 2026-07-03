import { describe, it, expect } from 'vitest'
import { eraFor, nextShiftIn, transitionLine } from '../shared/constants/worldEras.js'
import { mulberry32 } from './helpers/rng.js'

describe('eraFor — known combos and fallback', () => {
  it('boom|calm returns "A Golden Age" with prosperity blurb', () => {
    const era = eraFor('boom', 'calm')
    expect(era.name).toBe('A Golden Age')
    expect(era.blurb).toBe('Prosperity and peace — the village has never had it so good.')
  })

  it('recession|volatile returns "The Age of Ash" with endurance blurb', () => {
    const era = eraFor('recession', 'volatile')
    expect(era.name).toBe('The Age of Ash')
    expect(era.blurb).toBe('Poverty and violence together — the village must endure.')
  })

  it('known combos return distinct, non-empty names and blurbs', () => {
    const combos = [
      ['boom', 'calm'],
      ['boom', 'tense'],
      ['boom', 'volatile'],
      ['stable', 'calm'],
      ['stable', 'tense'],
      ['stable', 'volatile'],
      ['recession', 'calm'],
      ['recession', 'tense'],
      ['recession', 'volatile'],
    ]
    const names = new Set()
    combos.forEach(([econ, threat]) => {
      const era = eraFor(econ, threat)
      expect(era.name.length).toBeGreaterThan(0)
      expect(era.blurb.length).toBeGreaterThan(0)
      names.add(era.name)
    })
    expect(names.size).toBe(9)
  })

  it('unknown combo returns "A New Era" fallback with wind-shift blurb', () => {
    const era = eraFor('unknown', 'combo')
    expect(era.name).toBe('A New Era')
    expect(era.blurb).toBe('The winds of the world shift.')
  })

  it('result always has name and blurb properties', () => {
    const era = eraFor('unknown', 'unknown')
    expect(era).toHaveProperty('name')
    expect(era).toHaveProperty('blurb')
    expect(typeof era.name).toBe('string')
    expect(typeof era.blurb).toBe('string')
  })
})

describe('nextShiftIn — range and distribution', () => {
  it('stays within [4, 6] bounds over 1000 samples', () => {
    const rng = mulberry32(42)
    for (let i = 0; i < 1000; i++) {
      const shift = nextShiftIn(rng)
      expect(shift).toBeGreaterThanOrEqual(4)
      expect(shift).toBeLessThanOrEqual(6)
      expect(Number.isInteger(shift)).toBe(true)
    }
  })

  it('produces all three values 4, 5, 6 across enough samples', () => {
    const rng = mulberry32(7)
    const seen = new Set()
    for (let i = 0; i < 300; i++) {
      seen.add(nextShiftIn(rng))
    }
    expect(seen.has(4)).toBe(true)
    expect(seen.has(5)).toBe(true)
    expect(seen.has(6)).toBe(true)
    expect(seen.size).toBe(3)
  })

  it('uses default Math.random when rng not provided', () => {
    const shift = nextShiftIn()
    expect(shift).toBeGreaterThanOrEqual(4)
    expect(shift).toBeLessThanOrEqual(6)
  })
})

describe('transitionLine — prev state and formatting', () => {
  it('null prev generates "dawns" form with name and blurb', () => {
    const next = { name: 'A Golden Age', blurb: 'Prosperity and peace.' }
    const line = transitionLine(null, next)
    expect(line).toBe('A Golden Age dawns. Prosperity and peace.')
  })

  it('non-null prev generates "gives way to" form with name and blurb', () => {
    const next = { name: 'The Long Peace', blurb: 'Quiet years.' }
    const line = transitionLine('The Grinding Years', next)
    expect(line).toBe('The Grinding Years gives way to The Long Peace. Quiet years.')
  })

  it('includes full blurb text after period', () => {
    const longBlurb = 'This is a longer blurb with multiple words and commas, and even more detail.'
    const next = { name: 'An Era', blurb: longBlurb }
    const line = transitionLine('Previous Era', next)
    expect(line).toContain(longBlurb)
    expect(line).toContain('gives way to')
  })

  it('first era (null prev) uses different wording than subsequent transitions', () => {
    const era = { name: 'Starter Era', blurb: 'First blurb.' }
    const firstLine = transitionLine(null, era)
    const nextLine = transitionLine('Starter Era', { name: 'Second Era', blurb: 'Second blurb.' })
    expect(firstLine).toContain('dawns')
    expect(nextLine).toContain('gives way to')
    expect(firstLine).not.toContain('gives way to')
    expect(nextLine).not.toContain('dawns')
  })
})
