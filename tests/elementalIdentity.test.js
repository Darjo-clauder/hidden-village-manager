import { describe, it, expect } from 'vitest'
import {
  ELEMENTS, SPECS, SPEC_MODS, ELEMENTAL_IDENTITY, IDENTITY_BY_NATION,
  identityForElement, identityForNation, elementOfNation,
  specMod, specStanding, counterMod, counterLabel, COUNTER_WHEEL, COUNTER_MOD,
  TERRAINS, TERRAIN_BY_ID, terrainMod, rollTerrain,
  NATION_TECHNIQUES, nationTechniquesFor,
  ELEMENTAL_DOCTRINES, doctrinesFor,
} from '../shared/constants/elementalIdentity.js'
import {
  SIGNATURE_MISSIONS, DIPLOMATIC_MISSIONS, signatureMissionsFor, moodFor,
  diplomaticMissionsFor, HOSTILE_BELOW, WARM_ABOVE,
} from '../shared/constants/elementalMissions.js'
import { NATIONS } from '../shared/constants/nations.js'

describe('the identity table', () => {
  it('covers all five elements and maps 1:1 onto the nation ids', () => {
    expect(Object.keys(ELEMENTAL_IDENTITY).sort()).toEqual([...ELEMENTS].sort())
    for (const el of ELEMENTS) {
      const id = identityForElement(el)
      expect(id, el).toBeTruthy()
      expect(NATIONS[id.nationId], `${el} points at unknown nation ${id.nationId}`).toBeTruthy()
      expect(elementOfNation(id.nationId)).toBe(el)
      expect(identityForNation(id.nationId)).toBe(id)
    }
    // no two elements share a nation
    expect(Object.keys(IDENTITY_BY_NATION)).toHaveLength(ELEMENTS.length)
  })

  it('every identity is complete and coherent', () => {
    for (const el of ELEMENTS) {
      const id = ELEMENTAL_IDENTITY[el]
      expect(id.accent, el).toMatch(/^#[0-9a-f]{6}$/i)   // _hexAlpha has blanked the UI once on a non-hex
      expect(id.crest.length, el).toBeGreaterThan(0)
      expect(id.creed.length, el).toBeGreaterThan(10)
      expect(id.blurb.length, el).toBeGreaterThan(30)
      expect(SPECS, el).toContain(id.signature)
      expect(SPECS, el).toContain(id.wall)
      // the declared signature and wall must match the matrix
      expect(SPEC_MODS[el][id.signature], `${el} signature`).toBeGreaterThanOrEqual(0.20)
      expect(SPEC_MODS[el][id.wall], `${el} wall`).toBeLessThanOrEqual(-0.20)
    }
  })
})

describe('the strength matrix — differently shaped, not differently sized', () => {
  /**
   * THE INVARIANT THAT STOPS ONE NATION BEING SIMPLY BEST. Rows must sum to
   * zero: every element trades exactly as much away as it gains. If a future
   * tweak breaks this, one element quietly becomes the correct pick.
   */
  it('every element sums to zero across the six specs', () => {
    for (const el of ELEMENTS) {
      const total = SPECS.reduce((a, s) => a + SPEC_MODS[el][s], 0)
      expect(total, `${el} sums to ${total}, not 0`).toBeCloseTo(0, 10)
    }
  })

  it('every element has exactly one signature and exactly one wall', () => {
    for (const el of ELEMENTS) {
      const vals = SPECS.map(s => SPEC_MODS[el][s])
      expect(vals.filter(v => v >= 0.20), `${el} signatures`).toHaveLength(1)
      expect(vals.filter(v => v <= -0.20), `${el} walls`).toHaveLength(1)
    }
  })

  it('no spec is a dead end for everyone', () => {
    // Each spec must have at least one element that is good at it, or that
    // whole branch of the mission board is a chore for every possible run.
    for (const spec of SPECS) {
      const best = Math.max(...ELEMENTS.map(el => SPEC_MODS[el][spec]))
      expect(best, `nobody is good at ${spec}`).toBeGreaterThanOrEqual(0.10)
    }
  })

  it('specMod and specStanding agree, and tolerate junk', () => {
    expect(specMod('Fire', 'siege')).toBe(0.20)
    expect(specStanding('Fire', 'siege')).toBe('signature')
    expect(specStanding('Fire', 'stealth')).toBe('wall')
    expect(specStanding('Fire', 'combat')).toBe('strong')
    expect(specStanding('Fire', 'recovery')).toBe('weak')
    expect(specStanding('Fire', 'escort')).toBe('neutral')
    expect(specMod(null, 'siege')).toBe(0)
    expect(specMod('Fire', null)).toBe(0)          // untagged missions cost nothing
    expect(specMod('Nonsense', 'siege')).toBe(0)
  })
})

describe('the counter wheel — texture, not a lever', () => {
  it('is a closed five-cycle with no element countering itself', () => {
    const seen = new Set()
    let cur = 'Fire'
    for (let i = 0; i < ELEMENTS.length; i++) {
      expect(ELEMENTS).toContain(cur)
      expect(seen.has(cur), 'wheel repeats before closing').toBe(false)
      seen.add(cur)
      expect(COUNTER_WHEEL[cur]).not.toBe(cur)
      cur = COUNTER_WHEEL[cur]
    }
    expect(cur, 'wheel does not close').toBe('Fire')
    expect(seen.size).toBe(ELEMENTS.length)
  })

  it('is symmetric and capped where it applies', () => {
    for (const el of ELEMENTS) {
      const prey = COUNTER_WHEEL[el]
      expect(counterMod(el, prey)).toBe(COUNTER_MOD)
      expect(counterMod(prey, el)).toBe(-COUNTER_MOD)
      expect(counterMod(el, el)).toBe(0)
    }
    // Stays at or below the combined-element matchup it sits alongside.
    expect(COUNTER_MOD).toBeLessThanOrEqual(0.05)
  })

  it('labels a matchup only when one exists', () => {
    expect(counterLabel('Fire', 'Wind')).toContain('Fire')
    expect(counterLabel('Wind', 'Fire')).toContain('Fire')
    expect(counterLabel('Fire', 'Fire')).toBe(null)
    expect(counterLabel(null, 'Fire')).toBe(null)
  })
})

describe('terrain', () => {
  it('every terrain is well formed and argues with real elements', () => {
    expect(TERRAINS.length).toBeGreaterThanOrEqual(5)
    for (const t of TERRAINS) {
      expect(TERRAIN_BY_ID[t.id]).toBe(t)
      expect(t.desc.length).toBeGreaterThan(10)
      expect(Object.keys(t.mods).length).toBeGreaterThan(0)
      for (const [el, v] of Object.entries(t.mods)) {
        expect(ELEMENTS, `${t.id} names unknown element ${el}`).toContain(el)
        expect(Math.abs(v), `${t.id}/${el} is too strong`).toBeLessThanOrEqual(0.15)
      }
    }
  })

  it('helps someone and hurts someone overall, so no terrain is a flat tax', () => {
    const anyPositive = TERRAINS.some(t => Object.values(t.mods).some(v => v > 0))
    const anyNegative = TERRAINS.some(t => Object.values(t.mods).some(v => v < 0))
    expect(anyPositive && anyNegative).toBe(true)
    // and every element is helped by at least one terrain
    for (const el of ELEMENTS) {
      expect(TERRAINS.some(t => (t.mods[el] || 0) > 0), `${el} is never favoured anywhere`).toBe(true)
    }
  })

  it('terrainMod and rollTerrain behave', () => {
    expect(terrainMod('downpour', 'Fire')).toBeLessThan(0)
    expect(terrainMod('downpour', 'Water')).toBeGreaterThan(0)
    expect(terrainMod('downpour', 'Earth')).toBe(0)
    expect(terrainMod(null, 'Fire')).toBe(0)
    expect(terrainMod('nonsense', 'Fire')).toBe(0)
    for (let i = 0; i < 40; i++) expect(TERRAIN_BY_ID[rollTerrain()]).toBeTruthy()
  })
})

describe('nation techniques', () => {
  it('every element gets techniques, and each names a real element', () => {
    for (const el of ELEMENTS) {
      expect(nationTechniquesFor(el).length, `${el} has no techniques`).toBeGreaterThan(0)
    }
    const ids = new Set()
    for (const t of NATION_TECHNIQUES) {
      expect(ELEMENTS, `${t.id} names unknown element`).toContain(t.element)
      expect(ids.has(t.id), `duplicate technique id ${t.id}`).toBe(false)
      ids.add(t.id)
      expect(t.tier).toBe('nation')
      expect(Object.keys(t.bonus).length).toBeGreaterThan(0)
      expect(t.desc.length).toBeGreaterThan(10)
    }
  })

  /**
   * The rare-jutsu finding: content behind a gate nobody clears is content we
   * did not write. These need only rank and service, never a lottery.
   */
  it('no technique is gated behind a roll rather than a career', () => {
    for (const t of NATION_TECHNIQUES) {
      expect(t.req.prodigy, `${t.id} is behind a prodigy roll`).toBeFalsy()
      const bar = t.req.wins ?? t.req.winsB ?? t.req.winsS ?? 0
      expect(bar, `${t.id} demands too long a career`).toBeLessThanOrEqual(30)
    }
  })

  it('each element gets a comparable amount', () => {
    const counts = ELEMENTS.map(el => nationTechniquesFor(el).length)
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1)
  })
})

describe('elemental doctrines', () => {
  it('one per element, shaped like the generic ones so consumers read them unchanged', () => {
    expect(ELEMENTAL_DOCTRINES).toHaveLength(ELEMENTS.length)
    for (const d of ELEMENTAL_DOCTRINES) {
      expect(ELEMENTS).toContain(d.element)
      for (const k of ['id', 'n', 'icon', 'desc']) expect(d[k], `${d.id}.${k}`).toBeTruthy()
      for (const k of ['defBonus', 'incomeMod', 'growthMod']) {
        expect(typeof d[k], `${d.id}.${k}`).toBe('number')
      }
    }
    expect(new Set(ELEMENTAL_DOCTRINES.map(d => d.id)).size).toBe(ELEMENTS.length)
  })

  it('doctrinesFor adds exactly the element-exclusive one to the generic list', () => {
    const generic = [{ id: 'fortress' }, { id: 'commerce' }, { id: 'sage' }]
    const fire = doctrinesFor('Fire', generic)
    expect(fire).toHaveLength(generic.length + 1)
    expect(fire.filter(d => d.element === 'Fire')).toHaveLength(1)
    expect(fire.filter(d => d.element && d.element !== 'Fire')).toHaveLength(0)
    // An unthemed village still gets the generic three and nothing exclusive.
    expect(doctrinesFor(null, generic)).toHaveLength(generic.length)
  })

  /**
   * The generic doctrines set the exchange rate: `fortress` trades +20 defense
   * for −8% income and is evidently meant to be an even swap, so 1 defense is
   * worth about 0.004 income. Valued that way the three generics run 0.00
   * (fortress) to 0.12 (sage), which is the band an exclusive doctrine has to
   * live in — and two of these originally did not, which this caught.
   */
  const DEF_RATE = 0.004
  const doctrineValue = d => d.defBonus * DEF_RATE + d.incomeMod + d.growthMod

  it('every elemental doctrine trades something away', () => {
    for (const d of ELEMENTAL_DOCTRINES) {
      const gains = [d.defBonus, d.incomeMod, d.growthMod].filter(v => v > 0).length
      const costs = [d.defBonus, d.incomeMod, d.growthMod].filter(v => v < 0).length
      expect(gains, `${d.id} gains nothing`).toBeGreaterThan(0)
      expect(costs, `${d.id} is pure upside — it must give something up`).toBeGreaterThan(0)
    }
  })

  it('none is worth conspicuously more than the generic three', () => {
    for (const d of ELEMENTAL_DOCTRINES) {
      const v = doctrineValue(d)
      expect(v, `${d.id} is worth ${v.toFixed(3)}, below the generic band`).toBeGreaterThan(0.02)
      expect(v, `${d.id} is worth ${v.toFixed(3)}, above sage at 0.12`).toBeLessThanOrEqual(0.13)
    }
  })
})

describe('elemental and diplomatic contracts', () => {
  it('every element has signature contracts, tagged to its signature spec', () => {
    for (const el of ELEMENTS) {
      const pool = signatureMissionsFor(el)
      expect(pool.length, `${el} has no signature contracts`).toBeGreaterThan(0)
      for (const m of pool) {
        expect(m.spec, `${el} contract ${m.n} is off-spec`).toBe(ELEMENTAL_IDENTITY[el].signature)
        expect(m.flavour.length).toBeGreaterThan(20)
        expect(['D', 'C', 'B', 'A', 'S'], `${m.n} has rank ${m.rk}`).toContain(m.rk)
        for (const k of ['ryo', 'rep', 'dur', 'risk', 'mp']) {
          expect(Number.isFinite(m[k]), `${m.n}.${k} is not a number`).toBe(true)
        }
      }
    }
    expect(new Set(SIGNATURE_MISSIONS.map(m => m.n)).size).toBe(SIGNATURE_MISSIONS.length)
  })

  it('mood gates on relations, with a neutral band that offers nothing', () => {
    expect(moodFor(0)).toBe('hostile')
    expect(moodFor(HOSTILE_BELOW - 1)).toBe('hostile')
    expect(moodFor(HOSTILE_BELOW)).toBe(null)
    expect(moodFor(50)).toBe(null)
    expect(moodFor(WARM_ABOVE)).toBe(null)
    expect(moodFor(WARM_ABOVE + 1)).toBe('warm')
    expect(moodFor(undefined)).toBe(null)          // unknown relations are unremarkable
  })

  it('diplomatic contracts name the actual village', () => {
    const hostile = diplomaticMissionsFor({ n: 'Cragmoor', rel: 10 })
    expect(hostile.length).toBeGreaterThan(0)
    for (const m of hostile) {
      expect(m.n, 'placeholder left unsubstituted').not.toContain('{village}')
      expect(m.n).toContain('Cragmoor')
      expect(m.village).toBe('Cragmoor')
    }
    const warm = diplomaticMissionsFor({ n: 'Tidefort', rel: 90 })
    expect(warm.length).toBeGreaterThan(0)
    expect(warm.every(m => m.mood === 'warm')).toBe(true)
    // Most relationships should offer nothing, or the board fills with grievances.
    expect(diplomaticMissionsFor({ n: 'Mistral', rel: 50 })).toEqual([])
    expect(diplomaticMissionsFor(null)).toEqual([])
    expect(diplomaticMissionsFor({ rel: 10 })).toEqual([])   // nameless village
  })

  it('both moods are represented and every template has a real spec', () => {
    const moods = new Set(DIPLOMATIC_MISSIONS.map(m => m.mood))
    expect([...moods].sort()).toEqual(['hostile', 'warm'])
    for (const m of DIPLOMATIC_MISSIONS) {
      expect(SPECS, `${m.n} has unknown spec ${m.spec}`).toContain(m.spec)
      expect(m.n).toContain('{village}')
    }
  })
})
