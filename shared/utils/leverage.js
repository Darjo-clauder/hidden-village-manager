/**
 * Leverage plays — spending what you KNOW rather than what you own.
 *
 * The world model already tracks rich per-rival state (personal Warden
 * relationships and their history, rivalry heat, named aces, summit bloc
 * offers) that was previously read-only flavor. These plays turn each of
 * those fields into a target you can act on.
 *
 * Two things gate a play: a filed intel report on the target (recon is the
 * ammunition, so scouting finally pays off downstream) and a state condition
 * specific to that play — you can only blackmail a Warden who has something
 * to hide, only discredit a village that HAS a named ace, only poison a bloc
 * that is actually on the table.
 *
 * Pure — no G access. Caller checks eligibility, charges, and applies effects.
 */
const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi)

export const LEVERAGE_PLAYS = [
  {
    id: 'blackmail',
    n: 'Blackmail the Warden',
    cost: 6000,
    desc: 'Their own history is the weapon. A Warden who has wronged you has left a trail — press it and they back off.',
    // Needs a soured personal relationship: that history IS the dirt.
    requires: 'A personal grudge with their Warden (personal rel under 40)',
  },
  {
    id: 'discredit_ace',
    n: 'Discredit Their Ace',
    cost: 8000,
    desc: 'Put a story in the world about their best shinobi. A rattled star carries a village less far.',
    requires: 'The village must have a named ace',
  },
  {
    id: 'poison_bloc',
    n: 'Poison the Bloc',
    cost: 5000,
    desc: 'Whisper to the right delegates before the summit and the alliance forming against you never sets.',
    requires: 'An active summit bloc offer',
  },
]

export const PLAY_BY_ID = Object.fromEntries(LEVERAGE_PLAYS.map(p => [p.id, p]))

/**
 * Whether a play's state precondition is met.
 * @param playId
 * @param ctx { kagePersonalRel, aceCount, hasBlocOffer, hasIntel }
 * @returns { ok: boolean, reason: string }
 */
export function playEligibility(playId, ctx = {}) {
  if (!ctx.hasIntel) return { ok: false, reason: 'No current intel report on this village — run recon first.' }
  if (playId === 'blackmail') {
    return (ctx.kagePersonalRel ?? 50) < 40
      ? { ok: true, reason: '' }
      : { ok: false, reason: 'Nothing to hold over them — relations are too cordial.' }
  }
  if (playId === 'discredit_ace') {
    return (ctx.aceCount || 0) > 0
      ? { ok: true, reason: '' }
      : { ok: false, reason: 'They have no named ace to discredit.' }
  }
  if (playId === 'poison_bloc') {
    return ctx.hasBlocOffer
      ? { ok: true, reason: '' }
      : { ok: false, reason: 'No bloc is forming right now.' }
  }
  return { ok: false, reason: 'Unknown play.' }
}

/**
 * Success chance. Rivalry heat cuts both ways — a village that already
 * suspects you is watching for exactly this, so grudge makes plays HARDER,
 * while your espionage investment and their counter-intel set the baseline.
 * @param ctx { espionageBonus, grudgeTicks, counterIntel }
 */
export function leverageSuccessChance(playId, ctx = {}) {
  const base = { blackmail: 0.55, discredit_ace: 0.5, poison_bloc: 0.6 }[playId] ?? 0.5
  const heat = clamp((ctx.grudgeTicks || 0) * 0.03, 0, 0.2)
  const raw = base + (ctx.espionageBonus || 0) - heat - (ctx.counterIntel || 0) * 0.02
  return clamp(raw, 0.1, 0.9)
}

/**
 * Resolution effects. Success targets the specific field the play attacks;
 * failure is always exposure — the rival learns you tried, which raises heat
 * and sours the personal relationship further.
 * @returns { relDelta, kageRelDelta, grudgeDelta, threatDelta, strengthDelta,
 *            clearBloc, suppressDemandsMonths, note }
 */
export function leverageEffect(playId, success, rng = Math.random) {
  const exposed = {
    relDelta: -10, kageRelDelta: -12, grudgeDelta: 2, threatDelta: 8,
    strengthDelta: 0, clearBloc: false, suppressDemandsMonths: 0,
  }
  if (!success) {
    return { ...exposed, note: 'The play was traced back to you.' }
  }
  if (playId === 'blackmail') {
    return {
      relDelta: 0, kageRelDelta: -4, grudgeDelta: 1, threatDelta: -10,
      strengthDelta: 0, clearBloc: false,
      suppressDemandsMonths: 4 + Math.floor(rng() * 3),
      note: 'They have gone quiet — no demands will come from that quarter for a while.',
    }
  }
  if (playId === 'discredit_ace') {
    return {
      relDelta: -5, kageRelDelta: -6, grudgeDelta: 2, threatDelta: 2,
      strengthDelta: -(4 + Math.floor(rng() * 5)), clearBloc: false,
      suppressDemandsMonths: 0,
      note: 'Their star is fielding questions instead of missions.',
    }
  }
  if (playId === 'poison_bloc') {
    return {
      relDelta: -3, kageRelDelta: -3, grudgeDelta: 1, threatDelta: 0,
      strengthDelta: 0, clearBloc: true, suppressDemandsMonths: 0,
      note: 'The bloc never formed.',
    }
  }
  return { ...exposed, note: '' }
}
