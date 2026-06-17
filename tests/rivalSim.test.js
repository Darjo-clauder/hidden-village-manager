import { describe, it, expect } from 'vitest'
import {
  tickRivalStrength,
  shouldFireRivalEvent,
  pickRivalEvent,
  strengthRatio,
  computePlayerStrength,
  RIVAL_EVENT_TYPES,
} from '../shared/utils/rivalSim.js'

describe('tickRivalStrength', () => {
  it('increases strength for aggressive village with low rel', () => {
    const v = { strength: 50, rel: 20, personality: 'Aggressive' }
    const results = Array.from({ length: 20 }, () => {
      const clone = { ...v }
      tickRivalStrength(clone)
      return clone.strength
    })
    const avg = results.reduce((a, b) => a + b, 0) / results.length
    expect(avg).toBeGreaterThan(51)
  })

  it('clamps strength between 10 and 200', () => {
    const vLow = { strength: 11, rel: 50, personality: 'Honorable' }
    for (let i = 0; i < 5; i++) tickRivalStrength(vLow)
    expect(vLow.strength).toBeGreaterThanOrEqual(10)

    const vHigh = { strength: 198, rel: 50, personality: 'Aggressive' }
    for (let i = 0; i < 5; i++) tickRivalStrength(vHigh)
    expect(vHigh.strength).toBeLessThanOrEqual(200)
  })

  it('initializes strength if undefined', () => {
    const v = { rel: 50, personality: 'Neutral' }
    tickRivalStrength(v)
    expect(v.strength).toBeDefined()
    expect(v.strength).toBeGreaterThanOrEqual(10)
  })
})

describe('pickRivalEvent', () => {
  it('always returns a valid event type', () => {
    const ids = RIVAL_EVENT_TYPES.map(e => e.id)
    for (let i = 0; i < 20; i++) {
      const ev = pickRivalEvent()
      expect(ids).toContain(ev.id)
    }
  })

  it('event templates contain {village} placeholder', () => {
    for (const ev of RIVAL_EVENT_TYPES) {
      expect(ev.template).toContain('{village}')
    }
  })
})

describe('strengthRatio', () => {
  it('returns > 1 when player is stronger', () => {
    expect(strengthRatio(100, 50)).toBeGreaterThan(1)
  })

  it('returns < 1 when rival is stronger', () => {
    expect(strengthRatio(40, 100)).toBeLessThan(1)
  })

  it('returns 1 when equal', () => {
    expect(strengthRatio(80, 80)).toBe(1)
  })

  it('returns 2 when rivalStrength is 0 (guard against division by zero)', () => {
    expect(strengthRatio(50, 0)).toBe(2)
  })
})

describe('computePlayerStrength', () => {
  it('returns higher strength with more available shinobi', () => {
    const G1 = { shinobi: [{ status: 'available', ri: 2 }], upgrades: { wall: 0, seal: 0 } }
    const G2 = { shinobi: [
      { status: 'available', ri: 2 },
      { status: 'available', ri: 3 },
      { status: 'available', ri: 4 },
    ], upgrades: { wall: 0, seal: 0 } }
    expect(computePlayerStrength(G2)).toBeGreaterThan(computePlayerStrength(G1))
  })

  it('wall upgrades add to strength', () => {
    const base = { shinobi: [], upgrades: { wall: 0, seal: 0 } }
    const walled = { shinobi: [], upgrades: { wall: 2, seal: 0 } }
    expect(computePlayerStrength(walled)).toBeGreaterThan(computePlayerStrength(base))
  })

  it('returns 0+ for empty village', () => {
    const G = { shinobi: [], upgrades: { wall: 0, seal: 0 } }
    expect(computePlayerStrength(G)).toBeGreaterThanOrEqual(0)
  })
})
