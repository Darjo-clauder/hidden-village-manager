/**
 * Live battle viewer (client) — a watch-it-unfold overlay for an already-resolved
 * mission. Plays the three contested beats one at a time with a swinging momentum
 * bar and narrative, then reveals the outcome + squad grades. Pure presentation
 * over a mission report — no engine state touched. Auto-plays; Skip jumps to end.
 */
import { battleSequence, battleVerdict } from '../../shared/utils/battleViewer.js'
import { BATTLE_CALLS } from '../../shared/utils/battleCalls.js'
import { arenaFor } from '../../shared/constants/arenas.js'
import { mountPitch } from './pitchView.js'

let _bvTimers = []
function _clearTimers() { _bvTimers.forEach(clearTimeout); _bvTimers = [] }

// Resolve the arena for a report: explicit rep.arena wins; otherwise league
// matches use the home side's nation venue, brackets their special ground,
// missions their spec layout.
function _repArena(rep) {
  if (rep.arena) return rep.arena
  if (rep.kind === 'league') return arenaFor('league', { homeVillage: rep.scoreline?.home })
  if (rep.kind === 'tournament') return arenaFor('tournament')
  if (rep.kind === 'academy') return arenaFor('academy')
  return arenaFor('mission', { spec: rep.spec })
}

// Shirt tags for the circles — initials from squad grades where we have names.
function _tags(rep) {
  const names = (rep.scores || []).map(s => (s.name || '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase())
  const n = Math.min(5, Math.max(3, names.length || 3))
  const home = names.length ? names.slice(0, 5) : Array.from({ length: n }, (_, i) => String(i + 1))
  const away = Array.from({ length: home.length }, (_, i) => String(i + 1))
  return { home, away }
}

// Did "our side" win, for the final tableau?
function _repWon(rep) {
  if (rep.kind === 'tournament') return !!rep.champion
  if (rep.kind === 'league') return rep.result === 'win'
  return !!rep.succeeded
}

const GRADE_COLOR = { A: '#c9a84c', B: '#8fbc8f', C: '#f0a030', D: '#f66' }
const BEAT_MS = 1100
const CALL_MS = 6000   // window to make the micro-call before it auto-disengages

// A micro-call is offered when the report carries an unresolved applyCall (player
// squad missions, live only — the closure is dropped on save/reload).
function _callBeat(rep) {
  return (rep.microCall && typeof rep.applyCall === 'function' && !rep._callDone)
    ? rep.microCall.beatIndex : -1
}

/** Open the live viewer for a mission report ({ missionName, missionRk, succeeded, phases, quality, scores }). */
export function openBattleViewer(rep) {
  if (!rep || !rep.phases || !rep.phases.length) return
  closeBattleViewer()
  const seq = battleSequence(rep.phases, (rep.missionName || '').length)
  const cb = _callBeat(rep)
  const ov = document.createElement('div')
  ov.id = 'bv-overlay'
  ov.className = 'bv-overlay'
  ov.__seq = seq
  ov.__rep = rep
  ov.innerHTML = `
    <div class="bv-card">
      <div class="bv-head">
        <div class="bv-title">${rep.missionName || 'Operation'} <span class="bv-rk">${rep.missionRk || ''}-Rank</span></div>
        <button class="bv-skip" onclick="skipBattleViewer()">Skip ▸</button>
      </div>
      <div class="bv-pitch" id="bv-pitch"></div>
      <div class="bv-mom-wrap"><div class="bv-mom-fill" id="bv-mom" style="width:50%"></div></div>
      <div class="bv-mom-labels"><span>◂ Enemy</span><span>Your squad ▸</span></div>
      <div class="bv-beats" id="bv-beats">${seq.map((b, i) => `
        <div class="bv-beat" id="bv-beat-${i}">
          <div class="bv-beat-name">${b.name}</div>
          <div class="bv-beat-mark" id="bv-mark-${i}">·</div>
          <div class="bv-beat-line" id="bv-line-${i}"></div>
        </div>`).join('')}
      </div>
      <div class="bv-call" id="bv-call"></div>
      <div class="bv-outcome" id="bv-outcome"></div>
    </div>`
  document.body.appendChild(ov)

  // Animated pitch — the match-engine window above the momentum bar.
  const { home, away } = _tags(rep)
  ov.__pitch = mountPitch(document.getElementById('bv-pitch'), {
    arena: _repArena(rep), home, away,
    homeLabel: rep.squadName || rep.scoreline?.home || '',
    awayLabel: rep.scoreline?.away || '',
  })

  // Reveal every beat up to (but not including) the bet-on beat; then either pause
  // for the micro-call, or play straight through to the outcome.
  const stopBefore = cb >= 0 ? cb : seq.length
  for (let i = 0; i < stopBefore; i++) { _bvTimers.push(setTimeout(() => _revealBeat(seq, i), BEAT_MS * (i + 1))) }
  if (cb >= 0) {
    _bvTimers.push(setTimeout(() => _promptCall(rep, seq, cb), BEAT_MS * (stopBefore + 1)))
  } else {
    for (let i = stopBefore; i < seq.length; i++) { _bvTimers.push(setTimeout(() => _revealBeat(seq, i), BEAT_MS * (i + 1))) }
    _bvTimers.push(setTimeout(() => _revealOutcome(rep), BEAT_MS * (seq.length + 1)))
  }
}

// Pause the reveal and offer Commit / Disengage before the final beat.
function _promptCall(rep, seq, cb) {
  const el = document.getElementById('bv-call'); if (!el) return
  el.innerHTML = `
    <div class="bv-call-q">The battle hangs in the balance — your call for the final push:</div>
    <div class="bv-call-opts">${BATTLE_CALLS.map(c => `
      <button class="bv-call-btn bv-call-${c.id}" onclick="chooseBattleCall('${c.id}')">
        <span class="bv-call-ico">${c.icon}</span> ${c.label}
        <span class="bv-call-desc">${c.desc}</span>
      </button>`).join('')}
    </div>
    <div class="bv-call-timer"><div class="bv-call-timer-fill" id="bv-call-timer"></div></div>`
  el.classList.add('bv-on')
  // Animate the countdown, then auto-disengage if untouched.
  requestAnimationFrame(() => { const f = document.getElementById('bv-call-timer'); if (f) { f.style.transition = `width ${CALL_MS}ms linear`; f.style.width = '0%' } })
  _bvTimers.push(setTimeout(() => _applyCall('none'), CALL_MS))
}

// Apply the chosen call, dismiss the prompt, then finish the reveal from the bet beat.
function _applyCall(call) {
  _clearTimers()
  const ov = document.getElementById('bv-overlay'); if (!ov) return
  const rep = ov.__rep, seq = ov.__seq
  const cb = rep?.microCall?.beatIndex ?? -1
  if (rep && typeof rep.applyCall === 'function' && !rep._callDone) rep.applyCall(call)
  const el = document.getElementById('bv-call'); if (el) { el.classList.remove('bv-on'); el.innerHTML = '' }
  if (!seq) return
  for (let i = Math.max(0, cb); i < seq.length; i++) { _bvTimers.push(setTimeout(() => _revealBeat(seq, i), BEAT_MS * (i - cb + 1))) }
  _bvTimers.push(setTimeout(() => _revealOutcome(rep), BEAT_MS * (seq.length - cb + 1)))
}

function _revealBeat(seq, i) {
  const b = seq[i]
  const ov = document.getElementById('bv-overlay')
  if (ov?.__pitch) ov.__pitch.playBeat(i, b)
  const mom = document.getElementById('bv-mom')
  if (mom) { mom.style.width = b.momentum + '%'; mom.style.background = b.won ? 'linear-gradient(90deg,#3a6a3a,#8fbc8f)' : 'linear-gradient(90deg,#6a3030,#cc5a4a)' }
  const beat = document.getElementById('bv-beat-' + i); if (beat) beat.classList.add('bv-on')
  const mark = document.getElementById('bv-mark-' + i); if (mark) { mark.textContent = b.won ? '✓' : '✕'; mark.style.color = b.won ? '#8fbc8f' : '#cc5a4a' }
  const line = document.getElementById('bv-line-' + i); if (line) line.textContent = b.line
}

function _revealOutcome(rep) {
  const ovp = document.getElementById('bv-overlay')
  if (ovp?.__pitch) ovp.__pitch.finish(_repWon(rep))
  const el = document.getElementById('bv-outcome'); if (!el) return
  const league = rep.kind === 'league'
  const tourney = rep.kind === 'tournament'
  const label = tourney ? (rep.champion ? 'CHAMPIONS' : 'ELIMINATED')
    : league ? (rep.result === 'win' ? 'WIN' : rep.result === 'draw' ? 'DRAW' : 'LOSS')
    : (rep.succeeded ? 'SUCCESS' : 'FAILURE')
  const cls = tourney ? (rep.champion ? 'bv-win' : 'bv-loss')
    : league ? (rep.result === 'win' ? 'bv-win' : rep.result === 'draw' ? 'bv-draw' : 'bv-loss')
    : (rep.succeeded ? 'bv-win' : 'bv-loss')
  const verdict = rep.verdict || battleVerdict(rep.quality, rep.succeeded)
  const cr = rep._callResult
  const callNote = cr
    ? `<div class="bv-call-note bv-call-${cr.kind}">${cr.label} — ${cr.note}${cr.bonusRyo ? ` <b>(${cr.bonusRyo > 0 ? '+' : ''}${cr.bonusRyo} ryo)</b>` : ''}</div>`
    : ''
  const detail = (tourney)
    ? `<div class="bv-scoreline">Reached <b>${rep.reachedStage || 'the field'}</b>${rep.kiaTotal ? ` · ${rep.kiaTotal} fallen ☠` : ''}</div>`
    : (league && rep.scoreline)
      ? `<div class="bv-scoreline">${rep.scoreline.home} <b>${rep.scoreline.hs}–${rep.scoreline.as}</b> ${rep.scoreline.away}</div>`
      : (rep.scores || []).length
        ? `<div class="bv-grades">${rep.scores.map(sc => `<div class="bv-grade"><div class="bv-grade-n">${sc.name}</div><div class="bv-grade-g" style="color:${GRADE_COLOR[sc.grade] || '#888'}">${sc.grade}</div></div>`).join('')}</div>`
        : ''
  el.innerHTML = `
    <div class="bv-result ${cls}">${label}</div>
    <div class="bv-verdict">${verdict}</div>
    ${callNote}
    ${detail}
    <button class="bv-close" onclick="closeBattleViewer()">Close</button>`
  el.classList.add('bv-on')
}

/** Player's micro-call choice from the prompt (Commit / Disengage). */
export function chooseBattleCall(call) { _applyCall(call) }

/** Jump straight to the final state. A pending micro-call auto-disengages. */
export function skipBattleViewer() {
  _clearTimers()
  const ov = document.getElementById('bv-overlay'); if (!ov) return
  const rep = ov.__rep
  if (rep && typeof rep.applyCall === 'function' && !rep._callDone) rep.applyCall('none')
  const el = document.getElementById('bv-call'); if (el) { el.classList.remove('bv-on'); el.innerHTML = '' }
  if (ov.__seq) ov.__seq.forEach((b, i) => _revealBeat(ov.__seq, i))
  if (rep) _revealOutcome(rep)
}

export function closeBattleViewer() {
  _clearTimers()
  const ov = document.getElementById('bv-overlay')
  if (ov) { if (ov.__pitch) ov.__pitch.destroy(); ov.remove() }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeBattleViewer() }, true)
}
