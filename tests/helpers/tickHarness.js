/**
 * Headless harness for the monthly tick.
 *
 * The whole client was unverified: 1,047 tests covered pure shared/ functions
 * and nothing at all imported adv.js, so ~21k lines including the entire
 * simulation ran only under manual browser QA. adv.js turns out to be free of
 * direct DOM access — it reaches the browser only through four modules — so it
 * can be driven in plain node once those are stubbed. No jsdom required.
 *
 * Test files must declare the mocks themselves (vi.mock is hoisted per file);
 * MOCKS below documents the exact set. This module owns the seeding and the
 * state-reading helpers.
 */

/** The four modules in adv.js's import graph that touch the browser. */
export const MOCKS = ['ui.js', 'socket.js', 'news.js', 'legacyStore.js']

/** Deterministic PRNG (same generator the match engine uses). */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Replace Math.random with a seeded stream for the duration of a run, so the
 * tick is reproducible. Returns a restore function.
 */
export function seedRandom(seed = 12345) {
  const real = Math.random
  Math.random = mulberry32(seed)
  return () => { Math.random = real }
}

/**
 * Stand in for a player answering whatever is holding the turn.
 *
 * adv() now refuses to run while a blocking decision is outstanding
 * (shared/utils/turnGate.js). Before that guard existed this harness drove the
 * tick straight over pending mandates, pact calls and world choices — which
 * means the months it produced were ones no real player could have reached.
 * Clearing them here is closer to a real playthrough than ignoring them was,
 * though it does skip whatever effect answering would have had.
 *
 * Exams and wars need interactive play to resolve properly, so they are simply
 * stood down; driving those end-to-end is a browser job, not a harness one.
 */
export function clearBlockers(G) {
  G.pendingChoiceEvent = null
  G.pendingObligation = null
  G.pendingQuickDecision = null
  G.examActive = false
  G.warActive = false
}

/** Numeric fields that must stay finite for the simulation to be meaningful. */
export const NUMERIC_INVARIANTS = [
  'ryo', 'reputation', 'legend', 'morale', 'year', 'month',
]

/**
 * Walk state and collect anything that has gone numerically wrong. Catching
 * NaN/Infinity early matters because they propagate silently through a tick
 * and only surface as "undefined" or "NaN" in the UI many months later.
 */
export function findNumericCorruption(G, { maxDepth = 3 } = {}) {
  const bad = []
  const seen = new Set()
  const walk = (node, path, depth) => {
    if (!node || typeof node !== 'object' || depth > maxDepth) return
    if (seen.has(node)) return
    seen.add(node)
    for (const [k, v] of Object.entries(node)) {
      const p = path ? `${path}.${k}` : k
      if (typeof v === 'number') {
        if (Number.isNaN(v)) bad.push(`${p} = NaN`)
        else if (!Number.isFinite(v)) bad.push(`${p} = ${v}`)
      } else if (v && typeof v === 'object') {
        walk(v, p, depth + 1)
      }
    }
  }
  walk(G, '', 0)
  return bad
}

/**
 * An untranslated i18n key that reached the player.
 *
 * `t()` returns the KEY when it has no entry, and a key is a truthy string — so
 * the idiom `t('some.key', …) || 'fallback'` silently logs "some.key" instead of
 * the fallback. That shipped once, in the wage review, and no test noticed
 * because the detector below only looked for undefined/NaN. A leaked key is the
 * WHOLE message, so an exact match is enough and won't fire on prose that
 * happens to contain a dot.
 */
export function isLeakedI18nKey(s) {
  return typeof s === 'string' && /^[a-z][\w]*(\.[\w]+)+$/.test(s.trim())
}

/** Text fields that leaked an undefined/NaN/raw key into player-visible copy. */
export function findTextCorruption(G) {
  const bad = []
  const check = (s, where) => {
    if (typeof s !== 'string') return
    if (/\bundefined\b|\bNaN\b|\[object Object\]/.test(s)) bad.push(`${where}: ${s.slice(0, 90)}`)
    else if (isLeakedI18nKey(s)) bad.push(`${where}: untranslated key "${s.trim()}"`)
  }
  ;(G.log || []).forEach((e, i) => check(e.msg, `log[${i}]`))
  ;(G.noticeboard || []).forEach((n, i) => { check(n.text, `notice[${i}]`); check(n.title, `notice[${i}].title`) })
  ;(G.chronicle || []).forEach((c, i) => { check(c.title, `chronicle[${i}].title`); check(c.body, `chronicle[${i}].body`) })
  ;(G.shinobi || []).forEach((s, i) => { check(s.fn, `shinobi[${i}].fn`); check(s.ln, `shinobi[${i}].ln`) })
  return bad
}

/**
 * Dispatch available shinobi onto available missions, the way a player would.
 *
 * This exists because of a genuinely alarming discovery: mission resolution —
 * the largest block in adv(), the one that kills shinobi, writes the memorial,
 * and feeds the mandate tracker — NEVER RAN in any test. It iterates `G.aM`,
 * assignment is a player action, and the harness only ever advanced months.
 * Twenty-four seeds across 1,152 simulated months produced zero KIA and zero
 * injuries, because nobody was ever sent anywhere.
 *
 * Every characterisation snapshot taken before this was therefore blind to the
 * single most consequential system in the tick.
 *
 * Mirrors panels/missions.js doA() rather than calling it, since that reaches
 * into the DOM. Kept intentionally simple: take whoever is free, send them at
 * whatever is on the board.
 */
export function autoAssignMissions(G, { max = 3 } = {}) {
  const board = (G.avM || [])
  if (!board.length) return 0
  // Power, matching sPow(): mean of the stat block.
  const pow = s => {
    const v = Object.values(s.stats || {})
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
  }
  // Strongest first, so a capable shinobi is matched to a demanding mission
  // rather than wasted on a trivial one.
  const free = (G.shinobi || []).filter(s => s.status === 'available').sort((a, b) => pow(b) - pow(a))
  let sent = 0
  for (const m of board) {
    if (sent >= max) break
    // ELIGIBILITY. The real assign screen only offers shinobi who meet the
    // mission's power requirement (`doA` is simply absent otherwise), so a
    // harness that ignores it plays worse than any player can. Without this
    // check the sweep ran a 66.8% failure rate while a driven browser game
    // went 9-for-9 — and every economy figure measured on it was pessimistic.
    const s = free.find(x => x.status === 'available' && (m.mp == null || pow(x) >= m.mp))
    if (!s) continue
    s.status = 'mission'
    s.missId = m.id
    G.aM.push({
      id: 'h' + (G.year * 100 + G.month) + '_' + sent,
      missionId: m.id, assignedTo: s.id, squadId: null,
      daysLeft: m.dur, isSquad: false, approach: 'balanced',
    })
    sent++
  }
  return sent
}

/**
 * Sign academy prospects, the way a player continually does.
 *
 * WHY THIS MATTERS MORE THAN IT LOOKS. `rfP()` tops the prospect pool back up to
 * a cap and only rolls the 1%-prodigy chance on prospects that are NEW that
 * month. A harness that never signs anyone leaves the pool permanently full, so
 * `toAdd` is 0 almost every month, almost no new prospects are created, and the
 * roll barely ever runs. Measured: ONE prodigy across 2,343 prospects and 1,200
 * simulated months — and `prodigy` gates three of the five rare jutsu, so that
 * whole tier was invisible to every automated test we had.
 *
 * The pool is also where academy intake, region scouting and minor-nation
 * prodigies land, so a stagnant pool freezes several pipelines at once.
 *
 * Mirrors panels/academy.js recruitProspect() — spread the prospect, mark it
 * available — without the DOM or the ryo prompt.
 */
export function autoSignProspects(G, { max = 1, minRyo = 2000 } = {}) {
  let signed = 0
  while (signed < max && (G.prospects || []).length && G.ryo >= minRyo) {
    // Best potential first, as a player would.
    const p = [...G.prospects].sort((a, b) => (b.potential || 0) - (a.potential || 0))[0]
    if (!p) break
    G.ryo -= minRyo
    // Same numeric guards normalizeRecruit() applies, inlined rather than
    // imported: this helper is deliberately dependency-free so it can load
    // before the vi.mock calls that stand in for the browser modules.
    const recruited = { ...p, status: 'available' }
    for (const k of ['months', 'wins', 'winsB', 'winsS', 'streak', 'injDays', 'workload', 'monthsWaiting']) {
      if (!Number.isFinite(Number(recruited[k]))) recruited[k] = 0
    }
    if (!Array.isArray(recruited.jutsu)) recruited.jutsu = []
    if (!Array.isArray(recruited.bonds)) recruited.bonds = []
    if (recruited.academyOrigin) recruited.homegrown = true
    G.shinobi.push(recruited)
    G.prospects = G.prospects.filter(x => x.id !== p.id)
    signed++
  }
  return signed
}

/**
 * Keep squads staffed and send them out.
 *
 * The other half of the blind spot. `autoAssignMissions` only ever dispatched
 * SOLO missions (`isSquad: false`), so across every sweep we had:
 *   - the squad KIA branch never ran (the branch that writes sq.fallen, forms
 *     vendettas and drives the memorial),
 *   - `tryFormBonds` never ran, so ZERO bonds formed in 1,200 months,
 *   - A- and S-rank missions were never assigned, because their power
 *     requirement (median 86 and 135) is written for a SQUAD's combined power
 *     and no single shinobi clears it — which in turn made the four `winsS`
 *     jutsu unreachable.
 *
 * Squad power is the sum of member power, matching sqP().
 */
export function autoSquadMissions(G, { squads = 2, size = 3, max = 2 } = {}) {
  const pow = s => {
    const v = Object.values(s.stats || {})
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0
  }
  G.squads = G.squads || []
  // Top up to `squads` squads of `size`, from whoever is free.
  while (G.squads.length < squads) {
    G.squads.push({
      id: 'hsq' + G.squads.length + '_' + Math.floor(Math.random() * 1e6),
      n: 'Harness Squad ' + (G.squads.length + 1),
      members: [], cohesion: 50, fallen: [], wins: 0, losses: 0, kills: 0,
    })
  }
  const inSquad = new Set(G.squads.flatMap(q => q.members))
  for (const sq of G.squads) {
    sq.members = sq.members.filter(id => (G.shinobi || []).some(s => s.id === id))
    for (const s of G.shinobi || []) {
      if (sq.members.length >= size) break
      if (s.status !== 'available' || inSquad.has(s.id)) continue
      sq.members.push(s.id); inSquad.add(s.id)
    }
  }
  let sent = 0
  for (const sq of G.squads) {
    if (sent >= max) break
    const members = sq.members.map(id => (G.shinobi || []).find(s => s.id === id)).filter(Boolean)
    if (members.length < size || members.some(s => s.status !== 'available')) continue
    const power = members.reduce((a, s) => a + pow(s), 0)
    // Hardest mission this squad actually qualifies for — the point is to reach
    // the A/S board that solo dispatch can never touch.
    const m = (G.avM || [])
      .filter(x => x.mp == null || power >= x.mp)
      .sort((a, b) => (b.mp || 0) - (a.mp || 0))[0]
    if (!m) continue
    members.forEach(s => { s.status = 'mission'; s.missId = m.id })
    G.aM.push({
      id: 'hs' + (G.year * 100 + G.month) + '_' + sent,
      missionId: m.id, assignedTo: null, squadId: sq.id,
      daysLeft: m.dur, isSquad: true, approach: 'balanced',
    })
    sent++
  }
  return sent
}

/**
 * Which rare branches a run actually exercised.
 *
 * Four seeds were enough to catch a missing import in tick/finance.js the
 * instant it ran, and NOT enough to catch two in tick/staff.js — those sat
 * green because no seed happened to graduate a mentorship or form a mentor
 * bond. Snapshots tell you a run's output changed; they say nothing about
 * which paths produced it.
 *
 * This counts the events that only occur on uncommon branches, so coverage can
 * be asserted rather than assumed. If a change makes shinobi unkillable or
 * stops promotions firing, a test fails instead of a snapshot quietly shifting.
 */
export function branchProbe(G, prev = null) {
  const kia = (G.memorial || []).filter(m => !m.transfer).length
  const departures = (G.memorial || []).filter(m => m.transfer).length
  const cur = {
    kia,
    departures,
    injured: (G.shinobi || []).filter(s => s.status === 'injured').length,
    traumatised: (G.shinobi || []).filter(s => s.traumaStatus).length,
    enshrined: (G.hallOfLegends || []).length,
    examWins: Number(G.dynastyRecords?.examWins) || 0,
    bonded: (G.shinobi || []).filter(s => (s.bonds || []).length).length,
    mentorships: (G.mentorships || []).length,
    prospects: (G.prospects || []).length,
    students: (G.intakeClass || []).length,
    youthCups: (G.youthCupHistory || []).length,
    sealedBeasts: (G.beasts || []).filter(b => b.sealed).length,
    pacts: (G.villages || []).filter(v => v.pact).length,
    chronicles: (G.chronicles || []).length,
    brokeOnce: !!G._everBroke,
    cleanYears: Number(G._cleanYears) || 0,
  }
  if (!prev) return cur
  // Peak-tracking for anything that can go back down, so a transient injury
  // that healed before the run ended still counts as having happened.
  for (const k of ['injured', 'traumatised', 'bonded', 'mentorships']) {
    cur[k] = Math.max(cur[k], prev[k] || 0)
  }
  return cur
}

/**
 * A compact, comparable fingerprint of simulation state. Used as a golden
 * value: refactoring the tick must not change what the same seed produces.
 */
export function fingerprint(G) {
  return {
    year: G.year, month: G.month,
    ryo: G.ryo, reputation: G.reputation, legend: G.legend, morale: G.morale,
    prestigeTier: G.prestigeTier,
    shinobi: (G.shinobi || []).length,
    prospects: (G.prospects || []).length,
    staff: (G.staff || []).length,
    squads: (G.squads || []).length,
    missions: (G.aM || []).length,
    logLines: (G.log || []).length,
    injured: (G.shinobi || []).filter(s => s.status === 'injured').length,
    // Roster power total is the broadest single signal that progression changed.
    // Stats live in s.stats as a keyed object, not as flat fields.
    power: (G.shinobi || []).reduce(
      (a, s) => a + Object.values(s.stats || {}).reduce((x, y) => x + (Number(y) || 0), 0), 0),
  }
}

/**
 * Initialise the string table the way main.js does at boot.
 *
 * Without this `t()` returns its key for every lookup, because the locale is
 * only registered in main.js — which the harness does not import. That made the
 * leaked-key detector below report ~20 phantom failures the first time it ran,
 * all of them keys that are present in en.js and resolve perfectly in the real
 * game. Tests must exercise the string path the player actually gets.
 */
export async function initLocale() {
  const { registerLocale, setLocale } = await import('../../shared/utils/i18n.js')
  const { en } = await import('../../shared/i18n/en.js')
  registerLocale('en', en)
  setLocale('en')
}
