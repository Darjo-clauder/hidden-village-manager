import { G, rnd, pk, clamp, genRegionProspect, genScoutNarrative } from './state.js'
import { REGIONS, REGION_EVENTS } from './constants.js'
import { aL, ntf } from './ui.js'
import { isEnabled } from '../../config/features.js'
import { calcConfidence, confidenceToQuality, createScoutReport } from '../../shared/types/ScoutReport.js'
import { HIDDEN_ATTRIBUTE_KEYS } from '../../shared/constants/prospect.js'

// ── Helpers for the new Scout entity shape (knowledge/judgement direct fields) ─
function scoutJudgement(scout) {
  return scout.judgement ?? scout.stats?.judgement ?? scout.stats?.endurance ?? 8
}
function scoutMonthsInRegion(scout, regionId) {
  return scout.regionMemory?.[regionId]?.monthsWorked ?? scout.regionMemory?.[regionId]?.contactLevel ?? 0
}

// Ensures a prospect has the Phase 1 hiddenAttributes array (backfill for old saves)
function ensureHiddenAttributes(prospect) {
  if (!prospect.hiddenAttributes || prospect.hiddenAttributes.length === 0) {
    prospect.hiddenAttributes = HIDDEN_ATTRIBUTE_KEYS.map(key => ({
      key,
      value: rnd(1, 20),
      revealed: false,
    }))
  }
}

// Reveals hidden attributes whose key matches scout judgement threshold
function maybeRevealAttributes(prospect, scout, confidence) {
  if (!isEnabled('SCOUTING')) return
  ensureHiddenAttributes(prospect)
  if (confidence < 0.65) return
  const judgeLevel = scoutJudgement(scout)
  prospect.hiddenAttributes.forEach(attr => {
    if (!attr.revealed && judgeLevel >= 12) {
      attr.revealed = Math.random() < (confidence - 0.5)
    }
  })
}

// ── Regional memory helpers ───────────────────────────────────────────────────
function getMemory(scout, regionId) {
  if (!scout.regionMemory) scout.regionMemory = {}
  if (!scout.regionMemory[regionId]) {
    scout.regionMemory[regionId] = { monthsWorked: 0, contactLevel: 0, lastReportMonth: 0, lastReportYear: 0 }
  }
  return scout.regionMemory[regionId]
}

// ── Monthly scout tick (called from adv.js) ───────────────────────────────────
export function tickScouts(G) {
  const scouts = (G.staff || []).filter(s => s.role === 'scout_jonin' || s.role === 'head_scout')

  scouts.forEach(scout => {
    if (!scout.regionAssigned) {
      // Resting: recover fatigue faster
      scout.fatigue = Math.max(0, (scout.fatigue || 0) - 12)
      return
    }

    const regionId = scout.regionAssigned
    const region = REGIONS.find(r => r.id === regionId)
    const mem = getMemory(scout, regionId)

    // Build regional familiarity
    mem.monthsWorked++
    mem.contactLevel = Math.min(20, mem.contactLevel + 1)

    // Fatigue accumulates while active
    const adaptability = scout.stats.adaptability ?? scout.stats.ninjutsu ?? 8
    const fatigueGain = Math.max(2, 10 - Math.floor(adaptability / 2))
    scout.fatigue = Math.min(100, (scout.fatigue || 0) + fatigueGain)

    // High fatigue reduces effectiveness
    if ((scout.fatigue || 0) >= 90) {
      aL(`${scout.fn} ${scout.ln} is exhausted — scouting effectiveness critically reduced.`, 'warn')
    }

    // Regional meta modifier
    const meta = G.regionalMeta?.[regionId]
    const metaEv = meta ? REGION_EVENTS.find(e => e.id === meta.eventId) : null
    const qualityMod = metaEv ? metaEv.qualityMod : 0

    // Generate a report (base 55% chance per month, boosted by contact level and budget)
    const budgetBonus = ((G.scoutBudget?.domestic || 40) / 100) * 0.15
    const fatigueReduction = scout.fatigue >= 75 ? 0.20 : scout.fatigue >= 50 ? 0.10 : 0
    const reportChance = clamp(0.55 + mem.contactLevel * 0.02 + budgetBonus + qualityMod - fatigueReduction, 0.15, 0.85)

    if (Math.random() < reportChance) {
      _generateReport(scout, regionId, region, mem, qualityMod)
    }
  })

  // Reveal bias pattern after 3+ conflicting reports from same scout
  _checkBiasPattern()
}

function _generateReport(scout, regionId, region, mem, qualityMod) {
  // Pick an existing unresolved prospect from the pool first, or generate a new one
  let prospect = pk(G.prospects.filter(p => !p.fromRegion && !p.scoutHistory?.find(r => r.scoutId === scout.id)))
  if (!prospect || Math.random() < 0.4) {
    prospect = genRegionProspect(regionId, scout)
    G.prospects.push(prospect)
  }

  // Ensure Phase 1 hidden attributes exist on this prospect
  ensureHiddenAttributes(prospect)

  const contactLevel = mem.contactLevel
  const fatigueReduction = scout.fatigue >= 75 ? 8 : scout.fatigue >= 50 ? 4 : 0

  // Use the formal confidence model when SCOUTING feature is on; fall back to legacy formula
  let confidence
  if (isEnabled('SCOUTING')) {
    const monthsActive = scoutMonthsInRegion(scout, regionId)
    // Build a normalised scout shim for calcConfidence (supports both entity shapes)
    const scoutShim = { judgement: scoutJudgement(scout) }
    const conf01 = clamp(calcConfidence(scoutShim, monthsActive) + qualityMod * 0.15 - fatigueReduction / 100, 0, 0.98)
    confidence = Math.round(conf01 * 100)
  } else {
    const perception = scout.stats?.perception || 8
    const judgement  = scoutJudgement(scout)
    confidence = clamp(
      Math.round(35 + perception * 1.5 + judgement * 1.2 + (contactLevel >= 10 ? 10 : contactLevel >= 5 ? 5 : 0) - fatigueReduction + qualityMod * 30),
      35, 95
    )
  }

  const quality = confidence >= 80 ? 'Elite' : confidence >= 65 ? 'Detailed' : confidence >= 50 ? 'General' : 'Impression'
  const narrative = genScoutNarrative(scout, prospect, quality === 'Impression' ? 'Vague' : quality)

  // Reveal hidden attributes based on this report's confidence
  maybeRevealAttributes(prospect, scout, confidence / 100)

  const report = {
    id: Math.random().toString(36).slice(2),
    prospectId: prospect.id,
    prospectName: prospect.fn + ' ' + prospect.ln,
    scoutId: scout.id,
    scoutName: scout.fn + ' ' + scout.ln,
    region: regionId,
    year: G.year,
    month: G.month,
    confidence,
    quality,
    narrative,
    rivalInterest: prospect.urgencyMonths > 0 && prospect.urgencyMonths <= 4,
    isSecondOpinion: (prospect.scoutHistory || []).length > 0,
    personalityRevealed: prospect.personalityRevealed || false,
  }

  // Check for conflicting reads vs previous reports
  const prevReports = (prospect.scoutHistory || [])
  if (prevReports.length > 0) {
    const prevConf = prevReports[prevReports.length - 1].confidence
    if (Math.abs(confidence - prevConf) >= 20) {
      if (!prospect.conflictingRanges) prospect.conflictingRanges = []
      prospect.conflictingRanges.push({ scoutName: scout.fn + ' ' + scout.ln, confidence, year: G.year })
    }
  }

  if (!prospect.scoutHistory) prospect.scoutHistory = []
  prospect.scoutHistory.push(report)
  prospect.bestConfidence = Math.max(prospect.bestConfidence || 0, confidence)

  if (!G.scoutReports) G.scoutReports = []
  G.scoutReports.push(report)
  if (G.scoutReports.length > 50) G.scoutReports.shift()

  mem.lastReportMonth = G.month
  mem.lastReportYear = G.year

  aL(`Scout Report: ${scout.fn} ${scout.ln} filed a ${quality} report on ${prospect.fn} ${prospect.ln} (${region?.n || regionId}).`, 'neutral')
}

function _checkBiasPattern() {
  const scouts = (G.staff || []).filter(s => s.role === 'scout_jonin' || s.role === 'head_scout')
  scouts.forEach(scout => {
    if (scout.biasDetected || !scout.hiddenBias) return
    const scoutReports = (G.scoutReports || []).filter(r => r.scoutId === scout.id)
    const conflicting = scoutReports.filter(r => r.isSecondOpinion).length
    if (conflicting >= 3) {
      scout.biasDetected = true
      aL(`⚠ Pattern detected in ${scout.fn} ${scout.ln}'s reports — possible scouting bias. Check their assessments carefully.`, 'warn')
    }
  })
}

// ── Trial Day (player-triggered) ──────────────────────────────────────────────
export function conductTrialDay(prospectId) {
  const p = G.prospects.find(x => x.id === prospectId)
  if (!p) return
  if (p.trialDayDone) { ntf('Trial day already conducted for this prospect.'); return }
  if (G.ryo < 2000) { ntf('Need 2,000 ryo to host a trial day.'); return }

  G.ryo -= 2000
  p.trialDayDone = true

  // Trial gives a direct look — boosts confidence significantly
  const boost = rnd(15, 25)
  p.scoutConfidence = Math.min(95, (p.scoutConfidence || 50) + boost)

  // Narrow stat ranges
  if (p.statRanges) {
    Object.keys(p.statRanges).forEach(k => {
      const mid = Math.round((p.statRanges[k].lo + p.statRanges[k].hi) / 2)
      p.statRanges[k] = { lo: Math.max(1, mid - 4), hi: Math.min(99, mid + 4), exact: p.scoutConfidence >= 85 }
    })
  }
  if (p.potRange) {
    const mid = Math.round((p.potRange.lo + p.potRange.hi) / 2)
    p.potRange = { lo: Math.max(10, mid - 5), hi: Math.min(99, mid + 5), exact: p.scoutConfidence >= 85 }
  }

  // Always reveals personality at trial level
  p.personalityRevealed = true

  const narratives = [
    `${p.fn} arrived early and warmed up alone — composed, methodical. The real performance came in the sparring drills: measured power, excellent spatial awareness. Strong candidate.`,
    `Trial day confirmed the reports. ${p.fn} showed real chakra control under pressure, better than the range suggested. The personality read was straightforward — focused and driven.`,
    `${p.fn} had a shaky start but settled into the drills impressively. The potential is real. Our assessment is much cleaner after seeing them up close.`,
    `Better than the scouting reports suggested. ${p.fn}'s movement economy in live exercise was exceptional. We've tightened all assessments accordingly.`,
  ]
  p.trialDayReport = pk(narratives)

  aL(`Trial day complete: ${p.fn} ${p.ln} assessed up close. Confidence now ${p.scoutConfidence}%.`, 'good')
  ntf(`Trial day: ${p.fn} ${p.ln} — confidence updated to ${p.scoutConfidence}%`)
}
