/**
 * Mentorship system.
 *
 * A Jonin+ shinobi can be assigned as mentor to one Genin/Chunin student at a time.
 * The bond accelerates the student's stat development and eventually unlocks a
 * one-time stat bonus. Both parties gain a mentor_bond memory after 3 months.
 *
 * Pure — no G references. Caller passes state and mutates.
 */

import { RANKS } from '../../client/js/constants.js'

// ── Eligibility ───────────────────────────────────────────────────────────────

/** Returns true if s can serve as a mentor (Jonin+ active, not already mentoring). */
export function isMentorEligible(s, mentorships) {
  if (s.ri < 2) return false                             // must be Jonin+
  if (s.status !== 'available') return false
  return !mentorships.some(m => m.mentorId === s.id)
}

/** Returns true if s can receive mentorship (Genin/Chunin, active, no current mentor). */
export function isStudentEligible(s, mentorships) {
  if (s.ri > 1) return false                             // Genin or Chunin only
  if (s.status !== 'available') return false
  return !mentorships.some(m => m.studentId === s.id)
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Create a new mentorship record.
 * Caller is responsible for validating eligibility first.
 */
export function createMentorship(mentorId, studentId, when) {
  return {
    id:           Math.random().toString(36).slice(2),
    mentorId,
    studentId,
    startYear:    when.year,
    startMonth:   when.month,
    months:       0,
    bonusApplied: false,    // true after 12-month stat bonus fires
    bondMemoryAdded: false, // true after 3-month memory fires
  }
}

/** Remove a mentorship by mentor or student id. Returns the removed entry or null. */
export function removeMentorship(mentorships, shinobiId) {
  const idx = mentorships.findIndex(m => m.mentorId === shinobiId || m.studentId === shinobiId)
  if (idx === -1) return null
  return mentorships.splice(idx, 1)[0]
}

// ── Monthly tick ──────────────────────────────────────────────────────────────

const DEV_STATS = ['ninjutsu', 'taijutsu', 'genjutsu', 'chakra', 'intelligence', 'speed']

/**
 * Tick all active mentorships. Call once per monthly adv().
 * Mutates shinobi stats, returns array of narrative event objects to push.
 *
 * @param {object[]} mentorships  G.mentorships (mutated)
 * @param {object[]} shinobi      G.shinobi
 * @param {{ year: number, month: number }} when
 * @returns {Array<{ type: string, mentorName: string, studentName: string, detail: string }>}
 */
export function tickMentorships(mentorships, shinobi, when) {
  const events = []
  const toRemove = []

  for (const m of mentorships) {
    const mentor  = shinobi.find(s => s.id === m.mentorId)
    const student = shinobi.find(s => s.id === m.studentId)

    // Clean up if either party is gone or no longer eligible (injured, retired, etc.)
    if (!mentor || !student || mentor.status !== 'available' || student.status !== 'available') {
      toRemove.push(m.id)
      continue
    }

    m.months++

    // Dev speed bonus: +15% chance of extra point on a random stat each month
    if (Math.random() < 0.15) {
      const stat = DEV_STATS[Math.floor(Math.random() * DEV_STATS.length)]
      student.stats[stat] = Math.min(99, (student.stats[stat] || 0) + 1)
    }

    // Month 3: mutual mentor_bond memory
    if (m.months === 3 && !m.bondMemoryAdded) {
      m.bondMemoryAdded = true
      events.push({ type: 'bond_memory', mentorId: mentor.id, studentId: student.id,
        mentorName: mentor.fn + ' ' + mentor.ln, studentName: student.fn + ' ' + student.ln,
        detail: `${mentor.fn} and ${student.fn} have settled into a real working rhythm.` })
    }

    // Month 6: morale boost for student
    if (m.months === 6) {
      student.indMorale = Math.min(100, (student.indMorale || 70) + 8)
      events.push({ type: 'milestone', mentorId: mentor.id, studentId: student.id,
        mentorName: mentor.fn + ' ' + mentor.ln, studentName: student.fn + ' ' + student.ln,
        detail: `Six months under ${mentor.fn}. ${student.fn} is visibly more composed in the field.` })
    }

    // Month 12: one-time stat bonus on highest-potential stat
    if (m.months === 12 && !m.bonusApplied) {
      m.bonusApplied = true
      const bonusStat = DEV_STATS.reduce((best, k) => (student.stats[k] > student.stats[best] ? k : best), DEV_STATS[0])
      student.stats[bonusStat] = Math.min(99, student.stats[bonusStat] + 3)
      // Mentor gets experience too
      mentor.wins = (mentor.wins || 0)  // no stat change, just narrative
      events.push({ type: 'graduation', mentorId: mentor.id, studentId: student.id,
        mentorName: mentor.fn + ' ' + mentor.ln, studentName: student.fn + ' ' + student.fn,
        detail: `A full year of mentorship. ${student.fn}'s ${bonusStat} jumped +3. ${mentor.fn} earned the respect of the next generation.` })
    }
  }

  // Prune ended mentorships
  for (const id of toRemove) {
    const idx = mentorships.findIndex(m => m.id === id)
    if (idx !== -1) mentorships.splice(idx, 1)
  }

  return events
}

// ── Query helpers ─────────────────────────────────────────────────────────────

/** Returns the current mentor shinobi for student s, or null. */
export function getMentor(s, mentorships, shinobi) {
  const m = mentorships.find(r => r.studentId === s.id)
  if (!m) return null
  return shinobi.find(x => x.id === m.mentorId) ?? null
}

/** Returns the current student shinobi for mentor s, or null. */
export function getStudent(s, mentorships, shinobi) {
  const m = mentorships.find(r => r.mentorId === s.id)
  if (!m) return null
  return shinobi.find(x => x.id === m.studentId) ?? null
}

/** Returns the mentorship record for a given mentor or student id, or null. */
export function getMentorshipRecord(shinobiId, mentorships) {
  return mentorships.find(m => m.mentorId === shinobiId || m.studentId === shinobiId) ?? null
}

/**
 * Returns a short summary string for use in the dossier (e.g. "Mentoring Naruto Uzumaki (3 months)").
 */
export function mentorshipSummary(s, mentorships, shinobi) {
  const asM = mentorships.find(r => r.mentorId === s.id)
  if (asM) {
    const student = shinobi.find(x => x.id === asM.studentId)
    return student ? `Mentoring ${student.fn} ${student.ln} (${asM.months}mo)` : 'Mentoring a student'
  }
  const asS = mentorships.find(r => r.studentId === s.id)
  if (asS) {
    const mentor = shinobi.find(x => x.id === asS.mentorId)
    return mentor ? `Under ${mentor.fn} ${mentor.ln} (${asS.months}mo)` : 'Under a mentor'
  }
  return null
}
