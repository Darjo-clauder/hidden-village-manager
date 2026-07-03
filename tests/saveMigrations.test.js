import { describe, it, expect } from 'vitest'
import { SAVE_VERSION, MIGRATIONS, saveVersionOf, migrateSave } from '../shared/utils/saveMigrations.js'

const DYNASTY_ARRAYS = ['hallOfFame', 'youthCupHistory', 'invitationalHistory', 'exhibitions',
  'prestigeBuilds', 'prestigeCompleted', 'eraHistory', 'promises']
const DYNASTY_MAPS = ['minorRelations', 'journalistRel', 'h2h']

describe('saveVersionOf', () => {
  it('treats an unversioned save as v1', () => {
    expect(saveVersionOf({})).toBe(1)
  })

  it('respects an explicit positive integer version', () => {
    expect(saveVersionOf({ _saveVersion: 2 })).toBe(2)
    expect(saveVersionOf({ _saveVersion: 5 })).toBe(5)
  })

  it('falls back to 1 for null/undefined/0/negative and is null-safe', () => {
    expect(saveVersionOf(null)).toBe(1)
    expect(saveVersionOf(undefined)).toBe(1)
    expect(saveVersionOf({ _saveVersion: 0 })).toBe(1)
    expect(saveVersionOf({ _saveVersion: -3 })).toBe(1)
  })
})

describe('migrateSave', () => {
  it('creates all dynasty arrays and maps on an unversioned (v1) save, and stamps current version', () => {
    const save = {}
    const result = migrateSave(save)

    DYNASTY_ARRAYS.forEach(k => expect(Array.isArray(result[k])).toBe(true))
    DYNASTY_MAPS.forEach(k => {
      expect(typeof result[k]).toBe('object')
      expect(Array.isArray(result[k])).toBe(false)
      expect(result[k]).not.toBeNull()
    })
    expect(result._saveVersion).toBe(SAVE_VERSION)
  })

  it('preserves existing dynasty data instead of clobbering it', () => {
    const save = {
      hallOfFame: [{ name: 'Kestrel', year: 1999 }],
      minorRelations: { Emberfall: 80 },
    }
    const result = migrateSave(save)

    expect(result.hallOfFame).toEqual([{ name: 'Kestrel', year: 1999 }])
    expect(result.minorRelations).toEqual({ Emberfall: 80 })
    // untouched fields still get filled in
    expect(Array.isArray(result.youthCupHistory)).toBe(true)
    expect(result.journalistRel).toEqual({})
  })

  it('does not re-run migrations destructively on a save already at SAVE_VERSION', () => {
    const save = {
      _saveVersion: SAVE_VERSION,
      hallOfFame: ['keep-me'],
      minorRelations: { keep: true },
    }
    const result = migrateSave(save)

    expect(result._saveVersion).toBe(SAVE_VERSION)
    expect(result.hallOfFame).toEqual(['keep-me'])
    expect(result.minorRelations).toEqual({ keep: true })
  })

  it('returns null/non-object inputs untouched without throwing', () => {
    expect(migrateSave(null)).toBeNull()
    expect(migrateSave(undefined)).toBeUndefined()
    expect(() => migrateSave(null)).not.toThrow()
    expect(() => migrateSave(undefined)).not.toThrow()
    expect(() => migrateSave('not-an-object')).not.toThrow()
    expect(() => migrateSave(42)).not.toThrow()
    expect(migrateSave('not-an-object')).toBe('not-an-object')
    expect(migrateSave(42)).toBe(42)
  })

  it('is idempotent: running migrateSave twice yields the same result', () => {
    const save = { hallOfFame: [{ name: 'Kestrel' }] }
    const once = migrateSave(save)
    const snapshot = JSON.parse(JSON.stringify(once))
    const twice = migrateSave(once)

    expect(twice).toEqual(snapshot)
    expect(twice._saveVersion).toBe(SAVE_VERSION)
  })

  it('sanity-checks MIGRATIONS shape for the target version', () => {
    expect(typeof MIGRATIONS[SAVE_VERSION]).toBe('function')
  })
})
