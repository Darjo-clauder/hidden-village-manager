import { describe, it, expect } from 'vitest'
import {
  genMissionBlurb, genKIABlurb, genInjuryBlurb, genTradeBlurb,
  genBondBlurb, genGrudgeBlurb, genRankUpBlurb,
  genWarResultBlurb, genExamResultBlurb, genPrestigeBlurb,
  genCounterStrategyBlurb,
} from '../shared/utils/narrativeEngine.js'

function expectBlurb(b) {
  expect(typeof b.title).toBe('string')
  expect(typeof b.body).toBe('string')
  expect(typeof b.tag).toBe('string')
  expect(b.title.length).toBeGreaterThan(0)
  expect(b.body.length).toBeGreaterThan(0)
}

describe('genMissionBlurb', () => {
  const qualities = ['decisive', 'narrow', 'costly', 'disaster']
  qualities.forEach(q => {
    it(`returns valid blurb for quality: ${q}`, () => {
      const b = genMissionBlurb('Naruto Uzumaki', 2, 'Retrieve the Scroll', q)
      expectBlurb(b)
      expect(b.link).toBe('missions')
    })
  })

  it('decisive and narrow are tagged success', () => {
    expect(genMissionBlurb('A', 0, 'M', 'decisive').tag).toBe('success')
    expect(genMissionBlurb('A', 0, 'M', 'narrow').tag).toBe('success')
  })

  it('costly and disaster are tagged failure', () => {
    expect(genMissionBlurb('A', 0, 'M', 'costly').tag).toBe('failure')
    expect(genMissionBlurb('A', 0, 'M', 'disaster').tag).toBe('failure')
  })

  it('body contains the mission name', () => {
    const b = genMissionBlurb('Sakura', 1, 'Escort the Daimyo', 'decisive')
    expect(b.body).toContain('Escort the Daimyo')
  })
})

describe('genKIABlurb', () => {
  it('returns valid blurb', () => {
    const b = genKIABlurb('Kakashi Hatake', 2, 'S-rank Infiltration')
    expectBlurb(b)
    expect(b.tag).toBe('kia')
    expect(b.link).toBe('memorial')
  })

  it('includes shinobi name in title', () => {
    const b = genKIABlurb('Rock Lee', 1, 'Border Patrol')
    expect(b.title).toContain('Rock Lee')
  })
})

describe('genInjuryBlurb', () => {
  it('returns valid blurb with correct link', () => {
    const b = genInjuryBlurb('Hinata', 1, 'muscle strain', 2)
    expectBlurb(b)
    expect(b.link).toBe('roster')
  })

  it('pluralises month correctly', () => {
    const one = genInjuryBlurb('A', 0, 'sprain', 1)
    expect(one.body).toContain('1 month')
    const two = genInjuryBlurb('A', 0, 'sprain', 2)
    expect(two.body).toContain('2 months')
  })
})

describe('genTradeBlurb', () => {
  it('returns valid blurb', () => {
    const b = genTradeBlurb('Sasuke Uchiha', 2, 'Shimogakure', 50000)
    expectBlurb(b)
    expect(b.tag).toBe('transfer')
    expect(b.title).toContain('Shimogakure')
  })
})

describe('genBondBlurb', () => {
  const types = ['Brothers-in-Arms', 'Mentor/Student', 'Battle-Scarred', 'Rivals', 'Unknown']
  types.forEach(t => {
    it(`handles bond type: ${t}`, () => {
      const b = genBondBlurb('Naruto', 'Sasuke', t)
      expectBlurb(b)
      expect(b.tag).toBe('bond')
    })
  })
})

describe('genGrudgeBlurb', () => {
  it('intensity 3 appends risk note', () => {
    const b = genGrudgeBlurb('Naruto', 'Sasuke', 'Rivalry', 3)
    expect(b.body).toContain('risk')
  })

  it('intensity 1 has no risk note', () => {
    const b = genGrudgeBlurb('Naruto', 'Sasuke', 'Rivalry', 1)
    expect(b.body).not.toContain('risk')
  })
})

describe('genRankUpBlurb', () => {
  const ranks = [1, 2, 3, 4]
  ranks.forEach(ri => {
    it(`generates blurb for ri=${ri}`, () => {
      const b = genRankUpBlurb('Might Guy', ri)
      expectBlurb(b)
      expect(b.tag).toBe('promotion')
    })
  })
})

describe('genWarResultBlurb', () => {
  it('victory blurb has correct tag', () => {
    const b = genWarResultBlurb(true, 'Konoha', 0)
    expect(b.tag).toBe('war')
    expect(b.title).toContain('Victory')
  })

  it('elimination blurb has correct tag', () => {
    const b = genWarResultBlurb(false, 'Konoha', 0)
    expect(b.title).toContain('Eliminated')
  })

  it('KIA count appears in victory body', () => {
    const b = genWarResultBlurb(true, 'Konoha', 3)
    expect(b.body).toContain('3 fell')
  })
})

describe('genExamResultBlurb', () => {
  it('champion blurb mentions promotions when given', () => {
    const b = genExamResultBlurb(true, 'Konoha', 4)
    expect(b.body).toContain('4 shinobi earned promotion')
  })

  it('eliminated blurb has correct tag', () => {
    const b = genExamResultBlurb(false, 'Konoha')
    expect(b.tag).toBe('exam')
  })
})

describe('genPrestigeBlurb', () => {
  it('includes tier in title', () => {
    const b = genPrestigeBlurb('Konoha', 'B')
    expect(b.title).toContain('B')
    expect(b.tag).toBe('prestige')
  })
})

describe('genCounterStrategyBlurb', () => {
  it('returns valid intel blurb', () => {
    const b = genCounterStrategyBlurb('Kazegakure', 'Border Blitz', 'They are pushing the borders.')
    expectBlurb(b)
    expect(b.tag).toBe('intel')
  })
})
