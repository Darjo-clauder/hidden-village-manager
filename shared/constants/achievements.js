/**
 * Achievements.
 *
 * Steam expects them and the game had none. Almost every one of these reads
 * state the simulation ALREADY maintains — dynasty records, the memorial wall,
 * the hall of legends, sealed primals, the owner's confidence, the cross-run
 * lineage — which is why this is a data file and a predicate rather than a
 * system. Two needed a fact nothing recorded (`G._everBroke`, `G._cleanYears`);
 * both are single lines in the tick rather than a new subsystem.
 *
 * Checks are pure and take `{ G, legacy }` so they can span both timescales:
 * `G` is the current run, `legacy` is the cross-run store (shared/utils/legacy.js).
 * A check must tolerate missing fields — it runs against old saves too.
 *
 * Steam SDK wiring is deliberately not here. Unlocks are recorded locally; the
 * mapping to Steam stats belongs with packaging, and this list is the source
 * of truth either way.
 */

const n = v => Number(v) || 0
const arr = v => Array.isArray(v) ? v : []

/** KIA only — the memorial also records departures, which are flagged. */
export function fallenCount(G) {
  return arr(G?.memorial).filter(m => !m.transfer).length
}

export const ACHIEVEMENTS = [
  // ── Tenure ───────────────────────────────────────────────────────────────
  { id: 'first_year',    icon: '🌱', tier: 'bronze', name: 'First Winter',
    desc: 'Survive your first year as Warden.',
    check: ({ G }) => n(G?.year) >= 2 },
  { id: 'decade',        icon: '🏯', tier: 'silver', name: 'A Decade in Office',
    desc: 'Serve ten years in a single tenure.',
    check: ({ G }) => n(G?.year) >= 10 },
  { id: 'full_dynasty',  icon: '👑', tier: 'gold', name: 'The Long Game',
    desc: 'Complete a full thirty-year dynasty.',
    check: ({ G, legacy }) => n(G?.year) >= 30 || n(legacy?.dynastiesCompleted) >= 1 },
  { id: 'grade_s',       icon: '✦', tier: 'gold', name: 'Without Equal',
    desc: 'Conclude a tenure at S grade.',
    check: ({ legacy }) => legacy?.bestGrade === 'S' },
  { id: 'dismissed',     icon: '🚪', tier: 'bronze', name: 'Thanked for Your Service',
    desc: 'Be dismissed by the council. It happens.',
    check: ({ legacy }) => arr(legacy?.tenures).some(t => t.endedBy === 'dismissed') },
  { id: 'survived_vote', icon: '🗳', tier: 'silver', name: 'Mandate Renewed',
    desc: 'Hold owner confidence above 90.',
    check: ({ G }) => n(G?.ownerMandate?.confidence) >= 90 },
  { id: 'lineage_3',     icon: '📜', tier: 'silver', name: 'A Line of Wardens',
    desc: 'Conclude three tenures.',
    check: ({ legacy }) => arr(legacy?.tenures).length >= 3 },
  { id: 'lineage_storied', icon: '🏛', tier: 'gold', name: 'Storied',
    desc: 'Reach the highest legacy standing.',
    check: ({ legacy }) => n(legacy?.points) >= 450 },

  // ── Competition ──────────────────────────────────────────────────────────
  { id: 'first_exam',    icon: '🎓', tier: 'bronze', name: 'Coming of Age',
    desc: 'Win the Adept Exam.',
    check: ({ G }) => n(G?.dynastyRecords?.examWins) >= 1 },
  { id: 'exam_dynasty',  icon: '🎖', tier: 'gold', name: 'Exam Dynasty',
    desc: 'Win the Adept Exam five times.',
    check: ({ G }) => n(G?.dynastyRecords?.examWins) >= 5 },
  { id: 'war_victor',    icon: '⚔', tier: 'silver', name: 'Victor',
    desc: 'Win a Nation War.',
    check: ({ G }) => arr(G?.warState?.warHistory).some(w => w.won) },
  { id: 'raid_streak',   icon: '🔥', tier: 'silver', name: 'Unbroken',
    desc: 'Put together a raid streak of five.',
    check: ({ G }) => n(G?.dynastyRecords?.longestRaidStreak) >= 5 },

  // ── Roster ───────────────────────────────────────────────────────────────
  { id: 'first_legend',  icon: '⭐', tier: 'bronze', name: 'One for the Records',
    desc: 'Enshrine your first legend.',
    check: ({ G }) => arr(G?.hallOfLegends).length >= 1 },
  { id: 'hall_of_five',  icon: '🌟', tier: 'silver', name: 'A Hall Worth Visiting',
    desc: 'Enshrine five legends.',
    check: ({ G }) => arr(G?.hallOfLegends).length >= 5 },
  { id: 'legend_rank',   icon: '🥷', tier: 'silver', name: 'Peak of the Craft',
    desc: 'Have three shinobi at Legend rank at once.',
    check: ({ G }) => arr(G?.shinobi).filter(s => n(s.ri) >= 4).length >= 3 },
  { id: 'full_roster',   icon: '👥', tier: 'bronze', name: 'A Full Village',
    desc: 'Field a roster of thirty.',
    check: ({ G }) => arr(G?.shinobi).length >= 30 },
  { id: 'peak_legend',   icon: '📈', tier: 'gold', name: 'Renown',
    desc: 'Reach a legend score of 500.',
    check: ({ G }) => n(G?.legend) >= 500 || n(G?.dynastyRecords?.peakLegend) >= 500 },

  // ── Primals ──────────────────────────────────────────────────────────────
  { id: 'first_primal',  icon: '🦊', tier: 'silver', name: 'Bound',
    desc: 'Seal your first Primal.',
    check: ({ G }) => arr(G?.beasts).filter(b => b.sealed).length >= 1 },
  { id: 'five_primals',  icon: '🐉', tier: 'gold', name: 'Keeper of Beasts',
    desc: 'Hold five sealed Primals at once.',
    check: ({ G }) => arr(G?.beasts).filter(b => b.sealed).length >= 5 },

  // ── Economy ──────────────────────────────────────────────────────────────
  { id: 'millionaire',   icon: '💰', tier: 'silver', name: 'Coffers Full',
    desc: 'Hold one million ryo.',
    check: ({ G }) => n(G?.ryo) >= 1_000_000 },
  { id: 'from_the_brink',icon: '🩹', tier: 'silver', name: 'From the Brink',
    desc: 'Recover to 100,000 ryo after falling below 1,000.',
    check: ({ G }) => !!G?._everBroke && n(G?.ryo) >= 100_000 },
  { id: 'monument',      icon: '🗿', tier: 'gold', name: 'Built to Last',
    desc: 'Complete a grand work.',
    check: ({ G }) => arr(G?.prestigeCompleted).length >= 1 },
  { id: 'district_five', icon: '🏘', tier: 'silver', name: 'The Village Grows',
    desc: 'Build five districts.',
    check: ({ G }) => arr(G?.districts).filter(d => d.status === 'built').length >= 5 },
  { id: 'prestige_s',    icon: '🏆', tier: 'gold', name: 'First Among Villages',
    desc: 'Reach S prestige tier.',
    check: ({ G }) => G?.prestigeTier === 'S' },

  // ── Diplomacy ────────────────────────────────────────────────────────────
  { id: 'first_ally',    icon: '🤝', tier: 'bronze', name: 'Common Cause',
    desc: 'Form your first alliance.',
    check: ({ G }) => arr(G?.villages).filter(v => v.allied).length >= 1 },
  { id: 'bloc',          icon: '🕊', tier: 'gold', name: 'Architect of Peace',
    desc: 'Hold four alliances at once.',
    check: ({ G }) => arr(G?.villages).filter(v => v.allied).length >= 4 },
  { id: 'beloved',       icon: '🎏', tier: 'silver', name: 'Beloved',
    desc: 'Raise populace support above 90.',
    check: ({ G }) => n(G?.populace?.support) >= 90 },

  // ── The cost ─────────────────────────────────────────────────────────────
  { id: 'first_fallen',  icon: '🕯', tier: 'bronze', name: 'The First Name',
    desc: 'Lose a shinobi in the field.',
    check: ({ G }) => fallenCount(G) >= 1 },
  { id: 'ten_fallen',    icon: '⚰', tier: 'silver', name: 'The Weight of It',
    desc: 'Lose ten shinobi across a tenure.',
    check: ({ G }) => fallenCount(G) >= 10 },
  { id: 'no_losses_year',icon: '🛡', tier: 'gold', name: 'Everyone Comes Home',
    desc: 'Complete a full year without losing a single shinobi.',
    check: ({ G }) => n(G?._cleanYears) >= 1 },
]

export const ACHIEVEMENT_BY_ID = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]))

export const TIER_ORDER = ['bronze', 'silver', 'gold']

/**
 * Evaluate every achievement and return the ids that are newly satisfied.
 * A failing predicate must never break the sweep — a bad check should cost its
 * own achievement, not the whole tick.
 */
export function checkAchievements(state, unlockedIds = []) {
  const have = new Set(unlockedIds)
  const won = []
  for (const a of ACHIEVEMENTS) {
    if (have.has(a.id)) continue
    let ok = false
    try { ok = !!a.check(state) } catch { ok = false }
    if (ok) won.push(a.id)
  }
  return won
}

/** Completion summary for the gallery header. */
export function achievementProgress(unlockedIds = []) {
  const have = new Set(unlockedIds)
  const byTier = {}
  for (const t of TIER_ORDER) {
    const all = ACHIEVEMENTS.filter(a => a.tier === t)
    byTier[t] = { total: all.length, unlocked: all.filter(a => have.has(a.id)).length }
  }
  return { total: ACHIEVEMENTS.length, unlocked: ACHIEVEMENTS.filter(a => have.has(a.id)).length, byTier }
}
