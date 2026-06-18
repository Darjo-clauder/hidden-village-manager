import { describe, it, expect, beforeEach } from 'vitest'
import { emit, getEvents, clearEvents, integrityCheck } from '../shared/utils/telemetry.js'

describe('telemetry buffer', () => {
  beforeEach(() => clearEvents())

  it('emit records an event with type and fields', () => {
    emit('mission_resolved', { rank: 'B', success: true })
    const evs = getEvents('mission_resolved')
    expect(evs).toHaveLength(1)
    expect(evs[0]).toMatchObject({ type: 'mission_resolved', rank: 'B', success: true })
  })

  it('getEvents filters by type', () => {
    emit('a'); emit('b'); emit('a')
    expect(getEvents('a')).toHaveLength(2)
    expect(getEvents()).toHaveLength(3)
  })

  it('ring buffer caps at 500', () => {
    for (let i = 0; i < 600; i++) emit('x', { i })
    const all = getEvents('x')
    expect(all.length).toBe(500)
    expect(all[0].i).toBe(100) // oldest 100 dropped
  })
})

describe('integrityCheck (incidenceOfNaN)', () => {
  it('clean state -> 0 NaN', () => {
    const G = { ryo: 5000, shinobi: [{ stats: { speed: 40, chakra: 30 } }] }
    expect(integrityCheck(G).nanCount).toBe(0)
  })
  it('detects NaN ryo and NaN stats', () => {
    const G = { ryo: NaN, shinobi: [{ stats: { speed: Infinity } }] }
    expect(integrityCheck(G).nanCount).toBe(2)
  })
  it('handles empty / missing fields', () => {
    expect(integrityCheck({}).nanCount).toBe(1) // ryo undefined is not finite
    expect(integrityCheck({ ryo: 0 }).nanCount).toBe(0)
  })
})
