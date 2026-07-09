import { describe, it, expect } from 'vitest'
import { NATION_ARENAS, SPECIAL_ARENAS, arenaFor, hashArenaKey } from '../shared/constants/arenas.js'
import { VILLAGE_IDENTITIES } from '../shared/constants/villageIdentity.js'

const HEX = /^#[0-9a-f]{6}$/i
const PROP_TYPES = new Set(['ring', 'disc', 'rect', 'diamond', 'hatch'])

function checkArena(a, key) {
  expect(a.id, `${key} missing id`).toBeTruthy()
  expect(a.name, `${key} missing name`).toBeTruthy()
  const { ground, groundAlt, line, accent, glow } = a.palette
  ;[ground, groundAlt, line, accent, glow].forEach(c => expect(c, `${key} palette`).toMatch(HEX))
  ;(a.props || []).forEach(p => {
    expect(PROP_TYPES.has(p.type), `${key} prop type ${p.type}`).toBe(true)
    expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(100)
    expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(100)
    if (p.w != null) { expect(p.x + p.w).toBeLessThanOrEqual(100) }
    if (p.h != null) { expect(p.y + p.h).toBeLessThanOrEqual(100) }
  })
}

describe('arenas — nation venues', () => {
  it('every league nation has a themed home arena', () => {
    Object.keys(VILLAGE_IDENTITIES).forEach(v => {
      expect(NATION_ARENAS[v], `${v} has no arena`).toBeTruthy()
    })
  })

  it('all nation arenas are well-formed and visually distinct', () => {
    const grounds = new Set()
    Object.entries(NATION_ARENAS).forEach(([k, a]) => { checkArena(a, k); grounds.add(a.palette.ground) })
    // Each nation reads differently on the pitch.
    expect(grounds.size).toBe(Object.keys(NATION_ARENAS).length)
  })

  it('all special layouts are well-formed', () => {
    Object.entries(SPECIAL_ARENAS).forEach(([k, a]) => checkArena(a, k))
    // The promised specials exist: mission types + academy day + brackets.
    ;['mission_stealth', 'mission_combat', 'mission_escort', 'mission_siege', 'mission_intel', 'mission_recovery', 'academy', 'exam_forest', 'tournament', 'neutral']
      .forEach(id => expect(SPECIAL_ARENAS[id], `missing special ${id}`).toBeTruthy())
  })
})

describe('arenas — resolver', () => {
  it('league matches play in the home nation venue', () => {
    expect(arenaFor('league', { homeVillage: 'Dunehold' }).id).toBe('dunehold')
    expect(arenaFor('league', { homeVillage: 'Frostmere' }).id).toBe('frostmere')
  })

  it('a custom (player) village hashes to a stable nation theme', () => {
    const a1 = arenaFor('league', { homeVillage: 'Kasumi Hollow' })
    const a2 = arenaFor('league', { homeVillage: 'Kasumi Hollow' })
    expect(a1.id).toBe(a2.id)                       // deterministic
    expect(Object.values(NATION_ARENAS)).toContain(a1)
    // hash handles the empty string without throwing
    expect(NATION_ARENAS[hashArenaKey('')]).toBeTruthy()
  })

  it('brackets, missions and academy days get their special grounds', () => {
    expect(arenaFor('exam').id).toBe('exam_forest')
    expect(arenaFor('tournament').id).toBe('tournament')
    expect(arenaFor('academy').id).toBe('academy')
    expect(arenaFor('mission', { spec: 'stealth' }).id).toBe('mission_stealth')
    expect(arenaFor('mission', { spec: 'siege' }).id).toBe('mission_siege')
    // unknown/missing spec falls back to the combat field, unknown kind to neutral
    expect(arenaFor('mission', { spec: 'nope' }).id).toBe('mission_combat')
    expect(arenaFor('mission').id).toBe('mission_combat')
    expect(arenaFor('???').id).toBe('neutral')
  })
})
