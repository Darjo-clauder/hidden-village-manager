/**
 * @typedef {Object} Scout
 * @property {string}  id
 * @property {string}  fn
 * @property {string}  ln
 * @property {string}  region           - Primary assigned region id
 * @property {number}  knowledge        - 1-20: breadth of player/prospect database
 * @property {number}  judgement        - 1-20: accuracy of ability/potential estimates
 * @property {number}  bias             - -10 to +10: systematic over/under-rating tendency
 * @property {number}  costPerReport    - Ryo cost per submitted ScoutReport
 * @property {Object}  regionMemory     - { [regionId]: { contactLevel, monthsActive } }
 * @property {number}  fatigue          - 0-100
 * @property {string}  role             - 'scout_jonin' | 'head_scout'
 * @property {number}  rating           - Overall scout quality 1-20 (derived from knowledge+judgement)
 */

import { nanoid } from '../utils/nanoid.js'

/**
 * @param {Partial<Scout>} overrides
 * @returns {Scout}
 */
export function createScout(overrides = {}) {
  const knowledge = overrides.knowledge ?? rndInt(6, 16)
  const judgement = overrides.judgement ?? rndInt(6, 16)
  return {
    id: nanoid(),
    fn: overrides.fn ?? '',
    ln: overrides.ln ?? '',
    region: overrides.region ?? null,
    knowledge,
    judgement,
    bias: overrides.bias ?? rndInt(-4, 4),
    costPerReport: overrides.costPerReport ?? (knowledge + judgement) * 100,
    regionMemory: overrides.regionMemory ?? {},
    fatigue: overrides.fatigue ?? 0,
    role: overrides.role ?? 'scout_jonin',
    rating: Math.round((knowledge + judgement) / 2),
    ...overrides,
  }
}

function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
