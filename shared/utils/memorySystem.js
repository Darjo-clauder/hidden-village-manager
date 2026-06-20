/**
 * Shinobi memory system.
 *
 * Each shinobi carries a small log of meaningful events (memories). Memories
 * have a type, intensity (0–1), and a natural decay half-life (tau, in months).
 * Decayed memories below 0.05 intensity are pruned automatically.
 *
 * Memories feed into:
 *  - indMorale delta (memoryMoraleMod)
 *  - confidence floor/ceiling nudges (dominantValence)
 *  - narrative quote selection (most salient memory)
 *  - thread escalation triggers
 *
 * Pure — no G references.
 */

// ── Memory type definitions ────────────────────────────────────────────────

export const MEMORY_TYPES = {
  saved_comrade:    { label: 'Saved a Comrade',      tau: 24, valence: 'positive',  baseIntensity: 0.80 },
  witness_kia:      { label: 'Witnessed KIA',         tau: 18, valence: 'trauma',    baseIntensity: 0.90 },
  mission_triumph:  { label: 'Mission Triumph',       tau: 12, valence: 'positive',  baseIntensity: 0.50 },
  mission_disaster: { label: 'Mission Disaster',      tau: 12, valence: 'negative',  baseIntensity: 0.60 },
  public_shame:     { label: 'Public Shaming',        tau: 20, valence: 'negative',  baseIntensity: 0.70 },
  betrayal:         { label: 'Betrayal',              tau: 36, valence: 'trauma',    baseIntensity: 1.00 },
  mentor_bond:      { label: 'Mentorship',            tau: 30, valence: 'positive',  baseIntensity: 0.60 },
  rival_defeat:     { label: 'Defeated a Rival',      tau: 16, valence: 'positive',  baseIntensity: 0.70 },
  promotion_earned: { label: 'Hard-Earned Promotion', tau: 24, valence: 'positive',  baseIntensity: 0.50 },
  war_hero:         { label: 'War Hero',              tau: 30, valence: 'positive',  baseIntensity: 0.75 },
  squad_kia:        { label: 'Squad Member Died',     tau: 24, valence: 'trauma',    baseIntensity: 0.85 },
  prestige_rise:    { label: 'Village Prestige Rise', tau: 18, valence: 'positive',  baseIntensity: 0.40 },
  grudge_escalated: { label: 'Grudge Escalated',      tau: 20, valence: 'negative',  baseIntensity: 0.60 },
  reconciled:       { label: 'Reconciliation',        tau: 24, valence: 'positive',  baseIntensity: 0.65 },
}

export const MEMORY_TYPE_IDS = Object.keys(MEMORY_TYPES)

/**
 * Create a single memory entry.
 * @param {string} type         key from MEMORY_TYPES
 * @param {string} source       mission id, event id, or freeform string
 * @param {{ year: number, month: number }} when
 * @param {number} [intensityOverride]  optional override; otherwise uses baseIntensity
 * @returns {object} memory entry
 */
export function createMemory(type, source, when, intensityOverride) {
  const def = MEMORY_TYPES[type]
  if (!def) throw new Error(`Unknown memory type: ${type}`)
  return {
    id:        Math.random().toString(36).slice(2),
    type,
    label:     def.label,
    valence:   def.valence,
    intensity: intensityOverride ?? def.baseIntensity,
    tau:       def.tau,
    source,
    year:      when.year,
    month:     when.month,
  }
}

/**
 * Push a memory onto a shinobi, capping the list at 20 (oldest pruned first).
 * @param {object} s        shinobi
 * @param {string} type
 * @param {string} source
 * @param {{ year: number, month: number }} when
 * @param {number} [intensityOverride]
 */
export function addMemory(s, type, source, when, intensityOverride) {
  if (!s.memories) s.memories = []
  s.memories.push(createMemory(type, source, when, intensityOverride))
  if (s.memories.length > 20) s.memories.splice(0, s.memories.length - 20)
}

/**
 * Decay all memories on a shinobi by monthsElapsed.
 * Memories that fall below 0.05 intensity are pruned.
 * Call once per monthly tick.
 *
 * Decay model: intensity *= e^(−monthsElapsed / tau)
 *
 * @param {object} s               shinobi
 * @param {number} monthsElapsed   typically 1 (called each adv tick)
 */
export function decayMemories(s, monthsElapsed = 1) {
  if (!s.memories || s.memories.length === 0) return
  s.memories = s.memories
    .map(m => ({ ...m, intensity: m.intensity * Math.exp(-monthsElapsed / m.tau) }))
    .filter(m => m.intensity >= 0.05)
}

/**
 * Returns the dominant memory valence: 'positive' | 'negative' | 'trauma' | 'neutral'.
 * Weighted by current intensity.
 */
export function dominantMemoryValence(s) {
  if (!s.memories || s.memories.length === 0) return 'neutral'
  const scores = { positive: 0, negative: 0, trauma: 0 }
  for (const m of s.memories) scores[m.valence] = (scores[m.valence] || 0) + m.intensity
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
  return top[1] > 0.15 ? top[0] : 'neutral'
}

/**
 * Returns a morale modifier (flat integer) driven by the shinobi's memory state.
 * Range roughly −6 to +4 per month.
 */
export function memoryMoraleMod(s) {
  if (!s.memories || s.memories.length === 0) return 0
  let score = 0
  for (const m of s.memories) {
    const w = m.valence === 'positive' ? 1 : m.valence === 'trauma' ? -2 : -1
    score += w * m.intensity
  }
  return Math.max(-6, Math.min(4, Math.round(score * 4)))
}

/**
 * Returns the single most salient memory (highest intensity) or null.
 */
export function mostSalientMemory(s) {
  if (!s.memories || s.memories.length === 0) return null
  return s.memories.reduce((best, m) => (!best || m.intensity > best.intensity ? m : best), null)
}

/**
 * Returns a short flavor string describing a shinobi's memory state (for dossier/inbox).
 */
export function memoryStateBlurb(s) {
  const val = dominantMemoryValence(s)
  const salient = mostSalientMemory(s)
  if (!salient) return 'No strong memories on record.'
  const label = salient.label.toLowerCase()
  if (val === 'trauma') return `Still carrying the weight of ${label}. It shows.`
  if (val === 'positive') return `Buoyed by the memory of ${label}.`
  if (val === 'negative') return `The shadow of ${label} lingers.`
  return `Memory of ${label} fading.`
}
