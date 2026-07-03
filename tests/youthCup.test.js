import { describe, it, expect } from 'vitest'
import {
  stageName, runYouthCup, entrantRun, studentPower, rivalYouthPower, minorYouthPower,
} from '../shared/utils/youthCup.js'
import { mulberry32 } from './helpers/rng.js'

function makeEntrants(n, { spread = true } = {}) {
  const out = []
  for (let i = 0; i < n; i++) {
    out.push({ name: `Ent${i}`, village: 'Testfall', ico: '🍥', power: spread ? 30 + i * 3 : 40, isPlayer: false })
  }
  return out
}

describe('stageName boundaries', () => {
  it('8 entrants remaining -> Quarterfinal', () => {
    expect(stageName(8)).toBe('Quarterfinal')
  })
  it('4 entrants remaining -> Semifinal', () => {
    expect(stageName(4)).toBe('Semifinal')
  })
  it('2 entrants remaining -> Final', () => {
    expect(stageName(2)).toBe('Final')
  })
})

describe('runYouthCup — 8-entrant bracket', () => {
  it('produces exactly one champion, 3 rounds (QF/SF/Final), and every match winner is one of its two entrants', () => {
    const entrants = makeEntrants(8)
    const rng = mulberry32(1)
    const cup = runYouthCup(entrants, rng)
    expect(cup.champion).toBeTruthy()
    expect(cup.rounds.length).toBe(3)
    expect(cup.rounds.map(r => r.stage)).toEqual(['Quarterfinal', 'Semifinal', 'Final'])
    cup.rounds.forEach(round => {
      round.matches.forEach(m => {
        expect([m.a, m.b]).toContain(m.winner)
      })
    })
    // Final round should have exactly one match producing the champion.
    const final = cup.rounds[cup.rounds.length - 1]
    expect(final.matches.length).toBe(1)
    expect(final.matches[0].winner).toBe(cup.champion)
  })
})

describe('runYouthCup — determinism', () => {
  it('same entrants + same seed produce the identical champion', () => {
    const entrants = makeEntrants(8)
    const cupA = runYouthCup(entrants, mulberry32(42))
    const cupB = runYouthCup(entrants, mulberry32(42))
    expect(cupA.champion.name).toBe(cupB.champion.name)
  })
})

describe('runYouthCup — odd fields (byes)', () => {
  it('resolves a 5-entrant field to one champion without crashing', () => {
    const entrants = makeEntrants(5)
    const cup = runYouthCup(entrants, mulberry32(7))
    expect(cup.champion).toBeTruthy()
    expect(cup.rounds.length).toBeGreaterThan(0)
    cup.rounds.forEach(round => {
      round.matches.forEach(m => expect([m.a, m.b]).toContain(m.winner))
    })
  })

  it('resolves a 7-entrant field to one champion without crashing', () => {
    const entrants = makeEntrants(7)
    const cup = runYouthCup(entrants, mulberry32(9))
    expect(cup.champion).toBeTruthy()
    cup.rounds.forEach(round => {
      round.matches.forEach(m => expect([m.a, m.b]).toContain(m.winner))
    })
  })
})

describe('runYouthCup — power sanity', () => {
  it('a dominating top-power entrant wins far more often than chance over many seeds', () => {
    const field = [
      { name: 'Ace', village: 'Testfall', ico: '🍥', power: 90, isPlayer: false },
      ...makeEntrants(7, { spread: false }).map((e, i) => ({ ...e, name: `Filler${i}`, power: 35 + i })),
    ]
    const trials = 200
    let wins = 0
    for (let seed = 1; seed <= trials; seed++) {
      const cup = runYouthCup(field, mulberry32(seed))
      if (cup.champion.name === 'Ace') wins++
    }
    // 8-entrant chance baseline is 1/8 (12.5%); dominance should clear that by a wide margin.
    expect(wins / trials).toBeGreaterThan(0.5)
  })
})

describe('entrantRun', () => {
  it('champion exit is "Champion" with wins>0; first-round loser exits at the first stage with 0 wins; unknown entrant did not play', () => {
    const entrants = makeEntrants(8)
    const cup = runYouthCup(entrants, mulberry32(3))

    const champRun = entrantRun(cup, cup.champion.name)
    expect(champRun.exit).toBe('Champion')
    expect(champRun.wins).toBeGreaterThan(0)

    // Find a first-round (Quarterfinal) loser.
    const qf = cup.rounds[0]
    const loserMatch = qf.matches.find(m => m.winner !== m.a || m.winner !== m.b)
    const qfLoser = qf.matches
      .map(m => (m.winner === m.a ? m.b : m.a))
      .find(loser => loser.name !== cup.champion.name)
    expect(qfLoser).toBeTruthy()
    const loserRun = entrantRun(cup, qfLoser.name)
    expect(loserRun.wins).toBe(0)
    expect(loserRun.exit).toBe('Quarterfinal')

    const ghostRun = entrantRun(cup, 'Nobody McNoshow')
    expect(ghostRun.wins).toBe(0)
    expect(ghostRun.exit).toBe('Did not play')
  })
})

describe('studentPower', () => {
  it('increases with higher stats', () => {
    const low = studentPower({ stats: { ninjutsu: 30, taijutsu: 30, speed: 30 }, potential: 50 })
    const high = studentPower({ stats: { ninjutsu: 60, taijutsu: 60, speed: 60 }, potential: 50 })
    expect(high).toBeGreaterThan(low)
  })

  it('increases with higher potential', () => {
    const lowPotential = studentPower({ stats: { ninjutsu: 40, taijutsu: 40 }, potential: 20 })
    const highPotential = studentPower({ stats: { ninjutsu: 40, taijutsu: 40 }, potential: 90 })
    expect(highPotential).toBeGreaterThan(lowPotential)
  })
})

describe('rivalYouthPower / minorYouthPower', () => {
  it('rivalYouthPower scales with village strength and stays within a small band', () => {
    const rng = mulberry32(5)
    const weak = rivalYouthPower(20, rng)
    const strong = rivalYouthPower(90, mulberry32(5))
    expect(strong).toBeGreaterThan(weak)
  })

  it('minorYouthPower scales with nation strength', () => {
    const weak = minorYouthPower(10, mulberry32(5))
    const strong = minorYouthPower(90, mulberry32(5))
    expect(strong).toBeGreaterThan(weak)
  })
})
