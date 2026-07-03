/**
 * Medical & rehab depth (R25) — turns injury recovery from a silent countdown into
 * a decision. For an injured shinobi the player picks a rehab plan: rush them back
 * (faster, but real re-injury risk and rusty returning form), standard, or careful
 * rehab (needs a medic; best returning form + lingering injury resistance). Medic
 * quality (staff + infirmary tier) softens the rush risk. Pure + deterministic.
 */

export const REHAB_PLANS = [
  { id: 'rush',     label: 'Rush Back',     icon: '⚡', desc: 'Heal ~twice as fast, but risk aggravating the injury and returning rusty.' },
  { id: 'standard', label: 'Standard',      icon: '⚖', desc: 'Normal recovery — the default.' },
  { id: 'careful',  label: 'Careful Rehab', icon: '🛡', desc: 'Needs a medic. Sharpest return + lingering injury resistance.' },
]
export const PLAN_BY_ID = Object.fromEntries(REHAB_PLANS.map(p => [p.id, p]))

// Medic quality 0..1 from medical staff count + infirmary (hospital) tier.
export function medQuality(medStaffCount = 0, hospitalLevel = 0) {
  return Math.min(1, medStaffCount * 0.22 + hospitalLevel * 0.14)
}

// Months of healing applied per turn for a plan (base 1).
export function recoveryStep(plan) {
  return plan === 'rush' ? 2 : 1
}

// Chance of a setback when rushing, softened by medic quality. 0 for other plans.
export function reinjuryChance(plan, quality = 0) {
  if (plan !== 'rush') return 0
  return Math.max(0.04, Math.round((0.28 - quality * 0.20) * 100) / 100)
}

// Returning-form floor after recovery — careful returns sharp, rush returns rusty.
export function returningForm(plan) {
  return plan === 'careful' ? 88 : plan === 'rush' ? 55 : 70
}

// Careful rehab needs a medic on staff; falls back to standard otherwise.
export function effectivePlan(plan, hasMedic) {
  if (plan === 'careful' && !hasMedic) return 'standard'
  return plan || 'standard'
}
