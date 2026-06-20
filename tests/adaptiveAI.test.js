import { describe, it, expect } from 'vitest'
import {
  recordPlayerTactic, getPlayerTendency, pickCounterStrategy,
  applyCounterStrategy, rivalScPenalty, COUNTER_STRATEGIES,
} from '../shared/utils/adaptiveAI.js'

function makeTendencies(overrides = {}) {
  return { totalMissions: 0, eliteDeployments: 0, successRun: 0, squadMissions: 0, ...overrides }
}

function makeVillage(personality = 'Honorable') {
  return { n: 'TestVillage', personality, counterStrategy: null }
}

describe('recordPlayerTactic', () => {
  it('increments totalMissions', () => {
    const t = makeTendencies()
    recordPlayerTactic(t, 'D', 'narrow', false)
    expect(t.totalMissions).toBe(1)
  })

  it('increments eliteDeployments for A and S ranks', () => {
    const t = makeTendencies()
    recordPlayerTactic(t, 'A', 'decisive', false)
    recordPlayerTactic(t, 'S', 'decisive', false)
    expect(t.eliteDeployments).toBe(2)
  })

  it('does not increment eliteDeployments for D/C/B', () => {
    const t = makeTendencies()
    recordPlayerTactic(t, 'B', 'decisive', false)
    expect(t.eliteDeployments).toBe(0)
  })

  it('increments successRun on success', () => {
    const t = makeTendencies()
    recordPlayerTactic(t, 'D', 'decisive', false)
    expect(t.successRun).toBe(1)
  })

  it('resets successRun on failure', () => {
    const t = makeTendencies({ successRun: 5 })
    recordPlayerTactic(t, 'D', 'disaster', false)
    expect(t.successRun).toBe(0)
  })

  it('handles null tendencies gracefully', () => {
    expect(() => recordPlayerTactic(null, 'D', 'narrow', false)).not.toThrow()
  })
})

describe('getPlayerTendency', () => {
  it('returns passive when total < 5', () => {
    const t = makeTendencies({ totalMissions: 3 })
    expect(getPlayerTendency(t).aggression).toBe('passive')
  })

  it('returns elite when >50% are A/S', () => {
    const t = makeTendencies({ totalMissions: 10, eliteDeployments: 7 })
    expect(getPlayerTendency(t).aggression).toBe('elite')
  })

  it('returns mixed otherwise', () => {
    const t = makeTendencies({ totalMissions: 10, eliteDeployments: 2 })
    expect(getPlayerTendency(t).aggression).toBe('mixed')
  })

  it('consistency reaches 1 after 5 consecutive wins', () => {
    const t = makeTendencies({ successRun: 5 })
    expect(getPlayerTendency(t).consistency).toBe(1)
  })
})

describe('pickCounterStrategy', () => {
  it('Isolationist village always returns balanced', () => {
    const v = makeVillage('Isolationist')
    const tendency = getPlayerTendency(makeTendencies({ totalMissions: 20, eliteDeployments: 15 }))
    expect(pickCounterStrategy(v, tendency).id).toBe('balanced')
  })

  it('Aggressive village adopts Border Blitz vs passive player', () => {
    const v = makeVillage('Aggressive')
    const tendency = getPlayerTendency(makeTendencies({ totalMissions: 2 }))
    expect(pickCounterStrategy(v, tendency).id).toBe('aggressive')
  })

  it('any village adopts elite_wall vs elite-heavy player', () => {
    const v = makeVillage('Honorable')
    const tendency = getPlayerTendency(makeTendencies({ totalMissions: 10, eliteDeployments: 8 }))
    expect(pickCounterStrategy(v, tendency).id).toBe('elite_wall')
  })

  it('scout_study fires when player has 5+ win streak', () => {
    const v = makeVillage('Mercantile')
    const tendency = getPlayerTendency(makeTendencies({ totalMissions: 10, eliteDeployments: 2, successRun: 5 }))
    expect(pickCounterStrategy(v, tendency).id).toBe('scout_study')
  })
})

describe('applyCounterStrategy', () => {
  it('mutates village.counterStrategy', () => {
    const v = makeVillage('Aggressive')
    const tendency = getPlayerTendency(makeTendencies({ totalMissions: 2 }))
    applyCounterStrategy(v, tendency)
    expect(v.counterStrategy).toBeTruthy()
  })

  it('reports changed=true on first application', () => {
    const v = makeVillage('Honorable')
    const tendency = getPlayerTendency(makeTendencies({ totalMissions: 10, eliteDeployments: 8 }))
    const { changed } = applyCounterStrategy(v, tendency)
    expect(changed).toBe(true)
  })

  it('reports changed=false when strategy stays the same', () => {
    const v = makeVillage('Honorable')
    const tendency = getPlayerTendency(makeTendencies({ totalMissions: 10, eliteDeployments: 8 }))
    applyCounterStrategy(v, tendency)
    const { changed } = applyCounterStrategy(v, tendency)
    expect(changed).toBe(false)
  })
})

describe('rivalScPenalty', () => {
  it('returns 0 when no rivals have counter strategies', () => {
    expect(rivalScPenalty([makeVillage()], 'S')).toBe(0)
  })

  it('elite_wall applies penalty for A rank', () => {
    const v = { ...makeVillage(), counterStrategy: 'elite_wall' }
    expect(rivalScPenalty([v], 'A')).toBeLessThan(0)
  })

  it('elite_wall does not apply penalty for D rank', () => {
    const v = { ...makeVillage(), counterStrategy: 'elite_wall' }
    expect(rivalScPenalty([v], 'D')).toBe(0)
  })

  it('scout_study applies penalty for all ranks', () => {
    const v = { ...makeVillage(), counterStrategy: 'scout_study' }
    expect(rivalScPenalty([v], 'D')).toBeLessThan(0)
    expect(rivalScPenalty([v], 'S')).toBeLessThan(0)
  })

  it('sums penalties across multiple rivals', () => {
    const vs = [
      { ...makeVillage(), counterStrategy: 'scout_study' },
      { ...makeVillage(), counterStrategy: 'scout_study' },
    ]
    const p = rivalScPenalty(vs, 'B')
    expect(p).toBe(COUNTER_STRATEGIES.scout_study.scMod * 2)
  })
})
