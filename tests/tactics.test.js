import { describe, it, expect } from 'vitest'
import {
  TEMPO, WIDTH, FORECHECK, SHAPE, STYLE_TACTICS,
  tacticsForStyle, tacticsRead, evalSituations, effectiveTactics,
} from '../shared/constants/tactics.js'
import { buildMatchScript, statsFrom } from '../shared/utils/matchEngine.js'
import { MATCH_STYLES } from '../shared/constants/villageIdentity.js'

const BEATS = [{ name: 'A', won: true }, { name: 'B', won: false }, { name: 'C', won: true }]

describe('tactics — identity auto-map', () => {
  it('every match style has a complete, valid tactic row', () => {
    Object.keys(MATCH_STYLES).forEach(style => {
      const t = tacticsForStyle(style)
      expect(TEMPO[t.tempo], `${style} tempo`).toBeTruthy()
      expect(WIDTH[t.width], `${style} width`).toBeTruthy()
      expect(FORECHECK[t.forecheck], `${style} forecheck`).toBeTruthy()
      expect(SHAPE).toContain(t.shape)
    })
    // unknown style falls back to balanced
    expect(tacticsForStyle('???')).toEqual(STYLE_TACTICS.balanced)
  })

  it('blitz swarms and goes direct; fortress collapses and stays patient', () => {
    expect(tacticsForStyle('blitz')).toMatchObject({ tempo: 'direct', forecheck: 'swarm' })
    expect(tacticsForStyle('fortress')).toMatchObject({ tempo: 'patient', shape: 'collapse' })
    expect(tacticsRead(tacticsForStyle('blitz'))).toMatch(/Direct tempo/)
  })
})

describe('tactics — situational triggers', () => {
  it('late push fires when behind in the last period; protect when ahead', () => {
    const behind = evalSituations({ periodIdx: 2, totalPeriods: 3, pointsSoFar: -2 })
    expect(behind.some(s => s.id === 'late_push')).toBe(true)
    const ahead = evalSituations({ periodIdx: 2, totalPeriods: 3, pointsSoFar: 2 })
    expect(ahead.some(s => s.id === 'protect')).toBe(true)
    // neither fires mid-match
    expect(evalSituations({ periodIdx: 0, totalPeriods: 3, pointsSoFar: -2 })).toEqual([])
  })

  it('man down / power phase mirror KO counts; redline forces patient tempo', () => {
    expect(evalSituations({ homeKo: 1, awayKo: 0 }).some(s => s.id === 'man_down')).toBe(true)
    expect(evalSituations({ homeKo: 0, awayKo: 1 }).some(s => s.id === 'power_phase')).toBe(true)
    const red = evalSituations({ avgStamina: 20 })
    expect(red.some(s => s.id === 'redline')).toBe(true)
    expect(effectiveTactics({ tempo: 'direct', width: 'wide', forecheck: 'swarm', shape: 'zone' }, red).tempo).toBe('patient')
  })

  it('effectiveTactics layers situation effects over the base row in order', () => {
    const base = tacticsForStyle('balanced')
    const sits = evalSituations({ periodIdx: 2, totalPeriods: 3, pointsSoFar: -1, avgStamina: 20 })
    const eff = effectiveTactics(base, sits)
    // redline fires first (patient), late push after (direct) — last write wins
    expect(eff.tempo).toBe('direct')
    expect(eff.forecheck).toBe('swarm')
  })
})

describe('matchEngine — tempo + stats', () => {
  it('patient tempo produces longer build-ups than direct (same seed)', () => {
    const patient = buildMatchScript({ beats: BEATS, seedStr: 'tempo-x', tempoPasses: { home: 2, away: 1 } })
    const direct = buildMatchScript({ beats: BEATS, seedStr: 'tempo-x', tempoPasses: { home: 0, away: 1 } })
    const passes = s => s.periods.flatMap(p => p.phases).filter(ph => ph.side === 'home' && ph.point > 0)
      .reduce((a, ph) => a + ph.events.filter(e => e.type === 'pass').length, 0)
    expect(passes(patient)).toBeGreaterThan(passes(direct))
  })

  it('statsFrom aggregates possession, strikes, pass % and per-actor lines', () => {
    const script = buildMatchScript({ beats: BEATS, seedStr: 'stats-x' })
    const events = script.periods.flatMap(p => p.phases.flatMap(ph => ph.events))
    const s = statsFrom(events)
    expect(s.possessionPct).toBeGreaterThanOrEqual(0); expect(s.possessionPct).toBeLessThanOrEqual(100)
    expect(s.strikesHome + s.blocksHome).toBeGreaterThan(0)   // two won periods must bank attempts
    expect(s.passPct).toBeGreaterThanOrEqual(0); expect(s.passPct).toBeLessThanOrEqual(100)
    // per-actor records only for home indices
    Object.values(s.byHomeActor).forEach(r => {
      expect(r.strikes + r.intercepts + r.passes).toBeGreaterThan(0)
    })
    expect(statsFrom([]).possessionPct).toBe(50)
  })
})
