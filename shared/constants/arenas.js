/**
 * Arena definitions for the animated 2D match view (FM24/FHM-style pitch).
 *
 * Every nation in the league has a home arena with its own palette, terrain
 * banding and prop layout, so a matchday in Dunehold *looks* like the desert
 * and one in Frostmere looks like the ice. On top of the twelve nation venues
 * there are special layouts for mission types (stealth/combat/escort/siege/
 * intel/recovery), the academy training ground, the Adept Exam forest bracket
 * and the Grand Tournament colosseum.
 *
 * Pure data + a resolver — no DOM, no G. The client pitch renderer consumes
 * these; coordinates are normalized 0..100 on both axes (landscape pitch).
 *
 * prop types the renderer understands:
 *   ring    — hollow circle   { x, y, r }
 *   disc    — filled circle   { x, y, r }
 *   rect    — filled rect     { x, y, w, h }
 *   diamond — rotated square  { x, y, r }
 *   hatch   — diagonal strokes in a rect { x, y, w, h }
 */

export const NATION_ARENAS = {
  Dunehold: {
    id: 'dunehold', name: 'The Dunebowl', terrain: 'sand',
    palette: { ground: '#2a2113', groundAlt: '#332817', line: '#c9a84c', accent: '#e0b96a', glow: '#8a6a2a' },
    props: [
      { type: 'diamond', x: 14, y: 20, r: 5 }, { type: 'diamond', x: 86, y: 80, r: 5 },
      { type: 'ring', x: 50, y: 50, r: 16 }, { type: 'hatch', x: 2, y: 2, w: 12, h: 96 }, { type: 'hatch', x: 86, y: 2, w: 12, h: 96 },
    ],
  },
  Tidefort: {
    id: 'tidefort', name: 'Tidewall Basin', terrain: 'water',
    palette: { ground: '#0d1a22', groundAlt: '#10212b', line: '#6fb3c9', accent: '#8fd0e0', glow: '#2a5a6a' },
    props: [
      { type: 'ring', x: 50, y: 50, r: 18 }, { type: 'ring', x: 50, y: 50, r: 26 },
      { type: 'disc', x: 10, y: 12, r: 2.5 }, { type: 'disc', x: 90, y: 88, r: 2.5 }, { type: 'disc', x: 10, y: 88, r: 2.5 }, { type: 'disc', x: 90, y: 12, r: 2.5 },
    ],
  },
  Stoneveil: {
    id: 'stoneveil', name: 'The Granite Ring', terrain: 'stone',
    palette: { ground: '#1a1a1c', groundAlt: '#202024', line: '#9a9aa2', accent: '#c0c0c8', glow: '#4a4a52' },
    props: [
      { type: 'rect', x: 4, y: 40, w: 6, h: 20 }, { type: 'rect', x: 90, y: 40, w: 6, h: 20 },
      { type: 'rect', x: 44, y: 4, w: 12, h: 5 }, { type: 'rect', x: 44, y: 91, w: 12, h: 5 },
      { type: 'ring', x: 50, y: 50, r: 14 },
    ],
  },
  Stormreach: {
    id: 'stormreach', name: 'Tempest Yard', terrain: 'storm',
    palette: { ground: '#141420', groundAlt: '#191a28', line: '#8f8fd0', accent: '#b0b0f0', glow: '#3a3a7a' },
    props: [
      { type: 'hatch', x: 20, y: 8, w: 60, h: 10 }, { type: 'hatch', x: 20, y: 82, w: 60, h: 10 },
      { type: 'diamond', x: 50, y: 50, r: 10 }, { type: 'disc', x: 25, y: 50, r: 2 }, { type: 'disc', x: 75, y: 50, r: 2 },
    ],
  },
  Wellspring: {
    id: 'wellspring', name: 'The Deepwell', terrain: 'spring',
    palette: { ground: '#0e1c18', groundAlt: '#12231e', line: '#7ac9a8', accent: '#9ae0c2', glow: '#2a6a52' },
    props: [
      { type: 'ring', x: 50, y: 50, r: 10 }, { type: 'ring', x: 50, y: 50, r: 20 }, { type: 'ring', x: 50, y: 50, r: 30 },
    ],
  },
  Verdancross: {
    id: 'verdancross', name: 'Wildgrove Pitch', terrain: 'grove',
    palette: { ground: '#14200e', groundAlt: '#182712', line: '#8fbc5f', accent: '#b0e07a', glow: '#3f6a2a' },
    props: [
      { type: 'disc', x: 12, y: 18, r: 4 }, { type: 'disc', x: 88, y: 22, r: 3 }, { type: 'disc', x: 15, y: 80, r: 3 },
      { type: 'disc', x: 85, y: 76, r: 4 }, { type: 'ring', x: 50, y: 50, r: 15 },
    ],
  },
  Frostmere: {
    id: 'frostmere', name: 'The Frostring', terrain: 'ice',
    palette: { ground: '#141a20', groundAlt: '#182029', line: '#a8cfe8', accent: '#d0eaf8', glow: '#4a6a8a' },
    props: [
      { type: 'ring', x: 50, y: 50, r: 17 }, { type: 'diamond', x: 12, y: 50, r: 4 }, { type: 'diamond', x: 88, y: 50, r: 4 },
      { type: 'hatch', x: 30, y: 44, w: 40, h: 12 },
    ],
  },
  Starhaven: {
    id: 'starhaven', name: 'Celestial Court', terrain: 'star',
    palette: { ground: '#171224', groundAlt: '#1d172e', line: '#c9a8e8', accent: '#e0c9f8', glow: '#5a3a8a' },
    props: [
      { type: 'disc', x: 20, y: 20, r: 1.5 }, { type: 'disc', x: 80, y: 15, r: 1.5 }, { type: 'disc', x: 30, y: 82, r: 1.5 },
      { type: 'disc', x: 72, y: 78, r: 1.5 }, { type: 'disc', x: 55, y: 12, r: 1.5 }, { type: 'ring', x: 50, y: 50, r: 19 },
      { type: 'diamond', x: 50, y: 50, r: 6 },
    ],
  },
  Cragmoor: {
    id: 'cragmoor', name: 'The Cragpit', terrain: 'crag',
    palette: { ground: '#201812', groundAlt: '#281e16', line: '#c98f5f', accent: '#e0aa78', glow: '#6a4a2a' },
    props: [
      { type: 'rect', x: 6, y: 6, w: 10, h: 8 }, { type: 'rect', x: 84, y: 86, w: 10, h: 8 },
      { type: 'rect', x: 84, y: 6, w: 10, h: 8 }, { type: 'rect', x: 6, y: 86, w: 10, h: 8 },
      { type: 'ring', x: 50, y: 50, r: 13 },
    ],
  },
  Emberfall: {
    id: 'emberfall', name: 'Cinder Arena', terrain: 'ember',
    palette: { ground: '#220f0a', groundAlt: '#2b130c', line: '#e07a4a', accent: '#f89a5f', glow: '#8a3a1a' },
    props: [
      { type: 'disc', x: 18, y: 30, r: 2 }, { type: 'disc', x: 82, y: 70, r: 2 }, { type: 'disc', x: 30, y: 75, r: 1.5 },
      { type: 'disc', x: 70, y: 25, r: 1.5 }, { type: 'ring', x: 50, y: 50, r: 16 }, { type: 'diamond', x: 50, y: 50, r: 5 },
    ],
  },
  Mistral: {
    id: 'mistral', name: 'The Veiled Ground', terrain: 'mist',
    palette: { ground: '#171a1a', groundAlt: '#1d2121', line: '#9fb8b0', accent: '#c2d8d0', glow: '#4a6a60' },
    props: [
      { type: 'hatch', x: 10, y: 20, w: 30, h: 60 }, { type: 'hatch', x: 60, y: 20, w: 30, h: 60 },
      { type: 'ring', x: 50, y: 50, r: 12 },
    ],
  },
  Thornveil: {
    id: 'thornveil', name: 'Bramblecourt', terrain: 'thorn',
    palette: { ground: '#1c1410', groundAlt: '#231a14', line: '#b08f5f', accent: '#d0aa78', glow: '#5a4a2a' },
    props: [
      { type: 'diamond', x: 15, y: 15, r: 3 }, { type: 'diamond', x: 85, y: 15, r: 3 },
      { type: 'diamond', x: 15, y: 85, r: 3 }, { type: 'diamond', x: 85, y: 85, r: 3 },
      { type: 'ring', x: 50, y: 50, r: 15 }, { type: 'diamond', x: 50, y: 50, r: 4 },
    ],
  },
}

// Special layouts — missions, academy days, and the two bracket competitions.
export const SPECIAL_ARENAS = {
  mission_stealth: {
    id: 'mission_stealth', name: 'Hostile Compound', terrain: 'mist',
    palette: { ground: '#121216', groundAlt: '#17171c', line: '#7a8fa8', accent: '#9fb8d0', glow: '#2a3a4a' },
    props: [
      { type: 'rect', x: 8, y: 8, w: 18, h: 14 }, { type: 'rect', x: 74, y: 78, w: 18, h: 14 },
      { type: 'rect', x: 74, y: 8, w: 18, h: 14 }, { type: 'rect', x: 8, y: 78, w: 18, h: 14 },
      { type: 'rect', x: 42, y: 40, w: 16, h: 20 },
    ],
  },
  mission_combat: {
    id: 'mission_combat', name: 'Contested Field', terrain: 'crag',
    palette: { ground: '#1c1210', groundAlt: '#241814', line: '#c96f5f', accent: '#e08f78', glow: '#6a2a1a' },
    props: [
      { type: 'hatch', x: 35, y: 30, w: 30, h: 40 }, { type: 'diamond', x: 20, y: 50, r: 4 }, { type: 'diamond', x: 80, y: 50, r: 4 },
    ],
  },
  mission_escort: {
    id: 'mission_escort', name: 'The Long Road', terrain: 'sand',
    palette: { ground: '#1e1a10', groundAlt: '#252014', line: '#c9b87a', accent: '#e0d09a', glow: '#6a5a2a' },
    props: [
      { type: 'rect', x: 0, y: 44, w: 100, h: 12 }, { type: 'disc', x: 15, y: 25, r: 3 }, { type: 'disc', x: 85, y: 75, r: 3 },
    ],
  },
  mission_siege: {
    id: 'mission_siege', name: 'The Breachworks', terrain: 'stone',
    palette: { ground: '#16161a', groundAlt: '#1c1c22', line: '#a88f6f', accent: '#c9aa88', glow: '#4a3a2a' },
    props: [
      { type: 'rect', x: 70, y: 10, w: 8, h: 80 }, { type: 'rect', x: 80, y: 25, w: 14, h: 50 },
      { type: 'diamond', x: 20, y: 30, r: 3 }, { type: 'diamond', x: 20, y: 70, r: 3 },
    ],
  },
  mission_intel: {
    id: 'mission_intel', name: 'Shadow Market', terrain: 'mist',
    palette: { ground: '#141218', groundAlt: '#1a171f', line: '#a89fc9', accent: '#c9c2e0', glow: '#3a3a5a' },
    props: [
      { type: 'rect', x: 10, y: 20, w: 12, h: 10 }, { type: 'rect', x: 30, y: 60, w: 12, h: 10 },
      { type: 'rect', x: 55, y: 25, w: 12, h: 10 }, { type: 'rect', x: 76, y: 65, w: 12, h: 10 },
      { type: 'ring', x: 50, y: 50, r: 8 },
    ],
  },
  mission_recovery: {
    id: 'mission_recovery', name: 'The Ruinfield', terrain: 'grove',
    palette: { ground: '#161a14', groundAlt: '#1c2118', line: '#9fb88a', accent: '#c2d8a8', glow: '#3a5a2a' },
    props: [
      { type: 'rect', x: 20, y: 30, w: 10, h: 6 }, { type: 'rect', x: 60, y: 55, w: 14, h: 8 },
      { type: 'rect', x: 40, y: 15, w: 8, h: 5 }, { type: 'ring', x: 72, y: 30, r: 6 },
    ],
  },
  academy: {
    id: 'academy', name: 'Academy Training Ground', terrain: 'grove',
    palette: { ground: '#181c12', groundAlt: '#1e2317', line: '#c9c25f', accent: '#e0da7a', glow: '#5a5a2a' },
    props: [
      { type: 'ring', x: 25, y: 30, r: 8 }, { type: 'ring', x: 75, y: 70, r: 8 },
      { type: 'rect', x: 44, y: 10, w: 12, h: 4 }, { type: 'rect', x: 44, y: 86, w: 12, h: 4 },
      { type: 'disc', x: 25, y: 30, r: 1.5 }, { type: 'disc', x: 75, y: 70, r: 1.5 },
    ],
  },
  exam_forest: {
    id: 'exam_forest', name: 'The Proving Forest', terrain: 'grove',
    palette: { ground: '#101a0e', groundAlt: '#152112', line: '#7aa85f', accent: '#9ac978', glow: '#2a4a1a' },
    props: [
      { type: 'disc', x: 12, y: 20, r: 5 }, { type: 'disc', x: 30, y: 70, r: 4 }, { type: 'disc', x: 55, y: 25, r: 5 },
      { type: 'disc', x: 78, y: 65, r: 4 }, { type: 'disc', x: 90, y: 30, r: 3 }, { type: 'ring', x: 50, y: 50, r: 10 },
    ],
  },
  tournament: {
    id: 'tournament', name: 'The Grand Colosseum', terrain: 'stone',
    palette: { ground: '#1a1410', groundAlt: '#211a14', line: '#c9a84c', accent: '#e8ca6a', glow: '#6a5a1a' },
    props: [
      { type: 'ring', x: 50, y: 50, r: 34 }, { type: 'ring', x: 50, y: 50, r: 26 }, { type: 'ring', x: 50, y: 50, r: 14 },
      { type: 'diamond', x: 50, y: 50, r: 4 },
    ],
  },
  neutral: {
    id: 'neutral', name: 'Neutral Ground', terrain: 'stone',
    palette: { ground: '#15130f', groundAlt: '#1b1913', line: '#8a8070', accent: '#a89f8a', glow: '#3a362a' },
    props: [{ type: 'ring', x: 50, y: 50, r: 16 }],
  },
}

// A player-named village isn't in NATION_ARENAS — hash its name to a stable
// nation theme so every custom village still gets a consistent home look.
const _NATION_KEYS = Object.keys(NATION_ARENAS)
export function hashArenaKey(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0
  return _NATION_KEYS[Math.abs(h) % _NATION_KEYS.length]
}

/**
 * Resolve the arena for a viewer report.
 *   kind: 'league' | 'tournament' | 'exam' | 'mission' | 'academy'
 *   opts: { homeVillage, spec }
 * League matches play in the home side's nation arena; the exam bracket in the
 * Proving Forest; the Grand Tournament in the Colosseum; missions in their
 * spec's layout; academy days on the training ground.
 */
export function arenaFor(kind, opts = {}) {
  if (kind === 'league') {
    const v = opts.homeVillage || ''
    return NATION_ARENAS[v] || NATION_ARENAS[hashArenaKey(v)] || SPECIAL_ARENAS.neutral
  }
  if (kind === 'exam') return SPECIAL_ARENAS.exam_forest
  if (kind === 'tournament') return SPECIAL_ARENAS.tournament
  if (kind === 'academy') return SPECIAL_ARENAS.academy
  if (kind === 'mission') return SPECIAL_ARENAS['mission_' + (opts.spec || '')] || SPECIAL_ARENAS.mission_combat
  return SPECIAL_ARENAS.neutral
}
