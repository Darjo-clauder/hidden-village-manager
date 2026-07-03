import { describe, it, expect } from 'vitest'
import {
  COLLAPSE_STRENGTH,
  COLLAPSE_YEARS,
  nextDeclineYears,
  findRelegation,
  pickPromotion,
} from '../shared/utils/leagueMembership.js'

describe('nextDeclineYears', () => {
  it('increments when strength is at or under the collapse line', () => {
    expect(nextDeclineYears(0, COLLAPSE_STRENGTH)).toBe(1)
    expect(nextDeclineYears(2, COLLAPSE_STRENGTH - 1)).toBe(3)
  })

  it('resets to 0 once strength recovers above the line', () => {
    expect(nextDeclineYears(5, COLLAPSE_STRENGTH + 1)).toBe(0)
  })

  it('respects a custom line argument', () => {
    expect(nextDeclineYears(1, 40, 40)).toBe(2)
    expect(nextDeclineYears(1, 41, 40)).toBe(0)
  })

  it('treats a missing prev as 0', () => {
    expect(nextDeclineYears(undefined, COLLAPSE_STRENGTH)).toBe(1)
    expect(nextDeclineYears(null, COLLAPSE_STRENGTH)).toBe(1)
  })
})

describe('findRelegation', () => {
  it('returns null when no village has enough decline years', () => {
    const villages = [
      { n: 'A', strength: 10, declineYears: 1 },
      { n: 'B', strength: 5, declineYears: 2 },
    ]
    expect(findRelegation(villages)).toBeNull()
  })

  it('among multiple eligible villages, returns the weakest by strength', () => {
    const villages = [
      { n: 'A', strength: 20, declineYears: 3 },
      { n: 'B', strength: 5, declineYears: 4 },
      { n: 'C', strength: 15, declineYears: 3 },
    ]
    expect(findRelegation(villages).n).toBe('B')
  })

  it('supports a custom years threshold', () => {
    const villages = [
      { n: 'A', strength: 10, declineYears: 2 },
      { n: 'B', strength: 1, declineYears: 1 },
    ]
    expect(findRelegation(villages, 2).n).toBe('A')
    expect(findRelegation(villages, 3)).toBeNull()
  })

  it('ignores villages under the threshold even if weak', () => {
    const villages = [
      { n: 'Weakest', strength: 1, declineYears: 1 },
      { n: 'Eligible', strength: 30, declineYears: 3 },
    ]
    expect(findRelegation(villages).n).toBe('Eligible')
  })
})

describe('pickPromotion', () => {
  const strengthOf = n => n.pow

  it('skips tier-D nations and picks the strongest tier-C', () => {
    const minorNations = [
      { n: 'Weak', tier: 'C', pow: 10 },
      { n: 'Strong', tier: 'C', pow: 50 },
      { n: 'Excluded', tier: 'D', pow: 999 },
    ]
    expect(pickPromotion(minorNations, [], strengthOf).n).toBe('Strong')
  })

  it('skips nations already in currentNames', () => {
    const minorNations = [
      { n: 'AlreadyIn', tier: 'C', pow: 100 },
      { n: 'Candidate', tier: 'C', pow: 20 },
    ]
    expect(pickPromotion(minorNations, ['AlreadyIn'], strengthOf).n).toBe('Candidate')
  })

  it('returns null when no eligible tier-C remains', () => {
    const minorNations = [
      { n: 'OnlyC', tier: 'C', pow: 40 },
      { n: 'OnlyD', tier: 'D', pow: 60 },
    ]
    expect(pickPromotion(minorNations, ['OnlyC'], strengthOf)).toBeNull()
    expect(pickPromotion([], [], strengthOf)).toBeNull()
  })
})
