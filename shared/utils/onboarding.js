/**
 * First-year guidance.
 *
 * The old version was a flat checklist that vanished at month 4 — which meant
 * it disappeared before the player ever met the thing that can END their run.
 * The council sets mandates each January and evaluates them each December, and
 * two bad years in a row is a dismissal. A new player could reasonably reach
 * their first review without knowing the review existed.
 *
 * So this runs for the whole first year and is grouped into three phases:
 * learn the turn loop, build the village, then understand the job you are
 * actually being judged on.
 *
 * Steps are pure predicates over G so they can be tested, and every one keys
 * off state the game already tracks — completing a step is something you did,
 * never a box you ticked.
 */

const arr = v => Array.isArray(v) ? v : []
const n = v => Number(v) || 0

export const PHASES = [
  { id: 'loop',  label: 'The turn loop',   blurb: 'Missions earn ryo and rank. Months pass when you end the turn.' },
  { id: 'build', label: 'Building a village', blurb: 'Talent and income both have to be developed — neither arrives on its own.' },
  { id: 'job',   label: 'The job itself',  blurb: 'The council judges you every December. Know the terms before the first review.' },
]

export const ONBOARDING_STEPS = [
  // ── Phase 1: the loop ────────────────────────────────────────────────────
  {
    id: 'assign_mission', phase: 'loop', panel: 'missions',
    label: 'Send a shinobi on a mission',
    hint: 'Missions are where ryo, reputation and experience come from. Open Missions, pick one, and assign someone.',
    done: G => arr(G?.aM).length > 0 || arr(G?.shinobi).some(s => s.status === 'mission' || n(s.wins) > 0),
  },
  {
    id: 'end_turn', phase: 'loop', panel: 'dashboard',
    label: 'End your first turn',
    hint: 'Nothing resolves until the month does. End Turn advances the world — missions finish, wages are paid, rivals move.',
    done: G => n(G?.year) > 1 || n(G?.month) > 1,
  },
  {
    id: 'read_inbox', phase: 'loop', panel: 'inbox',
    label: 'Read your inbox',
    hint: 'Decisions, reports and offers arrive here. Some of them block the turn until you answer.',
    done: G => !!G?._visited?.inbox,
  },

  // ── Phase 2: building ────────────────────────────────────────────────────
  {
    id: 'recruit', phase: 'build', panel: 'academy',
    label: 'Recruit a prospect',
    hint: 'Your roster ages and dies. The academy is how it replenishes — recruit before a prospect ages out.',
    done: G => arr(G?.shinobi).some(s => s.homegrown),
  },
  {
    id: 'form_squad', phase: 'build', panel: 'squads',
    label: 'Form a squad',
    hint: 'Squads take on harder missions than individuals and build cohesion over time.',
    done: G => arr(G?.squads).length > 0,
  },
  {
    id: 'scout', phase: 'build', panel: 'scouting',
    label: 'Send a scout to a region',
    hint: 'Scouts reveal prospects you would otherwise never see. They cost money every month, so give them work.',
    done: G => arr(G?.staff).some(s => s.regionAssigned),
  },
  {
    id: 'income', phase: 'build', panel: 'economy',
    label: 'Open a trade route',
    hint: 'Your tax base alone does not cover payroll. Trade routes and contracts are the difference.',
    done: G => arr(G?.tradeRoutes).some(r => r.active) || arr(G?.contracts).some(c => c.active),
  },

  // ── Phase 3: the job ─────────────────────────────────────────────────────
  {
    id: 'mandates', phase: 'job', panel: 'kage',
    label: 'Read your council mandates',
    hint: 'Each January the council sets three goals and grades you each December. Two bad years in a row and you are dismissed — this is the clock your whole tenure runs on.',
    done: G => !!G?._visited?.kage,
  },
  {
    id: 'runway', phase: 'job', panel: 'finances',
    label: 'Check your runway',
    hint: 'A young village runs at a deficit by design. Finances shows how many months the treasury lasts at the current burn.',
    done: G => !!G?._visited?.finances,
  },
  {
    id: 'warden_path', phase: 'job', panel: 'kagedev',
    label: 'Choose a Warden path',
    hint: 'You develop too. Picking a path shapes what your village is good at for the rest of your tenure.',
    done: G => !!G?.kageDev?.path,
  },
]

export const STEP_BY_ID = Object.fromEntries(ONBOARDING_STEPS.map(s => [s.id, s]))

/**
 * Guidance is for the first year, and stops early once everything is done or
 * the player dismisses it. It never reappears in a later tenure — the lineage
 * screen is where a returning player looks.
 */
export function shouldShowOnboarding(G) {
  if (!G || G._onboardingDismissed) return false
  if (n(G.year) > 1) return false
  return !onboardingState(G).complete
}

/** Per-step completion plus the next thing worth doing. */
export function onboardingState(G) {
  const steps = ONBOARDING_STEPS.map(s => {
    let ok = false
    try { ok = !!s.done(G) } catch { ok = false }
    return { ...s, ok }
  })
  const doneCount = steps.filter(s => s.ok).length
  return {
    steps,
    done: doneCount,
    total: steps.length,
    complete: doneCount === steps.length,
    next: steps.find(s => !s.ok) || null,
    byPhase: PHASES.map(p => ({
      ...p,
      steps: steps.filter(s => s.phase === p.id),
      done: steps.filter(s => s.phase === p.id && s.ok).length,
      total: steps.filter(s => s.phase === p.id).length,
    })),
  }
}
