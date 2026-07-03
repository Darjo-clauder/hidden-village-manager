/**
 * Journalist personas — the press corps who ask the questions.
 *
 * Press conferences already exist; this gives them a face. Each request is asked
 * by one of a small named corps, each with a persona that frames the question and
 * reacts differently to your tone. Your standing with each reporter (0–100) is
 * moved by how you answer them, and a reporter you've alienated colors their
 * future coverage — "who's asking" now matters as much as what they ask.
 *
 * Pure helpers; no G access. Unit-tested.
 */

export const JOURNALISTS = [
  { id: 'loyal',   name: 'Rin Tomari',   persona: 'sympathetic',   outlet: 'The Village Herald',
    frame: 'asks warmly', blurb: 'A friendly beat writer who roots for the village.' },
  { id: 'cynic',   name: 'Goro Banda',   persona: 'cynical',       outlet: 'The Standard',
    frame: 'presses hard', blurb: 'A hard-nosed cynic looking for the crack in every story.' },
  { id: 'sensat',  name: 'Mika Sena',    persona: 'sensationalist', outlet: 'Frontline Weekly',
    frame: 'hunts a headline', blurb: 'A sensationalist who spins everything into drama.' },
]

export const JOURNALIST_BY_ID = Object.fromEntries(JOURNALISTS.map(j => [j.id, j]))

export function getJournalistRel(rels, id) {
  const v = rels?.[id]
  return typeof v === 'number' ? v : 50
}

export function adjustJournalistRel(rels, id, delta) {
  const next = Math.max(0, Math.min(100, getJournalistRel(rels, id) + delta))
  rels[id] = next
  return next
}

/** Pick who's asking this time. */
export function pickJournalist(rng = Math.random) {
  return JOURNALISTS[Math.floor(rng() * JOURNALISTS.length)]
}

/**
 * Standing change from answering `journalist` with `toneId`.
 * Humble answers win everyone over; dismissiveness stings, and the cynic takes it
 * hardest; the sensationalist loves a confident/callout soundbite.
 */
export function toneRelDelta(persona, toneId) {
  const base = { humble: 4, confident: 1, dismissive: -5, callout: -2 }[toneId] ?? 0
  let mod = 0
  if (persona === 'cynical' && toneId === 'dismissive') mod = -4
  if (persona === 'cynical' && toneId === 'humble') mod = 2
  if (persona === 'sensationalist' && (toneId === 'confident' || toneId === 'callout')) mod = 4
  if (persona === 'sympathetic' && toneId === 'dismissive') mod = 2   // forgives you more
  return base + mod
}

/** Standing tier for UI + coverage effects. */
export function journalistTier(rel) {
  if (rel >= 70) return { id: 'friendly', label: 'Friendly', color: '#8fbc8f' }
  if (rel >= 40) return { id: 'neutral', label: 'Neutral', color: '#c9a84c' }
  return { id: 'hostile', label: 'Hostile', color: '#cc5a4a' }
}
