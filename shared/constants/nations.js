/**
 * Nation identity table for the proposed HUD layer (v2, additive).
 * Accent colours verified WCAG AA (>=4.5:1 on #0d0d0f) — scripts/hudContrast.mjs.
 * PURE data — consumed only when G._ff_nationHud is enabled.
 */
// traitMods fold into the existing sc / income terms when _ff_nationHud is on.
// I-NAT-2: |successMod| <= 0.1 so a nation never dominates the success formula.
export const NATIONS = {
  ember:   { name: 'Ember',   crest: '🔥', accent: '#ff5a3c', pattern: 'hatch',  traitMods: { successMod:  0.04, ryoMod: -0.02 } }, // Fire — aggressive
  tempest: { name: 'Tempest', crest: '⚡', accent: '#ffd24a', pattern: 'dots',   traitMods: { successMod:  0.03, ryoMod:  0.00 } }, // Lightning — fast
  tide:    { name: 'Tide',    crest: '🌊', accent: '#46b5ff', pattern: 'hlines', traitMods: { successMod:  0.02, ryoMod:  0.03 } }, // Water — balanced
  dune:    { name: 'Dune',    crest: '💨', accent: '#e6b873', pattern: 'cross',  traitMods: { successMod:  0.00, ryoMod:  0.05 } }, // Wind — economic
  stone:   { name: 'Stone',   crest: '🪨', accent: '#7bd88f', pattern: 'solid',  traitMods: { successMod:  0.01, ryoMod:  0.02 } }, // Earth — defensive
}

const NEUTRAL = { name: 'Neutral', crest: '◇', accent: '#9aa0a6', pattern: 'solid', traitMods: { successMod: 0, ryoMod: 0 } }

/** Safe lookup — unknown id falls back to a neutral identity (I-NAT-1). */
export function nationIdentity(id) {
  return NATIONS[id] || NEUTRAL
}

/** Nation trait modifiers; neutral zeros for unknown id. Pure. */
export function nationMods(id) {
  return (NATIONS[id] || NEUTRAL).traitMods
}

/** True if id is a real nation. */
export function isValidNation(id) {
  return Object.prototype.hasOwnProperty.call(NATIONS, id)
}
