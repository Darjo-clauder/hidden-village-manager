import { describe, it, expect, beforeEach } from 'vitest'
import {
  isMentorEligible, isStudentEligible,
  createMentorship, removeMentorship,
  tickMentorships, getMentor, getStudent,
  getMentorshipRecord, mentorshipSummary,
} from '../shared/utils/mentorship.js'

const WHEN = { year: 1, month: 3 }

function makeMentor(id = 'm1') {
  return { id, fn: 'Kakashi', ln: 'Hatake', ri: 2, status: 'available',
           stats: { ninjutsu: 70, taijutsu: 70, genjutsu: 60, chakra: 80, intelligence: 75, speed: 72 },
           indMorale: 70, wins: 30 }
}

function makeStudent(id = 's1') {
  return { id, fn: 'Naruto', ln: 'Uzumaki', ri: 0, status: 'available',
           stats: { ninjutsu: 40, taijutsu: 38, genjutsu: 20, chakra: 60, intelligence: 30, speed: 42 },
           indMorale: 65, wins: 5 }
}

describe('isMentorEligible', () => {
  it('true for active Jonin+', () => {
    expect(isMentorEligible(makeMentor(), [])).toBe(true)
  })

  it('false for Genin', () => {
    const s = makeMentor(); s.ri = 0
    expect(isMentorEligible(s, [])).toBe(false)
  })

  it('false when injured', () => {
    const s = makeMentor(); s.status = 'injured'
    expect(isMentorEligible(s, [])).toBe(false)
  })

  it('false when already mentoring', () => {
    const s = makeMentor()
    const ms = [createMentorship(s.id, 's2', WHEN)]
    expect(isMentorEligible(s, ms)).toBe(false)
  })
})

describe('isStudentEligible', () => {
  it('true for active Genin', () => {
    expect(isStudentEligible(makeStudent(), [])).toBe(true)
  })

  it('true for Chunin', () => {
    const s = makeStudent(); s.ri = 1
    expect(isStudentEligible(s, [])).toBe(true)
  })

  it('false for Jonin+', () => {
    const s = makeStudent(); s.ri = 2
    expect(isStudentEligible(s, [])).toBe(false)
  })

  it('false when already has mentor', () => {
    const s = makeStudent()
    const ms = [createMentorship('m2', s.id, WHEN)]
    expect(isStudentEligible(s, ms)).toBe(false)
  })
})

describe('createMentorship', () => {
  it('creates a well-formed record', () => {
    const m = createMentorship('m1', 's1', WHEN)
    expect(m.mentorId).toBe('m1')
    expect(m.studentId).toBe('s1')
    expect(m.months).toBe(0)
    expect(m.bonusApplied).toBe(false)
    expect(m.bondMemoryAdded).toBe(false)
    expect(m.startYear).toBe(1)
    expect(typeof m.id).toBe('string')
  })
})

describe('removeMentorship', () => {
  it('removes by mentorId and returns record', () => {
    const ms = [createMentorship('m1', 's1', WHEN)]
    const removed = removeMentorship(ms, 'm1')
    expect(removed.mentorId).toBe('m1')
    expect(ms).toHaveLength(0)
  })

  it('removes by studentId', () => {
    const ms = [createMentorship('m1', 's1', WHEN)]
    removeMentorship(ms, 's1')
    expect(ms).toHaveLength(0)
  })

  it('returns null when no match', () => {
    const ms = [createMentorship('m1', 's1', WHEN)]
    expect(removeMentorship(ms, 'x99')).toBeNull()
    expect(ms).toHaveLength(1)
  })
})

describe('tickMentorships', () => {
  let mentor, student, ms, shinobi

  beforeEach(() => {
    mentor  = makeMentor()
    student = makeStudent()
    ms      = [createMentorship(mentor.id, student.id, WHEN)]
    shinobi = [mentor, student]
  })

  it('increments months each tick', () => {
    tickMentorships(ms, shinobi, WHEN)
    expect(ms[0].months).toBe(1)
  })

  it('fires bond_memory event at month 3', () => {
    ms[0].months = 2
    const events = tickMentorships(ms, shinobi, WHEN)
    expect(events.some(e => e.type === 'bond_memory')).toBe(true)
    expect(ms[0].bondMemoryAdded).toBe(true)
  })

  it('does not fire bond_memory twice', () => {
    ms[0].months = 2
    ms[0].bondMemoryAdded = true
    const events = tickMentorships(ms, shinobi, WHEN)
    expect(events.filter(e => e.type === 'bond_memory')).toHaveLength(0)
  })

  it('fires graduation event at month 12', () => {
    ms[0].months = 11
    const events = tickMentorships(ms, shinobi, WHEN)
    expect(events.some(e => e.type === 'graduation')).toBe(true)
    expect(ms[0].bonusApplied).toBe(true)
  })

  it('graduation applies +3 to a stat', () => {
    ms[0].months = 11
    const before = { ...student.stats }
    tickMentorships(ms, shinobi, WHEN)
    const delta = Object.keys(before).reduce((sum, k) => sum + (student.stats[k] - before[k]), 0)
    expect(delta).toBeGreaterThanOrEqual(3)
  })

  it('graduation does not fire twice', () => {
    ms[0].months = 11
    ms[0].bonusApplied = true
    const events = tickMentorships(ms, shinobi, WHEN)
    expect(events.filter(e => e.type === 'graduation')).toHaveLength(0)
  })

  it('removes mentorship when mentor is injured', () => {
    mentor.status = 'injured'
    tickMentorships(ms, shinobi, WHEN)
    expect(ms).toHaveLength(0)
  })

  it('fires morale event at month 6', () => {
    ms[0].months = 5
    const before = student.indMorale
    tickMentorships(ms, shinobi, WHEN)
    expect(student.indMorale).toBeGreaterThan(before)
  })
})

describe('getMentor / getStudent', () => {
  it('getMentor returns the mentor shinobi', () => {
    const mentor  = makeMentor()
    const student = makeStudent()
    const ms      = [createMentorship(mentor.id, student.id, WHEN)]
    expect(getMentor(student, ms, [mentor, student])).toBe(mentor)
  })

  it('getStudent returns the student shinobi', () => {
    const mentor  = makeMentor()
    const student = makeStudent()
    const ms      = [createMentorship(mentor.id, student.id, WHEN)]
    expect(getStudent(mentor, ms, [mentor, student])).toBe(student)
  })

  it('returns null when no mentorship', () => {
    const mentor = makeMentor()
    expect(getMentor(mentor, [], [])).toBeNull()
  })
})

describe('getMentorshipRecord', () => {
  it('returns record for mentorId or studentId', () => {
    const ms = [createMentorship('m1', 's1', WHEN)]
    expect(getMentorshipRecord('m1', ms)).not.toBeNull()
    expect(getMentorshipRecord('s1', ms)).not.toBeNull()
    expect(getMentorshipRecord('x99', ms)).toBeNull()
  })
})

describe('mentorshipSummary', () => {
  it('returns summary for mentor', () => {
    const mentor  = makeMentor()
    const student = makeStudent()
    const ms      = [createMentorship(mentor.id, student.id, WHEN)]
    const summary = mentorshipSummary(mentor, ms, [mentor, student])
    expect(summary).toMatch(/Mentoring/)
    expect(summary).toMatch(/Naruto/)
  })

  it('returns summary for student', () => {
    const mentor  = makeMentor()
    const student = makeStudent()
    const ms      = [createMentorship(mentor.id, student.id, WHEN)]
    const summary = mentorshipSummary(student, ms, [mentor, student])
    expect(summary).toMatch(/Under/)
    expect(summary).toMatch(/Kakashi/)
  })

  it('returns null when no mentorship', () => {
    expect(mentorshipSummary(makeMentor(), [], [])).toBeNull()
  })
})
