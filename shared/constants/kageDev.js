/**
 * Warden development — a GM/coach-style progression for the player's Warden.
 * Six attributes, each hooked into a live system; XP + spendable points earned
 * from playing; a one-time Path (background) that biases the build.
 *
 * Pure + dependency-free so it can be unit-tested and shared client/server.
 */

export const KAGE_ATTR_CAP = 12

// per = bonus contributed PER point of the attribute (applied where noted).
export const KAGE_ATTRS = [
  { id: 'command',        n: 'Command',        icon: '⚔',  per: 0.012, desc: 'Mission & squad success. +1.2% success per point.' },
  { id: 'tactics',        n: 'Tactics',        icon: '🎯', per: 0.012, desc: 'Edge in Adept Exams & Nation War. +1.2% advance per point.' },
  { id: 'mentorship',     n: 'Mentorship',     icon: '📖', per: 0.03,  desc: 'Shinobi development speed. +3% growth per point.' },
  { id: 'diplomacy',      n: 'Diplomacy',      icon: '🤝', per: 0.05,  desc: 'Relations gains & cheaper alliances. +5% per point.' },
  { id: 'administration', n: 'Administration', icon: '🏛', per: 0.012, desc: 'Village income. +1.2% income per point.' },
  { id: 'espionage',      n: 'Espionage',      icon: '🕵', per: 0.03,  desc: 'Shadow & deep-cover success. +3% per point.' },
]
export const ATTR_BY_ID = Object.fromEntries(KAGE_ATTRS.map(a => [a.id, a]))

export const KAGE_PATHS = [
  { id: 'warlord',       n: 'The Warlord',       icon: '⚔',  attrs: { command: 2, tactics: 2 },        perk: 'war_casualties', desc: 'Forged in battle. +2 Command, +2 Tactics. Signature: −25% Nation War casualties.' },
  { id: 'administrator', n: 'The Administrator', icon: '🏛', attrs: { administration: 2, diplomacy: 1 }, perk: 'stipend',        desc: 'A builder of villages. +2 Administration, +1 Diplomacy. Signature: +600 ryo/month stipend.' },
  { id: 'sensei',        n: 'The Sensei',        icon: '📖', attrs: { mentorship: 2, tactics: 1 },      perk: 'academy',        desc: 'A teacher first. +2 Mentorship, +1 Tactics. Signature: +10% academy growth.' },
  { id: 'diplomat',      n: 'The Diplomat',      icon: '🤝', attrs: { diplomacy: 2, administration: 1 }, perk: 'alliance',       desc: 'Master of the table. +2 Diplomacy, +1 Administration. Signature: alliances 30% cheaper.' },
  { id: 'spymaster',     n: 'The Spymaster',     icon: '🕵', attrs: { espionage: 2, command: 1 },        perk: 'recon',          desc: 'Eyes everywhere. +2 Espionage, +1 Command. Signature: free recon on a rival each month.' },
]
export const PATH_BY_ID = Object.fromEntries(KAGE_PATHS.map(p => [p.id, p]))

/** Default Warden dev block for a new game. */
export function newKageDev() {
  return { level: 1, xp: 0, points: 0, path: null, perk: null,
    attrs: { command: 1, tactics: 1, mentorship: 1, diplomacy: 1, administration: 1, espionage: 1 } }
}

/** Rising XP curve — gentler first levels (faster early reward), steepening later.
 *  L1→2: 60, L2→3: 115, L3→4: 170, … (+55/level). */
export function xpForLevel(level) { return 60 + (level - 1) * 55 }

export function kageAttr(G, id) { return (G.kageDev && G.kageDev.attrs && G.kageDev.attrs[id]) || 0 }

/** Bonus value for an attribute (attr points × per-point rate). */
export function kageMod(G, id) { return kageAttr(G, id) * (ATTR_BY_ID[id]?.per || 0) }

export function kagePerk(G) { return G.kageDev?.perk || null }

/**
 * Award XP and resolve level-ups. Mutates G.kageDev. Returns
 * { gained, leveled:boolean, levels:number, newLevel }.
 */
export function addKageXp(G, amount) {
  if (!G.kageDev) G.kageDev = newKageDev()
  const k = G.kageDev
  k.xp += amount
  let leveled = 0
  while (k.xp >= xpForLevel(k.level)) {
    k.xp -= xpForLevel(k.level)
    k.level++
    k.points += 2
    leveled++
  }
  return { gained: amount, leveled: leveled > 0, levels: leveled, newLevel: k.level }
}

/** Spend a point to raise an attribute (respects cap). Returns true on success. */
export function spendKagePoint(G, attrId) {
  if (!G.kageDev || G.kageDev.points <= 0) return false
  if (!ATTR_BY_ID[attrId]) return false
  if ((G.kageDev.attrs[attrId] || 0) >= KAGE_ATTR_CAP) return false
  G.kageDev.attrs[attrId] = (G.kageDev.attrs[attrId] || 0) + 1
  G.kageDev.points--
  return true
}

/** Apply a chosen path once. Returns true on success. */
export function applyKagePath(G, pathId) {
  if (!G.kageDev || G.kageDev.path) return false
  const p = PATH_BY_ID[pathId]; if (!p) return false
  G.kageDev.path = pathId
  G.kageDev.perk = p.perk
  Object.entries(p.attrs).forEach(([k, v]) => {
    G.kageDev.attrs[k] = Math.min(KAGE_ATTR_CAP, (G.kageDev.attrs[k] || 0) + v)
  })
  return true
}
