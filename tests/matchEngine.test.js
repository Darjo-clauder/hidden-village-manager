import { describe, it, expect } from 'vitest'
import {
  seedFrom, mulberry32, ZONES, ZONE_X,
  planPeriodPoints, buildMatchScript, zoneControlFrom, tickerLine,
} from '../shared/utils/matchEngine.js'

const BEATS = [
  { name: 'Infiltration', won: true },
  { name: 'Engagement', won: false },
  { name: 'Extraction', won: true },
]

describe('matchEngine — seeding', () => {
  it('seedFrom is stable and mulberry32 is deterministic', () => {
    expect(seedFrom('mission-x-Y1M4')).toBe(seedFrom('mission-x-Y1M4'))
    expect(seedFrom('a')).not.toBe(seedFrom('b'))
    const r1 = mulberry32(42), r2 = mulberry32(42)
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()])
  })

  it('the same report seed always builds the same script (replays are archival)', () => {
    const a = buildMatchScript({ beats: BEATS, seedStr: 'op-77-Y2M9' })
    const b = buildMatchScript({ beats: BEATS, seedStr: 'op-77-Y2M9' })
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    const c = buildMatchScript({ beats: BEATS, seedStr: 'op-78-Y2M9' })
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c))
  })
})

describe('matchEngine — outcome governor', () => {
  it('a won period always ends with positive phase points, a lost one negative', () => {
    // Sweep many seeds — the governor must hold for every one.
    for (let s = 0; s < 200; s++) {
      const rng = mulberry32(s)
      const won = planPeriodPoints(rng, true)
      const lost = planPeriodPoints(rng, false)
      expect(won.reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
      expect(lost.reduce((a, b) => a + b, 0)).toBeLessThan(0)
    }
  })

  it('buildMatchScript honours every beat in a mixed sequence', () => {
    for (let s = 0; s < 50; s++) {
      const script = buildMatchScript({ beats: BEATS, seedStr: 'sweep-' + s })
      script.periods.forEach((per, i) => {
        const sum = per.phases.reduce((a, p) => a + p.point, 0)
        if (BEATS[i].won) expect(sum, `seed ${s} period ${i}`).toBeGreaterThan(0)
        else expect(sum, `seed ${s} period ${i}`).toBeLessThan(0)
      })
    }
  })
})

describe('matchEngine — phase event shape', () => {
  const script = buildMatchScript({ beats: BEATS, seedStr: 'shape-test' })
  const allPhases = script.periods.flatMap(p => p.phases)

  it('every phase opens with a carry and events are time-ordered within 0..1', () => {
    allPhases.forEach(ph => {
      expect(ph.events[0].type).toBe('carry')
      let last = -1
      ph.events.forEach(e => {
        expect(e.at).toBeGreaterThan(last); last = e.at
        expect(e.at).toBeGreaterThanOrEqual(0); expect(e.at).toBeLessThanOrEqual(1)
        expect(ZONES).toContain(e.zone)
      })
    })
  })

  it('a banked phase ends at the enemy gate; a stolen one counters to the attacker\'s gate', () => {
    allPhases.forEach(ph => {
      const lastEv = ph.events[ph.events.length - 1]
      if (ph.point > 0 && ph.side === 'home') expect(lastEv.zone).toBe('AG')
      if (ph.point < 0 && ph.side === 'home') { expect(lastEv.zone).toBe('HG'); expect(lastEv.side).toBe('away') }
      if (ph.point === 0) expect(lastEv.type).toBe('turnover')
    })
  })

  it('pass targets are side-relative indices distinct from the passer (3-squads)', () => {
    allPhases.forEach(ph => ph.events.filter(e => e.type === 'pass').forEach(e => {
      expect(e.target).not.toBe(e.actor)
      expect(e.target).toBeGreaterThanOrEqual(0); expect(e.target).toBeLessThan(3)
    }))
  })

  it('a lone shinobi never passes to themselves — solo phases carry instead', () => {
    for (let s = 0; s < 30; s++) {
      const solo = buildMatchScript({ beats: BEATS, seedStr: 'solo-' + s, nHome: 1 })
      solo.periods.flatMap(p => p.phases).filter(ph => ph.side === 'home' && ph.point > 0)
        .forEach(ph => expect(ph.events.some(e => e.type === 'pass'), `seed ${s}`).toBe(false))
    }
  })
})

describe('matchEngine — zone control + ticker', () => {
  it('zoneControlFrom tilts bands toward the acting side and stays bounded', () => {
    const ctl = zoneControlFrom([
      { type: 'strike', zone: 'AG', side: 'home' },
      { type: 'strike', zone: 'AG', side: 'home' },
      { type: 'intercept', zone: 'N', side: 'away' },
    ])
    expect(ctl).toHaveLength(5)
    ctl.forEach(v => { expect(v).toBeGreaterThanOrEqual(-1); expect(v).toBeLessThanOrEqual(1) })
    // home strikes at AG push that band toward home (up from its away baseline)
    expect(ctl[ZONES.indexOf('AG')]).toBeGreaterThan(-0.4)
    expect(ctl[ZONES.indexOf('N')]).toBeLessThan(0)
    expect(Object.keys(ZONE_X)).toEqual(ZONES)
  })

  it('tickerLine renders every event type with names substituted', () => {
    const names = (side, idx) => (side === 'home' ? 'Kira' : 'Foe' + idx)
    for (const type of ['carry', 'pass', 'pass_fail', 'intercept', 'strike', 'block', 'turnover']) {
      const line = tickerLine({ type, side: 'home', actor: 0, target: 1, zone: 'N' }, names, 0)
      expect(line.length).toBeGreaterThan(3)
      expect(line).not.toMatch(/\{[ABZ]\}/)
    }
    expect(tickerLine({ type: 'pass', side: 'home', actor: 0, target: 1, zone: 'N' }, names, 0)).toMatch(/Kira/)
  })
})
