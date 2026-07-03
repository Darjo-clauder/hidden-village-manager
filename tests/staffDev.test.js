import { describe, it, expect } from 'vitest'
import { addStaffXp, xpForStaffLevel, staffLevelBonus, staffTitle, STAFF_MAX_LEVEL, STAFF_TITLES } from '../shared/utils/staffDev.js'

describe('staffDev — curve & titles', () => {
  it('xp cost rises with level', () => {
    expect(xpForStaffLevel(1)).toBe(40)
    expect(xpForStaffLevel(2)).toBe(80)
    expect(xpForStaffLevel(4)).toBe(160)
  })
  it('level bonus 1.0..1.4', () => {
    expect(staffLevelBonus(1)).toBe(1)
    expect(staffLevelBonus(5)).toBeCloseTo(1.4)
    expect(staffLevelBonus(undefined)).toBe(1)
  })
  it('titles map to levels', () => {
    expect(staffTitle(1)).toBe('Novice')
    expect(staffTitle(5)).toBe('Master')
    expect(staffTitle(99)).toBe(STAFF_TITLES[STAFF_TITLES.length - 1])
  })
})

describe('staffDev — addStaffXp', () => {
  it('levels up when XP crosses the threshold', () => {
    const st = {}
    const r = addStaffXp(st, 40)
    expect(r.leveledUp).toBe(true)
    expect(st.staffLevel).toBe(2)
    expect(st.staffXp).toBe(0)
  })
  it('accumulates without leveling below threshold', () => {
    const st = { staffLevel: 1, staffXp: 0 }
    const r = addStaffXp(st, 30)
    expect(r.leveledUp).toBe(false)
    expect(st.staffLevel).toBe(1)
    expect(st.staffXp).toBe(30)
  })
  it('can gain multiple levels in one grant and reports the count', () => {
    const st = {}
    const r = addStaffXp(st, 200)   // 40 + 80 = 120 -> L3, remainder 80 < 120
    expect(st.staffLevel).toBe(3)
    expect(r.gained).toBe(2)
  })
  it('caps at STAFF_MAX_LEVEL', () => {
    const st = { staffLevel: 1, staffXp: 0 }
    addStaffXp(st, 100000)
    expect(st.staffLevel).toBe(STAFF_MAX_LEVEL)
  })
})
