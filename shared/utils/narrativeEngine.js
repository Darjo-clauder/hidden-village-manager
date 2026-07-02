/**
 * Narrative engine — generates short, human-readable event blurbs.
 * Pure. No G references. Caller extracts what's needed and passes it in.
 *
 * Each function returns { title, body, tag, link } where:
 *   tag  — category string for inbox filtering
 *   link — panel id for clickable context (or null)
 */

const RANK_LABELS = ['Initiate', 'Adept', 'Veteran', 'Shadow', 'Legend']
const rk = ri => RANK_LABELS[ri] ?? 'Shinobi'
const pk = arr => arr[Math.floor(Math.random() * arr.length)]

// ── Mission blurbs ─────────────────────────────────────────────────────────

const DECISIVE = [
  (n, r, m) => `${r} ${n} executed a flawless operation. "${m}" complete — infiltration to extraction without a scratch.`,
  (n, r, m) => `Chronicle scribes are talking about ${n}'s run on "${m}". Decisive from the first handseals.`,
  (n, r, m) => `${r} ${n} returned from "${m}" before noon. The target never saw them coming.`,
  (n, r, m) => `"${m}" is in the books. ${r} ${n} made it look routine. It wasn't.`,
]
const NARROW = [
  (n, r, m) => `"${m}" is done. ${r} ${n} made it out, though the after-action report buries the details.`,
  (n, r, m) => `${r} ${n} completed "${m}" — extraction was rough, but they held the line.`,
  (n, r, m) => `The mission is complete. ${n} says little about how close it got.`,
]
const COSTLY = [
  (n, r, m) => `"${m}" ended in failure. ${r} ${n} returned empty-handed.`,
  (n, r, m) => `${r} ${n} aborted "${m}" after the engagement turned. The Daimyo's office will want answers.`,
  (n, r, m) => `${n} came back from "${m}" without the objective. Medical reports the rest.`,
]
const DISASTER = [
  (n, r, m) => `Disaster on "${m}". ${r} ${n}'s squad was routed. The village felt it.`,
  (n, r, m) => `"${m}" was a catastrophe. ${r} ${n} returned alone, silent, and shaken.`,
  (n, r, m) => `The mission board has pulled "${m}" from the active list. What happened out there won't be in the report.`,
]

export function genMissionBlurb(name, ri, missionName, quality) {
  const pools = { decisive: DECISIVE, narrow: NARROW, costly: COSTLY, disaster: DISASTER }
  const body = pk(pools[quality] ?? NARROW)(name, rk(ri), missionName)
  const tag  = (quality === 'decisive' || quality === 'narrow') ? 'success' : 'failure'
  return { title: `Mission: ${missionName}`, body, tag, link: 'missions' }
}

// ── KIA blurbs ─────────────────────────────────────────────────────────────

export function genKIABlurb(name, ri, missionName) {
  const rank = rk(ri)
  const lines = [
    `${rank} ${name} fell during "${missionName}". Their name will be carved into the memorial stone.`,
    `The village mourns ${name}. A ${rank.toLowerCase()} who gave everything on "${missionName}".`,
    `${name} didn't come back from "${missionName}". The ranks are quieter today.`,
    `${rank} ${name} — remembered not for how they died, but for how they fought.`,
  ]
  return { title: `Fallen: ${name}`, body: pk(lines), tag: 'kia', link: 'memorial' }
}

// ── Injury blurbs ──────────────────────────────────────────────────────────

export function genInjuryBlurb(name, ri, injTypeName, durationMonths) {
  const rank = rk(ri)
  const mo   = `${durationMonths} month${durationMonths !== 1 ? 's' : ''}`
  const lines = [
    `${rank} ${name} is hospitalized — ${injTypeName}. Medical corps estimates ${mo} before they're cleared.`,
    `${name} walked out of that mission on their own, but the healers say ${mo}.`,
    `Medical confirms ${name} is off active duty — ${injTypeName}. Out for ${mo}.`,
  ]
  return { title: `Injury: ${name}`, body: pk(lines), tag: 'injury', link: 'roster' }
}

// ── Transfer blurbs ────────────────────────────────────────────────────────

export function genTradeBlurb(name, ri, toVillage, ryo) {
  const rank = rk(ri)
  const lines = [
    `Transfer scroll signed. ${rank} ${name} departs for ${toVillage}. The village receives ${ryo.toLocaleString()} ryo.`,
    `${name} bows at the gate and walks toward ${toVillage}. The Daimyo's couriers confirm the fee.`,
    `${toVillage} came calling for ${rank} ${name}. After two days of negotiation, the scroll is sealed.`,
  ]
  return { title: `Transfer: ${name} → ${toVillage}`, body: pk(lines), tag: 'transfer', link: 'transfers' }
}

// ── Bond blurbs ────────────────────────────────────────────────────────────

const BOND_COPY = {
  'Brothers-in-Arms': (a, b) => `${a} and ${b} forged something in the field no mission debrief can capture. Brothers-in-Arms.`,
  'Mentor/Student':   (a, b) => `${a} started teaching ${b} the things the Academy never covered. A bond older than rank.`,
  'Battle-Scarred':   (a, b) => `${a} and ${b} carry the same scar from the same night. That tends to change things.`,
  'Rivals':           (a, b) => `${a} and ${b} push each other past what either would reach alone. The rivalry sharpens both.`,
}

export function genBondBlurb(nameA, nameB, bondType) {
  const fn = BOND_COPY[bondType] ?? ((a, b) => `${a} and ${b} have grown closer through shared missions.`)
  return { title: `Bond: ${nameA} & ${nameB}`, body: fn(nameA, nameB), tag: 'bond', link: 'roster' }
}

// ── Grudge blurbs ──────────────────────────────────────────────────────────

export function genGrudgeBlurb(nameA, nameB, reasonLabel, intensity) {
  const lines = [
    `${nameA} hasn't forgotten what happened between them and ${nameB}. The training yard has been tense.`,
    `Sources close to the barracks say ${nameA} holds ${nameB} responsible. That kind of grudge doesn't stay quiet.`,
    `${nameA} and ${nameB} — a ${reasonLabel.toLowerCase()} that neither has put down.`,
  ]
  const note = intensity >= 3 ? ' Deploying them together is a risk.' : ''
  return { title: `Tension: ${nameA} & ${nameB}`, body: pk(lines) + note, tag: 'grudge', link: 'roster' }
}

// ── Rank-up blurbs ─────────────────────────────────────────────────────────

const RANKUP_COPY = {
  1: n => `${n} earned Adept. No more D-rank cat retrieval — the village gains a field leader.`,
  2: n => `${n} is Veteran now. The Daimyo's court received the scroll this morning.`,
  3: n => `${n} was recruited into Shadow. The mask is black. The missions don't go in the report.`,
  4: n => `${n} has reached the level of Legend. A legend walks these streets.`,
}

export function genRankUpBlurb(name, newRi) {
  const fn = RANKUP_COPY[newRi] ?? (n => `${n} was promoted.`)
  return { title: `Promotion: ${name} → ${rk(newRi)}`, body: fn(name), tag: 'promotion', link: 'roster' }
}

// ── War result blurbs ──────────────────────────────────────────────────────

export function genWarResultBlurb(won, villageName, kiaCount) {
  if (won) {
    const body = pk([
      `The Nation War is over. ${villageName} stands victorious.`,
      `Chronicle scribes are already writing. ${villageName} won the Nation War. The Daimyo sends gifts.`,
    ]) + (kiaCount ? ` ${kiaCount} fell along the way.` : ' The memorial wall stays unchanged tonight.')
    return { title: 'Nation War: Victory', body, tag: 'war', link: 'war' }
  }
  const body = pk([
    `${villageName} was eliminated from the Nation War. The debriefing will be long.`,
    `The War Pavilion is quiet. ${villageName} didn't make the final stage.`,
  ])
  return { title: 'Nation War: Eliminated', body, tag: 'war', link: 'war' }
}

// ── Exam result blurbs ─────────────────────────────────────────────────────

export function genExamResultBlurb(won, villageName, promotions) {
  if (won) {
    return {
      title: 'Adept Exam: Champion',
      body: `${villageName} dominated the Adept Exam. ${promotions ? `${promotions} shinobi earned promotion.` : 'The next generation has arrived.'}`,
      tag: 'exam', link: 'exam',
    }
  }
  return {
    title: 'Adept Exam: Eliminated',
    body: `The Exam is over for ${villageName}. Scouts are already noting which prospects need another cycle.`,
    tag: 'exam', link: 'exam',
  }
}

// ── Prestige blurbs ────────────────────────────────────────────────────────

export function genPrestigeBlurb(villageName, tier) {
  return {
    title: `Prestige: Tier ${tier}`,
    body: `${villageName} reached Prestige ${tier}. Word travels fast — rival Warden are adjusting their threat assessments.`,
    tag: 'prestige', link: 'legacy',
  }
}

// ── Adaptive AI counter-strategy blurbs ───────────────────────────────────

export function genCounterStrategyBlurb(villageName, strategyLabel, strategyDesc) {
  return {
    title: `Intel: ${villageName} — ${strategyLabel}`,
    body: `Shadow reports that ${villageName} has shifted tactics. ${strategyDesc}`,
    tag: 'intel', link: null,
  }
}
