/**
 * Live battle viewer (client) — a watch-it-unfold overlay for an already-resolved
 * mission. Plays the three contested beats one at a time with a swinging momentum
 * bar and narrative, then reveals the outcome + squad grades. Pure presentation
 * over a mission report — no engine state touched. Auto-plays; Skip jumps to end.
 */
import { battleSequence, battleVerdict } from '../../shared/utils/battleViewer.js'

let _bvTimers = []
function _clearTimers() { _bvTimers.forEach(clearTimeout); _bvTimers = [] }

const GRADE_COLOR = { A: '#c9a84c', B: '#8fbc8f', C: '#f0a030', D: '#f66' }
const BEAT_MS = 1100

/** Open the live viewer for a mission report ({ missionName, missionRk, succeeded, phases, quality, scores }). */
export function openBattleViewer(rep) {
  if (!rep || !rep.phases || !rep.phases.length) return
  closeBattleViewer()
  const seq = battleSequence(rep.phases, (rep.missionName || '').length)
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
      <div class="bv-mom-wrap"><div class="bv-mom-fill" id="bv-mom" style="width:50%"></div></div>
      <div class="bv-mom-labels"><span>◂ Enemy</span><span>Your squad ▸</span></div>
      <div class="bv-beats" id="bv-beats">${seq.map((b, i) => `
        <div class="bv-beat" id="bv-beat-${i}">
          <div class="bv-beat-name">${b.name}</div>
          <div class="bv-beat-mark" id="bv-mark-${i}">·</div>
          <div class="bv-beat-line" id="bv-line-${i}"></div>
        </div>`).join('')}
      </div>
      <div class="bv-outcome" id="bv-outcome"></div>
    </div>`
  document.body.appendChild(ov)

  seq.forEach((b, i) => { _bvTimers.push(setTimeout(() => _revealBeat(seq, i), BEAT_MS * (i + 1))) })
  _bvTimers.push(setTimeout(() => _revealOutcome(rep), BEAT_MS * (seq.length + 1)))
}

function _revealBeat(seq, i) {
  const b = seq[i]
  const mom = document.getElementById('bv-mom')
  if (mom) { mom.style.width = b.momentum + '%'; mom.style.background = b.won ? 'linear-gradient(90deg,#3a6a3a,#8fbc8f)' : 'linear-gradient(90deg,#6a3030,#cc5a4a)' }
  const beat = document.getElementById('bv-beat-' + i); if (beat) beat.classList.add('bv-on')
  const mark = document.getElementById('bv-mark-' + i); if (mark) { mark.textContent = b.won ? '✓' : '✕'; mark.style.color = b.won ? '#8fbc8f' : '#cc5a4a' }
  const line = document.getElementById('bv-line-' + i); if (line) line.textContent = b.line
}

function _revealOutcome(rep) {
  const el = document.getElementById('bv-outcome'); if (!el) return
  const league = rep.kind === 'league'
  const label = league ? (rep.result === 'win' ? 'WIN' : rep.result === 'draw' ? 'DRAW' : 'LOSS')
    : (rep.succeeded ? 'SUCCESS' : 'FAILURE')
  const cls = league ? (rep.result === 'win' ? 'bv-win' : rep.result === 'draw' ? 'bv-draw' : 'bv-loss')
    : (rep.succeeded ? 'bv-win' : 'bv-loss')
  const verdict = rep.verdict || battleVerdict(rep.quality, rep.succeeded)
  const detail = (league && rep.scoreline)
    ? `<div class="bv-scoreline">${rep.scoreline.home} <b>${rep.scoreline.hs}–${rep.scoreline.as}</b> ${rep.scoreline.away}</div>`
    : (rep.scores || []).length
      ? `<div class="bv-grades">${rep.scores.map(sc => `<div class="bv-grade"><div class="bv-grade-n">${sc.name}</div><div class="bv-grade-g" style="color:${GRADE_COLOR[sc.grade] || '#888'}">${sc.grade}</div></div>`).join('')}</div>`
      : ''
  el.innerHTML = `
    <div class="bv-result ${cls}">${label}</div>
    <div class="bv-verdict">${verdict}</div>
    ${detail}
    <button class="bv-close" onclick="closeBattleViewer()">Close</button>`
  el.classList.add('bv-on')
}

/** Jump straight to the final state. */
export function skipBattleViewer() {
  _clearTimers()
  const ov = document.getElementById('bv-overlay'); if (!ov) return
  if (ov.__seq) ov.__seq.forEach((b, i) => _revealBeat(ov.__seq, i))
  if (ov.__rep) _revealOutcome(ov.__rep)
}

export function closeBattleViewer() {
  _clearTimers()
  const ov = document.getElementById('bv-overlay'); if (ov) ov.remove()
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeBattleViewer() }, true)
}
