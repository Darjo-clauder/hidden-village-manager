/**
 * Village council factions and policy proposals.
 */
export const COUNCIL_FACTIONS = [
  {
    id: 'military',
    n: 'Military Council',
    icon: '⚔',
    color: '#f66',
    desc: 'Veteran commanders who prioritize combat readiness and border defense.',
    approvalGains: { missionSuccess: 1, sRankComplete: 3, warWon: 5 },
    approvalLoss: { missionFail: -2, shinobiKIA: -3, warLost: -8 },
    perk: { id: 'military_perk', desc: '+5% mission success when approval ≥ 70', successMod: 0.05, threshold: 70 },
  },
  {
    id: 'merchant',
    n: 'Merchant Guild',
    icon: '💰',
    color: '#c9a84c',
    desc: 'Wealthy traders who care about ryo flow, trade relations, and stability.',
    approvalGains: { districtBuilt: 4, allianceFormed: 2, highRyo: 2 },
    approvalLoss: { lowRyo: -3, warDeclared: -4 },
    perk: { id: 'merchant_perk', desc: '+800 ryo/month when approval ≥ 70', monthlyRyo: 800, threshold: 70 },
  },
  {
    id: 'academy',
    n: 'Academy Board',
    icon: '📖',
    color: '#87ceeb',
    desc: 'Educators focused on youth development and long-term village strength.',
    approvalGains: { prospectSigned: 2, graduationMonth: 3 },
    approvalLoss: { prospectLost: -2, lowMorale: -2 },
    perk: { id: 'academy_perk', desc: '+10% prospect growth when approval ≥ 70', growthBonus: 0.10, threshold: 70 },
  },
  {
    id: 'elder',
    n: 'Elder Council',
    icon: '🧓',
    color: '#cc7fb8',
    desc: 'Ancient advisors who value tradition, reputation, and civilian welfare.',
    approvalGains: { highReputation: 2, veteranRetired: 3, allianceFormed: 1 },
    approvalLoss: { lowReputation: -2, lowMorale: -2, shinobiKIA: -1 },
    perk: { id: 'elder_perk', desc: '+5 rep/month when approval ≥ 70', monthlyRep: 5, threshold: 70 },
  },
]

export const FACTION_BY_ID = Object.fromEntries(COUNCIL_FACTIONS.map(f => [f.id, f]))

export const COUNCIL_PROPOSALS = [
  { id: 'war_footing',   faction: 'military', n: 'War Footing',       desc: 'Double mission assignments but KIA risk +2%.', choices: [{ l: 'Approve', fn: 'war_footing_yes' }, { l: 'Decline', fn: 'war_footing_no' }] },
  { id: 'trade_treaty',  faction: 'merchant', n: 'Trade Treaty',      desc: 'Spend 8,000 ryo to open a new trade route (+1,500 ryo/mo).', choices: [{ l: 'Approve (−8k ryo)', fn: 'trade_treaty_yes' }, { l: 'Decline', fn: 'trade_treaty_no' }] },
  { id: 'exam_funding',  faction: 'academy',  n: 'Extra Exam Funding',desc: 'Spend 5,000 ryo for +15% graduation rates this cycle.', choices: [{ l: 'Approve (−5k ryo)', fn: 'exam_funding_yes' }, { l: 'Decline', fn: 'exam_funding_no' }] },
  { id: 'curfew',        faction: 'elder',    n: 'Civilian Curfew',   desc: 'Reduce morale −5 but gain +8 reputation.', choices: [{ l: 'Approve', fn: 'curfew_yes' }, { l: 'Decline', fn: 'curfew_no' }] },
  { id: 'arms_stockpile',faction: 'military', n: 'Arms Stockpile',    desc: 'Spend 12,000 ryo to add +10 permanent defense.', choices: [{ l: 'Approve (−12k ryo)', fn: 'arms_yes' }, { l: 'Decline', fn: 'arms_no' }] },
  { id: 'market_day',    faction: 'merchant', n: 'Grand Market Day',  desc: 'Free event: +3,000 ryo and +5 morale, once per year.', choices: [{ l: 'Approve', fn: 'market_day_yes' }, { l: 'Decline', fn: 'market_day_no' }] },
]

/**
 * Returns the combined council perks from factions at or above approval threshold.
 * @param {object} G
 * @returns {{ successMod, monthlyRyo, growthBonus, monthlyRep }}
 */
export function getCouncilPerks(G) {
  const perks = { successMod: 0, monthlyRyo: 0, growthBonus: 0, monthlyRep: 0 }
  const approvals = G.councilApproval || {}
  for (const f of COUNCIL_FACTIONS) {
    const ap = approvals[f.id] ?? 50
    if (ap >= f.perk.threshold) {
      for (const [k, v] of Object.entries(f.perk)) {
        if (k in perks) perks[k] += v
      }
    }
  }
  return perks
}
