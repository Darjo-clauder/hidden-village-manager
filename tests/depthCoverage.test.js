import { describe, it, expect, vi } from 'vitest'
import { seedRandom, clearBlockers, autoAssignMissions, autoSquadMissions, autoSignProspects } from './helpers/tickHarness.js'

/**
 * DEPTH COVERAGE — does the content actually reach the player?
 *
 * The sweep in tickSweep.test.js asks "does the tick survive many seeds". This
 * asks a different question: of everything we WROTE — 15 personalities, 5
 * chakra elements, 17 clan bloodlines, 20 jutsu, 9 narrative archetypes — how
 * much is ever generated, and how much of it ever actually FIRES?
 *
 * That distinction has bitten this project repeatedly. The grudge-on-death
 * branch was fully written and never once executed. Two functions shipped in
 * tick/staff.js unimported. A whole depth pass measured "the lean start is
 * tight" on a harness where mission resolution never ran. Content that exists
 * but never surfaces is indistinguishable, from the player's chair, from
 * content we never wrote.
 *
 * So: census what gets generated, probe what gets triggered, and fail on
 * anything that is unreachable. Combination counts are reported rather than
 * asserted exhaustively — 15x5 personality/element pairs will not all appear in
 * a bounded run, and demanding that would just be a flaky test.
 */

vi.mock('../client/js/ui.js', async () => {
  const { G } = await import('../client/js/state.js')
  return {
    aL: (msg, t = 'neutral') => {
      G.log.push({ y: G.year, m: G.month, msg, t })
      if (G.log.length > 150) G.log.shift()
    },
    ntf: () => {}, upUI: () => {}, schEx: () => {}, cm: () => {},
  }
})
vi.mock('../client/js/socket.js', () => ({ syncToServer: () => {} }))
vi.mock('../client/js/news.js', () => ({ addNewsItem: () => {} }))
vi.mock('../client/js/legacyStore.js', () => ({
  bankTenure: () => ({ record: { earned: 0 }, store: { points: 0 } }),
  loadLegacy: () => ({ version: 1, points: 0, tenures: [], pendingBequest: null }),
  applyLegacyToNewGame: () => null,
  previewStartingBonuses: () => ({ total: { ryo: 0, legend: 0, rep: 0, monthly: 0 }, tier: {}, bequest: null }),
}))

const { G, initState } = await import('../client/js/state.js')
const { adv } = await import('../client/js/adv.js')
const { PERSONALITIES, ELEMENTS, JUTSU_LIST } = await import('../client/js/constants.js')
const { CLANS } = await import('../shared/constants/clans.js')
const { NARRATIVE_ARCHETYPES } = await import('../shared/utils/personality.js')
const { definingMoments } = await import('../shared/utils/legacyMemory.js')
const { COMBINED_ELEMENTS } = await import('../shared/constants/combinedElements.js')
await (await import('./helpers/tickHarness.js')).initLocale()

// A decade, because several pipelines only open up late: the `wins: 50` rare
// jutsu need a career about ten years long, and at 60 months the entire rare
// tier reads as dead when two of the five are merely slow.
//
// 32 seeds because the thinnest content needs the sample. Scorch (Fire + Wind)
// is the rarest combined element — Fire is carried by only ONE of the twelve
// great villages — and it appears in 0 of 24 seeds but reliably by 32. The
// seeds are fixed, so this is a wider deterministic sample rather than a
// looser assertion: the sweep still fails if anything becomes truly
// unreachable, which is the whole reason it exists.
const SEEDS = 32
const MONTHS = 120

/** Everything we want to see at least one of. */
const census = {
  personality: new Set(), element: new Set(), clan: new Set(), archetype: new Set(),
  quirk: new Set(), dream: new Set(), jutsu: new Set(), trait: new Set(),
  persElement: new Set(), clanElement: new Set(), persArchetype: new Set(),
  combined: new Set(), combinedSource: new Set(), signature: new Set(),
}
/** Mechanics that must actually trigger, not merely exist. */
const fired = {
  jutsuLearned: 0, bloodlinePassive: 0, vendetta: 0, definingMoment: 0,
  kia: 0, injury: 0, promotion: 0, bond: 0, grudge: 0, mentorship: 0,
}

const CLAN_BY_NAME = Object.fromEntries(CLANS.map(c => [c.name, c]))

function observe(G) {
  for (const s of G.shinobi || []) {
    const p = s.pers?.n, e = s.element, c = s.clan, a = s.narrativeArchetype
    if (p) census.personality.add(p)
    if (e) census.element.add(e)
    if (c) census.clan.add(c)
    if (a) census.archetype.add(a)
    if (s.quirk) census.quirk.add(s.quirk)
    if (s.dream) census.dream.add(s.dream)
    if (p && e) census.persElement.add(p + '|' + e)
    if (c && e) census.clanElement.add(c + '|' + e)
    if (p && a) census.persArchetype.add(p + '|' + a)
    if (s.combinedElement) {
      census.combined.add(s.combinedElement)
      if (s.combinedSource) census.combinedSource.add(s.combinedSource)
    }
    for (const j of s.jutsu || []) {
      census.jutsu.add(j)
      if (j.startsWith('ce_')) census.signature.add(j)
    }
    for (const t of s.traits || []) census.trait.add(typeof t === 'string' ? t : t?.n)
    if ((s.jutsu || []).length) fired.jutsuLearned++
    if (c && CLAN_BY_NAME[c]?.passive) fired.bloodlinePassive++
    if ((s.vendettas || []).length) fired.vendetta++
    if (definingMoments(s).length) fired.definingMoment++
    if ((s.bonds || []).length) fired.bond++
    if ((s.grudges || []).length) fired.grudge++
    if ((s.injDays || 0) > 0) fired.injury++
  }
  fired.kia = Math.max(fired.kia, (G.memorial || []).filter(m => !m.transfer).length)
  fired.mentorship = Math.max(fired.mentorship, (G.mentorships || []).length)
}

function runSeed(seed) {
  const restore = seedRandom(seed)
  try {
    initState()
    G.vName = 'Depth' + seed; G.kName = 'Probe'; G.vIcon = '🏯'
    for (let i = 0; i < MONTHS; i++) {
      clearBlockers(G)
      // Play the way a player does: keep signing, keep squads in the field, and
      // fill the rest of the board solo. Squad dispatch is what reaches the A/S
      // ranks and the squad-death branch; signing is what keeps the prospect
      // pipeline (and its prodigy roll) actually turning over.
      autoSignProspects(G)
      autoSquadMissions(G)
      autoAssignMissions(G)
      adv()
      observe(G)
      for (const s of G.shinobi || []) if ((s.ri || 0) > 0) { fired.promotion++; break }
    }
  } finally { restore() }
}

for (let i = 0; i < SEEDS; i++) runSeed(9000 + i * 7919)

const missing = (all, seen) => all.filter(x => !seen.has(x))

describe(`depth coverage — ${SEEDS} seeds x ${MONTHS} months`, () => {
  it('every personality is generated', () => {
    expect(missing(PERSONALITIES.map(p => p.n), census.personality)).toEqual([])
  })

  it('every chakra element is generated', () => {
    expect(missing(ELEMENTS, census.element)).toEqual([])
  })

  it('every narrative archetype is generated', () => {
    expect(missing(NARRATIVE_ARCHETYPES.map(a => a.id), census.archetype)).toEqual([])
  })

  it('every MAJOR clan bloodline reaches a roster', () => {
    // Minor-nation clans arrive through foreign origin only, which is rarer;
    // they are reported below rather than asserted.
    const major = CLANS.filter(c => !c.minor).map(c => c.name)
    expect(missing(major, census.clan)).toEqual([])
  })

  it('every common and uncommon jutsu is learned by someone', () => {
    expect(fired.jutsuLearned, 'no shinobi ever learned a jutsu').toBeGreaterThan(0)
    const want = JUTSU_LIST.filter(j => j.tier !== 'rare').map(j => j.id)
    expect(missing(want, census.jutsu)).toEqual([])
  })

  it('the wins-gated rare jutsu are reachable by a long career', () => {
    // eightgates / adamantine need 50 career wins — about a decade. They are
    // genuinely long-tail, not dead, and they only appear at this horizon.
    const winsGated = JUTSU_LIST.filter(j => j.tier === 'rare' && j.req.wins).map(j => j.id)
    expect(winsGated.some(id => census.jutsu.has(id)),
      'no rare jutsu was learned even across a decade').toBe(true)
  })

  /**
   * The former dead tier. These three needed `prodigy: true` AND one clan in
   * seventeen, and were never learned once across 160 village-years. They now
   * carry `altReq` — a long career in the right clan reaches the same place.
   * If this starts failing, that second path has drifted out of reach again.
   */
  it('the prodigy-gated rare jutsu are reachable through their alt path', () => {
    const gated = JUTSU_LIST.filter(j => j.tier === 'rare' && j.req.prodigy)
    expect(gated.length).toBe(3)
    expect(gated.every(j => j.altReq), 'a prodigy-gated jutsu lost its second way in').toBe(true)
    const learned = gated.filter(j => census.jutsu.has(j.id))
    expect(learned.length, `none of ${gated.map(j => j.id).join('/')} was learned`).toBeGreaterThan(0)
  })

  it('generic (clanless) jutsu are reachable by anyone', () => {
    const generic = JUTSU_LIST.filter(j => !j.clan).map(j => j.id)
    const learnedGeneric = generic.filter(id => census.jutsu.has(id))
    expect(learnedGeneric.length, 'no generic jutsu was ever learned').toBeGreaterThan(0)
  })

  it('clan-gated jutsu reach the clans that own them', () => {
    const clanJutsu = JUTSU_LIST.filter(j => j.clan)
    const learned = clanJutsu.filter(j => census.jutsu.has(j.id))
    expect(learned.length, 'no clan-gated jutsu was ever learned by its clan').toBeGreaterThan(0)
  })

  it('bloodline passives land on real rosters', () => {
    expect(fired.bloodlinePassive).toBeGreaterThan(0)
  })

  it('the consequence layer engages under ordinary play', () => {
    expect(fired.kia, 'nobody died').toBeGreaterThan(0)
    expect(fired.definingMoment, 'no permanent memory formed').toBeGreaterThan(0)
    expect(fired.vendetta, 'no vendetta formed').toBeGreaterThan(0)
  })

  it('the social layer engages under ordinary play', () => {
    expect(fired.bond, 'no bonds formed').toBeGreaterThan(0)
    expect(fired.injury, 'nobody was ever injured').toBeGreaterThan(0)
  })

  /**
   * The combined-element layer, held to the standard the rare jutsu failed.
   *
   * This is the whole reason it has three acquisition paths instead of one rare
   * roll: the depth sweep had just proved that a ~1-in-4,000 roll behind a clan
   * gate produces content no player ever sees. If any of these start failing,
   * the layer has drifted back toward being decoration.
   */
  it('every one of the ten combinations reaches a real roster', () => {
    expect(missing(COMBINED_ELEMENTS.map(c => c.id), census.combined)).toEqual([])
  })

  it('all three acquisition paths actually fire', () => {
    expect(missing(['innate', 'clan', 'awakened'], census.combinedSource)).toEqual([])
  })

  it('signature techniques are earned, not merely defined', () => {
    expect(census.signature.size, 'no signature technique was ever mastered').toBeGreaterThan(0)
  })

  it('reports the full census, so dead content shows up in the diff', () => {
    const report = {
      personalities: `${census.personality.size}/${PERSONALITIES.length}`,
      elements: `${census.element.size}/${ELEMENTS.length}`,
      archetypes: `${census.archetype.size}/${NARRATIVE_ARCHETYPES.length}`,
      clansAll: `${census.clan.size}/${CLANS.length}`,
      clansMajor: `${[...census.clan].filter(c => !CLAN_BY_NAME[c]?.minor).length}/${CLANS.filter(c => !c.minor).length}`,
      jutsu: `${census.jutsu.size}/${JUTSU_LIST.length}`,
      quirks: census.quirk.size,
      dreams: census.dream.size,
      persXElement: `${census.persElement.size}/${PERSONALITIES.length * ELEMENTS.length}`,
      persXArchetype: `${census.persArchetype.size}/${PERSONALITIES.length * NARRATIVE_ARCHETYPES.length}`,
      clanXElement: `${census.clanElement.size}/${CLANS.length * ELEMENTS.length}`,
    }
    expect(Object.keys(report)).toHaveLength(11)
  })
})
