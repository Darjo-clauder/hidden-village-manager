/**
 * Starting-kit seed for a new village. Called from setup.js after initState() to
 * populate the opening academy prospect pool and the mission-template library.
 * (Scouts are no longer seeded — the village starts lean and builds scouting itself.)
 *
 * Usage (server tests):  import { seedPhase1 } from '../../seeds/phase1.js'
 */

import { createProspect } from '../shared/types/Prospect.js'
import { dlog } from '../shared/utils/debug.js'
import { createMissionTemplate } from '../shared/types/MissionTemplate.js'
import { createDepthChart } from '../shared/types/DepthChart.js'

// ── 20 Seeded Prospects ───────────────────────────────────────────────────────
export const SEED_PROSPECTS = [
  { fn: 'Kosei',   ln: 'Ueda',    age: 14, positionRole: 'vanguard',  potentialRange: { min: 72, max: 88 }, developmentCurve: 'early_peak' },
  { fn: 'Rena',    ln: 'Shindo',  age: 13, positionRole: 'support',   potentialRange: { min: 65, max: 82 }, developmentCurve: 'linear' },
  { fn: 'Daichi',  ln: 'Mori',    age: 15, positionRole: 'intel',     potentialRange: { min: 55, max: 78 }, developmentCurve: 'late_bloomer' },
  { fn: 'Sora',    ln: 'Aoki',    age: 12, positionRole: 'medical',   potentialRange: { min: 68, max: 91 }, developmentCurve: 'linear' },
  { fn: 'Yuto',    ln: 'Kato',    age: 16, positionRole: 'flex',      potentialRange: { min: 50, max: 70 }, developmentCurve: 'volatile' },
  { fn: 'Hana',    ln: 'Nakamura',age: 13, positionRole: 'vanguard',  potentialRange: { min: 78, max: 95 }, developmentCurve: 'late_bloomer' },
  { fn: 'Ren',     ln: 'Fujii',   age: 14, positionRole: 'support',   potentialRange: { min: 60, max: 75 }, developmentCurve: 'early_peak' },
  { fn: 'Misaki',  ln: 'Hayashi', age: 15, positionRole: 'intel',     potentialRange: { min: 70, max: 85 }, developmentCurve: 'linear' },
  { fn: 'Kaito',   ln: 'Tanaka',  age: 12, positionRole: 'medical',   potentialRange: { min: 62, max: 80 }, developmentCurve: 'volatile' },
  { fn: 'Akira',   ln: 'Yamamoto',age: 16, positionRole: 'vanguard',  potentialRange: { min: 55, max: 72 }, developmentCurve: 'linear' },
  { fn: 'Yuki',    ln: 'Ito',     age: 13, positionRole: 'flex',      potentialRange: { min: 74, max: 89 }, developmentCurve: 'early_peak' },
  { fn: 'Haruto',  ln: 'Suzuki',  age: 14, positionRole: 'support',   potentialRange: { min: 58, max: 76 }, developmentCurve: 'late_bloomer' },
  { fn: 'Noa',     ln: 'Watanabe',age: 12, positionRole: 'intel',     potentialRange: { min: 80, max: 94 }, developmentCurve: 'linear' },
  { fn: 'Saki',    ln: 'Kobayashi',age:15, positionRole: 'medical',   potentialRange: { min: 63, max: 79 }, developmentCurve: 'volatile' },
  { fn: 'Ryota',   ln: 'Kondo',   age: 13, positionRole: 'vanguard',  potentialRange: { min: 69, max: 83 }, developmentCurve: 'linear' },
  { fn: 'Mei',     ln: 'Saito',   age: 16, positionRole: 'support',   potentialRange: { min: 55, max: 71 }, developmentCurve: 'early_peak' },
  { fn: 'Takumi',  ln: 'Inoue',   age: 14, positionRole: 'intel',     potentialRange: { min: 76, max: 90 }, developmentCurve: 'late_bloomer' },
  { fn: 'Aoi',     ln: 'Kimura',  age: 12, positionRole: 'flex',      potentialRange: { min: 66, max: 84 }, developmentCurve: 'volatile' },
  { fn: 'Sota',    ln: 'Matsumoto',age:15, positionRole: 'vanguard',  potentialRange: { min: 82, max: 97 }, developmentCurve: 'early_peak', personalityTraits: ['Ambitious', 'Determined'] },
  { fn: 'Hinata',  ln: 'Ogawa',   age: 13, positionRole: 'medical',   potentialRange: { min: 71, max: 86 }, developmentCurve: 'linear', personalityTraits: ['Compassionate', 'Loyal'] },
].map(p => createProspect(p))

// ── 3 Mission Templates ───────────────────────────────────────────────────────
export const SEED_MISSION_TEMPLATES = [
  createMissionTemplate({
    type: 'escort', name: 'Escort the Tea Merchant',
    baseDifficulty: 'D', rewardRange: { min: 300, max: 500 },
    riskProfile: { injuryChance: 0.04, failPenalty: 1 },
    requiredRoles: ['vanguard', 'support'], description: 'Protect a merchant convoy through bandit territory.',
  }),
  createMissionTemplate({
    type: 'recon', name: 'Border Reconnaissance',
    baseDifficulty: 'B', rewardRange: { min: 3000, max: 5500 },
    riskProfile: { injuryChance: 0.18, failPenalty: 3 },
    requiredRoles: ['intel', 'vanguard', 'flex'], description: 'Map enemy patrol routes near the Land of Iron border.',
  }),
  createMissionTemplate({
    type: 'elimination', name: 'Suppress the Rogue Cell',
    baseDifficulty: 'A', rewardRange: { min: 12000, max: 20000 },
    riskProfile: { injuryChance: 0.35, failPenalty: 6 },
    requiredRoles: ['vanguard', 'vanguard', 'support', 'intel', 'medical'],
    description: 'Neutralise a splinter group that has taken hostages.',
  }),
]

/**
 * Injects seed data into an existing game state object G.
 * Safe to call on an active save — only adds, never removes.
 * @param {object} G - Live game state
 */
export function seedPhase1(G) {
  if (!G) throw new Error('seedPhase1: no game state provided')

  // Prospects
  if (!G.prospects) G.prospects = []
  const existingIds = new Set(G.prospects.map(p => p.id))
  SEED_PROSPECTS.forEach(p => { if (!existingIds.has(p.id)) G.prospects.push(p) })

  // NOTE: a new village no longer inherits a free 5-scout regional network. It starts
  // lean — with the single starter scout seeded in initState() — and the player builds
  // out scouting by hiring through the Staff panel. (The old auto-seeded scouts put a
  // fresh village ~11.8k/mo into staff cost it never chose; see salaryCap.js history.)
  if (!G.staff) G.staff = []

  // Mission templates (stored on G for runtime use)
  if (!G.missionTemplates) G.missionTemplates = []
  const existingTemplateIds = new Set(G.missionTemplates.map(t => t.id))
  SEED_MISSION_TEMPLATES.forEach(t => { if (!existingTemplateIds.has(t.id)) G.missionTemplates.push(t) })

  // Depth charts for existing squads that don't have one yet
  if (!G.depthChart) G.depthChart = {}
  ;(G.squads || []).forEach(sq => {
    if (!G.depthChart[sq.id]) G.depthChart[sq.id] = createDepthChart(sq.id)
  })

  dlog('[seed] Phase 1 seed applied:', {
    prospects: G.prospects.length,
    staff: G.staff.length,
    missionTemplates: G.missionTemplates.length,
    depthChartSquads: Object.keys(G.depthChart).length,
  })
}
