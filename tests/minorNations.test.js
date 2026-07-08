import { describe, it, expect } from 'vitest'
import {
  MINOR_NATIONS, MINOR_BY_NAME, minorStrength, pickMinorNation, applyMinorOrigin,
} from '../shared/constants/minorNations.js'
import { REGIONS } from '../client/js/constants.js'
import { G, genTransferPool } from '../client/js/state.js'
import { mulberry32, withSeed } from './helpers/rng.js'

const STAT_KEYS = ['ninjutsu', 'taijutsu', 'genjutsu', 'chakra', 'intelligence', 'speed']

describe('minor nations — data shape', () => {
  it('has 8 nations with unique names and valid regions/tiers/specialties', () => {
    expect(MINOR_NATIONS.length).toBe(8)
    const names = new Set(MINOR_NATIONS.map(m => m.n))
    expect(names.size).toBe(8)
    const regionIds = new Set(REGIONS.map(r => r.id))
    MINOR_NATIONS.forEach(m => {
      expect(regionIds.has(m.region), `${m.n} region ${m.region}`).toBe(true)
      expect(['C', 'D']).toContain(m.tier)
      expect(STAT_KEYS).toContain(m.specialty)
      expect(m.blurb.length).toBeGreaterThan(0)
      expect(MINOR_BY_NAME[m.n]).toBe(m)
    })
  })

  it('minor-nation names never collide with the great-village pool', () => {
    const pool = ['Dunehold', 'Tidefort', 'Stoneveil', 'Stormreach', 'Wellspring', 'Verdancross',
      'Frostmere', 'Starhaven', 'Cragmoor', 'Emberfall', 'Mistral', 'Thornveil']
    MINOR_NATIONS.forEach(m => expect(pool).not.toContain(m.n))
  })
})

describe('minor nations — helpers', () => {
  it('minorStrength respects tier bands (C: 38–55, D: 26–42)', () => {
    const rng = mulberry32(3)
    MINOR_NATIONS.forEach(m => {
      for (let i = 0; i < 50; i++) {
        const s = minorStrength(m, rng)
        if (m.tier === 'C') { expect(s).toBeGreaterThanOrEqual(38); expect(s).toBeLessThanOrEqual(55) }
        else { expect(s).toBeGreaterThanOrEqual(26); expect(s).toBeLessThanOrEqual(42) }
      }
    })
  })

  it('pickMinorNation honors the region filter and falls back gracefully', () => {
    const rng = mulberry32(9)
    for (let i = 0; i < 40; i++) expect(pickMinorNation(rng, 'water').region).toBe('water')
    // Unknown region → any nation rather than a crash
    expect(MINOR_NATIONS).toContain(pickMinorNation(rng, 'no-such-region'))
  })

  it('applyMinorOrigin tags the shinobi and bumps the specialty within clamps', () => {
    const nation = MINOR_BY_NAME.Galecrest // tier C, speed
    const s = { stats: { speed: 40, ninjutsu: 30 } }
    applyMinorOrigin(s, nation, mulberry32(5))
    expect(s.origin).toBe('Galecrest')
    expect(s.minorNation).toBe('Galecrest')
    expect(s.stats.speed).toBeGreaterThanOrEqual(46)  // C bump: 6–10
    expect(s.stats.speed).toBeLessThanOrEqual(50)
    expect(s.stats.ninjutsu).toBe(30)
    const hi = { stats: { speed: 97 } }
    applyMinorOrigin(hi, nation, mulberry32(5))
    expect(hi.stats.speed).toBe(99)
  })
})

describe('minor nations — transfer pool integration', () => {
  it('village-listed origins come from live rivals or minor nations; specialists are minor-nation exports', () => {
    withSeed(1234, () => {
      G.villages = [{ n: 'Stormreach' }, { n: 'Frostmere' }, { n: 'Cragmoor' }]
      const live = new Set(G.villages.map(v => v.n))
      for (let run = 0; run < 20; run++) {
        const pool = genTransferPool()
        pool.filter(p => p.transferCategory === 'village_listed').forEach(p => {
          const ok = live.has(p.originVillage) || !!MINOR_BY_NAME[p.originVillage]
          expect(ok, `unexpected origin ${p.originVillage}`).toBe(true)
          if (MINOR_BY_NAME[p.originVillage]) expect(p.minorNation).toBe(p.originVillage)
        })
        pool.filter(p => p.transferCategory === 'foreign_specialist').forEach(p => {
          const nation = MINOR_BY_NAME[p.originVillage]
          expect(nation, `specialist origin ${p.originVillage} not a minor nation`).toBeTruthy()
          expect(p.stats[nation.specialty]).toBeGreaterThanOrEqual(40) // spiked specialty
        })
      }
    })
  })
})

describe('minor-nation clans (applyMinorOrigin)', () => {
  it('assigns the nation clan to a clanless recruit when the roll passes', () => {
    const nation = MINOR_BY_NAME['Galecrest']  // clan Kazehai
    const s = { stats: { speed: 40, taijutsu: 40 } }
    applyMinorOrigin(s, nation, () => 0.1)      // roll 0.1 < 0.4 -> clan assigned
    expect(s.clan).toBe('Kazehai')
    expect(s.trait).toBe('Gale Step')
    expect(s.stats.speed).toBeGreaterThan(40)   // clan stat bias applied
  })
  it('does NOT override an existing (great) clan', () => {
    const nation = MINOR_BY_NAME['Galecrest']
    const s = { clan: 'Mori', trait: 'Forest Birth', stats: { speed: 40 } }
    applyMinorOrigin(s, nation, () => 0.1)
    expect(s.clan).toBe('Mori')                 // untouched
  })
  it('skips clan when the roll fails', () => {
    const nation = MINOR_BY_NAME['Galecrest']
    const s = { stats: { speed: 40 } }
    applyMinorOrigin(s, nation, () => 0.9)      // 0.9 !< 0.4
    expect(s.clan).toBeUndefined()
  })
  it('every minor nation defines a clan with a stat bias', () => {
    MINOR_NATIONS.forEach(m => {
      expect(m.clan).toBeTruthy()
      expect(m.clan.name).toBeTruthy()
      expect(Object.keys(m.clan.b).length).toBeGreaterThan(0)
    })
  })
})
