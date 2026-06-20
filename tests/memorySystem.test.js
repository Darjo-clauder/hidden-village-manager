import { describe, it, expect } from 'vitest'
import {
  MEMORY_TYPES, MEMORY_TYPE_IDS,
  createMemory, addMemory, decayMemories,
  dominantMemoryValence, memoryMoraleMod, mostSalientMemory, memoryStateBlurb,
} from '../shared/utils/memorySystem.js'

const WHEN = { year: 1, month: 3 }

describe('createMemory', () => {
  it('creates a well-formed entry', () => {
    const m = createMemory('mission_triumph', 'test_src', WHEN)
    expect(m.type).toBe('mission_triumph')
    expect(m.valence).toBe('positive')
    expect(m.intensity).toBeCloseTo(0.5)
    expect(m.tau).toBe(12)
    expect(m.year).toBe(1)
    expect(m.month).toBe(3)
    expect(typeof m.id).toBe('string')
  })

  it('respects intensityOverride', () => {
    const m = createMemory('mission_triumph', 'src', WHEN, 0.3)
    expect(m.intensity).toBeCloseTo(0.3)
  })

  it('throws on unknown type', () => {
    expect(() => createMemory('bogus_type', 'src', WHEN)).toThrow()
  })

  it('covers every MEMORY_TYPE_ID', () => {
    for (const t of MEMORY_TYPE_IDS) {
      expect(() => createMemory(t, 'src', WHEN)).not.toThrow()
    }
  })
})

describe('addMemory', () => {
  it('appends to s.memories', () => {
    const s = { memories: [] }
    addMemory(s, 'witness_kia', 'mission_1', WHEN)
    expect(s.memories).toHaveLength(1)
  })

  it('initialises s.memories if absent', () => {
    const s = {}
    addMemory(s, 'mentor_bond', 'ev', WHEN)
    expect(s.memories).toHaveLength(1)
  })

  it('caps at 20 entries (oldest pruned)', () => {
    const s = { memories: [] }
    for (let i = 0; i < 25; i++) addMemory(s, 'mission_triumph', 'ev', WHEN)
    expect(s.memories).toHaveLength(20)
  })
})

describe('decayMemories', () => {
  it('reduces intensity over time', () => {
    const s = {}
    addMemory(s, 'mission_triumph', 'ev', WHEN)   // tau=12, intensity=0.5
    const before = s.memories[0].intensity
    decayMemories(s, 6)                            // 6 months
    expect(s.memories[0].intensity).toBeLessThan(before)
  })

  it('follows e^(−t/τ) formula', () => {
    const s = {}
    addMemory(s, 'mission_triumph', 'ev', WHEN)
    decayMemories(s, 12)  // exactly one half-life (tau=12)
    expect(s.memories[0].intensity).toBeCloseTo(0.5 * Math.exp(-1), 4)
  })

  it('prunes entries below 0.05', () => {
    const s = {}
    addMemory(s, 'mission_triumph', 'ev', WHEN, 0.04)  // already below threshold
    decayMemories(s, 1)
    expect(s.memories).toHaveLength(0)
  })

  it('no-ops when memories is empty', () => {
    const s = { memories: [] }
    expect(() => decayMemories(s, 1)).not.toThrow()
  })
})

describe('dominantMemoryValence', () => {
  it('returns neutral when no memories', () => {
    expect(dominantMemoryValence({ memories: [] })).toBe('neutral')
    expect(dominantMemoryValence({})).toBe('neutral')
  })

  it('returns trauma when trauma memories dominate', () => {
    const s = {}
    addMemory(s, 'witness_kia', 'ev', WHEN)   // trauma, 0.9
    addMemory(s, 'mission_triumph', 'ev', WHEN, 0.1)  // positive, 0.1
    expect(dominantMemoryValence(s)).toBe('trauma')
  })

  it('returns positive when positive memories dominate', () => {
    const s = {}
    addMemory(s, 'mentor_bond', 'ev', WHEN)     // positive, 0.6
    addMemory(s, 'promotion_earned', 'ev', WHEN) // positive, 0.5
    expect(dominantMemoryValence(s)).toBe('positive')
  })

  it('returns neutral when intensity too weak', () => {
    const s = {}
    addMemory(s, 'mission_triumph', 'ev', WHEN, 0.05)
    // score = 0.05 which is below 0.15 threshold
    expect(dominantMemoryValence(s)).toBe('neutral')
  })
})

describe('memoryMoraleMod', () => {
  it('returns 0 when no memories', () => {
    expect(memoryMoraleMod({})).toBe(0)
  })

  it('is positive when memories are positive', () => {
    const s = {}
    addMemory(s, 'mentor_bond', 'ev', WHEN)
    addMemory(s, 'promotion_earned', 'ev', WHEN)
    expect(memoryMoraleMod(s)).toBeGreaterThan(0)
  })

  it('is negative when trauma memories dominate', () => {
    const s = {}
    addMemory(s, 'witness_kia', 'ev', WHEN)      // trauma 0.9
    addMemory(s, 'betrayal', 'ev', WHEN)          // trauma 1.0
    expect(memoryMoraleMod(s)).toBeLessThan(0)
  })

  it('clamps to [−6, 4]', () => {
    const s = {}
    for (let i = 0; i < 10; i++) addMemory(s, 'betrayal', 'ev', WHEN)
    const mod = memoryMoraleMod(s)
    expect(mod).toBeGreaterThanOrEqual(-6)
    expect(mod).toBeLessThanOrEqual(4)
  })
})

describe('mostSalientMemory', () => {
  it('returns null for empty', () => {
    expect(mostSalientMemory({})).toBeNull()
    expect(mostSalientMemory({ memories: [] })).toBeNull()
  })

  it('returns highest-intensity entry', () => {
    const s = {}
    addMemory(s, 'mission_triumph', 'ev', WHEN, 0.3)
    addMemory(s, 'betrayal', 'ev', WHEN, 1.0)
    addMemory(s, 'mentor_bond', 'ev', WHEN, 0.6)
    expect(mostSalientMemory(s).type).toBe('betrayal')
  })
})

describe('memoryStateBlurb', () => {
  it('returns no-memories line when list is empty', () => {
    expect(memoryStateBlurb({ memories: [] })).toBe('No strong memories on record.')
  })

  it('returns a non-empty string when memories present', () => {
    const s = {}
    addMemory(s, 'witness_kia', 'ev', WHEN)
    const blurb = memoryStateBlurb(s)
    expect(typeof blurb).toBe('string')
    expect(blurb.length).toBeGreaterThan(0)
  })

  it('reflects trauma valence', () => {
    const s = {}
    addMemory(s, 'betrayal', 'ev', WHEN)
    expect(memoryStateBlurb(s)).toMatch(/carrying|weight|trauma/i)
  })
})
