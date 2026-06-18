import { G, rnd, pk, clamp, sn } from './state.js'
import { DEV_CURVES } from './constants.js'
import { aL, ntf } from './ui.js'

// ── Ensure career fields exist (backward compat for old saves) ────────────────
export function ensureCareerFields(s) {
  if (s.peakAge === undefined) {
    s.peakAge = s.ri === 0 ? rnd(20, 24) : s.ri === 1 ? rnd(23, 27) : rnd(24, 30)
  }
  if (s.phase === undefined) {
    const age = s.age || 25
    s.phase = age < 18 ? 'developing' : age < 32 ? 'prime' : age < 37 ? 'veteran' : 'declining'
  }
  if (s.declineMod === undefined) s.declineMod = 0
  if (s.retirementOffered === undefined) s.retirementOffered = false
  if (s.squadRole === undefined) s.squadRole = 'flex'
}

// ── Compute current phase label ────────────────────────────────────────────────
function computePhase(age, peakAge) {
  if (age < peakAge - 4)  return 'developing'
  if (age <= peakAge + 2) return 'prime'
  if (age <= peakAge + 7) return 'veteran'
  return 'declining'
}

// ── Monthly tick — runs in adv() every December (age increments once per year) ─
export function tickCareers(G) {
  if (G.month !== 12) return  // only run in December

  G.shinobi.forEach(s => {
    ensureCareerFields(s)

    // Age up once per year
    s.age = (s.age || 20) + 1

    const prevPhase = s.phase
    s.phase = computePhase(s.age, s.peakAge)

    // Phase transition notifications
    if (prevPhase !== s.phase) {
      const msgs = {
        prime:      `${sn(s)} has entered their prime years (age ${s.age}). Expect peak performance.`,
        veteran:    `${sn(s)} is now a veteran (age ${s.age}). Experience shows — but the peak may be behind them.`,
        declining:  `${sn(s)} shows signs of decline (age ${s.age}). Mission success rates will drift lower.`,
      }
      if (msgs[s.phase]) aL(msgs[s.phase], s.phase === 'prime' ? 'good' : s.phase === 'declining' ? 'warn' : 'neutral')
    }

    // Compute decline modifier (negative, applied to mission sc calc)
    if (s.phase === 'declining') {
      const yearsIntoDecline = s.age - (s.peakAge + 7)
      s.declineMod = clamp(-0.02 * Math.max(1, yearsIntoDecline), -0.18, 0)
    } else if (s.phase === 'veteran') {
      // Slight veteran edge — experience offset vs early decline risk
      const yearsPost = s.age - (s.peakAge + 2)
      s.declineMod = yearsPost >= 4 ? -0.02 : 0
    } else {
      s.declineMod = 0
    }

    // Retirement eligibility
    if (s.age >= 35 && !s.retirementOffered && s.declineMod <= -0.06) {
      s.retirementOffered = true
      if (!G.noticeboard) G.noticeboard = []
      G.noticeboard.push({
        year: G.year,
        month: G.month,
        type: 'retirement',
        text: `${sn(s)} (age ${s.age}) is approaching the end of their active career. Consider transitioning them to staff or honoring their service.`,
        shinobiId: s.id,
      })
      aL(`${sn(s)} is eligible for retirement (age ${s.age}, declining form).`, 'warn')
      ntf(`${sn(s)} may be ready to retire.`)
    }
  })

  // Also age students in the academy
  ;(G.intakeClass || []).forEach(s => {
    ensureCareerFields(s)
    s.age = (s.age || 12) + 1
  })
}

// ── Phase display helpers (used in UI) ────────────────────────────────────────
export const PHASE_META = {
  developing: { color: 'var(--blue)',     icon: '↑', label: 'Developing' },
  prime:      { color: 'var(--green)',    icon: '★', label: 'Prime'      },
  veteran:    { color: 'var(--gold)',     icon: '◆', label: 'Veteran'    },
  declining:  { color: 'var(--red)',      icon: '↓', label: 'Declining'  },
}
