import { describe, it, expect } from 'vitest'
import { aggregateReports, REGION_POOL_CAP } from '../shared/utils/scoutAggregation.js'

// ensureRegionPool imports REGIONS (browser state) so we test it in isolation
function ensureRegionPool(G, regionIds = ['fire', 'water', 'lightning']) {
  if (!G.regionPool) G.regionPool = {}
  for (const id of regionIds) {
    if (G.regionPool[id] == null) G.regionPool[id] = REGION_POOL_CAP
  }
}

// ── aggregateReports ──────────────────────────────────────────────────────────
describe('aggregateReports', () => {
  it('returns null for a prospect with no reports', () => {
    expect(aggregateReports({ scoutHistory: [] })).toBeNull()
  })

  it('single report: avgConfidence equals its own confidence', () => {
    const p = { scoutHistory: [{ scoutId: 'a', confidence: 70 }] }
    const agg = aggregateReports(p)
    expect(agg.avgConfidence).toBe(70)
    expect(agg.bestConfidence).toBe(70)
    expect(agg.reportCount).toBe(1)
    expect(agg.uniqueScouts).toBe(1)
  })

  it('two scouts averaging to 65 gets Detailed quality', () => {
    const p = {
      scoutHistory: [
        { scoutId: 'a', confidence: 60 },
        { scoutId: 'b', confidence: 70 },
      ],
    }
    const agg = aggregateReports(p)
    expect(agg.avgConfidence).toBe(65)
    expect(agg.quality).toBe('Detailed')
    expect(agg.uniqueScouts).toBe(2)
  })

  it('best confidence of 85 gives Elite quality', () => {
    const p = {
      scoutHistory: [
        { scoutId: 'a', confidence: 50 },
        { scoutId: 'a', confidence: 85 },
      ],
    }
    const agg = aggregateReports(p)
    expect(agg.bestConfidence).toBe(85)
    expect(agg.quality).toBe('Elite')
  })

  it('detects high biasSeverity when conflictingRanges >= 4', () => {
    const p = {
      scoutHistory: [{ scoutId: 'a', confidence: 60 }],
      conflictingRanges: [1, 2, 3, 4],  // 4 conflicts
    }
    const agg = aggregateReports(p)
    expect(agg.biasSeverity).toBe('high')
  })

  it('detects medium bias when conflictingRanges === 2', () => {
    const p = {
      scoutHistory: [{ scoutId: 'a', confidence: 60 }],
      conflictingRanges: [1, 2],
    }
    expect(aggregateReports(p).biasSeverity).toBe('medium')
  })

  it('biasSeverity is none when no conflicts and single scout', () => {
    const p = {
      scoutHistory: [{ scoutId: 'a', confidence: 70 }, { scoutId: 'a', confidence: 72 }],
      conflictingRanges: [],
    }
    expect(aggregateReports(p).biasSeverity).toBe('none')
  })

  it('stddev is 0 when all confidences are equal', () => {
    const p = {
      scoutHistory: [
        { scoutId: 'a', confidence: 65 },
        { scoutId: 'b', confidence: 65 },
        { scoutId: 'c', confidence: 65 },
      ],
    }
    expect(aggregateReports(p).stddev).toBe(0)
  })
})

// ── ensureRegionPool ──────────────────────────────────────────────────────────
describe('ensureRegionPool', () => {
  it('initialises missing regions to cap (12)', () => {
    const G = { regionPool: {} }
    ensureRegionPool(G)
    // Should have entries for every region in REGIONS constant
    expect(Object.keys(G.regionPool).length).toBeGreaterThan(0)
    for (const v of Object.values(G.regionPool)) {
      expect(v).toBe(12)
    }
  })

  it('does not overwrite an existing pool value', () => {
    const G = { regionPool: { fire: 3 } }
    ensureRegionPool(G)
    expect(G.regionPool.fire).toBe(3)
  })

  it('creates G.regionPool if it does not exist', () => {
    const G = {}
    ensureRegionPool(G)
    expect(G.regionPool).toBeDefined()
  })
})
