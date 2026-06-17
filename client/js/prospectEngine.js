import { G, rnd, clamp, sn } from './state.js'
import { aL } from './ui.js'
import { isEnabled } from '../../config/features.js'
import { HIDDEN_ATTRIBUTE_KEYS } from '../../shared/constants/prospect.js'
import { PLAN_BY_ID } from '../../shared/constants/trainingPlans.js'

// ── Growth rate by age ────────────────────────────────────────────────────────
// Returns base growth points per month at a given age
function baseGrowthRate(age) {
  if (age <= 14) return 1.2
  if (age <= 17) return 1.6
  if (age <= 21) return 1.4
  if (age <= 25) return 0.8
  if (age <= 28) return 0.4
  return 0.1
}

// ── Curve modifiers ───────────────────────────────────────────────────────────
// Each curve returns a multiplier applied to baseGrowthRate
function curveMultiplier(curve, age) {
  switch (curve) {
    case 'early_peak':
      // Fast before 20, hard stop after
      return age <= 19 ? 1.5 : age <= 22 ? 0.4 : 0.05
    case 'late_bloomer':
      // Slow until 21, then accelerates
      return age <= 18 ? 0.4 : age <= 21 ? 0.8 : age <= 26 ? 1.6 : 0.6
    case 'volatile':
      // Random swing each month — caller applies separately
      return 1.0
    case 'linear':
    default:
      return 1.0
  }
}

// ── Training plan bonus ───────────────────────────────────────────────────────
function trainingPlanBonus(prospect) {
  const plan = PLAN_BY_ID[prospect.trainingPlanId]
  if (!plan) return 0
  // Coachability amplifies plan effectiveness when revealed
  const coachAttr = (prospect.hiddenAttributes || []).find(a => a.key === 'coachability')
  const coachAmp = coachAttr?.revealed ? (coachAttr.value / 20) * 0.10 : 0
  return plan.growthBonus + coachAmp
}

// ── Coachability bonus (from hidden attributes) ───────────────────────────────
function coachabilityBonus(prospect) {
  // Base coachability bonus when no plan is assigned — still rewards revealed attribute
  if (prospect.trainingPlanId) return 0  // plan bonus already subsumes this
  const attr = (prospect.hiddenAttributes || []).find(a => a.key === 'coachability')
  if (!attr || !attr.revealed) return 0
  return attr.value / 80
}

// ── Mentor bonus ──────────────────────────────────────────────────────────────
function mentorBonus(prospect) {
  if (!prospect.mentor) return 0
  const mentor = (G.shinobi || []).find(s => s.id === prospect.mentor)
  if (!mentor) return 0
  // Mentor rank index → bonus: Genin 0.05, Chunin 0.10, Jonin 0.18, Kage 0.25
  const bonusByRank = [0.03, 0.05, 0.10, 0.15, 0.18, 0.22, 0.25]
  return bonusByRank[Math.min(mentor.ri, bonusByRank.length - 1)]
}

// ── Apply monthly growth to a single prospect ─────────────────────────────────
function growProspect(p) {
  const age = p.age ?? 15
  const curve = p.developmentCurve ?? 'linear'

  let growth = baseGrowthRate(age) * curveMultiplier(curve, age)

  // Volatile: random ±3 swing on top of base
  if (curve === 'volatile') {
    growth += rnd(-3, 3)
  }

  growth *= (1 + coachabilityBonus(p) + mentorBonus(p) + trainingPlanBonus(p))

  // Stochastic: apply growth only if random roll passes monthly chance
  // Ensures growth isn't every month for every prospect (more realistic)
  const rollThreshold = curve === 'volatile' ? 0.7 : curve === 'early_peak' && age <= 19 ? 0.85 : 0.6
  if (Math.random() > rollThreshold) return

  growth = Math.max(0, growth)

  const prevAbility = p.currentAbility ?? 0
  const ceiling = p.potential ?? 99
  p.currentAbility = clamp(Math.round(prevAbility + growth), prevAbility, ceiling)

  // Track development milestones
  const breakpoints = [30, 50, 65, 80]
  for (const bp of breakpoints) {
    if (prevAbility < bp && p.currentAbility >= bp) {
      if (!p.milestones) p.milestones = []
      p.milestones.push({ ability: bp, year: G.year, month: G.month })
      aL(`${p.fn} ${p.ln} reached ability ${bp} — a genuine talent is emerging.`, 'good')
    }
  }
}

// ── Reveal development curve when confidence is high enough ──────────────────
function maybeRevealCurve(p) {
  if (p.curveRevealed) return
  const confidence = p.bestConfidence ?? 0
  if (confidence >= 75) {
    p.curveRevealed = true
    aL(`Scout confidence on ${p.fn} ${p.ln} now high enough — development curve identified: ${p.developmentCurve}.`, 'neutral')
  }
}

// ── Graduation stat bias (called from academy.js rec()) ──────────────────────
// Redistributes up to 12 bonus stat points according to the plan's weights.
export function applyGraduationBias(prospect) {
  const plan = PLAN_BY_ID[prospect.trainingPlanId]
  if (!plan || !prospect.stats) return

  const weights = plan.graduationWeights
  const statKeys = Object.keys(weights)
  const totalWeight = statKeys.reduce((s, k) => s + Math.max(0, weights[k]), 0)
  if (totalWeight === 0) return

  const BONUS_POOL = 12  // total extra points to distribute
  statKeys.forEach(k => {
    if (!prospect.stats[k] && prospect.stats[k] !== 0) return
    const w = weights[k]
    const delta = Math.round((w / totalWeight) * BONUS_POOL)
    prospect.stats[k] = clamp((prospect.stats[k] || 0) + delta, 0, 99)
  })

  if (plan.id !== 'balanced') {
    aL(`${prospect.fn} ${prospect.ln} graduated with ${plan.label} training — stats shaped accordingly.`, 'good')
  }
}

// ── Rival village names for offer generation ─────────────────────────────────
const RIVAL_VILLAGES = ['Kumogakure', 'Sunagakure', 'Kirigakure', 'Iwagakure', 'Otogakure']

// ── Rival offer generation ────────────────────────────────────────────────────
function maybeGenerateRivalOffer(p) {
  if (p.rivalOffer) return                      // already has an active offer
  if ((p.potential ?? 0) < 70) return           // not attractive enough
  if ((p.monthsWaiting ?? 0) < 2) return        // too new to attract rivals
  if (Math.random() > 0.15) return              // 15% monthly chance

  const village = RIVAL_VILLAGES[Math.floor(Math.random() * RIVAL_VILLAGES.length)]
  const potTier = p.potential >= 90 ? 4 : p.potential >= 80 ? 3 : p.potential >= 70 ? 2 : 1
  const baseOffer = 4000 + potTier * 2500
  const offerRyo = Math.round(baseOffer * (0.9 + Math.random() * 0.4))  // ±20% variance

  p.rivalOffer = {
    village,
    offerRyo,
    expiresMonth: G.month + 2,
    expiresYear: G.month >= 11 ? G.year + 1 : G.year,
    createdYear: G.year,
    createdMonth: G.month,
  }
  p.rivalInterest = true

  aL(`${village} has made an offer for ${p.fn} ${p.ln} — ${offerRyo.toLocaleString()} ryo. Respond within 2 months.`, 'warn')
}

// ── Rival offer expiry ────────────────────────────────────────────────────────
function tickRivalOffers(G) {
  ;(G.prospects || []).forEach(p => {
    if (!p.rivalOffer) return
    const offer = p.rivalOffer
    const expired = G.year > offer.expiresYear ||
      (G.year === offer.expiresYear && G.month > offer.expiresMonth)
    if (expired) {
      aL(`${offer.village}'s offer for ${p.fn} ${p.ln} expired — they signed elsewhere.`, 'bad')
      G.prospects = G.prospects.filter(x => x.id !== p.id)
    }
  })
}

// ── Monthly tick (called from adv.js) ────────────────────────────────────────
export function tickProspects(G) {
  if (!isEnabled('ACADEMY')) return
  tickRivalOffers(G)
  ;(G.prospects || []).forEach(p => {
    growProspect(p)
    maybeRevealCurve(p)
    maybeGenerateRivalOffer(p)
    // Increment monthsWaiting (used for patience bar)
    p.monthsWaiting = (p.monthsWaiting ?? 0) + 1
    // Decline urgency window
    if ((p.urgencyMonths ?? 0) > 0) p.urgencyMonths--
  })
}
