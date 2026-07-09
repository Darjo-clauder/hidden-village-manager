/**
 * Live battle viewer (client) — a watch-it-unfold overlay for an already-resolved
 * mission. Plays the three contested beats one at a time with a swinging momentum
 * bar and narrative, then reveals the outcome + squad grades. Pure presentation
 * over a mission report — no engine state touched. Auto-plays; Skip jumps to end.
 */
import { battleSequence, battleVerdict, spotlightRole, roleBeatFlavor } from '../../shared/utils/battleViewer.js'
import { BATTLE_CALLS } from '../../shared/utils/battleCalls.js'
import { arenaFor } from '../../shared/constants/arenas.js'
import { mountPitch } from './pitchView.js'
import { MATCH_TACTICS, unitCompRead, beatDrain, staminaBand, finishEffects } from '../../shared/utils/matchSim.js'

// ── Match clock — a pausable, speed-scalable scheduler ─────────────────────────
// The old fixed setTimeout chain couldn't pause or fast-forward; the clock
// accumulates scaled time on a short interval and fires queued reveals when due,
// which is what makes the ⏸ / speed / replay controls possible.
let _clock = null
function _startClock() {
  _stopClock()
  _clock = { t: 0, last: performance.now(), paused: false, speed: 1, queue: [] }
  const sb = document.getElementById('bv-ctl-speed'); if (sb) sb.textContent = '1×'
  const pb = document.getElementById('bv-ctl-pause'); if (pb) pb.textContent = '⏸'
  _clock.iv = setInterval(() => {
    const c = _clock; if (!c) return
    const now = performance.now()
    if (!c.paused) c.t += (now - c.last) * c.speed
    c.last = now
    c.queue = c.queue.filter(q => { if (q.at <= c.t) { q.fn(); return false } return true })
  }, 50)
}
function _stopClock() { if (_clock) { clearInterval(_clock.iv); _clock = null } }
function _sched(fn, at) { if (_clock) _clock.queue.push({ fn, at }) }
function _clearTimers() { _stopClock() }

/** ⏸ / ▶ — pause the reveal clock and the pitch animation together. */
export function bvTogglePause() {
  const ov = document.getElementById('bv-overlay'); if (!ov || !_clock) return
  _clock.paused = !_clock.paused
  if (ov.__pitch) { _clock.paused ? ov.__pitch.pause() : ov.__pitch.resume() }
  const b = document.getElementById('bv-ctl-pause'); if (b) b.textContent = _clock.paused ? '▶' : '⏸'
}

/** Cycle playback speed 1× → 2× → 4×. */
export function bvCycleSpeed() {
  if (!_clock) return
  _clock.speed = _clock.speed >= 4 ? 1 : _clock.speed * 2
  const b = document.getElementById('bv-ctl-speed'); if (b) b.textContent = _clock.speed + '×'
}

/** ↻ Replay the whole match from kickoff (outcome + rewards unchanged). */
export function replayBattle() {
  const ov = document.getElementById('bv-overlay'); if (!ov) return
  const rep = ov.__rep, seq = ov.__seq; if (!rep || !seq) return
  // A pending micro-call locks in as Disengage — replays never re-open bets.
  if (typeof rep.applyCall === 'function' && !rep._callDone) rep.applyCall('none')
  const callEl = document.getElementById('bv-call'); if (callEl) { callEl.classList.remove('bv-on'); callEl.innerHTML = '' }
  seq.forEach((b, i) => {
    document.getElementById('bv-beat-' + i)?.classList.remove('bv-on')
    const mk = document.getElementById('bv-mark-' + i); if (mk) { mk.textContent = '·'; mk.style.color = '' }
    const ln = document.getElementById('bv-line-' + i); if (ln) ln.textContent = ''
  })
  const out = document.getElementById('bv-outcome'); if (out) { out.classList.remove('bv-on'); out.innerHTML = '' }
  const mom = document.getElementById('bv-mom'); if (mom) { mom.style.width = '50%'; mom.style.background = '' }
  if (ov.__pitch) { ov.__pitch.reset(); ov.__pitch.resume() }
  if (ov.__cond) {   // fresh legs for the replay; the settled result stays locked
    ov.__cond.stamina = [...ov.__cond.start]
    ov.__cond.tactic = 'balanced'
    ov.__pitch?.updateStamina(ov.__cond.stamina)
    _renderTactics(ov)
  }
  _startClock()
  const b = document.getElementById('bv-ctl-pause'); if (b) b.textContent = '⏸'
  seq.forEach((_, i) => _sched(() => _revealBeat(seq, i), BEAT_MS * (i + 1)))
  _sched(() => _revealOutcome(rep), BEAT_MS * (seq.length + 1))
}

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
      <div class="bv-pitch" id="bv-pitch">
        <div class="bv-pitch-ctl">
          <button class="bv-ctl-btn" id="bv-ctl-pause" onclick="bvTogglePause()" title="Pause / resume">⏸</button>
          <button class="bv-ctl-btn" id="bv-ctl-speed" onclick="bvCycleSpeed()" title="Playback speed">1×</button>
          <button class="bv-ctl-btn" onclick="replayBattle()" title="Replay from kickoff">↻</button>
        </div>
      </div>
      <div class="bv-pitch-info" id="bv-pitch-info">Hover a shinobi for their name · click to inspect</div>
      <div class="bv-tactics" id="bv-tactics"></div>
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

  // Animated pitch — the hexagon-stadium match window above the momentum bar.
  const { home, away } = _tags(rep)
  ov.__pitch = mountPitch(document.getElementById('bv-pitch'), {
    arena: _repArena(rep), home, away,
    homeLabel: rep.squadName || rep.scoreline?.home || '',
    awayLabel: rep.scoreline?.away || '',
    roster: rep.scores || [],
    onSelect: sel => _showInspect(rep, sel),
  })

  // Condition layer — live stamina + touchline tactics, only for reports that
  // carry real members (player squad missions). Unit comp sets the profile.
  if (rep.matchStamina?.length) {
    const comp = unitCompRead(rep.matchStamina.map(m => m.role))
    const start = rep.matchStamina.map(m => Math.min(100, m.stamina + comp.startBonus))
    ov.__cond = { tactic: 'balanced', comp, start, stamina: [...start], members: rep.matchStamina }
    ov.__pitch?.updateStamina(ov.__cond.stamina)
    _renderTactics(ov)
  }

  // Reveal every beat up to (but not including) the bet-on beat; then either pause
  // for the micro-call, or play straight through to the outcome.
  _startClock()
  const stopBefore = cb >= 0 ? cb : seq.length
  for (let i = 0; i < stopBefore; i++) { _sched(() => _revealBeat(seq, i), BEAT_MS * (i + 1)) }
  if (cb >= 0) {
    _sched(() => _promptCall(rep, seq, cb), BEAT_MS * (stopBefore + 1))
  } else {
    for (let i = stopBefore; i < seq.length; i++) { _sched(() => _revealBeat(seq, i), BEAT_MS * (i + 1)) }
    _sched(() => _revealOutcome(rep), BEAT_MS * (seq.length + 1))
  }
}

// Touchline strip: unit-comp tags + the live tactic dial + squad condition readout.
function _renderTactics(ov) {
  const el = document.getElementById('bv-tactics'); if (!el || !ov.__cond) return
  const c = ov.__cond
  const avg = Math.round(c.stamina.reduce((a, v) => a + v, 0) / c.stamina.length)
  const band = staminaBand(avg)
  el.classList.add('bv-on')
  el.innerHTML = `
    <div class="bv-tac-row">
      <span class="bv-tac-cond" title="Squad average stamina — manage it with the tactic dial">Condition <b style="color:${band.color}">${avg} · ${band.label}</b></span>
      ${MATCH_TACTICS.map(t => `<button class="bv-tac-btn${c.tactic === t.id ? ' bv-tac-sel' : ''}" onclick="bvSetTactic('${t.id}')" title="${t.desc}">${t.icon} ${t.label}</button>`).join('')}
    </div>
    ${c.comp.tags.length ? `<div class="bv-tac-tags">${c.comp.tags.map(t => `<span class="bv-tac-tag" style="color:${t.good ? '#8fbc8f' : '#f0a030'}" title="${t.desc}">${t.label}</span>`).join('')}</div>` : ''}`
}

/** Touchline tactic switch — takes effect from the next exchange. */
export function bvSetTactic(id) {
  const ov = document.getElementById('bv-overlay'); if (!ov?.__cond) return
  ov.__cond.tactic = id
  _renderTactics(ov)
}

// Clicked-shinobi inspector strip — role + live match grade for your side,
// a scouting one-liner for the opposition.
const _GRADE_COLOR_TXT = { A: '#c9a84c', B: '#8fbc8f', C: '#f0a030', D: '#f66' }
function _showInspect(rep, sel) {
  const el = document.getElementById('bv-pitch-info'); if (!el) return
  if (!sel) { el.innerHTML = 'Hover a shinobi for their name · click to inspect'; el.classList.remove('bv-on'); return }
  el.classList.add('bv-on')
  if (sel.side === 'home' && sel.entry) {
    const e = sel.entry
    // Live stamina for the selected shinobi, if the condition layer is running.
    const cond = document.getElementById('bv-overlay')?.__cond
    const stam = cond?.stamina?.[sel.idx]
    const stamHtml = stam != null ? (() => { const bd = staminaBand(stam); return ` · Stamina <b style="color:${bd.color}">${stam}</b> <span style="color:${bd.color}">(${bd.label})</span>` })() : ''
    el.innerHTML = `<b style="color:#c9a84c">${e.name}</b>${e.role ? ` · <span style="color:#9a9080">${e.role}</span>` : ''}${stamHtml}${e.grade ? ` · Match grade <b style="color:${_GRADE_COLOR_TXT[e.grade] || '#888'}">${e.grade}</b>` : ''}${e.detail ? ` <span style="color:#7a7060">(${e.detail})</span>` : ''}${sel.ko ? ' · <span style="color:#cc5a4a">taken out of the fight</span>' : ''}`
  } else if (sel.side === 'home') {
    el.innerHTML = `<b style="color:#c9a84c">${sel.name}</b>${sel.ko ? ' · <span style="color:#cc5a4a">taken out of the fight</span>' : ''}`
  } else {
    el.innerHTML = `<b>${sel.name}</b> · <span style="color:#7a7060">opposition</span>${sel.ko ? ' · <span style="color:#8fbc8f">taken out of the fight</span>' : ''}`
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
  _sched(() => _applyCall('none'), (_clock?.t || 0) + CALL_MS)
}

// Apply the chosen call, dismiss the prompt, then finish the reveal from the bet beat.
function _applyCall(call) {
  const ov = document.getElementById('bv-overlay'); if (!ov) return
  const rep = ov.__rep, seq = ov.__seq
  const cb = rep?.microCall?.beatIndex ?? -1
  if (rep && typeof rep.applyCall === 'function' && !rep._callDone) rep.applyCall(call)
  const el = document.getElementById('bv-call'); if (el) { el.classList.remove('bv-on'); el.innerHTML = '' }
  if (!seq) return
  _startClock()
  for (let i = Math.max(0, cb); i < seq.length; i++) { _sched(() => _revealBeat(seq, i), BEAT_MS * (i - cb + 1)) }
  _sched(() => _revealOutcome(rep), BEAT_MS * (seq.length - cb + 1))
}

function _revealBeat(seq, i) {
  const b = seq[i]
  const ov = document.getElementById('bv-overlay')
  // Role-aware spotlight + condition tick. The spotlight names the shinobi whose
  // role drives this beat (and lights their circle); the tick drains legs by
  // role × tactic × result, a medic clawing some back on wins. Needs the squad
  // roster (condition layer) — the beat plays generic otherwise.
  let spotHtml = '', spotIdx = -1
  if (ov?.__cond) {
    const c = ov.__cond
    const roles = c.members.map(m => m.role)
    const role = spotlightRole(roles, b.name, i)
    spotIdx = role ? roles.indexOf(role) : -1
    const who = spotIdx >= 0 ? c.members[spotIdx] : null
    if (who) spotHtml = ` <span class="bv-beat-spot">— ${who.name} ${roleBeatFlavor(role, b.won, i)}.</span>`
    c.stamina = c.stamina.map((s, k) => {
      let v = s - beatDrain({ role: c.members[k].role, tactic: c.tactic, won: b.won, stamina: s, compDrainMult: c.comp.drainMult })
      if (b.won && c.comp.regenPerWin) v += c.comp.regenPerWin
      return Math.max(0, Math.min(100, v))
    })
    ov.__pitch?.updateStamina(c.stamina)
    _renderTactics(ov)
  }
  if (ov?.__pitch) ov.__pitch.playBeat(i, b, spotIdx)
  const mom = document.getElementById('bv-mom')
  if (mom) { mom.style.width = b.momentum + '%'; mom.style.background = b.won ? 'linear-gradient(90deg,#3a6a3a,#8fbc8f)' : 'linear-gradient(90deg,#6a3030,#cc5a4a)' }
  const beat = document.getElementById('bv-beat-' + i); if (beat) beat.classList.add('bv-on')
  const mark = document.getElementById('bv-mark-' + i); if (mark) { mark.textContent = b.won ? '✓' : '✕'; mark.style.color = b.won ? '#8fbc8f' : '#cc5a4a' }
  const line = document.getElementById('bv-line-' + i); if (line) line.innerHTML = b.line + spotHtml
}

function _revealOutcome(rep) {
  const ovp = document.getElementById('bv-overlay')
  if (ovp?.__pitch) ovp.__pitch.finish(_repWon(rep))
  // Settle the condition sim: how the player paced the squad becomes real
  // fatigue/morale (once — replays reuse the locked result).
  let condFx = rep._condResult || null
  if (ovp?.__cond && typeof rep.applyCondition === 'function' && !rep._condDone) {
    const c = ovp.__cond
    const avg = Math.round(c.stamina.reduce((a, v) => a + v, 0) / c.stamina.length)
    condFx = rep.applyCondition(avg)
  }
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
  const condNote = condFx
    ? `<div class="bv-call-note bv-cond-${condFx.id}">${condFx.label} — ${condFx.note}${condFx.workloadDelta ? ` <b>(${condFx.workloadDelta > 0 ? '+' : ''}${condFx.workloadDelta} fatigue${condFx.moraleDelta ? `, ${condFx.moraleDelta > 0 ? '+' : ''}${condFx.moraleDelta} morale` : ''})</b>` : ''}</div>`
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
    ${condNote}
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
