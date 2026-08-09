import { describe, it, expect } from 'vitest'
import { villageKey, nowMonth, reportsFor, hasFreshIntel, intelMonthsLeft } from '../shared/utils/intel.js'

const rep = (villageId, expiresMonth, type = 'recon') => ({ villageId, type, expiresMonth, data: {} })

describe('intel freshness', () => {
  it('keys a village the way reports are actually written', () => {
    expect(villageKey({ id: 'v1', n: 'Cragmoor' })).toBe('v1')
    expect(villageKey({ n: 'Cragmoor' })).toBe('Cragmoor')   // id-less villages exist
    expect(villageKey(null)).toBe(null)
    expect(villageKey({})).toBe(null)
  })

  it('nowMonth matches how expiresMonth is stamped', () => {
    expect(nowMonth(1, 1)).toBe(1)
    expect(nowMonth(2, 1)).toBe(13)
    expect(nowMonth(3, 5)).toBe(29)
  })

  /**
   * The keying is already inconsistent in saved games — reports are written
   * with `v.id || v.n` but read elsewhere against `v.n`, and _leverageCtx
   * checks both. Matching either is deliberate; narrowing it would silently
   * blind every save written under the other convention.
   */
  it('matches a report filed under EITHER the id or the name', () => {
    const v = { id: 'v1', n: 'Cragmoor' }
    expect(hasFreshIntel([rep('v1', 10)], v, 5)).toBe(true)
    expect(hasFreshIntel([rep('Cragmoor', 10)], v, 5)).toBe(true)
    expect(hasFreshIntel([rep('somewhere-else', 10)], v, 5)).toBe(false)
  })

  it('expired intel does not count', () => {
    const v = { id: 'v1', n: 'Cragmoor' }
    expect(hasFreshIntel([rep('v1', 10)], v, 10)).toBe(true)    // expires ON this month, still good
    expect(hasFreshIntel([rep('v1', 9)], v, 10)).toBe(false)
    expect(hasFreshIntel([], v, 5)).toBe(false)
    expect(hasFreshIntel(null, v, 5)).toBe(false)
  })

  it('reports the longest remaining window, so the player can see it closing', () => {
    const v = { id: 'v1', n: 'Cragmoor' }
    expect(intelMonthsLeft([rep('v1', 12), rep('v1', 15, 'deep_cover')], v, 10)).toBe(5)
    expect(intelMonthsLeft([rep('v1', 9)], v, 10)).toBe(0)
    expect(intelMonthsLeft([], v, 10)).toBe(0)
  })

  it('returns every current report on a village, ignoring others', () => {
    const v = { id: 'v1', n: 'Cragmoor' }
    const all = [rep('v1', 12), rep('v1', 15, 'deep_cover'), rep('v2', 20), rep('v1', 3)]
    const got = reportsFor(all, v, 10)
    expect(got).toHaveLength(2)
    expect(got.every(r => r.villageId === 'v1')).toBe(true)
  })

  it('tolerates junk without throwing mid-render', () => {
    expect(reportsFor(null, null, 0)).toEqual([])
    expect(reportsFor([rep('v1', 5)], null, 0)).toEqual([])
    expect(hasFreshIntel([{}], { id: 'v1' }, 0)).toBe(false)
  })
})
