/**
 * Press conference / media sim.
 * Pure pool definitions. Triggers and effect application live in adv.js.
 */

export const PRESS_TONES = [
  { id: 'confident',  label: 'Confident',       mods: { morale: 5,  rep: 10,  rivalRel: -5  }, hint: '+10 rep, +5 morale, −5 rival relations' },
  { id: 'humble',     label: 'Humble',           mods: { morale: 3,  rep: 5,   rivalRel: 5   }, hint: '+5 rep, +3 morale, +5 rival relations' },
  { id: 'dismissive', label: 'Dismissive',       mods: { morale: -3, rep: -5,  rivalRel: -10 }, hint: '−5 rep, −3 morale, −10 rival relations' },
  { id: 'callout',    label: 'Call Out a Rival', mods: { morale: 8,  rep: 15,  rivalRel: -20 }, hint: '+15 rep, +8 morale, −20 with named rival — high risk', requiresRival: true },
  { id: 'emotional',  label: 'Emotional',        mods: { morale: 10, rep: 8,   rivalRel: 0   }, hint: '+8 rep, +10 morale — resonates deeply, only works near KIA or tragedy', trigger: 'kia' },
  { id: 'deflect',    label: 'Deflect to Team',  mods: { morale: 6,  rep: 3,   rivalRel: 2   }, hint: '+3 rep, +6 morale — shifts spotlight to shinobi, builds cohesion' },
]

// ── Expanded question pool ───────────────────────────────────────────────────

export const PRESS_QUESTIONS = [
  // ── Major events ──────────────────────────────────────────────────────────
  {
    id: 'after_exam_win',
    trigger: 'exam_win',
    question: 'Your squad just won the Chunin Exam. What does this mean for the village going forward?',
    intro: 'The reporters gather outside the arena. Torches are still burning from the closing ceremony.',
    followUp: 'Is this a sign that your academy pipeline is finally paying off?',
    availableTones: ['confident', 'humble', 'deflect', 'callout'],
  },
  {
    id: 'after_exam_loss',
    trigger: 'exam_loss',
    question: 'A disappointing Exam result. How do you plan to respond?',
    intro: 'Questions are pointed after the early exit. The arena empties behind you.',
    followUp: 'Some are questioning your squad selection strategy. Your thoughts?',
    availableTones: ['humble', 'dismissive', 'deflect', 'confident'],
  },
  {
    id: 'after_war_win',
    trigger: 'war_win',
    question: 'Victory in the Nation War — what\'s the secret to your squad\'s performance?',
    intro: 'The Hall of Records fills with scribes. Daimyo\'s messengers wait at the gate.',
    followUp: 'Can you name the shinobi who made the difference out there?',
    availableTones: ['confident', 'humble', 'deflect', 'callout'],
  },
  {
    id: 'after_war_loss',
    trigger: 'war_loss',
    question: 'You were eliminated from the Nation War. How do you assess your shinobi\'s readiness?',
    intro: 'The mood is sombre outside the war pavilion. Lanterns are dimmed.',
    followUp: 'There are calls for roster changes. Do you agree?',
    availableTones: ['humble', 'confident', 'deflect', 'dismissive'],
  },
  // ── Streaks ───────────────────────────────────────────────────────────────
  {
    id: 'good_run',
    trigger: 'win_streak',
    question: 'Three straight months of top mission results — is this village finally a title contender?',
    intro: 'The chronicle desk runs a feature piece. Artists are already painting the run.',
    followUp: 'Are you concerned rivals will now target your operatives more aggressively?',
    availableTones: ['confident', 'humble', 'callout', 'deflect'],
  },
  {
    id: 'bad_run',
    trigger: 'loss_streak',
    question: 'Consecutive mission failures have raised eyebrows. Is morale an issue in the ranks?',
    intro: 'Rumours are circulating through the market district. Merchants are nervous.',
    followUp: 'Has leadership considered bringing in outside talent to stabilise results?',
    availableTones: ['humble', 'confident', 'deflect', 'dismissive'],
  },
  // ── KIA ───────────────────────────────────────────────────────────────────
  {
    id: 'kia_press',
    trigger: 'kia',
    question: 'After recent losses in the field, how do you address concerns about shinobi safety and the missions you are assigning?',
    intro: 'Families of fallen shinobi have gathered at the memorial wall. The courtyard is silent.',
    followUp: 'Will you commit to reviewing the risk assessments for future deployments?',
    availableTones: ['emotional', 'humble', 'deflect', 'confident'],
  },
  {
    id: 'kia_grudge',
    trigger: 'kia_grudge',
    question: 'Sources suggest some surviving shinobi are struggling with the losses. How are you supporting them?',
    intro: 'A journalist got hold of the post-mission debrief notes.',
    followUp: 'Is there a risk of morale fractures spreading to the broader roster?',
    availableTones: ['emotional', 'humble', 'confident', 'deflect'],
  },
  // ── Prestige / milestone ──────────────────────────────────────────────────
  {
    id: 'prestige_up',
    trigger: 'prestige_up',
    question: 'Reaching a new prestige tier is significant. What ambitions does this unlock for the village?',
    intro: 'A scroll of recognition arrives from the Daimyo\'s court. Rivals are watching.',
    followUp: 'Which rival village do you see as your biggest obstacle now?',
    availableTones: ['confident', 'humble', 'callout', 'deflect'],
  },
  // ── Memory-informed ───────────────────────────────────────────────────────
  {
    id: 'trauma_concern',
    trigger: 'trauma',
    question: 'We\'ve had reports of psychological strain among operatives. Are you doing enough to protect your shinobi\'s mental readiness?',
    intro: 'A welfare organisation has filed a statement with the Daimyo\'s office.',
    followUp: 'Some shinobi\'s families are asking if recovery timelines are being rushed.',
    availableTones: ['emotional', 'humble', 'deflect', 'confident'],
  },
  {
    id: 'rivalry_heat',
    trigger: 'rivalry_heat',
    question: 'Tensions between this village and at least one rival have become very public. Do you expect a confrontation?',
    intro: 'Intel reports have leaked to the chronicle desks.',
    followUp: 'Would you be willing to name the village you consider your primary threat?',
    availableTones: ['callout', 'confident', 'humble', 'dismissive'],
  },
  {
    id: 'legend_milestone',
    trigger: 'legend',
    question: 'Your village has built something historic over the past decade. What does this legacy mean to you personally?',
    intro: 'A senior scribe from the Five Kage archive requests an audience.',
    followUp: 'What would you say to the shinobi who made it possible?',
    availableTones: ['emotional', 'humble', 'confident', 'deflect'],
  },
]

// ── Consequence table per tone × trigger ────────────────────────────────────
// Optional overrides on top of base mods. Keyed by `${toneId}:${triggerId}`.

export const TONE_TRIGGER_OVERRIDES = {
  'callout:exam_win':     { repBonus: 5,  moraleBonus: 0,  note: 'Rivalry intensifies — the callout makes headlines.' },
  'callout:war_win':      { repBonus: 8,  moraleBonus: 3,  note: 'Dominant posture after war win resonates with the village.' },
  'callout:prestige_up':  { repBonus: 5,  moraleBonus: 0,  note: 'Rivals log the statement. Expect tighter competition.' },
  'callout:rivalry_heat': { repBonus: 12, moraleBonus: 5,  note: 'The public rally behind the Kage. Rival rel craters.' },
  'emotional:kia':        { repBonus: 5,  moraleBonus: 8,  note: 'The village feels seen. Morale holds despite the losses.' },
  'emotional:kia_grudge': { repBonus: 3,  moraleBonus: 10, note: 'Survivors take notice. Cohesion stabilises.' },
  'emotional:legend':     { repBonus: 10, moraleBonus: 5,  note: 'A rare moment of genuine pride.' },
  'humble:kia':           { repBonus: 5,  moraleBonus: 3,  note: 'Families appreciate the honesty.' },
  'deflect:kia':          { repBonus: -2, moraleBonus: 5,  note: 'Shinobi feel recognised, but reporters push back.' },
  'confident:war_loss':   { repBonus: -5, moraleBonus: -2, note: 'The village reads it as deflection after a tough loss.' },
  'dismissive:kia':       { repBonus: -10,moraleBonus: -8, note: 'Families are furious. The story runs for weeks.' },
}

export const TONE_BY_ID     = Object.fromEntries(PRESS_TONES.map(t => [t.id, t]))
export const QUESTION_BY_ID = Object.fromEntries(PRESS_QUESTIONS.map(q => [q.id, q]))

/**
 * Build a context-aware question for queuePressConference.
 * Injects shinobi names, rival names, grudge details from live game state.
 *
 * @param {string} triggerId
 * @param {{ fallenName?: string, grudgeTarget?: string, rivalName?: string, legacyYears?: number }} ctx
 * @returns {object|null} the hydrated question object
 */
export function hydrateQuestion(triggerId, ctx = {}) {
  const q = PRESS_QUESTIONS.find(p => p.trigger === triggerId)
  if (!q) return null
  let question = q.question
  let intro    = q.intro
  if (ctx.fallenName)   { question = question.replace('recent losses', `the loss of ${ctx.fallenName}`); intro = intro.replace('fallen shinobi', ctx.fallenName) }
  if (ctx.rivalName)    { question = question.replace('at least one rival', ctx.rivalName) }
  if (ctx.legacyYears)  { question = question.replace('past decade', `past ${ctx.legacyYears} years`) }
  return { ...q, question, intro, rivalName: ctx.rivalName || null }
}
