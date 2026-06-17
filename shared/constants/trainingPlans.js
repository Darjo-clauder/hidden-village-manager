/**
 * Training plans assignable to in-academy prospects.
 * Each plan specifies which stat receives a growth bonus and by how much,
 * plus a description shown in the Academy UI.
 *
 * statFocus: the stat key that benefits most from this plan
 * growthBonus: multiplier added on top of base growth when plan is active
 *   (stacks with coachabilityBonus and mentorBonus)
 * graduationWeights: relative weight adjustments applied to stats at graduation
 *   (positive = bias more points toward that stat, negative = fewer)
 */
export const TRAINING_PLANS = [
  {
    id: 'ninjutsu_focus',
    label: 'Ninjutsu Focus',
    icon: '🔥',
    color: '#f0a030',
    statFocus: 'ninjutsu',
    growthBonus: 0.18,
    desc: 'Intensive chakra control and jutsu theory. +18% growth speed, graduation bias toward ninjutsu.',
    graduationWeights: { ninjutsu: 3, taijutsu: -1, speed: 0, chakra: 2, intelligence: 1 },
  },
  {
    id: 'taijutsu_focus',
    label: 'Taijutsu Focus',
    icon: '👊',
    color: '#f66',
    statFocus: 'taijutsu',
    growthBonus: 0.18,
    desc: 'Physical conditioning and combat drills. +18% growth speed, graduation bias toward taijutsu and speed.',
    graduationWeights: { ninjutsu: -1, taijutsu: 3, speed: 2, chakra: -1, intelligence: 0 },
  },
  {
    id: 'speed_focus',
    label: 'Speed Focus',
    icon: '⚡',
    color: '#87ceeb',
    statFocus: 'speed',
    growthBonus: 0.15,
    desc: 'Movement, evasion, and reflex training. +15% growth speed, strong graduation bias toward speed.',
    graduationWeights: { ninjutsu: 0, taijutsu: 1, speed: 4, chakra: -1, intelligence: 0 },
  },
  {
    id: 'intel_focus',
    label: 'Intel Focus',
    icon: '📖',
    color: '#cc7fb8',
    statFocus: 'intelligence',
    growthBonus: 0.15,
    desc: 'Strategy, analysis, and genjutsu theory. +15% growth speed, graduation bias toward intelligence.',
    graduationWeights: { ninjutsu: 1, taijutsu: -1, speed: -1, chakra: 1, intelligence: 4 },
  },
  {
    id: 'balanced',
    label: 'Balanced',
    icon: '⚖',
    color: '#8fbc8f',
    statFocus: null,
    growthBonus: 0.08,
    desc: 'Well-rounded fundamentals. +8% growth speed, even stat distribution at graduation.',
    graduationWeights: { ninjutsu: 1, taijutsu: 1, speed: 1, chakra: 1, intelligence: 1 },
  },
]

export const PLAN_BY_ID = Object.fromEntries(TRAINING_PLANS.map(p => [p.id, p]))
