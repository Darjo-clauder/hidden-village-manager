import { describe, it, expect } from 'vitest'
import { bondMissionBonus, mentorGrowthBonus, kiaRipple, BOND_TYPES, BOND_TYPE_KEYS, bondThresholdInfo, BOND_FORM_THRESHOLD } from '../shared/bonds/bondTypes.js'

const mk = (id, ri = 1, status = 'available', bonds = []) => ({ id, ri, status, bonds })

describe('bondThresholdInfo — next-threshold display (#5)', () => {
  it('reports wins remaining before bonds form', () => {
    expect(bondThresholdInfo({ wins: 3 })).toEqual({ wins: 3, threshold: BOND_FORM_THRESHOLD, eligible: false, away: 2 })
  })
  it('eligible once threshold reached', () => {
    const info = bondThresholdInfo({ wins: 5 })
    expect(info.eligible).toBe(true)
    expect(info.away).toBe(0)
  })
  it('handles missing squad / wins', () => {
    expect(bondThresholdInfo(undefined)).toEqual({ wins: 0, threshold: 5, eligible: false, away: 5 })
  })
})

describe('BOND_TYPES definitions', () => {
  it('has 4 bond types', () => {
    expect(BOND_TYPE_KEYS).toHaveLength(4)
  })
  it('all types have a desc', () => {
    for (const v of Object.values(BOND_TYPES)) expect(v.desc).toBeTruthy()
  })
  it('Rivals has higher moraleOnKIA penalty than Brothers-in-Arms', () => {
    expect(Math.abs(BOND_TYPES['Rivals'].rivalMoraleOnKIA)).toBeGreaterThan(Math.abs(BOND_TYPES['Brothers-in-Arms'].moraleOnKIA))
  })
})

describe('bondMissionBonus', () => {
  it('returns 0 for shinobi with no bonds', () => {
    const s = mk('a')
    expect(bondMissionBonus(s, [s]).successMod).toBe(0)
  })

  it('Brothers-in-Arms gives successMod when partner is active', () => {
    const a = mk('a', 1, 'available', [{ otherId: 'b', type: 'Brothers-in-Arms' }])
    const b = mk('b', 1, 'available')
    const { successMod } = bondMissionBonus(a, [a, b])
    expect(successMod).toBeCloseTo(BOND_TYPES['Brothers-in-Arms'].successMod)
  })

  it('Brothers-in-Arms gives 0 when partner is injured', () => {
    const a = mk('a', 1, 'available', [{ otherId: 'b', type: 'Brothers-in-Arms' }])
    const b = mk('b', 1, 'injured')
    expect(bondMissionBonus(a, [a, b]).successMod).toBe(0)
  })

  it('Rivals gives successMod when rival is on roster', () => {
    const a = mk('a', 1, 'available', [{ otherId: 'b', type: 'Rivals' }])
    const b = mk('b', 1, 'available')
    const { successMod } = bondMissionBonus(a, [a, b])
    expect(successMod).toBeCloseTo(BOND_TYPES['Rivals'].rivalSuccessMod)
  })

  it('Mentor/Student gives student bonus when s is the student', () => {
    const mentor = mk('mentor', 3, 'available')
    const student = mk('student', 1, 'available', [{ otherId: 'mentor', type: 'Mentor/Student' }])
    const { successMod } = bondMissionBonus(student, [mentor, student])
    expect(successMod).toBeCloseTo(BOND_TYPES['Mentor/Student'].studentSuccessMod)
  })

  it('Mentor/Student gives 0 bonus when s is the mentor', () => {
    const mentor = mk('mentor', 3, 'available', [{ otherId: 'student', type: 'Mentor/Student' }])
    const student = mk('student', 1, 'available')
    expect(bondMissionBonus(mentor, [mentor, student]).successMod).toBe(0)
  })
})

describe('mentorGrowthBonus', () => {
  it('returns 0 when no mentor bond exists', () => {
    const s = mk('a')
    expect(mentorGrowthBonus(s, [s])).toBe(0)
  })

  it('returns growth bonus when active higher-rank mentor exists', () => {
    const mentor = mk('m', 3, 'available')
    const student = mk('s', 1, 'available', [{ otherId: 'm', type: 'Mentor/Student' }])
    expect(mentorGrowthBonus(student, [mentor, student])).toBeCloseTo(BOND_TYPES['Mentor/Student'].mentorGrowthBonus)
  })

  it('returns 0 when mentor is injured', () => {
    const mentor = mk('m', 3, 'injured')
    const student = mk('s', 1, 'available', [{ otherId: 'm', type: 'Mentor/Student' }])
    expect(mentorGrowthBonus(student, [mentor, student])).toBe(0)
  })
})

describe('kiaRipple', () => {
  it('returns empty array when fallen has no bonded survivors', () => {
    const survivors = [mk('b')]
    expect(kiaRipple('a', survivors)).toHaveLength(0)
  })

  it('returns morale delta for bonded survivors', () => {
    const b = mk('b', 1, 'available', [{ otherId: 'a', type: 'Brothers-in-Arms' }])
    const effects = kiaRipple('a', [b])
    expect(effects).toHaveLength(1)
    expect(effects[0].shinobiId).toBe('b')
    expect(effects[0].delta).toBe(BOND_TYPES['Brothers-in-Arms'].moraleOnKIA)
  })

  it('rival KIA gives larger penalty', () => {
    const b = mk('b', 1, 'available', [{ otherId: 'a', type: 'Rivals' }])
    const effects = kiaRipple('a', [b])
    expect(effects[0].delta).toBe(BOND_TYPES['Rivals'].rivalMoraleOnKIA)
  })
})
