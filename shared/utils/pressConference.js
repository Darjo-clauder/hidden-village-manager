/**
 * Press conference / media sim.
 * Pure pool definitions. Triggers and effect application live in adv.js.
 */

export const PRESS_TONES = [
  { id: 'confident', label: 'Confident', mods: { morale: 5, rep: 10, rivalRel: -5 } },
  { id: 'humble',    label: 'Humble',    mods: { morale: 3, rep: 5,  rivalRel: 5  } },
  { id: 'dismissive',label: 'Dismissive',mods: { morale: -3,rep: -5, rivalRel: -10} },
]

export const PRESS_QUESTIONS = [
  {
    id: 'after_exam_win',
    trigger: 'exam_win',
    question: 'Your team just won the Chunin Exam. What does this mean for the village going forward?',
    intro: 'The reporters gather outside the arena.',
  },
  {
    id: 'after_exam_loss',
    trigger: 'exam_loss',
    question: 'A disappointing Exam result. How do you plan to respond?',
    intro: 'Questions are pointed after the early exit.',
  },
  {
    id: 'after_war_win',
    trigger: 'war_win',
    question: 'Victory in the Nation War — what\'s the secret to your squad\'s performance?',
    intro: 'The Hall of Records fills with scribes.',
  },
  {
    id: 'after_war_loss',
    trigger: 'war_loss',
    question: 'You were eliminated from the Nation War. How do you assess your shinobi\'s readiness?',
    intro: 'The mood is sombre outside the war pavilion.',
  },
  {
    id: 'good_run',
    trigger: 'win_streak',
    question: 'Three straight months of top mission results — is this village finally a title contender?',
    intro: 'The chronicle desk runs a feature piece.',
  },
  {
    id: 'bad_run',
    trigger: 'loss_streak',
    question: 'Consecutive mission failures have raised eyebrows. Is morale an issue in the ranks?',
    intro: 'Rumours are circulating through the market district.',
  },
  {
    id: 'kia_press',
    trigger: 'kia',
    question: 'After recent losses in the field, how do you address concerns about shinobi safety?',
    intro: 'Families of fallen shinobi have gathered.',
  },
  {
    id: 'prestige_up',
    trigger: 'prestige_up',
    question: 'Reaching a new prestige tier is significant. What ambitions does this unlock for you?',
    intro: 'A scroll of recognition arrives from the Daimyo\'s court.',
  },
]

export const TONE_BY_ID = Object.fromEntries(PRESS_TONES.map(t => [t.id, t]))
export const QUESTION_BY_ID = Object.fromEntries(PRESS_QUESTIONS.map(q => [q.id, q]))
