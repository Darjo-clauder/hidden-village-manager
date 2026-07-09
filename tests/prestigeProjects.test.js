import { describe, it, expect } from 'vitest'
import {
  PRESTIGE_PROJECTS, PROJECT_BY_ID, completedEffect, buildProgress, canStartProject,
  FESTIVAL_BASE_COST, festivalCost, festivalReward,
} from '../shared/constants/prestigeProjects.js'

describe('prestige sinks — grand works + festival', () => {
  it('includes mega-tier grand works costed for a millions-deep treasury', () => {
    const grand = PRESTIGE_PROJECTS.filter(p => p.cost >= 1000000)
    expect(grand.length).toBeGreaterThanOrEqual(3)
    // the top wonder should be a real dent in a ~25M balloon
    expect(Math.max(...PRESTIGE_PROJECTS.map(p => p.cost))).toBeGreaterThanOrEqual(6000000)
    grand.forEach(p => expect(p.effect.legend).toBeGreaterThan(0))
  })

  it('festivalCost escalates 1.6x per festival held', () => {
    expect(festivalCost(0)).toBe(FESTIVAL_BASE_COST)
    expect(festivalCost(1)).toBe(Math.round(FESTIVAL_BASE_COST * 1.6))
    expect(festivalCost(3)).toBe(Math.round(FESTIVAL_BASE_COST * 1.6 ** 3))
    expect(festivalCost(-2)).toBe(FESTIVAL_BASE_COST) // guards negatives
    // strictly increasing → an ever-growing sink
    expect(festivalCost(5)).toBeGreaterThan(festivalCost(4))
  })

  it('festivalReward is a flat prestige payoff', () => {
    expect(festivalReward().legend).toBeGreaterThan(0)
    expect(festivalReward().morale).toBeGreaterThan(0)
  })
})

describe('prestige projects — data shape', () => {
  it('every project has a unique id, positive cost + buildMonths, and an effect object', () => {
    const ids = new Set()
    PRESTIGE_PROJECTS.forEach(p => {
      expect(p.id, 'missing id').toBeTruthy()
      expect(ids.has(p.id), `duplicate id ${p.id}`).toBe(false)
      ids.add(p.id)
      expect(p.cost).toBeGreaterThan(0)
      expect(p.buildMonths).toBeGreaterThan(0)
      expect(typeof p.effect).toBe('object')
      expect(p.effect).toBeTruthy()
      expect(p.name.length).toBeGreaterThan(0)
    })
    expect(ids.size).toBe(PRESTIGE_PROJECTS.length)
  })

  it('PROJECT_BY_ID maps every project by id', () => {
    PRESTIGE_PROJECTS.forEach(p => {
      expect(PROJECT_BY_ID[p.id]).toBe(p)
    })
  })
})

describe('completedEffect', () => {
  it('sums a key across completed ids', () => {
    // monument legend:20, hall legend:30
    expect(completedEffect(['monument', 'hall'], 'legend')).toBe(50)
  })

  it('sums moraleFloor across completed ids', () => {
    // monument moraleFloor:6, arena moraleFloor:8
    expect(completedEffect(['monument', 'arena'], 'moraleFloor')).toBe(14)
  })

  it('unknown ids contribute 0', () => {
    expect(completedEffect(['not-real', 'monument'], 'legend')).toBe(20)
    expect(completedEffect(['not-real'], 'legend')).toBe(0)
  })

  it('empty or null list returns 0', () => {
    expect(completedEffect([], 'legend')).toBe(0)
    expect(completedEffect(null, 'legend')).toBe(0)
    expect(completedEffect(undefined, 'legend')).toBe(0)
  })

  it('missing effect key on an owned project contributes 0', () => {
    // monument has no defBonus
    expect(completedEffect(['monument'], 'defBonus')).toBe(0)
  })
})

describe('buildProgress', () => {
  it('is 0 at monthsDone 0', () => {
    expect(buildProgress({ id: 'monument', monthsDone: 0 })).toBe(0)
  })

  it('is 0.5 at half the buildMonths', () => {
    // monument buildMonths: 24
    expect(buildProgress({ id: 'monument', monthsDone: 12 })).toBe(0.5)
  })

  it('clamps to 1 past buildMonths', () => {
    expect(buildProgress({ id: 'monument', monthsDone: 999 })).toBe(1)
  })

  it('returns 0 for an unknown id', () => {
    expect(buildProgress({ id: 'not-real', monthsDone: 5 })).toBe(0)
  })

  it('returns 0 for a missing/undefined build', () => {
    expect(buildProgress(undefined)).toBe(0)
    expect(buildProgress({})).toBe(0)
  })
})

describe('canStartProject', () => {
  it('true when affordable and not owned/building', () => {
    // monument cost 80000
    expect(canStartProject('monument', 80000, [], [])).toBe(true)
    expect(canStartProject('monument', 200000)).toBe(true)
  })

  it('false when ryo is less than cost', () => {
    expect(canStartProject('monument', 79999, [], [])).toBe(false)
  })

  it('false if id is already in completedIds', () => {
    expect(canStartProject('monument', 200000, ['monument'], [])).toBe(false)
  })

  it('false if id is already in buildingIds', () => {
    expect(canStartProject('monument', 200000, [], ['monument'])).toBe(false)
  })

  it('false for an unknown project id', () => {
    expect(canStartProject('not-real', 999999, [], [])).toBe(false)
  })
})
