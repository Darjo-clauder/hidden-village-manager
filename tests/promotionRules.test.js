import { describe, it, expect } from 'vitest'

// Pure promotion rule resolver — mirrors depthEngine.resolveActiveShinobi logic
function resolveActive(slot, shinobiIndex) {
  const starter = slot.starter && shinobiIndex[slot.starter]
  if (starter?.status === 'available') return slot.starter
  if (slot.locked || slot.promotionRule === 'manual') return null

  const candidates = [slot.backup, slot.emergency].filter(Boolean)
    .map(id => shinobiIndex[id]).filter(s => s?.status === 'available')
  if (!candidates.length) return null

  const rule = slot.promotionRule || 'auto'
  if (rule === 'seniority') {
    candidates.sort((a, b) => (b.monthsActive || 0) - (a.monthsActive || 0))
  } else if (rule === 'power') {
    candidates.sort((a, b) => (b.pow || 0) - (a.pow || 0))
  }
  return candidates[0]?.id ?? null
}

const mkShinobi = (id, status, monthsActive = 0, pow = 50) =>
  ({ id, status, monthsActive, pow })

describe('Promotion rule: auto', () => {
  it('returns starter when available', () => {
    const slot = { starter: 's1', backup: 's2', emergency: null, promotionRule: 'auto' }
    const idx = { s1: mkShinobi('s1', 'available'), s2: mkShinobi('s2', 'available') }
    expect(resolveActive(slot, idx)).toBe('s1')
  })

  it('promotes first available backup when starter is injured', () => {
    const slot = { starter: 's1', backup: 's2', emergency: 's3', promotionRule: 'auto' }
    const idx = {
      s1: mkShinobi('s1', 'injured'),
      s2: mkShinobi('s2', 'available'),
      s3: mkShinobi('s3', 'available'),
    }
    expect(resolveActive(slot, idx)).toBe('s2')
  })

  it('falls through to emergency when backup also unavailable', () => {
    const slot = { starter: 's1', backup: 's2', emergency: 's3', promotionRule: 'auto' }
    const idx = {
      s1: mkShinobi('s1', 'injured'),
      s2: mkShinobi('s2', 'mission'),
      s3: mkShinobi('s3', 'available'),
    }
    expect(resolveActive(slot, idx)).toBe('s3')
  })

  it('returns null when all slots unavailable', () => {
    const slot = { starter: 's1', backup: 's2', emergency: null, promotionRule: 'auto' }
    const idx = {
      s1: mkShinobi('s1', 'injured'),
      s2: mkShinobi('s2', 'mission'),
    }
    expect(resolveActive(slot, idx)).toBeNull()
  })
})

describe('Promotion rule: manual', () => {
  it('returns null even if backups are available (manual = no auto-promote)', () => {
    const slot = { starter: 's1', backup: 's2', emergency: null, promotionRule: 'manual' }
    const idx = {
      s1: mkShinobi('s1', 'injured'),
      s2: mkShinobi('s2', 'available'),
    }
    expect(resolveActive(slot, idx)).toBeNull()
  })

  it('still returns starter if they are available', () => {
    const slot = { starter: 's1', backup: 's2', emergency: null, promotionRule: 'manual' }
    const idx = {
      s1: mkShinobi('s1', 'available'),
      s2: mkShinobi('s2', 'available'),
    }
    expect(resolveActive(slot, idx)).toBe('s1')
  })
})

describe('Promotion rule: seniority', () => {
  it('promotes backup with highest monthsActive', () => {
    const slot = { starter: 's1', backup: 's2', emergency: 's3', promotionRule: 'seniority' }
    const idx = {
      s1: mkShinobi('s1', 'injured'),
      s2: mkShinobi('s2', 'available', 10),
      s3: mkShinobi('s3', 'available', 30),
    }
    expect(resolveActive(slot, idx)).toBe('s3')
  })

  it('picks backup if backup has higher seniority than emergency', () => {
    const slot = { starter: 's1', backup: 's2', emergency: 's3', promotionRule: 'seniority' }
    const idx = {
      s1: mkShinobi('s1', 'mission'),
      s2: mkShinobi('s2', 'available', 25),
      s3: mkShinobi('s3', 'available', 5),
    }
    expect(resolveActive(slot, idx)).toBe('s2')
  })
})

describe('Promotion rule: power', () => {
  it('promotes backup with highest power rating', () => {
    const slot = { starter: 's1', backup: 's2', emergency: 's3', promotionRule: 'power' }
    const idx = {
      s1: mkShinobi('s1', 'injured'),
      s2: mkShinobi('s2', 'available', 0, 40),
      s3: mkShinobi('s3', 'available', 0, 75),
    }
    expect(resolveActive(slot, idx)).toBe('s3')
  })
})

describe('Locked slot', () => {
  it('returns null when slot is locked and starter is unavailable', () => {
    const slot = { starter: 's1', backup: 's2', emergency: null, locked: true, promotionRule: 'auto' }
    const idx = {
      s1: mkShinobi('s1', 'injured'),
      s2: mkShinobi('s2', 'available'),
    }
    expect(resolveActive(slot, idx)).toBeNull()
  })
})
