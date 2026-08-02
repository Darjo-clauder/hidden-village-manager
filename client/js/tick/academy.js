/**
 * Youth academy slice of the monthly tick, extracted from adv.js.
 *
 * Part of breaking up a single ~2,900-line adv() into per-system modules
 * (T4.1). Same architecture as the sibling tick modules: operates on the global
 * G singleton, returns nothing, takes no context — it needed none of the values
 * adv() derives at the top of the tick, which is what made it the safest of the
 * remaining blocks to lift.
 *
 * Covers the whole academy year: April intake, October walk-ins, the minimum
 * prospect-pool guarantee, monthly student development, and the Youth Cup in
 * June.
 *
 * ORDERING MATTERS, and it is not obvious from here.
 *
 * The roster floor — the rule that auto-signs the best available prospect when
 * the roster falls below fourteen — runs EARLIER in the tick, before this. So
 * the floor sees the prospect pool as it stood at the start of the month, and
 * this month's graduates are only available to next month's floor check. There
 * is a one-month lag between the academy producing talent and the roster being
 * allowed to draw on it.
 *
 * That lag is pre-existing and preserved deliberately. Moving this call above
 * the floor check would change how the village recovers from a bad year, and it
 * would not show up as an error — it would show up as slow drift in roster
 * stability across a long dynasty, which is the hardest kind of regression to
 * attribute. If you move this, move it knowing that.
 */
import { G, clamp, sn, pk, rnd, fmt, addChronicle, addLegend, addNotice, genStudent, genRegionProspect,
         genTrainingReport, revealDevCurve, senseiStyle } from '../state.js'
import { aL, ntf } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { addNewsItem } from '../news.js'
import { DEV_TRACKS, INTENSITY_LEVELS, REGIONS, DEV_CURVES } from '../constants.js'
import { getPhilosophyMods } from '../../../shared/constants/coachingPhilosophy.js'
import { runYouthCup, entrantRun, studentPower, rivalYouthPower, minorYouthPower } from '../../../shared/utils/youthCup.js'
import { MINOR_NATIONS, minorStrength, pickMinorNation } from '../../../shared/constants/minorNations.js'
import { allocationEffects } from '../../../shared/utils/budgetRamp.js'
import { completedEffect } from '../../../shared/constants/prestigeProjects.js'
import { pushNarrative } from './inbox.js'

export function tickAcademy() {
  // ── Annual intake (April = month 4) ───────────────────────────────────────
  if (G.month === 4 && (G.lastIntakeYear || 0) < G.year) {
    G.lastIntakeYear = G.year
    if (!G.intakeClass) G.intakeClass = []
    const acLv = (G.upgrades.academy || 0) + completedEffect(G.prestigeCompleted, 'academyBoost')
    const headSensei = (G.staff || []).find(st => st.role === 'head_sensei')
    const hsRating = headSensei?.rating || 0
    // Draft pick bonus: pick #1 gets full class, last pick gets slightly smaller class and lower base quality
    const _draftPick = G._draftPlayerPick || 3
    const _pickBonus = Math.max(0, (3 - _draftPick) * 0.08)  // #1 pick = +16%, #2 = +8%, #3+ = 0
    const classSize = rnd(14, 20) + Math.floor(acLv * 2)
    const prodigyIdx = Math.random() < (0.01 + _pickBonus * 0.5) * classSize ? rnd(0, classSize - 1) : -1
    for (let i = 0; i < classSize; i++) {
      const student = genStudent(acLv + (_pickBonus > 0 ? 1 : 0), hsRating)
      if (i === prodigyIdx) {
        student.potential = Math.min(99, student.potential + rnd(15, 25))
        student.trait = 'Prodigy'
        aL(tr('toast.adv.prodigyEntered'), 'good')
        addChronicle('Prodigy Intake', student.fn + ' ' + student.ln + ' shows extraordinary talent.', 'shinobi')
        addLegend(5)
      }
      G.intakeClass.push(student)
    }
    aL(tr('toast.adv.annualIntake', { n: classSize, year: G.year }), 'good')
    ntf(tr('toast.adv.annualIntakeShort', { n: classSize }))
  }

  // ── Mid-year walk-ins (October = month 10) ────────────────────────────────
  if (G.month === 10 && (G.lastMidIntakeYear || 0) < G.year) {
    G.lastMidIntakeYear = G.year
    if (!G.intakeClass) G.intakeClass = []
    const acLv = G.upgrades.academy || 0
    const walkInCount = rnd(5, 9)
    for (let i = 0; i < walkInCount; i++) G.intakeClass.push(genStudent(acLv, 0))
    aL(walkInCount + ' transfer students arrived mid-year.', 'neutral')
  }

  // ── Minimum prospect pool guarantee ──────────────────────────────────────
  if (G.prospects.length < 6 && G.month % 2 === 0) {
    const acLv = G.upgrades.academy || 0
    for (let _wi = 0; _wi < 2; _wi++) {
      const walkIn = genStudent(acLv, 0)
      walkIn.status = 'prospect'
      G.prospects.push(walkIn)
      aL(sn(walkIn) + ' arrived at the village gates looking for a path.', 'neutral')
    }
  }

  // ── Youth academy development tick ────────────────────────────────────────
  if (!G.intakeClass) G.intakeClass = []
  if (!G.academyRecords) G.academyRecords = {}
  if (!G.gradTracking) G.gradTracking = []
  const graduates = []
  // Peer influence: identify prodigy and low-professionalism students in the class
  const prodigyIds = G.intakeClass.filter(s => s.trait === 'Prodigy').map(s => s.id)
  const lowProfIds = G.intakeClass.filter(s => (s.pMatrix?.professionalism || 10) < 7).map(s => s.id)
  G.intakeClass.forEach(student => {
    student.monthsInClass = (student.monthsInClass || 0) + 1
    const track = DEV_TRACKS.find(t => t.id === (student.devTrack || 'balanced')) || DEV_TRACKS[0]
    const intensity = INTENSITY_LEVELS.find(i => i.id === (student.intensity || 'medium')) || INTENSITY_LEVELS[1]
    const sensei = (G.staff || []).find(st => st.id === student.sensei)
    const sensMult = sensei ? (1 + (sensei.stats.pedagogy || 8) / 40) : 1.0
    // Peer influence multiplier: prodigy in class +10%, low-professionalism classmates -5% (stacking, excludes self)
    let peerMult = 1.0
    if (prodigyIds.some(id => id !== student.id)) peerMult += 0.10
    const dragCount = lowProfIds.filter(id => id !== student.id).length
    peerMult -= dragCount * 0.05
    peerMult = clamp(peerMult, 0.6, 1.3)
    let statGain = 0
    // Growth
    const _philProspectMult = 1 + getPhilosophyMods(G).prospectGrowth
    const _trainingMult = allocationEffects(G.budgetEffective || G.budgetPriority).devMult
    if (!student.burnout) {
      const growAmount = Math.round(intensity.mult * sensMult * peerMult * _philProspectMult * _trainingMult)
      // Bonus stats from track
      Object.entries(track.growBonus).forEach(([k, v]) => {
        if (student.stats[k] !== undefined) {
          const inc = Math.round(v * intensity.mult * sensMult * peerMult * 0.5)
          student.stats[k] = clamp(student.stats[k] + inc, 0, 99)
          statGain += inc
        }
      })
      // Random growth
      if (track.growRandom > 0) {
        const statKeys = Object.keys(student.stats)
        for (let i = 0; i < track.growRandom; i++) {
          const k = pk(statKeys)
          const inc = Math.round(Math.random() * growAmount)
          student.stats[k] = clamp(student.stats[k] + inc, 0, 99)
          statGain += inc
        }
      }
    } else {
      // Burnout: stat regression
      student.burnoutMonths = (student.burnoutMonths || 0) + 1
      if (Math.random() < 0.3) {
        const k = pk(Object.keys(student.stats))
        student.stats[k] = Math.max(1, student.stats[k] - 1)
      }
      if (student.burnoutMonths >= 3) {
        student.burnout = false; student.burnoutMonths = 0
        aL(sn(student) + ' has recovered from burnout.', 'neutral')
      }
    }
    // Burnout risk from high intensity
    if (!student.burnout && intensity.burnoutRisk > 0 && Math.random() < intensity.burnoutRisk / 100) {
      student.burnout = true
      student.burnoutTrait = pk(['Withdrawn', 'Anxious'])
      if (!student.traits) student.traits = []
      if (!student.traits.includes(student.burnoutTrait)) student.traits.push(student.burnoutTrait)
      aL(sn(student) + ' is burned out from intense training!', 'warn')
    }
    // Sensei style shapes personality during academy years
    if (sensei && student.pMatrix) {
      const style = senseiStyle(sensei)
      if (style === 'harsh' && Math.random() < 0.10) {
        const t = pk(['Resilient', 'Withdrawn'])
        student.pMatrix.temperament = clamp(student.pMatrix.temperament + (t === 'Resilient' ? 1 : -1), 1, 20)
        if (!student.traits) student.traits = []
        if (!student.traits.includes(t)) { student.traits.push(t); aL(sn(student) + ' grew ' + t + ' under a harsh training regimen.', t === 'Resilient' ? 'good' : 'warn') }
      } else if (style === 'nurturing' && Math.random() < 0.10) {
        const t = pk(['Loyal', 'Composed'])
        student.pMatrix.loyalty = clamp(student.pMatrix.loyalty + 1, 1, 20)
        if (!student.traits) student.traits = []
        if (!student.traits.includes(t)) { student.traits.push(t); aL(sn(student) + ' became ' + t + ' under a nurturing sensei.', 'good') }
      }
    }
    // Sensei trait pass-down (once, at 6 months) — legacy honor traits
    if (student.monthsInClass === 6 && sensei && sensei.stats.empathy >= 12 && Math.random() < 0.35) {
      const senseiTraits = ['Honorable', 'Determined', 'Analytical']
      const t = pk(senseiTraits)
      if (!student.traits) student.traits = []
      if (!student.traits.includes(t)) { student.traits.push(t); aL(sn(student) + ' adopted a ' + t + ' disposition from their sensei.', 'good') }
    }
    // Dev curve reveal — experienced sensei (pedagogy>=14) or elite head_scout judgment
    const headScoutForReveal = (G.staff || []).find(st => st.role === 'head_scout')
    const judgeRating = Math.max(sensei?.stats?.pedagogy || 0, headScoutForReveal?.stats?.perception || 0)
    if (revealDevCurve(student, judgeRating)) {
      const curve = DEV_CURVES.find(c => c.id === student.devCurve)
      aL(sn(student) + '\'s development curve was assessed: ' + (curve?.n || 'Standard') + '.', 'neutral')
    }
    // Monthly individual training report narrative
    const growthNote = statGain > 2 ? 'Strong gains this month.' : statGain > 0 ? 'Modest progress.' : student.burnout ? 'Struggling through burnout.' : 'A quiet month, little change.'
    student.trainingReports = student.trainingReports || []
    student.trainingReports.push({ year: G.year, month: G.month, text: genTrainingReport(student, sensei, growthNote) })
    if (student.trainingReports.length > 12) student.trainingReports.shift()
    // Milestones at months 3, 6, 9
    if ([3, 6, 9].includes(student.monthsInClass) && !student.milestones?.includes(student.monthsInClass)) {
      if (!student.milestones) student.milestones = []
      student.milestones.push(student.monthsInClass)
      aL(sn(student) + ' reached ' + student.monthsInClass + '-month Academy milestone.', 'neutral')
    }
    // Warden personal sparring (once per year, if G.kageTrainingUsedYear < G.year and student is flagged)
    if (student.kageTraining && (G.kageTrainingUsedYear || 0) < G.year) {
      G.kageTrainingUsedYear = G.year
      student.kageTraining = false
      const gainKey = pk(['ninjutsu','taijutsu','speed','chakra'])
      student.stats[gainKey] = clamp(student.stats[gainKey] + rnd(3, 6), 0, 99)
      student.potential = Math.min(99, student.potential + rnd(2, 5))
      aL(tr('toast.adv.kageSpar', { name: sn(student) }), 'good')
      addLegend(2)
    }
    // Graduation at 12 months
    if (student.monthsInClass >= 12) {
      graduates.push(student)
    }
  })
  // Graduate students into prospects pool
  if (graduates.length > 0) {
    // Determine class ranking by potential for clan expectation resolution
    const classByPotential = [...G.intakeClass].sort((a, b) => b.potential - a.potential)
    graduates.forEach(student => {
      // Clan/parent expectations for clan heirs
      if (student.clan) {
        const rank = classByPotential.findIndex(s => s.id === student.id)
        const topOfClass = rank >= 0 && rank < Math.max(1, Math.ceil(classByPotential.length * 0.2))
        const bottomOfClass = rank >= 0 && rank >= classByPotential.length - Math.max(1, Math.ceil(classByPotential.length * 0.2))
        if (topOfClass) {
          const statKey = pk(Object.keys(student.stats))
          student.stats[statKey] = clamp(student.stats[statKey] + rnd(3, 6), 0, 99)
          if (student.pMatrix) student.pMatrix.loyalty = clamp(student.pMatrix.loyalty + 3, 1, 20)
          aL(student.clan + ' clan elders honor ' + sn(student) + ' for graduating top of class — clan support granted.', 'good')
        } else if (bottomOfClass) {
          if (student.pMatrix) student.pMatrix.loyalty = clamp(student.pMatrix.loyalty - 3, 1, 20)
          aL(student.clan + ' clan elders express disappointment in ' + sn(student) + '\'s graduation standing — support withdrawn.', 'bad')
        }
      }
      // Academy records check — highest graduating stat per category
      Object.entries(student.stats).forEach(([k, v]) => {
        const cur = G.academyRecords[k]
        if (!cur || v > cur.value) {
          G.academyRecords[k] = { value: v, name: sn(student), year: G.year }
          addChronicle('Academy Record', sn(student) + ' set a new academy record in ' + k + ' (' + v + ').', 'milestone')
          aL(tr('toast.adv.newRecord', { name: sn(student), stat: k, value: v }), 'good')
        }
      })
      // Post-graduation tracking entry
      G.gradTracking.push({ id: student.id, name: sn(student), gradYear: G.year, gradMonth: G.month, clan: student.clan || null })
      // Convert to proper prospect/shinobi entry
      student.status = 'prospect'
      G.prospects.push(student)
      G.intakeClass = G.intakeClass.filter(s => s.id !== student.id)
      aL(sn(student) + ' graduated from the Academy!', 'good')
    })
    addChronicle('Academy Graduation', graduates.length + ' students graduated: ' + graduates.map(s => sn(s)).join(', ') + '.', 'event')
    ntf(graduates.length + ' students graduated from the Academy!')
    addLegend(graduates.length * 2)
  }

  // ── Youth Cup — the annual academy-age tournament (Month 6) ────────────────
  // The player's brightest students face rival + minor-nation juniors. A deep
  // run is a career milestone (and a growth spark) the kid carries for life.
  if (G.month === 6 && (G.intakeClass || []).length) {
    const mine = [...G.intakeClass].sort((a, b) => studentPower(b) - studentPower(a)).slice(0, 3)
    const entrants = mine.map(s => ({ id: s.id, name: sn(s), village: G.vName, ico: G.vIcon, power: studentPower(s), isPlayer: true }))
    ;(G.villages || []).slice(0, 4).forEach(v => entrants.push({ name: `${v.n} Junior`, village: v.n, ico: v.ico, power: rivalYouthPower(v.strength), isPlayer: false }))
    let _mnGuard = 0
    while (entrants.length < 8 && _mnGuard++ < 12) {
      const mn = pickMinorNation()
      entrants.push({ name: `${mn.n} Junior`, village: mn.n, ico: mn.ico, power: minorYouthPower(minorStrength(mn)), isPlayer: false })
    }
    const cup = runYouthCup(entrants)
    G.youthCupHistory = G.youthCupHistory || []
    G.youthCupHistory.push({ year: G.year, champion: cup.champion?.name, championVillage: cup.champion?.village, playerChampion: cup.champion?.village === G.vName })
    if (G.youthCupHistory.length > 10) G.youthCupHistory.shift()

    // Record the deepest player entrant's path as viewer beats — powers the
    // "Watch the Youth Cup" academy-day replay on the training-ground pitch.
    const _bestRun = mine.map(s => sn(s))
      .map(nm => ({ nm, phases: cup.rounds.map(r => { const m2 = r.matches.find(x => x.a.name === nm || x.b.name === nm); return m2 ? { name: r.stage, won: m2.winner.name === nm } : null }).filter(Boolean) }))
      .filter(r => r.phases.length)
      .sort((a, b) => b.phases.filter(p => p.won).length - a.phases.filter(p => p.won).length)[0]
    if (_bestRun) G._youthCupRun = { year: G.year, entrant: _bestRun.nm, phases: _bestRun.phases, champion: cup.champion?.name === _bestRun.nm, championVillage: cup.champion?.village }

    const _summ = []
    mine.forEach(s => {
      const run = entrantRun(cup, sn(s))
      let bump = 0, potBump = 0
      if (run.exit === 'Champion') { bump = 3; potBump = 4; addLegend(3) }
      else if (run.exit === 'Final') { bump = 2; potBump = 2 }
      else if (run.exit === 'Semifinal') { bump = 1; potBump = 1 }
      if (bump) Object.keys(s.stats).forEach(k => { s.stats[k] = clamp(s.stats[k] + bump, 0, 99) })
      if (potBump) s.potential = clamp((s.potential || 50) + potBump, 0, 99)
      if (run.exit === 'Champion') {
        s.milestones = s.milestones || []
        s.milestones.push({ label: `Youth Cup champion (Y${G.year})`, year: G.year, month: G.month })
        s.youthCupWins = (s.youthCupWins || 0) + 1
      }
      _summ.push(`${sn(s)}: ${run.exit === 'Champion' ? '🏆 Champion' : run.exit === 'Did not play' ? 'did not feature' : `out at the ${run.exit}`}`)
    })
    const champ = cup.champion
    pushNarrative({
      title: `🎓 Youth Cup — Year ${G.year}`,
      body: `${champ?.village === G.vName ? `<b>${G.vName} win the Youth Cup!</b>` : `${champ?.ico || ''} ${champ?.village} won the Youth Cup.`}<br><br>Your entrants — ${_summ.join('; ') || 'none fielded'}.`,
      tag: 'academy', link: 'youthacademy',
    })
    addNewsItem(`🎓 ${champ?.ico || ''} ${champ?.village || 'A hidden village'} lifted the Youth Cup.`)
    addChronicle(`Youth Cup Y${G.year}`, `${champ?.village} won the academy-age Youth Cup. ${_summ.join('; ')}.`, champ?.village === G.vName ? 'milestone' : 'event')
  }

}
