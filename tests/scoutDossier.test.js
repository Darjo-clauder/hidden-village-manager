import { describe, it, expect } from 'vitest'
import { buildDossier, confidenceTrend, reportAgeMonths, STALE_MONTHS } from '../shared/utils/scoutDossier.js'

const rep = (year, month, confidence, scoutId = 's1', extra = {}) =>
  ({ year, month, confidence, scoutId, scoutName: 'Scout ' + scoutId, quality: 'General', ...extra })

describe('scoutDossier — reportAgeMonths', () => {
  it('counts months across years', () => {
    expect(reportAgeMonths({ year: 3, month: 1 }, 3, 5)).toBe(4)
    expect(reportAgeMonths({ year: 2, month: 10 }, 3, 4)).toBe(6)
    expect(reportAgeMonths({ year: 3, month: 5 }, 3, 5)).toBe(0)
  })
})

describe('scoutDossier — confidenceTrend', () => {
  it('single report', () => {
    expect(confidenceTrend([rep(1, 1, 60)])).toBe('single')
  })
  it('rising and falling', () => {
    expect(confidenceTrend([rep(1, 1, 50), rep(1, 3, 55), rep(1, 6, 66)])).toBe('rising')
    expect(confidenceTrend([rep(1, 1, 70), rep(1, 3, 62), rep(1, 6, 55)])).toBe('falling')
  })
  it('steady when reads barely move', () => {
    expect(confidenceTrend([rep(1, 1, 60), rep(1, 3, 62), rep(1, 6, 61)])).toBe('steady')
  })
  it('volatile when spread is wide', () => {
    expect(confidenceTrend([rep(1, 1, 45), rep(1, 3, 80), rep(1, 6, 55)])).toBe('volatile')
  })
})

describe('scoutDossier — buildDossier', () => {
  it('returns null with no history', () => {
    expect(buildDossier({}, 3, 1)).toBe(null)
    expect(buildDossier({ scoutHistory: [] }, 3, 1)).toBe(null)
  })

  it('orders chronologically and computes per-report deltas', () => {
    const p = { scoutHistory: [rep(2, 6, 70, 's2'), rep(2, 1, 55, 's1')] }
    const d = buildDossier(p, 2, 7)
    expect(d.reportCount).toBe(2)
    expect(d.uniqueScouts).toBe(2)
    // sorted: (Y2M1, 55) then (Y2M6, 70)
    expect(d.entries[0].delta).toBe(null)
    expect(d.entries[1].delta).toBe(15)
    expect(d.latest.confidence).toBe(70)
  })

  it('flags stale reports and cold freshness', () => {
    // latest report is STALE_MONTHS+ old
    const p = { scoutHistory: [rep(1, 1, 60)] }
    const d = buildDossier(p, 1 + Math.ceil((STALE_MONTHS + 2) / 12), (STALE_MONTHS + 2) % 12 || 1)
    expect(d.entries[0].stale).toBe(true)
    expect(d.freshness).toBe('cold')
  })

  it('a recent report reads fresh', () => {
    const d = buildDossier({ scoutHistory: [rep(3, 4, 66)] }, 3, 5)
    expect(d.freshness).toBe('fresh')
    expect(d.entries[0].stale).toBe(false)
  })

  it('consensus weights fresh reports over stale ones', () => {
    // an old low read + a fresh high read → consensus leans toward the fresh high one
    const p = { scoutHistory: [rep(1, 1, 40, 's1'), rep(3, 1, 80, 's2')] }
    const d = buildDossier(p, 3, 2)
    const plainAvg = (40 + 80) / 2
    expect(d.consensus).toBeGreaterThan(plainAvg)   // stale 40 down-weighted
  })
})
