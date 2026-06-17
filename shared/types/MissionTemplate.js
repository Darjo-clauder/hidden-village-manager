/**
 * @typedef {'D'|'C'|'B'|'A'|'S'} MissionRank
 *
 * @typedef {Object} RewardRange
 * @property {number} min
 * @property {number} max
 *
 * @typedef {Object} RiskProfile
 * @property {number} injuryChance   - 0-1 base probability of injury
 * @property {number} failPenalty    - Reputation hit on failure
 *
 * @typedef {Object} MissionTemplate
 * @property {string}      id
 * @property {string}      type          - e.g. 'escort', 'recon', 'elimination', 'protection'
 * @property {string}      name
 * @property {MissionRank} baseDifficulty
 * @property {RewardRange} rewardRange   - Ryo payout range
 * @property {RiskProfile} riskProfile
 * @property {string[]}    requiredRoles - Role ids that should be filled for best outcome
 * @property {string}      description
 */

import { nanoid } from '../utils/nanoid.js'

/** Difficulty baseline squad-power thresholds */
export const DIFFICULTY_THRESHOLDS = { D: 15, C: 25, B: 40, A: 60, S: 80 }

/**
 * @param {Partial<MissionTemplate>} overrides
 * @returns {MissionTemplate}
 */
export function createMissionTemplate(overrides = {}) {
  return {
    id: nanoid(),
    type: overrides.type ?? 'escort',
    name: overrides.name ?? 'Unnamed Mission',
    baseDifficulty: overrides.baseDifficulty ?? 'D',
    rewardRange: overrides.rewardRange ?? { min: 300, max: 600 },
    riskProfile: overrides.riskProfile ?? { injuryChance: 0.05, failPenalty: 1 },
    requiredRoles: overrides.requiredRoles ?? [],
    description: overrides.description ?? '',
    ...overrides,
  }
}

/**
 * Resolves a mission against a squad's average power.
 * Returns a deterministic result when `seed` is provided (for testing).
 * @param {MissionTemplate} template
 * @param {number} squadAvgPower   - Average stat power of assigned shinobi
 * @param {number} [seed]          - 0-1, replaces Math.random for tests
 * @returns {{ success: boolean, ryo: number, repGain: number, injuryRoll: number }}
 */
export function resolveMission(template, squadAvgPower, seed) {
  const threshold = DIFFICULTY_THRESHOLDS[template.baseDifficulty] ?? 25
  const roll = seed ?? Math.random()
  const successChance = Math.min(0.95, Math.max(0.05, (squadAvgPower - threshold) / threshold + 0.5))
  const success = roll < successChance

  const ryo = success
    ? Math.round(template.rewardRange.min + Math.random() * (template.rewardRange.max - template.rewardRange.min))
    : 0

  const repGain = success ? 1 : -template.riskProfile.failPenalty
  const injuryRoll = Math.random()

  return { success, ryo, repGain, injuryRoll }
}
