import { describe, it, expect } from 'vitest'
import { updateH2H, h2hRecord, h2hLabel, pickDerbyRival } from '../shared/utils/rivalry.js'

describe('head-to-head ledger', () => {
  it('accumulates W/D/L from the player perspective across seasons', () => {
    const h2h = {}
    updateH2H(h2h, 'Kestrel', { a: 'Kestrel', b: 'Emberfall', winner: 'Kestrel' })
    updateH2H(h2h, 'Kestrel', { a: 'Emberfall', b: 'Kestrel', winner: 'Emberfall' })
    updateH2H(h2h, 'Kestrel', { a: 'Kestrel', b: 'Emberfall', winner: null })
    expect(h2hRecord(h2h, 'Emberfall')).toEqual({ w: 1, d: 1, l: 1 })
    expect(h2hLabel(h2h, 'Emberfall')).toBe('1W–1D–1L all-time')
  })

  it('ignores matches the player did not contest; empty history yields null label', () => {
    const h2h = {}
    expect(updateH2H(h2h, 'Kestrel', { a: 'Emberfall', b: 'Tidefort', winner: 'Tidefort' })).toBeNull()
    expect(h2hRecord(h2h, 'Emberfall')).toBeNull()
    expect(h2hLabel(h2h, 'Emberfall')).toBeNull()
    expect(h2hLabel(null, 'Emberfall')).toBeNull()
  })
})

describe('derby rival selection', () => {
  const villages = [
    { n: 'Friendly', rel: 80, grudgeTicks: 0 },
    { n: 'Hostile', rel: 15, grudgeTicks: 0 },
    { n: 'Grudge', rel: 45, grudgeTicks: 9 },   // (100-45) + 45 = 100 > (100-15) = 85
  ]

  it('prefers hostility: low relations + hot grudges beat plain low relations', () => {
    expect(pickDerbyRival(villages).n).toBe('Grudge')
  })

  it('stickiness keeps the incumbent through small swings', () => {
    // Hostile (85) vs Grudge (100): incumbent bonus +15 ties Hostile at 100 — first max wins,
    // so a strictly-better challenger is needed to displace the holder.
    expect(pickDerbyRival(villages, 'Hostile').n).toBe('Hostile')
    // But a clear gap still flips it.
    const shifted = villages.map(v => v.n === 'Grudge' ? { ...v, grudgeTicks: 14 } : v)
    expect(pickDerbyRival(shifted, 'Hostile').n).toBe('Grudge')
  })

  it('handles empty input', () => {
    expect(pickDerbyRival([])).toBeNull()
    expect(pickDerbyRival(null)).toBeNull()
  })
})
