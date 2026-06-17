/**
 * @typedef {Object} ScoutReport
 * @property {string}  id
 * @property {string}  prospectId
 * @property {string}  scoutId
 * @property {number}  timestamp          - Unix ms
 * @property {number}  year
 * @property {number}  month
 * @property {number}  estimatedAbility   - Scout's read on current ability (0-99)
 * @property {{min:number,max:number}} estimatedPotentialRange
 * @property {number}  confidence         - 0–1: how reliable this report is
 * @property {string}  quality            - 'Impression'|'General'|'Detailed'|'Elite'
 * @property {string}  notes              - Narrative description
 * @property {string}  scoutName
 * @property {string}  region
 * @property {boolean} isSecondOpinion
 * @property {boolean} personalityRevealed
 * @property {boolean} rivalInterest
 */

import { nanoid } from '../utils/nanoid.js'

/**
 * Calculates confidence from scout attributes and scouting duration.
 * @param {import('./Scout.js').Scout} scout
 * @param {number} monthsActive - Months scout has been in prospect's region
 * @returns {number} 0-1
 */
export function calcConfidence(scout, monthsActive = 1) {
  const regionFamiliarity = Math.min(1, monthsActive / 6)  // caps at 6 months
  const judgementFactor = scout.judgement / 20              // 0–1
  const base = 0.3 + judgementFactor * 0.4 + regionFamiliarity * 0.3
  return Math.min(0.98, parseFloat(base.toFixed(2)))
}

/**
 * Derives quality tier from confidence value.
 * @param {number} confidence - 0-1
 * @returns {'Impression'|'General'|'Detailed'|'Elite'}
 */
export function confidenceToQuality(confidence) {
  if (confidence >= 0.85) return 'Elite'
  if (confidence >= 0.65) return 'Detailed'
  if (confidence >= 0.45) return 'General'
  return 'Impression'
}

/**
 * Builds a ScoutReport with ability/potential estimates distorted by scout bias.
 * @param {import('./Scout.js').Scout} scout
 * @param {import('./Prospect.js').Prospect} prospect
 * @param {number} monthsActive
 * @param {object} [ctx] - { year, month, region, isSecondOpinion, rivalInterest }
 * @returns {ScoutReport}
 */
export function createScoutReport(scout, prospect, monthsActive = 1, ctx = {}) {
  const confidence = calcConfidence(scout, monthsActive)
  const quality = confidenceToQuality(confidence)

  // Bias distorts the estimate — higher confidence shrinks the distortion window
  const distortionWindow = Math.round((1 - confidence) * 20)
  const biasDrift = Math.round(scout.bias * (1 - confidence))
  const estimatedAbility = clamp(
    prospect.currentAbility + biasDrift + rndInt(-distortionWindow, distortionWindow),
    0, 99
  )

  const potSpread = Math.round((1 - confidence) * 15)
  const estimatedPotentialRange = {
    min: clamp(prospect.potential - potSpread + biasDrift, 0, 99),
    max: clamp(prospect.potential + potSpread + biasDrift, 0, 99),
  }

  return {
    id: nanoid(),
    prospectId: prospect.id,
    scoutId: scout.id,
    scoutName: `${scout.fn} ${scout.ln}`,
    timestamp: Date.now(),
    year: ctx.year ?? 1,
    month: ctx.month ?? 1,
    estimatedAbility,
    estimatedPotentialRange,
    confidence,
    quality,
    notes: '',
    region: ctx.region ?? scout.region ?? '',
    isSecondOpinion: ctx.isSecondOpinion ?? false,
    personalityRevealed: confidence >= 0.65,
    rivalInterest: ctx.rivalInterest ?? false,
  }
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)) }
function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
