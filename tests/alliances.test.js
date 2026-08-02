import { describe, it, expect } from 'vitest'
import {
  PACT_TYPES, PACT_LIST, PACT_REL_MIN, PACT_BREAK_STANDING, PACT_START_STANDING,
  canProposePact, newPact, pactBenefits, pactStandingTier,
  obligationChance, shouldCall, buildObligation, resolveObligation, driftStanding,
} from '../shared/utils/alliances.js'

const village = (over = {}) => ({ n: 'Cragmoor', rel: 70, strength: 60, ...over })

describe('pact definitions', () => {
  it('describes terms, benefit and obligation for every type', () => {
    for (const p of PACT_LIST) {
      expect(p.name, p.id).toBeTruthy()
      expect(p.benefit, p.id).toBeTruthy()
      expect(p.obligation, p.id).toBeTruthy()
      expect(p.callCost, p.id).toBeTruthy()
    }
  })
})

describe('canProposePact', () => {
  it('allows a proposal once relations are high enough', () => {
    expect(canProposePact(village({ rel: PACT_REL_MIN })).ok).toBe(true)
  })
  it('refuses below the relations floor, and says why', () => {
    const r = canProposePact(village({ rel: PACT_REL_MIN - 1 }))
    expect(r.ok).toBe(false)
    expect(r.why).toContain(String(PACT_REL_MIN))
  })
  it('refuses when already in a pact or at war', () => {
    expect(canProposePact(village({ pact: newPact('trade', 1, 1) })).ok).toBe(false)
    expect(canProposePact(village({ atWar: true })).ok).toBe(false)
  })
  it('is safe on nonsense input', () => {
    expect(canProposePact(null).ok).toBe(false)
    expect(canProposePact(undefined).ok).toBe(false)
  })
})

describe('newPact', () => {
  it('starts at the opening standing', () => {
    expect(newPact('defence', 3, 4).standing).toBe(PACT_START_STANDING)
  })
  it('falls back to a valid type', () => {
    expect(newPact('nonsense', 1, 1).type).toBe('trade')
    expect(PACT_TYPES[newPact('nonsense', 1, 1).type]).toBeTruthy()
  })
})

describe('pactBenefits', () => {
  it('is empty with no pacts', () => {
    expect(pactBenefits([]).pacts).toBe(0)
    expect(pactBenefits([village()]).monthlyRyo).toBe(0)
  })

  it('pays each type in its own currency', () => {
    const def = pactBenefits([village({ pact: newPact('defence', 1, 1) })])
    expect(def.warBonus).toBeGreaterThan(0)
    expect(def.monthlyRyo).toBe(0)

    const trd = pactBenefits([village({ pact: newPact('trade', 1, 1) })])
    expect(trd.monthlyRyo).toBeGreaterThan(0)
    expect(trd.warBonus).toBe(0)

    const trn = pactBenefits([village({ pact: newPact('training', 1, 1) })])
    expect(trn.examBonus).toBeGreaterThan(0)
  })

  it('scales with standing — a neglected ally is worth less', () => {
    const strong = pactBenefits([village({ pact: { ...newPact('trade', 1, 1), standing: 100 } })])
    const weak = pactBenefits([village({ pact: { ...newPact('trade', 1, 1), standing: 30 } })])
    expect(strong.monthlyRyo).toBeGreaterThan(weak.monthlyRyo)
  })

  it('scales with the ally being worth having', () => {
    const big = pactBenefits([village({ strength: 90, pact: newPact('trade', 1, 1) })])
    const small = pactBenefits([village({ strength: 20, pact: newPact('trade', 1, 1) })])
    expect(big.monthlyRyo).toBeGreaterThan(small.monthlyRyo)
  })

  it('accumulates across several pacts', () => {
    const two = pactBenefits([
      village({ pact: newPact('trade', 1, 1) }),
      village({ n: 'Verdancross', pact: newPact('trade', 1, 1) }),
    ])
    const one = pactBenefits([village({ pact: newPact('trade', 1, 1) })])
    expect(two.pacts).toBe(2)
    expect(two.monthlyRyo).toBeGreaterThan(one.monthlyRyo)
  })

  it('tolerates malformed input', () => {
    expect(() => pactBenefits(null)).not.toThrow()
    expect(() => pactBenefits([null, {}, village()])).not.toThrow()
  })
})

describe('obligations', () => {
  it('calls sometimes, not always', () => {
    const p = newPact('defence', 1, 1)
    expect(shouldCall(p, 0)).toBe(true)
    expect(shouldCall(p, 0.99)).toBe(false)
  })

  it('leans on you less when standing is high', () => {
    const normal = obligationChance({ type: 'defence', standing: 60 })
    const staunch = obligationChance({ type: 'defence', standing: 85 })
    expect(staunch).toBeLessThan(normal)
  })

  it('asks the most of a defence pact', () => {
    expect(obligationChance({ type: 'defence', standing: 60 }))
      .toBeGreaterThan(obligationChance({ type: 'trade', standing: 60 }))
  })

  it('builds a demand with a cost and readable copy', () => {
    for (const type of ['defence', 'trade', 'training']) {
      const o = buildObligation(village(), newPact(type, 1, 1), { ryo: 100000 })
      expect(o.label, type).toBeTruthy()
      expect(o.body, type).toBeTruthy()
      expect(o.villageName, type).toBe('Cragmoor')
    }
  })

  it('caps a subsidy against the treasury so refusing is never automatic', () => {
    const poor = buildObligation(village(), newPact('trade', 1, 1), { ryo: 8000 })
    const rich = buildObligation(village(), newPact('trade', 1, 1), { ryo: 500000 })
    expect(poor.cost).toBeLessThan(rich.cost)
  })
})

describe('resolveObligation', () => {
  it('honouring builds standing and relations', () => {
    const r = resolveObligation({ type: 'trade', standing: 60, honoured: 0, refused: 0 }, true)
    expect(r.standing).toBeGreaterThan(60)
    expect(r.relDelta).toBeGreaterThan(0)
    expect(r.broken).toBe(false)
    expect(r.honoured).toBe(1)
  })

  it('refusing once is survivable', () => {
    const r = resolveObligation({ type: 'trade', standing: 80, honoured: 0, refused: 0 }, false)
    expect(r.broken).toBe(false)
    expect(r.standing).toBeLessThan(80)
    expect(r.refused).toBe(1)
  })

  it('refusing from a weak position tears the pact up', () => {
    const r = resolveObligation({ type: 'trade', standing: 50, honoured: 0, refused: 2 }, false)
    expect(r.standing).toBeLessThanOrEqual(PACT_BREAK_STANDING)
    expect(r.broken).toBe(true)
    expect(r.repDelta).toBeLessThan(0)
  })

  it('punishes a break harder than a single refusal', () => {
    const soft = resolveObligation({ standing: 90 }, false)
    const hard = resolveObligation({ standing: 40 }, false)
    expect(hard.repDelta).toBeLessThan(soft.repDelta)
    expect(hard.relDelta).toBeLessThan(soft.relDelta)
  })

  it('never leaves standing outside 0..100', () => {
    expect(resolveObligation({ standing: 98 }, true).standing).toBeLessThanOrEqual(100)
    expect(resolveObligation({ standing: 2 }, false).standing).toBeGreaterThanOrEqual(0)
  })
})

describe('driftStanding', () => {
  it('drifts back toward the opening standing from either side', () => {
    expect(driftStanding({ standing: 40 })).toBe(41)
    expect(driftStanding({ standing: 90 })).toBe(89)
    expect(driftStanding({ standing: PACT_START_STANDING })).toBe(PACT_START_STANDING)
  })
  it('is safe with no pact', () => {
    expect(driftStanding(null)).toBeNull()
  })
})

describe('pactStandingTier', () => {
  it('labels the whole range', () => {
    expect(pactStandingTier(90).id).toBe('staunch')
    expect(pactStandingTier(60).id).toBe('solid')
    expect(pactStandingTier(40).id).toBe('strained')
    expect(pactStandingTier(10).id).toBe('failing')
  })
})
