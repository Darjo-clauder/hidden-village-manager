import { describe, it, expect } from 'vitest'
import {
  PROMISE_TYPES, createPromise, resolvePromise, openPromises, promisesFor, isPastDue, monthsUntil,
} from '../shared/utils/promises.js'

const mk = (list, over = {}) => createPromise(list, {
  shinobiId: 'sh1', name: 'Aiko Mori', type: 'promotion', detail: 'Promotion within 6 months',
  riAt: 1, madeYear: 1, madeMonth: 3, dueYear: 1, dueMonth: 9, ...over,
})

describe('promises ledger', () => {
  it('creates open entries and filters by shinobi/status', () => {
    const list = []
    const a = mk(list)
    const b = mk(list, { shinobiId: 'sh2', type: 'deployment' })
    expect(a.status).toBe('open')
    expect(openPromises(list).length).toBe(2)
    expect(promisesFor(list, 'sh1')).toEqual([a])
    expect(PROMISE_TYPES[b.type]).toBeTruthy()
  })

  it('resolves once and only once; unknown ids are null', () => {
    const list = []
    const a = mk(list)
    expect(resolvePromise(list, a.id, 'kept', 2)).toBe(a)
    expect(a.status).toBe('kept')
    expect(a.resolvedYear).toBe(2)
    expect(resolvePromise(list, a.id, 'broken')).toBeNull()   // already resolved
    expect(a.status).toBe('kept')
    expect(resolvePromise(list, 'nope', 'kept')).toBeNull()
    expect(openPromises(list).length).toBe(0)
  })

  it('isPastDue triggers at the due month, not before', () => {
    const p = mk([], {})
    expect(isPastDue(p, 1, 8)).toBe(false)
    expect(isPastDue(p, 1, 9)).toBe(true)
    expect(isPastDue(p, 2, 1)).toBe(true)
  })

  it('monthsUntil crosses year boundaries', () => {
    expect(monthsUntil(1, 11, 2, 2)).toBe(3)
    expect(monthsUntil(1, 3, 1, 9)).toBe(6)
  })

  it('cap evicts resolved entries before open ones', () => {
    const list = []
    const first = mk(list)                       // stays open
    for (let i = 0; i < 29; i++) mk(list, { shinobiId: 'x' + i })
    expect(list.length).toBe(30)
    resolvePromise(list, list[5].id, 'kept')
    mk(list, { shinobiId: 'overflow' })          // 31st → evict the resolved one
    expect(list.length).toBe(30)
    expect(list).toContain(first)                // open survivor
    expect(list.find(p => p.status === 'kept')).toBeUndefined()
  })
})
