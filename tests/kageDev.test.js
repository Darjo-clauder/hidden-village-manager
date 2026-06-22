import { describe, it, expect } from 'vitest'
import {
  newKageDev, xpForLevel, kageAttr, kageMod, kagePerk,
  addKageXp, spendKagePoint, applyKagePath,
  KAGE_ATTR_CAP, ATTR_BY_ID, PATH_BY_ID,
} from '../shared/constants/kageDev.js'

const g = () => ({ kageDev: newKageDev() })

describe('kageDev — defaults', () => {
  it('starts at level 1 with all attributes at 1 and no points/path', () => {
    const k = newKageDev()
    expect(k.level).toBe(1)
    expect(k.points).toBe(0)
    expect(k.path).toBeNull()
    expect(Object.values(k.attrs).every(v => v === 1)).toBe(true)
  })
})

describe('kageDev — xp curve & leveling', () => {
  it('xpForLevel rises with level', () => {
    expect(xpForLevel(1)).toBe(60)
    expect(xpForLevel(2)).toBeGreaterThan(xpForLevel(1))
  })

  it('addKageXp grants 2 points per level and carries remainder', () => {
    const G = g()
    const res = addKageXp(G, xpForLevel(1) + 10) // exactly one level + 10 leftover
    expect(res.leveled).toBe(true)
    expect(res.levels).toBe(1)
    expect(G.kageDev.level).toBe(2)
    expect(G.kageDev.points).toBe(2)
    expect(G.kageDev.xp).toBe(10)
  })

  it('handles multi-level gains in one award', () => {
    const G = g()
    const big = xpForLevel(1) + xpForLevel(2) + xpForLevel(3) + 5
    const res = addKageXp(G, big)
    expect(res.levels).toBe(3)
    expect(G.kageDev.level).toBe(4)
    expect(G.kageDev.points).toBe(6)
    expect(G.kageDev.xp).toBe(5)
  })

  it('does not level on insufficient xp', () => {
    const G = g()
    const res = addKageXp(G, xpForLevel(1) - 1)
    expect(res.leveled).toBe(false)
    expect(G.kageDev.level).toBe(1)
  })

  it('initialises kageDev if missing', () => {
    const G = {}
    addKageXp(G, 10)
    expect(G.kageDev).toBeDefined()
    expect(G.kageDev.xp).toBe(10)
  })
})

describe('kageDev — spending points', () => {
  it('spends a point to raise an attribute', () => {
    const G = g(); G.kageDev.points = 1
    expect(spendKagePoint(G, 'command')).toBe(true)
    expect(kageAttr(G, 'command')).toBe(2)
    expect(G.kageDev.points).toBe(0)
  })

  it('fails with no points', () => {
    const G = g()
    expect(spendKagePoint(G, 'command')).toBe(false)
    expect(kageAttr(G, 'command')).toBe(1)
  })

  it('rejects unknown attributes', () => {
    const G = g(); G.kageDev.points = 5
    expect(spendKagePoint(G, 'nonsense')).toBe(false)
    expect(G.kageDev.points).toBe(5)
  })

  it('respects the attribute cap', () => {
    const G = g(); G.kageDev.points = 99; G.kageDev.attrs.command = KAGE_ATTR_CAP
    expect(spendKagePoint(G, 'command')).toBe(false)
    expect(kageAttr(G, 'command')).toBe(KAGE_ATTR_CAP)
  })
})

describe('kageDev — paths', () => {
  it('applies path attribute bonuses and perk', () => {
    const G = g()
    expect(applyKagePath(G, 'warlord')).toBe(true)
    expect(kageAttr(G, 'command')).toBe(1 + PATH_BY_ID.warlord.attrs.command)
    expect(kageAttr(G, 'tactics')).toBe(1 + PATH_BY_ID.warlord.attrs.tactics)
    expect(kagePerk(G)).toBe('war_casualties')
  })

  it('can only be chosen once', () => {
    const G = g()
    applyKagePath(G, 'warlord')
    expect(applyKagePath(G, 'sensei')).toBe(false)
    expect(G.kageDev.path).toBe('warlord')
  })

  it('rejects unknown paths', () => {
    const G = g()
    expect(applyKagePath(G, 'ghost')).toBe(false)
  })

  it('path bonuses respect the cap', () => {
    const G = g(); G.kageDev.attrs.command = KAGE_ATTR_CAP
    applyKagePath(G, 'warlord')
    expect(kageAttr(G, 'command')).toBe(KAGE_ATTR_CAP)
  })
})

describe('kageDev — effect modifiers', () => {
  it('kageMod scales with attribute points and per-point rate', () => {
    const G = g(); G.kageDev.attrs.command = 5
    expect(kageMod(G, 'command')).toBeCloseTo(5 * ATTR_BY_ID.command.per, 6)
  })

  it('kageMod is 0 when kageDev is absent', () => {
    expect(kageMod({}, 'command')).toBe(0)
  })
})
