import { describe, it, expect } from 'vitest'
import { SALARY_CAP, capStatus, LUXURY_TAX_RATE, CAP_HARD_BLOCK_MULT } from '../shared/constants/salaryCap.js'

describe('Salary cap constants', () => {
  it('every prestige tier has a defined cap', () => {
    for (const tier of ['D', 'C', 'B', 'A', 'S']) {
      expect(SALARY_CAP[tier]).toBeGreaterThan(0)
    }
  })

  it('caps increase monotonically D → S', () => {
    const tiers = ['D', 'C', 'B', 'A', 'S']
    for (let i = 1; i < tiers.length; i++) {
      expect(SALARY_CAP[tiers[i]]).toBeGreaterThan(SALARY_CAP[tiers[i - 1]])
    }
  })
})

describe('capStatus', () => {
  it('under cap: no tax, no hard block, label Under Cap', () => {
    const cs = capStatus('C', 20_000)  // cap = 38,000
    expect(cs.overBy).toBe(0)
    expect(cs.luxuryTax).toBe(0)
    expect(cs.hardBlock).toBe(false)
    expect(cs.label).toBe('Under Cap')
    expect(cs.pct).toBeCloseTo(20_000 / 38_000)
  })

  it('near cap (90–99%): warns but no tax', () => {
    const cs = capStatus('C', 35_000)  // 92% of 38k
    expect(cs.overBy).toBe(0)
    expect(cs.label).toBe('Near Cap')
    expect(cs.hardBlock).toBe(false)
  })

  it('over cap: luxury tax = 50% of overage', () => {
    const over = 4_000
    const cs = capStatus('C', 38_000 + over)
    expect(cs.overBy).toBe(over)
    expect(cs.luxuryTax).toBe(Math.round(over * LUXURY_TAX_RATE))
    expect(cs.label).toBe('Over Cap')
    expect(cs.hardBlock).toBe(false)
  })

  it('hard block triggers at 130% of cap', () => {
    const cap = SALARY_CAP['B']   // 65,000
    const cs = capStatus('B', Math.ceil(cap * CAP_HARD_BLOCK_MULT))
    expect(cs.hardBlock).toBe(true)
    expect(cs.label).toBe('HARD CAP')
  })

  it('luxury tax is non-negative even at extreme payroll', () => {
    const cs = capStatus('D', 500_000)
    expect(cs.luxuryTax).toBeGreaterThan(0)
    expect(Number.isFinite(cs.luxuryTax)).toBe(true)
  })

  it('unknown prestige tier falls back to D cap', () => {
    const cs = capStatus('Z', 10_000)
    expect(cs.cap).toBe(SALARY_CAP['D'])
  })
})
