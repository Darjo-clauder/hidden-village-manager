/**
 * Legacy memory — the dead keep acting on the living.
 *
 * The loop analysis put our genre position as a sports-management skeleton
 * carrying a Crusader Kings narrative layer, and argued the strongest version of
 * this game leans into consequence rather than match fidelity. This module is
 * that lean. It rests on one rule the rest of the memory system does not have:
 *
 *   SOME THINGS DO NOT FADE.
 *
 * `memorySystem.js` decays every memory toward nothing and prunes it below 0.05,
 * so a shinobi has a mood but no history — three years after watching their
 * squadmate die on a bridge, there is literally no trace of it on the record.
 * Here, the heaviest events become *defining moments*: they decay to a floor and
 * stop dominating the monthly morale roll, but they never leave, and they stay
 * legible in the dossier for a whole career.
 *
 * On top of that sits the vendetta. When one of yours is killed, the survivors
 * carry a permanent, NAMED grudge against the village responsible, and the
 * village itself keeps a ledger of its dead. Beat that village later and the
 * grudge pays off — a beat that names the shinobi who died for it, and one death
 * marked as answered. A loss in year two is still generating story in year nine.
 *
 * Pure — no G references, fully deterministic, unit-tested. Callers own the
 * ledger object and the roster.
 */

// ── Defining moments ───────────────────────────────────────────────────────

/**
 * Memory types that become permanent scars rather than passing moods.
 * Deliberately short: if everything is defining, nothing is.
 */
export const PERMANENT_MEMORY_TYPES = ['witness_kia', 'betrayal', 'squad_kia', 'war_hero', 'avenged']

/**
 * The intensity a permanent memory decays to and holds forever.
 *
 * Chosen above the 0.05 prune threshold (so it survives) and below the ~0.5
 * band where memoryMoraleMod starts to bite hard (so a decade-old grief is a
 * part of who someone is, not a permanent −6 morale tax that makes veterans
 * unplayable). The wound closes; the scar stays.
 */
export const SCAR_FLOOR = 0.22

/** Does this memory type never fully fade? */
export function isPermanentType(type) { return PERMANENT_MEMORY_TYPES.includes(type) }

/**
 * A shinobi's defining moments — permanent memories, heaviest first.
 * This is a career's worth of history, and it is what the dossier reads.
 */
export function definingMoments(s) {
  return (s?.memories || [])
    .filter(m => isPermanentType(m.type))
    .slice()
    .sort((a, b) => b.intensity - a.intensity || (b.year - a.year) || (b.month - a.month))
}

/** A one-line read of what a shinobi carries, for the dossier. Null if nothing. */
export function definingBlurb(s) {
  const d = definingMoments(s)
  if (!d.length) return null
  const worst = d[0]
  const n = d.length
  return n === 1
    ? `Carries one defining moment: ${worst.label} (Y${worst.year}).`
    : `Carries ${n} defining moments — the heaviest still ${worst.label} (Y${worst.year}).`
}

// ── Vendettas ──────────────────────────────────────────────────────────────

/** Intensity ceiling for a single shinobi's vendetta against one village. */
export const VENDETTA_MAX_INTENSITY = 3
/** Effective-strength bonus contributed per point of carried intensity. */
export const VENDETTA_BONUS_PER_POINT = 0.02
/** Cap on the aggregate bonus, so a bloody history never trivialises a fixture. */
export const VENDETTA_BONUS_CAP = 0.10

/**
 * Who gets blamed for a death that has no explicit killer.
 *
 * Most deaths in this game happen on missions, and a mission carries no
 * antagonist village — so the grudge needs somewhere plausible to point. The
 * village you are on the worst terms with is named (ties broken by strength: the
 * stronger hand is the likelier one). This is a big improvement on the random
 * pick the old dead-code path used, and it means the blame tracks the diplomatic
 * story the player is already living: the village you have been feuding with is
 * the one your people believe is behind it.
 *
 * Callers with a REAL antagonist — a village defence, a war — should name it
 * directly and not call this.
 */
export function blameFor(villages) {
  if (!villages || !villages.length) return null
  return villages.slice().sort((a, b) =>
    (a.rel ?? 50) - (b.rel ?? 50) || (b.strength || 0) - (a.strength || 0))[0]
}

/**
 * Record a death against a village in the VILLAGE-level ledger.
 *
 * Kept separately from the carriers because the carriers die and retire, and the
 * village outlives all of them. This is the part that reaches across
 * generations: a shinobi born in year twelve can still be told what Cragmoor did
 * in year three.
 *
 * @param {object} ledger  G.vendettas — { [village]: { deaths, avenged } }
 */
export function recordVendettaDeath(ledger, villageName, fallen, when) {
  if (!ledger || !villageName) return null
  const v = ledger[villageName] || (ledger[villageName] = { deaths: [], avenged: 0 })
  const entry = {
    name: fallen?.name || 'an unnamed shinobi',
    rank: fallen?.rank || null,
    mission: fallen?.mission || null,
    year: when.year, month: when.month,
    settled: false,
  }
  v.deaths.push(entry)
  return entry
}

/**
 * Give one shinobi a vendetta against a village, naming who they lost.
 * Repeat losses to the same village deepen it rather than adding a second entry.
 *
 * `weight` is how hard this particular death lands — 1 for a squadmate, 2 for
 * someone they were bonded to. The name is recorded once regardless.
 */
export function addVendetta(s, villageName, fallenName, when, weight = 1) {
  if (!s || !villageName) return null
  if (!s.vendettas) s.vendettas = []
  const existing = s.vendettas.find(v => v.village === villageName)
  if (existing) {
    existing.intensity = Math.min(VENDETTA_MAX_INTENSITY, existing.intensity + weight)
    if (!existing.lost.includes(fallenName)) existing.lost.push(fallenName)
    existing.lastEvent = { year: when.year, month: when.month }
    return existing
  }
  const entry = {
    village: villageName,
    intensity: Math.min(VENDETTA_MAX_INTENSITY, weight),
    lost: [fallenName],
    formed: { year: when.year, month: when.month },
    lastEvent: { year: when.year, month: when.month },
  }
  s.vendettas.push(entry)
  return entry
}

/**
 * Who takes a death personally.
 *
 * A squad death has an obvious answer: the people who walked off the mission. A
 * SOLO death does not, and that is the common case — solo missions are how most
 * shinobi actually die here. The first cut leaned on the bond ripple alone, and
 * a live 12-seed sweep showed the result: deaths reached the village ledger and
 * *nobody carried them*, because formal bonds are rare. A consequence system
 * nothing remembers is not a consequence system.
 *
 * So mourners are, in order of who has the better claim: anyone the bond ripple
 * reached, plus anyone who shared a squad with them. If that set is empty — a
 * loner with no ties — the longest-serving shinobi on the books carry it
 * instead. Someone in a village always remembers the dead.
 *
 * `roster` must already exclude the fallen.
 */
export function mournersFor(fallenId, roster, squads = [], rippleIds = [], fallback = 3) {
  const ids = new Set(rippleIds)
  for (const sq of squads || []) {
    if (!(sq.members || []).includes(fallenId)) continue
    for (const id of sq.members) if (id !== fallenId) ids.add(id)
  }
  const named = (roster || []).filter(s => ids.has(s.id))
  if (named.length) return named
  return (roster || []).slice()
    .sort((a, b) => (b.months || 0) - (a.months || 0) || (b.wins || 0) - (a.wins || 0))
    .slice(0, fallback)
}

/** This shinobi's vendetta against a village, or null. */
export function vendettaAgainst(s, villageName) {
  return (s?.vendettas || []).find(v => v.village === villageName) || null
}

/** Every living shinobi who carries a vendetta against a village. */
export function vendettaCarriers(roster, villageName) {
  return (roster || []).filter(s => vendettaAgainst(s, villageName))
}

/**
 * Aggregate effective-strength modifier for facing a village, from how many of
 * your people have a personal reason to want it. Returns 0..VENDETTA_BONUS_CAP.
 *
 * Deliberately a bonus with no matching penalty: grief that sharpens you is the
 * story we want to tell, and the cap keeps it a thumb on the scale rather than
 * a substitute for having a good squad.
 */
export function vendettaBonus(roster, villageName) {
  const total = vendettaCarriers(roster, villageName)
    .reduce((sum, s) => sum + (vendettaAgainst(s, villageName)?.intensity || 0), 0)
  return Math.min(VENDETTA_BONUS_CAP, total * VENDETTA_BONUS_PER_POINT)
}

/**
 * The oldest death this village has not yet answered for, or null if the ledger
 * is square. One win settles one death, so a village that took six of yours owes
 * you six — an arc that can run for years.
 */
export function oldestUnsettled(ledger, villageName) {
  const v = ledger?.[villageName]
  if (!v) return null
  return v.deaths.find(d => !d.settled) || null
}

/** How many deaths a village still owes for. */
export function unsettledCount(ledger, villageName) {
  return (ledger?.[villageName]?.deaths || []).filter(d => !d.settled).length
}

/**
 * Answer one death: mark it settled in the ledger and return it, or null if
 * there was nothing outstanding. The caller fires the narrative and rewards the
 * carriers — this only moves the ledger.
 */
export function settleOneDeath(ledger, villageName) {
  const d = oldestUnsettled(ledger, villageName)
  if (!d) return null
  d.settled = true
  const v = ledger[villageName]
  v.avenged = (v.avenged || 0) + 1
  return d
}

/**
 * The payoff line — what the player actually reads when a debt is finally paid.
 * Names the dead, and says how long they waited. This sentence is the entire
 * point of the system.
 */
export function vengeanceBeat(fallen, villageName, now, carrierNames = []) {
  const years = Math.max(0, (now.year - fallen.year) + (now.month - fallen.month) / 12)
  const waited = years < 1 ? 'months' : years < 2 ? 'a year' : `${Math.floor(years)} years`
  const who = carrierNames.length === 0 ? 'The village'
    : carrierNames.length === 1 ? carrierNames[0]
    : carrierNames.length === 2 ? `${carrierNames[0]} and ${carrierNames[1]}`
    : `${carrierNames[0]}, ${carrierNames[1]} and ${carrierNames.length - 2} other${carrierNames.length - 2 > 1 ? 's' : ''}`
  const title = `Answered — ${fallen.name}`
  const body = `${villageName} beaten, and a name comes back up out of the ground. ${fallen.name}`
    + `${fallen.rank ? `, ${fallen.rank},` : ''} died ${fallen.mission ? `on "${fallen.mission}" ` : ''}in Y${fallen.year} M${fallen.month}. `
    + `${who} waited ${waited} for this one, and did not forget in the meantime.`
  return { title, body, years }
}

/**
 * A village-level summary of what stands between you and them, for the
 * diplomacy card and the match build-up. Null when there is no history.
 */
export function vendettaLabel(ledger, villageName) {
  const v = ledger?.[villageName]
  if (!v || !v.deaths.length) return null
  const open = unsettledCount(ledger, villageName)
  const total = v.deaths.length
  if (!open) return `⚑ ${total} answered — the ledger with ${villageName} is square.`
  return `⚑ ${open} of ours unanswered${total > open ? ` (${total - open} settled)` : ''}.`
}
