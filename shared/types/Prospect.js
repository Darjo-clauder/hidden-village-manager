/**
 * @typedef {Object} PotentialRange
 * @property {number} min   - Minimum realistic potential (0-99)
 * @property {number} max   - Maximum realistic potential (0-99)
 */

/**
 * @typedef {Object} HiddenAttribute
 * @property {string} key        - Attribute key (e.g. 'resilience', 'coachability')
 * @property {number} value      - True value (0-20)
 * @property {boolean} revealed  - Whether a scout has uncovered this attribute
 */

/**
 * @typedef {'linear'|'early_peak'|'late_bloomer'|'volatile'} DevelopmentCurve
 */

/**
 * @typedef {Object} Prospect
 * @property {string}           id
 * @property {string}           fn               - First name
 * @property {string}           ln               - Last name
 * @property {number}           age
 * @property {string}           positionRole     - 'vanguard'|'support'|'intel'|'medical'|'flex'
 * @property {PotentialRange}   potentialRange
 * @property {number}           currentAbility   - 0-99, hidden until scouted
 * @property {number}           potential        - True ceiling (0-99), hidden until scouted
 * @property {HiddenAttribute[]} hiddenAttributes
 * @property {string[]}         personalityTraits
 * @property {DevelopmentCurve} developmentCurve
 * @property {string|null}      clubAffiliation  - Current academy/village name or null
 * @property {string|null}      trainingPlanId
 * @property {string|null}      fromRegion
 * @property {number}           monthsWaiting
 * @property {number|null}      urgencyMonths    - Months before rival villages can sign
 * @property {ScoutHistory[]}   scoutHistory
 */

/**
 * @typedef {Object} ScoutHistory
 * @property {string} scoutId
 * @property {string} scoutName
 * @property {number} confidence
 * @property {string} quality
 * @property {string} narrative
 * @property {number} year
 * @property {number} month
 */

import { nanoid } from '../utils/nanoid.js'
import { POSITION_ROLES, DEVELOPMENT_CURVES, HIDDEN_ATTRIBUTE_KEYS, PERSONALITY_TRAITS } from '../constants/prospect.js'

/**
 * Creates a new Prospect with randomised hidden attributes.
 * @param {Partial<Prospect>} overrides
 * @returns {Prospect}
 */
export function createProspect(overrides = {}) {
  const potMin = overrides.potentialRange?.min ?? rndInt(40, 65)
  const potMax = overrides.potentialRange?.max ?? rndInt(potMin + 10, Math.min(99, potMin + 40))
  const potential = rndInt(potMin, potMax)
  const currentAbility = rndInt(Math.max(5, potential - 30), potential - 5)

  return {
    id: nanoid(),
    fn: overrides.fn ?? '',
    ln: overrides.ln ?? '',
    age: overrides.age ?? rndInt(12, 17),
    positionRole: overrides.positionRole ?? randomFrom(POSITION_ROLES),
    potentialRange: { min: potMin, max: potMax },
    currentAbility,
    potential,
    hiddenAttributes: overrides.hiddenAttributes ?? generateHiddenAttributes(),
    personalityTraits: overrides.personalityTraits ?? [randomFrom(PERSONALITY_TRAITS)],
    developmentCurve: overrides.developmentCurve ?? randomFrom(DEVELOPMENT_CURVES),
    clubAffiliation: overrides.clubAffiliation ?? null,
    trainingPlanId: overrides.trainingPlanId ?? null,
    fromRegion: overrides.fromRegion ?? null,
    monthsWaiting: overrides.monthsWaiting ?? 0,
    urgencyMonths: overrides.urgencyMonths ?? null,
    scoutHistory: overrides.scoutHistory ?? [],
    // UI-compat fields (used by existing scouting panel)
    statRanges: false,
    personalityRevealed: false,
    trialDayDone: false,
    ...overrides,
  }
}

function generateHiddenAttributes() {
  return HIDDEN_ATTRIBUTE_KEYS.map(key => ({
    key,
    value: rndInt(1, 20),
    revealed: false,
  }))
}

function rndInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)] }
