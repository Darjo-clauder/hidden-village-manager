/**
 * WCAG 2.1 contrast checker for the proposed Nation HUD palette.
 * Verifies each nation accent against the game's dark surface bg.
 * Run: node scripts/hudContrast.mjs
 */
const BG = '#0d0d0f' // game dark surface
const NATIONS = {
  Ember:   { accent: '#ff5a3c', crest: '🔥' }, // Fire
  Tempest: { accent: '#ffd24a', crest: '⚡' }, // Lightning
  Tide:    { accent: '#46b5ff', crest: '🌊' }, // Water
  Dune:    { accent: '#e6b873', crest: '💨' }, // Wind
  Stone:   { accent: '#7bd88f', crest: '🪨' }, // Earth
}
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const lum = h => { const [r, g, b] = hex(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a, b) => { const L1 = lum(a), L2 = lum(b); const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]; return (hi + 0.05) / (lo + 0.05) }

console.log(`\nContrast vs bg ${BG} (WCAG AA text >= 4.5, UI/large >= 3.0)\n`)
console.log('nation    accent     ratio   AA-text  AA-UI')
for (const [n, d] of Object.entries(NATIONS)) {
  const r = ratio(d.accent, BG)
  console.log(`${n.padEnd(9)} ${d.accent}   ${r.toFixed(2)}    ${r >= 4.5 ? 'PASS' : 'fail'}     ${r >= 3.0 ? 'PASS' : 'fail'}`)
}
