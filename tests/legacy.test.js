import { describe, it, expect } from 'vitest'
import {
  tenurePoints, tierFor, nextTier, emptyLegacy, recordTenure,
  startingBonuses, consumeBequest, LEGACY_TIERS, END_REASONS,
} from '../shared/utils/legacy.js'
import { DYNASTY_YEARS } from '../shared/utils/dynasty.js'

describe('tenurePoints', () => {
  it('scales with grade', () => {
    const args = { yearsServed: DYNASTY_YEARS, endedBy: 'completed' }
    const s = tenurePoints({ ...args, grade: 'S' })
    const b = tenurePoints({ ...args, grade: 'B' })
    const d = tenurePoints({ ...args, grade: 'D' })
    expect(s).toBeGreaterThan(b)
    expect(b).toBeGreaterThan(d)
  })

  it('scales with years served', () => {
    const long = tenurePoints({ grade: 'A', yearsServed: 30, endedBy: 'retired' })
    const short = tenurePoints({ grade: 'A', yearsServed: 5, endedBy: 'retired' })
    expect(long).toBeGreaterThan(short)
  })

  it('pays a dismissal less than a voluntary handoff, but never nothing', () => {
    const args = { grade: 'A', yearsServed: 20 }
    const fired = tenurePoints({ ...args, endedBy: 'dismissed' })
    const handed = tenurePoints({ ...args, endedBy: 'retired' })
    expect(fired).toBeLessThan(handed)
    expect(fired).toBeGreaterThan(0)
  })

  it('floors partial credit so a very short run still earns something', () => {
    expect(tenurePoints({ grade: 'D', yearsServed: 1, endedBy: 'dismissed' })).toBeGreaterThanOrEqual(1)
  })

  it('is defensive about missing input', () => {
    expect(tenurePoints()).toBeGreaterThanOrEqual(1)
    expect(tenurePoints({ grade: 'Z', yearsServed: -5, endedBy: 'nonsense' })).toBeGreaterThanOrEqual(1)
  })
})

describe('tiers', () => {
  it('starts at the base tier', () => {
    expect(tierFor(0).name).toBe('Unknown')
    expect(tierFor(0).ryo).toBe(0)
  })

  it('returns the highest tier reached, not the first matching', () => {
    const top = LEGACY_TIERS[LEGACY_TIERS.length - 1]
    expect(tierFor(top.at).name).toBe(top.name)
    expect(tierFor(top.at + 10_000).name).toBe(top.name)   // capped
  })

  it('is monotonic in every reward', () => {
    for (let i = 1; i < LEGACY_TIERS.length; i++) {
      expect(LEGACY_TIERS[i].ryo).toBeGreaterThanOrEqual(LEGACY_TIERS[i - 1].ryo)
      expect(LEGACY_TIERS[i].legend).toBeGreaterThanOrEqual(LEGACY_TIERS[i - 1].legend)
      expect(LEGACY_TIERS[i].rep).toBeGreaterThanOrEqual(LEGACY_TIERS[i - 1].rep)
    }
  })

  it('reports the next tier, and null at the cap', () => {
    expect(nextTier(0).at).toBe(LEGACY_TIERS[1].at)
    expect(nextTier(LEGACY_TIERS[LEGACY_TIERS.length - 1].at)).toBeNull()
  })
})

describe('recordTenure', () => {
  it('accumulates points across tenures', () => {
    let s = emptyLegacy()
    expect(s.points).toBe(0)
    s = recordTenure(s, { grade: 'B', yearsServed: 10, endedBy: 'retired' }).store
    const afterOne = s.points
    expect(afterOne).toBeGreaterThan(0)
    s = recordTenure(s, { grade: 'B', yearsServed: 10, endedBy: 'retired' }).store
    expect(s.points).toBeGreaterThan(afterOne)
    expect(s.tenures).toHaveLength(2)
  })

  it('does not mutate the store passed in', () => {
    const s = emptyLegacy()
    recordTenure(s, { grade: 'S', yearsServed: 30, endedBy: 'completed' })
    expect(s.points).toBe(0)
    expect(s.tenures).toHaveLength(0)
  })

  it('arms a bequest only when the dynasty is completed', () => {
    const retired = recordTenure(emptyLegacy(), { grade: 'A', yearsServed: 12, endedBy: 'retired' }).store
    expect(retired.pendingBequest).toBeNull()
    expect(retired.dynastiesCompleted).toBe(0)

    const done = recordTenure(emptyLegacy(), { grade: 'A', yearsServed: 30, endedBy: 'completed' }).store
    expect(done.pendingBequest).not.toBeNull()
    expect(done.pendingBequest.grade).toBe('A')
    expect(done.dynastiesCompleted).toBe(1)
  })

  it('tracks the best grade achieved, not the latest', () => {
    let s = recordTenure(emptyLegacy(), { grade: 'S', yearsServed: 30, endedBy: 'completed' }).store
    s = recordTenure(s, { grade: 'D', yearsServed: 2, endedBy: 'dismissed' }).store
    expect(s.bestGrade).toBe('S')
  })

  it('keeps the lineage bounded', () => {
    let s = emptyLegacy()
    for (let i = 0; i < 30; i++) s = recordTenure(s, { grade: 'C', yearsServed: 5, endedBy: 'retired' }).store
    expect(s.tenures.length).toBeLessThanOrEqual(20)
  })

  it('returns the record it added', () => {
    const { record } = recordTenure(emptyLegacy(), { vName: 'Ashfall', wardenName: 'Rin', grade: 'A', yearsServed: 30, endedBy: 'completed' })
    expect(record.vName).toBe('Ashfall')
    expect(record.wardenName).toBe('Rin')
    expect(record.earned).toBeGreaterThan(0)
  })
})

describe('startingBonuses', () => {
  it('gives nothing on a first run', () => {
    const { total } = startingBonuses(emptyLegacy())
    expect(total).toEqual({ ryo: 0, legend: 0, rep: 0, monthly: 0 })
  })

  it('grants the tier bonus once points are earned', () => {
    const s = { ...emptyLegacy(), points: LEGACY_TIERS[1].at }
    const { total, tier } = startingBonuses(s)
    expect(tier.name).toBe(LEGACY_TIERS[1].name)
    expect(total.ryo).toBe(LEGACY_TIERS[1].ryo)
  })

  it('stacks an armed bequest on top of the tier', () => {
    const s = recordTenure(emptyLegacy(), { grade: 'S', yearsServed: 30, endedBy: 'completed' }).store
    const withBequest = startingBonuses(s)
    const withoutBequest = startingBonuses(consumeBequest(s))
    expect(withBequest.total.ryo).toBeGreaterThan(withoutBequest.total.ryo)
    expect(withBequest.bequest).not.toBeNull()
    expect(withoutBequest.bequest).toBeNull()
  })

  it('is capped — many tenures cannot exceed the top tier plus one bequest', () => {
    let s = emptyLegacy()
    for (let i = 0; i < 20; i++) s = recordTenure(s, { grade: 'S', yearsServed: 30, endedBy: 'completed' }).store
    const top = LEGACY_TIERS[LEGACY_TIERS.length - 1]
    const { total } = startingBonuses(s)
    // one bequest is armed at most, so the ceiling is top tier + a single S bequest
    expect(total.ryo).toBeLessThanOrEqual(top.ryo + 20000)
    expect(total.legend).toBeLessThanOrEqual(top.legend + 50)
  })

  it('tolerates a missing or malformed store', () => {
    expect(startingBonuses(null).total.ryo).toBe(0)
    expect(startingBonuses({}).total.ryo).toBe(0)
  })
})

describe('consumeBequest', () => {
  it('clears the bequest without touching points', () => {
    const s = recordTenure(emptyLegacy(), { grade: 'S', yearsServed: 30, endedBy: 'completed' }).store
    const after = consumeBequest(s)
    expect(after.pendingBequest).toBeNull()
    expect(after.points).toBe(s.points)
  })

  it('does not mutate its input', () => {
    const s = recordTenure(emptyLegacy(), { grade: 'S', yearsServed: 30, endedBy: 'completed' }).store
    consumeBequest(s)
    expect(s.pendingBequest).not.toBeNull()
  })
})

describe('END_REASONS', () => {
  it('orders multipliers so voluntary conclusions beat dismissal', () => {
    expect(END_REASONS.completed.mult).toBeGreaterThan(END_REASONS.retired.mult)
    expect(END_REASONS.retired.mult).toBeGreaterThan(END_REASONS.dismissed.mult)
  })
})
