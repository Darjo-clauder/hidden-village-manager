/**
 * Nation identity table for the proposed HUD layer (v2, additive).
 * Accent colours verified WCAG AA (>=4.5:1 on #0d0d0f) — scripts/hudContrast.mjs.
 * PURE data — consumed only when G._ff_nationHud is enabled.
 */
export const NATIONS = {
  ember:   { name: 'Ember',   crest: '🔥', accent: '#ff5a3c', pattern: 'hatch'  }, // Fire
  tempest: { name: 'Tempest', crest: '⚡', accent: '#ffd24a', pattern: 'dots'   }, // Lightning
  tide:    { name: 'Tide',    crest: '🌊', accent: '#46b5ff', pattern: 'hlines' }, // Water
  dune:    { name: 'Dune',    crest: '💨', accent: '#e6b873', pattern: 'cross'  }, // Wind
  stone:   { name: 'Stone',   crest: '🪨', accent: '#7bd88f', pattern: 'solid'  }, // Earth
}

/** Safe lookup — unknown id falls back to a neutral identity (I-NAT-1). */
export function nationIdentity(id) {
  return NATIONS[id] || { name: 'Neutral', crest: '◇', accent: '#9aa0a6', pattern: 'solid' }
}

/** True if id is a real nation. */
export function isValidNation(id) {
  return Object.prototype.hasOwnProperty.call(NATIONS, id)
}
