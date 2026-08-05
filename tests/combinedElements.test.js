import { describe, it, expect } from 'vitest'
import {
  BASE_ELEMENTS, COMBINED_ELEMENTS, COMBINED_BY_ID, COMBINED_SIGNATURES, CLAN_PREDISPOSITION,
  combineElements, combinedOf, hasParent, candidateFor, rollInnate, awakeningOdds,
  combinedMissionMod, squadCombinedMod, matchupMod, signatureUnlocked, combinedBlurb,
  COMBINED_BASE_MOD, COMBINED_SPEC_MOD, MATCHUP_MOD, INNATE_CHANCE, CLAN_CHANCE,
  AWAKEN_MIN_CHAKRA, AWAKEN_MIN_WINS, AWAKEN_CHANCE, AWAKEN_CRISIS_MULT,
} from '../shared/constants/combinedElements.js'
import { CLANS } from '../shared/constants/clans.js'

const SPECS = ['combat', 'escort', 'intel', 'recovery', 'siege', 'stealth']
/** An rng that walks a fixed script, so every roll in a test is chosen not lucky. */
const scripted = (...vals) => { let i = 0; return () => vals[Math.min(i++, vals.length - 1)] }
const shinobi = (over = {}) => ({ element: 'Water', clan: null, ri: 3, wins: 30, stats: { chakra: 80 }, ...over })

describe('the combination table is complete and well formed', () => {
  it('covers every unordered pair of base elements exactly once', () => {
    const pairs = []
    for (let i = 0; i < BASE_ELEMENTS.length; i++) {
      for (let j = i + 1; j < BASE_ELEMENTS.length; j++) pairs.push([BASE_ELEMENTS[i], BASE_ELEMENTS[j]])
    }
    expect(COMBINED_ELEMENTS).toHaveLength(pairs.length)   // C(5,2) = 10
    for (const [a, b] of pairs) {
      const c = combineElements(a, b)
      expect(c, `${a}+${b} has no combination`).toBeTruthy()
      expect(combineElements(b, a), 'argument order must not matter').toBe(c)
    }
    expect(new Set(COMBINED_ELEMENTS.map(c => c.id)).size).toBe(COMBINED_ELEMENTS.length)
    expect(new Set(COMBINED_ELEMENTS.map(c => c.name)).size).toBe(COMBINED_ELEMENTS.length)
  })

  it('an element does not combine with itself, or with nonsense', () => {
    expect(combineElements('Fire', 'Fire')).toBe(null)
    expect(combineElements('Fire', null)).toBe(null)
    expect(combineElements(null, null)).toBe(null)
    expect(combineElements('Fire', 'Custard')).toBe(null)
  })

  it('every entry declares usable mechanics and a signature', () => {
    for (const c of COMBINED_ELEMENTS) {
      expect(c.parents, c.id).toHaveLength(2)
      c.parents.forEach(p => expect(BASE_ELEMENTS, c.id).toContain(p))
      expect(c.specs.length, c.id).toBeGreaterThan(0)
      c.specs.forEach(s => expect(SPECS, `${c.id} names an unknown mission spec`).toContain(s))
      c.strongInto.forEach(e => expect(BASE_ELEMENTS, `${c.id} counters an unknown element`).toContain(e))
      expect(c.signature.id, c.id).toMatch(/^ce_/)
      expect(c.signature.minRi, c.id).toBeGreaterThan(0)
      expect(Object.keys(c.signature.bonus).length, c.id).toBeGreaterThan(0)
      expect(c.blurb.length, c.id).toBeGreaterThan(20)
    }
  })

  it('signatures are shaped like JUTSU_LIST entries so existing maths reads them', () => {
    expect(COMBINED_SIGNATURES).toHaveLength(COMBINED_ELEMENTS.length)
    for (const sig of COMBINED_SIGNATURES) {
      expect(sig).toHaveProperty('n'); expect(sig).toHaveProperty('bonus')
      expect(sig).toHaveProperty('req'); expect(sig.tier).toBe('signature')
      expect(sig.desc.length).toBeGreaterThan(10)
    }
    expect(new Set(COMBINED_SIGNATURES.map(s => s.id)).size).toBe(COMBINED_SIGNATURES.length)
  })

  it('every predisposed clan is a real clan pointing at a real combination', () => {
    const names = new Set(CLANS.map(c => c.name))
    for (const [clan, id] of Object.entries(CLAN_PREDISPOSITION)) {
      expect(names, `${clan} is not a clan`).toContain(clan)
      expect(COMBINED_BY_ID[id], `${clan} points at unknown combination ${id}`).toBeTruthy()
    }
  })
})

describe('acquisition — all three paths reach a combination', () => {
  it('innate: fires on a low roll, and picks something built on their element', () => {
    const s = shinobi({ element: 'Wind' })
    const got = rollInnate(s, scripted(INNATE_CHANCE / 2, 0))
    expect(got).toBeTruthy()
    expect(got.parents).toContain('Wind')
  })

  it('innate: does not fire on a high roll', () => {
    expect(rollInnate(shinobi(), scripted(0.99))).toBe(null)
  })

  it('clan: a predisposed clan gets its own combination, at much better odds', () => {
    // Mori are Verdant (Water + Earth), so a Water-natured Mori qualifies.
    const mori = shinobi({ clan: 'Mori', element: 'Water' })
    const got = rollInnate(mori, scripted(CLAN_CHANCE - 0.01))
    expect(got.id).toBe('verdant')
    // A roll that would have passed the clan gate still fails the innate gate,
    // which is the whole point of the predisposition being worth something.
    expect(CLAN_CHANCE).toBeGreaterThan(INNATE_CHANCE)
    expect(rollInnate(mori, scripted(CLAN_CHANCE + 0.01))).toBe(null)
  })

  it('clan: predisposition is ignored when their element does not fit it', () => {
    // A Fire-natured Mori cannot be Verdant (Water + Earth) — falls back to the
    // ordinary innate path, which needs a much lower roll.
    const fireMori = shinobi({ clan: 'Mori', element: 'Fire' })
    expect(rollInnate(fireMori, scripted(CLAN_CHANCE - 0.01))).toBe(null)
    const got = rollInnate(fireMori, scripted(INNATE_CHANCE / 2, 0))
    expect(got.parents).toContain('Fire')
  })

  it('awakening: needs chakra, a career, and an element', () => {
    expect(awakeningOdds(shinobi({ stats: { chakra: AWAKEN_MIN_CHAKRA - 1 } })).eligible).toBe(false)
    expect(awakeningOdds(shinobi({ wins: AWAKEN_MIN_WINS - 1 })).eligible).toBe(false)
    expect(awakeningOdds(shinobi({ element: null })).eligible).toBe(false)
    expect(awakeningOdds(shinobi()).eligible).toBe(true)
  })

  it('awakening: a crisis multiplies the chance, and never exceeds certainty of intent', () => {
    const calm = awakeningOdds(shinobi(), { crisis: false })
    const crisis = awakeningOdds(shinobi(), { crisis: true })
    expect(calm.chance).toBeCloseTo(AWAKEN_CHANCE, 6)
    expect(crisis.chance).toBeCloseTo(AWAKEN_CHANCE * AWAKEN_CRISIS_MULT, 6)
    expect(crisis.chance).toBeGreaterThan(calm.chance)
    expect(crisis.combined.parents).toContain('Water')
  })

  it('nobody gets a second combination', () => {
    const already = shinobi({ combinedElement: 'rime' })
    expect(rollInnate(already, scripted(0))).toBe(null)
    expect(awakeningOdds(already).eligible).toBe(false)
  })

  it('candidateFor only ever offers combinations built on their own element', () => {
    for (const el of BASE_ELEMENTS) {
      for (let r = 0; r < 1; r += 0.2) {
        const c = candidateFor(shinobi({ element: el }), () => r)
        expect(c.parents, `${el} offered ${c.id}`).toContain(el)
      }
    }
  })
})

describe('mechanics — the element finally does something', () => {
  const rimeUser = { combinedElement: 'rime' }   // Water + Wind, suits stealth/escort

  it('pays a bigger modifier on the specs it suits', () => {
    expect(combinedMissionMod(rimeUser, { spec: 'stealth' })).toBe(COMBINED_SPEC_MOD)
    expect(combinedMissionMod(rimeUser, { spec: 'escort' })).toBe(COMBINED_SPEC_MOD)
    expect(combinedMissionMod(rimeUser, { spec: 'siege' })).toBe(COMBINED_BASE_MOD)
    expect(combinedMissionMod(rimeUser, {})).toBe(COMBINED_BASE_MOD)
    expect(COMBINED_SPEC_MOD).toBeGreaterThan(COMBINED_BASE_MOD)
  })

  it('pays nothing at all to a shinobi without one', () => {
    expect(combinedMissionMod({}, { spec: 'stealth' })).toBe(0)
    expect(combinedMissionMod(null, { spec: 'stealth' })).toBe(0)
    expect(matchupMod({}, 'Fire')).toBe(0)
  })

  it('a squad averages the bonus, so stacking specialists does not run away', () => {
    const m = { spec: 'stealth' }
    const solo = squadCombinedMod([rimeUser], m)
    const mixed = squadCombinedMod([rimeUser, {}, {}], m)
    const full = squadCombinedMod([rimeUser, rimeUser, rimeUser], m)
    expect(solo).toBe(COMBINED_SPEC_MOD)
    expect(mixed).toBeCloseTo(COMBINED_SPEC_MOD / 3, 6)
    expect(full).toBe(COMBINED_SPEC_MOD)          // averaged, not summed
    expect(full).toBeLessThanOrEqual(COMBINED_SPEC_MOD)
    expect(squadCombinedMod([], m)).toBe(0)
    expect(squadCombinedMod(null, m)).toBe(0)
  })

  it('the whole modifier stays small enough to tilt a mission, not decide it', () => {
    // It lands in a chain of a dozen other modifiers; a big number here would
    // quietly dominate mission resolution.
    expect(COMBINED_SPEC_MOD).toBeLessThanOrEqual(0.08)
    expect(MATCHUP_MOD).toBeLessThanOrEqual(0.08)
  })

  it('matchup edges apply only against the element they counter', () => {
    expect(matchupMod(rimeUser, 'Fire')).toBe(MATCHUP_MOD)   // Rime is strong into Fire
    expect(matchupMod(rimeUser, 'Earth')).toBe(0)
    expect(matchupMod(rimeUser, null)).toBe(0)
  })

  it('the signature unlocks at rank, not before', () => {
    const c = COMBINED_BY_ID.rime
    expect(signatureUnlocked({ combinedElement: 'rime', ri: c.signature.minRi - 1 })).toBe(false)
    expect(signatureUnlocked({ combinedElement: 'rime', ri: c.signature.minRi })).toBe(true)
    expect(signatureUnlocked({ ri: 4 })).toBe(false)
  })

  it('combinedOf and the dossier blurb tolerate junk without throwing', () => {
    expect(combinedOf(null)).toBe(null)
    expect(combinedOf({})).toBe(null)
    expect(combinedOf({ combinedElement: 'nonsense' })).toBe(null)
    expect(combinedBlurb({})).toBe(null)
    expect(combinedBlurb({ combinedElement: 'rime', combinedSource: 'awakened' })).toContain('Awakened')
    expect(combinedBlurb({ combinedElement: 'rime', combinedSource: 'clan' })).toContain('Clan')
    expect(hasParent({ element: 'Water' }, COMBINED_BY_ID.rime)).toBe(true)
    expect(hasParent({ element: 'Fire' }, COMBINED_BY_ID.rime)).toBe(false)
    expect(hasParent({}, null)).toBe(false)
  })
})
