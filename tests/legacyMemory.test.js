import { describe, it, expect } from 'vitest'
import {
  PERMANENT_MEMORY_TYPES, SCAR_FLOOR, isPermanentType, definingMoments, definingBlurb,
  recordVendettaDeath, addVendetta, vendettaAgainst, vendettaCarriers, vendettaBonus,
  oldestUnsettled, unsettledCount, settleOneDeath, vengeanceBeat, vendettaLabel,
  VENDETTA_BONUS_CAP, VENDETTA_MAX_INTENSITY, blameFor,
} from '../shared/utils/legacyMemory.js'
import { addMemory, decayMemories, memoryMoraleMod } from '../shared/utils/memorySystem.js'

const WHEN = { year: 3, month: 5 }
const fallenOf = (name, extra = {}) => ({ name, rank: 'Veteran', mission: 'The Long Road', ...extra })

describe('defining moments — some things do not fade', () => {
  it('a permanent memory survives a decade of decay, floored not pruned', () => {
    const s = {}
    addMemory(s, 'witness_kia', 'm1', WHEN)
    decayMemories(s, 120)                       // ten years on
    expect(s.memories).toHaveLength(1)
    expect(s.memories[0].intensity).toBe(SCAR_FLOOR)
  })

  it('an ordinary memory is still pruned away', () => {
    const s = {}
    addMemory(s, 'mission_triumph', 'm1', WHEN)
    decayMemories(s, 120)
    expect(s.memories).toHaveLength(0)
  })

  it('every declared permanent type is a real memory type that survives', () => {
    PERMANENT_MEMORY_TYPES.forEach(type => {
      expect(isPermanentType(type)).toBe(true)
      const s = {}
      addMemory(s, type, 'src', WHEN)           // throws on an unknown type
      decayMemories(s, 240)
      expect(s.memories).toHaveLength(1)
    })
  })

  it('the 20-memory cap evicts ordinary memories, never a defining one', () => {
    const s = {}
    addMemory(s, 'witness_kia', 'the one that matters', WHEN)
    for (let i = 0; i < 30; i++) addMemory(s, 'mission_triumph', 'routine' + i, WHEN)
    expect(s.memories).toHaveLength(20)
    expect(s.memories.some(m => m.type === 'witness_kia')).toBe(true)
  })

  it('a settled scar stops taxing morale, but fresh grief still bites', () => {
    const fresh = {}, scarred = {}
    addMemory(fresh, 'witness_kia', 'm', WHEN)
    addMemory(scarred, 'witness_kia', 'm', WHEN)
    decayMemories(scarred, 120)
    expect(memoryMoraleMod(fresh)).toBeLessThan(0)
    expect(memoryMoraleMod(scarred)).toBe(0)
  })

  it('a career of losses never becomes an unplayable permanent morale tax', () => {
    const s = {}
    for (let i = 0; i < 6; i++) addMemory(s, 'witness_kia', 'm' + i, WHEN)
    decayMemories(s, 120)
    expect(definingMoments(s)).toHaveLength(6)
    expect(memoryMoraleMod(s)).toBe(0)
  })

  it('definingMoments orders heaviest first and blurbs the worst', () => {
    const s = {}
    addMemory(s, 'witness_kia', 'm', WHEN, 0.4)
    addMemory(s, 'betrayal', 'b', { year: 4, month: 1 }, 0.95)
    addMemory(s, 'mission_triumph', 't', WHEN)       // ordinary — excluded
    const d = definingMoments(s)
    expect(d.map(m => m.type)).toEqual(['betrayal', 'witness_kia'])
    expect(definingBlurb(s)).toContain('2 defining moments')
    expect(definingBlurb(s)).toContain('Betrayal')
  })

  it('definingBlurb is null for someone with no history', () => {
    expect(definingBlurb({ memories: [] })).toBe(null)
    expect(definingBlurb({})).toBe(null)
  })
})

describe('vendettas — the dead keep acting on the living', () => {
  it('records a death in the village ledger and reads it back', () => {
    const ledger = {}
    recordVendettaDeath(ledger, 'Cragmoor', fallenOf('Genta Mori'), WHEN)
    expect(unsettledCount(ledger, 'Cragmoor')).toBe(1)
    expect(oldestUnsettled(ledger, 'Cragmoor').name).toBe('Genta Mori')
    expect(unsettledCount(ledger, 'Verdancross')).toBe(0)
  })

  it('a second loss to the same village deepens the grudge, not duplicates it', () => {
    const s = {}
    addVendetta(s, 'Cragmoor', 'Genta', WHEN)
    addVendetta(s, 'Cragmoor', 'Rei', { year: 4, month: 2 })
    expect(s.vendettas).toHaveLength(1)
    expect(s.vendettas[0].intensity).toBe(2)
    expect(s.vendettas[0].lost).toEqual(['Genta', 'Rei'])
    expect(s.vendettas[0].formed).toEqual({ year: 3, month: 5 })   // origin preserved
  })

  it('the same name is never recorded twice, and intensity is capped', () => {
    const s = {}
    for (let i = 0; i < 10; i++) addVendetta(s, 'Cragmoor', 'Genta', WHEN)
    expect(s.vendettas[0].lost).toEqual(['Genta'])
    expect(s.vendettas[0].intensity).toBe(VENDETTA_MAX_INTENSITY)
  })

  it('a bonded loss lands twice as hard', () => {
    const squadmate = {}, friend = {}
    addVendetta(squadmate, 'Cragmoor', 'Genta', WHEN, 1)
    addVendetta(friend, 'Cragmoor', 'Genta', WHEN, 2)
    expect(vendettaAgainst(friend, 'Cragmoor').intensity)
      .toBeGreaterThan(vendettaAgainst(squadmate, 'Cragmoor').intensity)
  })

  it('the matchday bonus scales with carriers and stays under the cap', () => {
    const roster = []
    expect(vendettaBonus(roster, 'Cragmoor')).toBe(0)
    for (let i = 0; i < 3; i++) {
      const s = {}; addVendetta(s, 'Cragmoor', 'Genta', WHEN); roster.push(s)
    }
    expect(vendettaBonus(roster, 'Cragmoor')).toBeCloseTo(0.06, 5)
    expect(vendettaCarriers(roster, 'Cragmoor')).toHaveLength(3)
    // A bloody history never trivialises the fixture.
    for (let i = 0; i < 40; i++) {
      const s = {}; addVendetta(s, 'Cragmoor', 'Genta', WHEN, 3); roster.push(s)
    }
    expect(vendettaBonus(roster, 'Cragmoor')).toBe(VENDETTA_BONUS_CAP)
    // ...and points only at the village that earned it.
    expect(vendettaBonus(roster, 'Verdancross')).toBe(0)
  })

  it('one win answers one death, oldest first — six deaths is a six-win arc', () => {
    const ledger = {}
    for (let i = 1; i <= 6; i++) recordVendettaDeath(ledger, 'Cragmoor', fallenOf('Fallen' + i), { year: i, month: 1 })
    expect(settleOneDeath(ledger, 'Cragmoor').name).toBe('Fallen1')
    expect(settleOneDeath(ledger, 'Cragmoor').name).toBe('Fallen2')
    expect(unsettledCount(ledger, 'Cragmoor')).toBe(4)
    expect(ledger.Cragmoor.avenged).toBe(2)
    for (let i = 0; i < 4; i++) settleOneDeath(ledger, 'Cragmoor')
    expect(unsettledCount(ledger, 'Cragmoor')).toBe(0)
    expect(settleOneDeath(ledger, 'Cragmoor')).toBe(null)   // nothing left owed
  })

  it('the payoff beat names the dead and says how long they waited', () => {
    const fallen = fallenOf('Genta Mori', { year: 2, month: 3 })
    const beat = vengeanceBeat(fallen, 'Cragmoor', { year: 9, month: 3 }, ['Rei Tamashii', 'Kaede Kusari'])
    expect(beat.title).toContain('Genta Mori')
    expect(beat.body).toContain('Genta Mori')
    expect(beat.body).toContain('Cragmoor')
    expect(beat.body).toContain('The Long Road')
    expect(beat.body).toContain('7 years')
    expect(beat.body).toContain('Rei Tamashii and Kaede Kusari')
  })

  it('the beat still reads when nobody named is left to carry it', () => {
    const beat = vengeanceBeat(fallenOf('Genta', { year: 8, month: 1 }), 'Cragmoor', { year: 8, month: 6 }, [])
    expect(beat.body).toContain('The village waited months')
  })

  it('vendettaLabel tracks the ledger from open to square', () => {
    const ledger = {}
    expect(vendettaLabel(ledger, 'Cragmoor')).toBe(null)
    recordVendettaDeath(ledger, 'Cragmoor', fallenOf('A'), WHEN)
    recordVendettaDeath(ledger, 'Cragmoor', fallenOf('B'), WHEN)
    expect(vendettaLabel(ledger, 'Cragmoor')).toContain('2 of ours unanswered')
    settleOneDeath(ledger, 'Cragmoor')
    expect(vendettaLabel(ledger, 'Cragmoor')).toContain('1 settled')
    settleOneDeath(ledger, 'Cragmoor')
    expect(vendettaLabel(ledger, 'Cragmoor')).toContain('square')
  })

  it('blame lands on the village you are on worst terms with, strongest first', () => {
    const villages = [
      { n: 'Friendly', rel: 80, strength: 90 },
      { n: 'Sour', rel: 20, strength: 40 },
      { n: 'AlsoSour', rel: 20, strength: 70 },
    ]
    expect(blameFor(villages).n).toBe('AlsoSour')       // tie on rel → stronger hand
    expect(blameFor([])).toBe(null)
    expect(blameFor(null)).toBe(null)
    // ...and it must not reorder the caller's array.
    expect(villages[0].n).toBe('Friendly')
  })

  it('tolerates missing arguments rather than throwing mid-tick', () => {
    expect(addVendetta(null, 'V', 'n', WHEN)).toBe(null)
    expect(addVendetta({}, null, 'n', WHEN)).toBe(null)
    expect(recordVendettaDeath(null, 'V', fallenOf('n'), WHEN)).toBe(null)
    expect(vendettaAgainst(undefined, 'V')).toBe(null)
    expect(vendettaBonus(null, 'V')).toBe(0)
    expect(oldestUnsettled({}, 'V')).toBe(null)
  })
})
