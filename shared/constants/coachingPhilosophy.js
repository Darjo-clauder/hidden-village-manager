export const COACHING_PHILOSOPHIES = [
  {
    id: 'balanced',
    n: 'Balanced',
    desc: 'No overriding philosophy — flexible tactics adapted to each situation.',
    mods: { missionSuccess: 0, kiaRisk: 0, morale: 0, prospectGrowth: 0, academyCostMult: 1 },
  },
  {
    id: 'aggressive',
    n: 'Aggressive',
    desc: 'Push hard for high-value missions. Higher KIA risk, stronger mission output.',
    mods: { missionSuccess: 0.08, kiaRisk: 0.12, morale: -3, prospectGrowth: -0.05, academyCostMult: 1 },
  },
  {
    id: 'defensive',
    n: 'Defensive',
    desc: 'Minimise casualties. Lower mission success rate but significantly safer rosters.',
    mods: { missionSuccess: -0.06, kiaRisk: -0.12, morale: 5, prospectGrowth: 0, academyCostMult: 1 },
  },
  {
    id: 'youth_focus',
    n: 'Youth Focus',
    desc: 'Invest in the academy pipeline. Prospects develop faster but experienced shinobi are underused.',
    mods: { missionSuccess: -0.05, kiaRisk: 0, morale: 0, prospectGrowth: 0.20, academyCostMult: 0.80 },
  },
]

export const PHILOSOPHY_BY_ID = Object.fromEntries(COACHING_PHILOSOPHIES.map(p => [p.id, p]))

export function getPhilosophyMods(G) {
  const id = G.coachingPhilosophy || 'balanced'
  return (PHILOSOPHY_BY_ID[id] || PHILOSOPHY_BY_ID.balanced).mods
}
