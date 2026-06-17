import { describe, it, expect } from 'vitest'
import { jutsuLoadoutBonus, toggleLoadoutSlot, LOADOUT_MAX } from '../shared/jutsu/loadout.js'

const JUTSU = [
  { id: 'fireball',  bonus: { powerMod: 0.05 }, tier: 'common' },
  { id: 'rasengan',  bonus: { powerMod: 0.10 }, tier: 'uncommon' },
  { id: 'kaibreak',  bonus: { successMod: 0.08 }, tier: 'uncommon' },
  { id: 'eightgates', bonus: { powerMod: 0.20 }, tier: 'rare' },
]

describe('jutsuLoadoutBonus', () => {
  it('returns zero when no loadout set', () => {
    const s = { jutsu: ['fireball'], jutsuLoadout: [] }
    const r = jutsuLoadoutBonus(s, JUTSU)
    expect(r.powerMod).toBe(0)
    expect(r.successMod).toBe(0)
  })

  it('sums powerMod from active loadout', () => {
    const s = { jutsu: ['fireball', 'rasengan'], jutsuLoadout: ['fireball', 'rasengan'] }
    const r = jutsuLoadoutBonus(s, JUTSU)
    expect(r.powerMod).toBeCloseTo(0.15)
  })

  it('sums successMod from active loadout', () => {
    const s = { jutsu: ['kaibreak'], jutsuLoadout: ['kaibreak'] }
    const r = jutsuLoadoutBonus(s, JUTSU)
    expect(r.successMod).toBeCloseTo(0.08)
  })

  it('ignores loadout entries shinobi has not learned', () => {
    const s = { jutsu: ['fireball'], jutsuLoadout: ['fireball', 'eightgates'] }
    const r = jutsuLoadoutBonus(s, JUTSU)
    expect(r.powerMod).toBeCloseTo(0.05)
  })

  it('ignores jutsu not in the jutsu list', () => {
    const s = { jutsu: ['mystery'], jutsuLoadout: ['mystery'] }
    const r = jutsuLoadoutBonus(s, JUTSU)
    expect(r.powerMod).toBe(0)
    expect(r.successMod).toBe(0)
  })
})

describe('toggleLoadoutSlot', () => {
  it('adds jutsu to empty loadout', () => {
    expect(toggleLoadoutSlot([], 'fireball')).toContain('fireball')
  })

  it('removes jutsu when already in loadout', () => {
    expect(toggleLoadoutSlot(['fireball'], 'fireball')).not.toContain('fireball')
  })

  it('does not add beyond LOADOUT_MAX', () => {
    const full = Array.from({ length: LOADOUT_MAX }, (_, i) => `j${i}`)
    const result = toggleLoadoutSlot(full, 'newjutsu')
    expect(result).toHaveLength(LOADOUT_MAX)
    expect(result).not.toContain('newjutsu')
  })

  it('does not mutate the original array', () => {
    const orig = ['fireball']
    toggleLoadoutSlot(orig, 'rasengan')
    expect(orig).toHaveLength(1)
  })

  it('LOADOUT_MAX is 3', () => {
    expect(LOADOUT_MAX).toBe(3)
  })
})
