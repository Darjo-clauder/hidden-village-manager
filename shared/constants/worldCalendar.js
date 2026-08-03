/**
 * World Events Calendar — recurring annual events at fixed months.
 * Each event fires at its `month`, with a 1-month advance notice at `month - 1`.
 *
 * Originally six events on the even months. Months 9 and 11 were the only two
 * in the whole year with NOTHING scheduled — no world event, no competition, no
 * annual review — so a player there assigned missions and pressed End Turn, and
 * that was the month (docs/LOOP_ANALYSIS_2026-08-03.md).
 *
 * The two added below close that gap and give the run-up to the year-end
 * tournament a continuous spine: every month from 8 to 12 now has an anchor,
 * escalating from the Shadow War's onset through to the tournament itself.
 * Both are turn-blocking decisions like their siblings, not notifications.
 */

export const WORLD_EVENTS = [
  {
    id: 'great_hunt',
    name: 'The Great Hunt',
    icon: '🎯',
    month: 2,
    desc: 'A competitive hunt across the region. Villages compete for territory bounties.',
    choices: [
      { id: 'participate', label: 'Participate', ryo: 6000, rep: 8, morale: 5, risk: 0.25, desc: 'Send hunters — good reward, some risk.' },
      { id: 'observe',     label: 'Observe',     ryo: 1000, rep: 2, morale: 0, risk: 0,    desc: 'Gather intel instead. Safe but modest.' },
      { id: 'skip',        label: 'Skip',         ryo: 0,    rep:-3, morale:-2, risk: 0,   desc: 'Sit it out. Slight rep loss.' },
    ],
  },
  {
    id: 'spring_festival',
    name: 'Spring Alliance Festival',
    icon: '🌸',
    month: 4,
    desc: 'Villages send delegations to strengthen ties. Strong attendance boosts alliances.',
    choices: [
      { id: 'host',        label: 'Host',         ryo:-4000, rep:15, morale:10, risk: 0,    desc: 'Host the festival. Costly but major rep gain.' },
      { id: 'attend',      label: 'Attend',        ryo: 0,    rep: 8, morale: 5, risk: 0,   desc: 'Send a delegation. Solid diplomacy.' },
      { id: 'skip',        label: 'Skip',          ryo: 0,    rep:-5, morale: 0, risk: 0,   desc: 'Skip entirely. Noted by others.' },
    ],
  },
  {
    id: 'merchant_summit',
    name: 'Merchant Summit',
    icon: '💰',
    month: 6,
    desc: 'Annual trade gathering. Negotiating well yields long-term income bonuses.',
    choices: [
      { id: 'negotiate',   label: 'Negotiate',    ryo: 12000, rep: 5, morale: 0, risk: 0.15, desc: 'Push hard for trade deals. High reward, some risk.' },
      { id: 'attend',      label: 'Attend',       ryo: 5000,  rep: 3, morale: 0, risk: 0,   desc: 'Standard attendance. Steady ryo.' },
      { id: 'boycott',     label: 'Boycott',      ryo: 0,     rep:-8, morale:-3, risk: 0,   desc: 'Send a political message. Major rep loss.' },
    ],
  },
  {
    id: 'shadow_war',
    name: 'Shadow War Onset',
    icon: '⚔',
    month: 8,
    desc: 'Proxy conflicts erupt region-wide. Villages must choose sides or stay neutral.',
    choices: [
      { id: 'aggressive',  label: 'Strike First',  ryo: 8000, rep: 10, morale:-5, risk: 0.35, desc: 'Attack rivals while they mobilize. High risk, high reward.' },
      { id: 'defensive',   label: 'Fortify',       ryo: 0,    rep: 5,  morale: 0, risk: 0.10, desc: 'Strengthen defenses and wait. Moderate risk.' },
      { id: 'neutral',     label: 'Stay Neutral',  ryo: 2000, rep:-2,  morale: 2, risk: 0,    desc: 'Trade with all sides. Small profit, no risk.' },
    ],
  },
  {
    // Month 9 had nothing at all. Sits directly after the Shadow War's onset
    // in month 8, so it reads as that conflict's consequence rather than an
    // unrelated event dropped in to fill a gap.
    id: 'refugee_season',
    name: 'The Displaced',
    icon: '🏚',
    month: 9,
    desc: 'Fighting on the borders has pushed families toward your walls. They need feeding, housing, and an answer.',
    choices: [
      { id: 'shelter', label: 'Open the Gates', ryo: -5000, rep: 14, morale: 6, risk: 0,
        desc: 'Take them in. Expensive, and the region will remember it.' },
      { id: 'ration',  label: 'Ration and Move On', ryo: -1500, rep: 3, morale: 0, risk: 0.20,
        desc: 'Feed them and send them onward. Cheap, but it can sour if it goes badly.' },
      { id: 'turn_away', label: 'Turn Them Away', ryo: 0, rep: -10, morale: -6, risk: 0,
        desc: 'Close the gates. Costs nothing but standing — and your own people are watching.' },
    ],
  },
  {
    id: 'harvest_tribute',
    name: 'Harvest Tribute Collection',
    icon: '🌾',
    month: 10,
    desc: 'Annual tribute season. Dominos produce loyalty or resentment in allied villages.',
    choices: [
      { id: 'full_tribute', label: 'Full Tribute', ryo: 10000, rep:-5, morale: 0, risk: 0,    desc: 'Collect in full. Rich but unpopular.' },
      { id: 'fair',         label: 'Fair Share',   ryo: 5000,  rep: 4, morale: 3, risk: 0,    desc: 'Equitable share. Balance of income and goodwill.' },
      { id: 'waive',        label: 'Waive Tribute',ryo: 0,     rep:12, morale: 5, risk: 0,    desc: 'Forgive debts. Major rep gain, no ryo.' },
    ],
  },
  {
    // Month 11 was the year's other empty slot, and it sits one month before
    // the Grand Tournament — so it is a preparation decision with a real
    // trade-off, and the tournament that follows is what makes the choice bite.
    id: 'tournament_draw',
    name: 'The Draw',
    icon: '🎴',
    month: 11,
    desc: 'Seedings for the Grand Tournament are settled this month. There is more than one way to influence a bracket.',
    choices: [
      { id: 'prepare', label: 'Drill the Squads', ryo: -6000, rep: 2, morale: 8, risk: 0,
        desc: 'Spend the month training. Costly, but the village goes in sharp.' },
      { id: 'lobby',   label: 'Work the Room', ryo: -3000, rep: 6, morale: 0, risk: 0.30,
        desc: 'Court the officials for a kinder draw. If it is noticed, it looks exactly like what it is.' },
      { id: 'stand',   label: 'Take What Comes', ryo: 0, rep: 4, morale: 3, risk: 0,
        desc: 'Say nothing and prepare quietly. Costs nothing; wins a little respect.' },
    ],
  },
  {
    id: 'winter_trials',
    name: 'Winter Endurance Trials',
    icon: '❄',
    month: 12,
    desc: 'Shinobi from all villages compete in grueling winter trials. Fame and growth await.',
    choices: [
      { id: 'full_team',   label: 'Full Squad',    ryo: 3000, rep:10, morale: 8, risk: 0.20, desc: 'Enter multiple shinobi. Competitive but taxing.' },
      { id: 'single',      label: 'Send One',      ryo: 1500, rep: 5, morale: 3, risk: 0.10, desc: 'One representative. Modest gains.' },
      { id: 'skip',        label: 'Skip',          ryo: 0,    rep:-4, morale:-3, risk: 0,    desc: 'No participation. Soft penalty.' },
    ],
  },
]

export const WE_BY_ID = Object.fromEntries(WORLD_EVENTS.map(e => [e.id, e]))

/**
 * Returns the world event scheduled for this month, if any.
 * @param {number} month
 * @returns {object|null}
 */
export function getEventForMonth(month) {
  return WORLD_EVENTS.find(e => e.month === month) || null
}

/**
 * Returns the world event that needs an advance notice this month
 * (i.e., fires next month).
 * @param {number} month
 * @returns {object|null}
 */
export function getUpcomingEvent(month) {
  const nextMonth = month >= 12 ? 1 : month + 1
  return WORLD_EVENTS.find(e => e.month === nextMonth) || null
}

/**
 * Resolve the player's choice for a world event.
 * Returns the outcome deltas.
 * @param {string} eventId
 * @param {string} choiceId
 * @param {Function} rand - Math.random replacement for testing
 * @returns {{ ryo: number, rep: number, morale: number, success: boolean }}
 */
export function resolveWorldEvent(eventId, choiceId, rand = Math.random) {
  const ev = WE_BY_ID[eventId]
  if (!ev) return { ryo: 0, rep: 0, morale: 0, success: false }
  const choice = ev.choices.find(c => c.id === choiceId)
  if (!choice) return { ryo: 0, rep: 0, morale: 0, success: false }

  const failed = choice.risk > 0 && rand() < choice.risk
  if (failed) {
    return { ryo: 0, rep: Math.min(0, choice.rep - 5), morale: choice.morale - 3, success: false }
  }
  return { ryo: choice.ryo, rep: choice.rep, morale: choice.morale, success: true }
}
