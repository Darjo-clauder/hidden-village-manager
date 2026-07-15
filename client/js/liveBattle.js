/**
 * Live battle viewer (client) — a watch-it-unfold overlay for an already-resolved
 * mission. Plays the three contested beats one at a time with a swinging momentum
 * bar and narrative, then reveals the outcome + squad grades. Pure presentation
 * over a mission report — no engine state touched. Auto-plays; Skip jumps to end.
 */
import { battleSequence, battleVerdict, spotlightRole, roleBeatFlavor } from '../../shared/utils/battleViewer.js'
import { BATTLE_CALLS } from '../../shared/utils/battleCalls.js'
import { arenaFor } from '../../shared/constants/arenas.js'
import { mountPitch, ROLE_TINT } from './pitchView.js'
import { MATCH_TACTICS, unitCompRead, beatDrain, staminaBand, finishEffects, resolveMatchPrefs, playerOfMatch } from '../../shared/utils/matchSim.js'
import { buildPeriod, statsFrom, zoneControlFrom, tickerLine, ZONE_X, mulberry32 } from '../../shared/utils/matchEngine.js'
import { TEMPO, tacticsForStyle, evalSituations, effectiveTactics } from '../../shared/constants/tactics.js'
import { identityFor } from '../../shared/constants/villageIdentity.js'
import { MATCH_STYLES } from '../../shared/constants/villageIdentity.js'
import { G } from './state.js'

// Match preferences live on G (persist in the save). resolveMatchPrefs guards
// old saves / partial objects.
function _prefs() { return resolveMatchPrefs(G.matchPrefs || {}) }

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
    // Split due items out FIRST, then fire them — callbacks may _sched more work
    // (lazy period builds do), and firing inside the filter would clobber those
    // additions when the filter's return value overwrote the queue.
    const due = []
    c.queue = c.queue.filter(q => (q.at <= c.t ? (due.push(q), false) : true))
    due.sort((a, b) => a.at - b.at)   // same-tick items fire in TIME order, not insertion order
    due.forEach(q => q.fn())
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
  // Fresh event log + ticker + match state; the seeded periods replay identically.
  ov.__evLog = []
  ov.__revealed = new Set()
  ov.__callHandled = false
  const tk = document.getElementById('bv-ticker'); if (tk) tk.innerHTML = ''
  if (ov.__match) {
    ov.__match.pts = 0; ov.__match.ko = { home: 0, away: 0 }; ov.__match.lineOffset = { home: 0, away: 0 }
    ov.__match.built = new Set()
    ov.__tickRng = mulberry32((ov.__match.seedStr.length * 2654435761) ^ 0x5f3759df)
  }
  _startClock()
  const b = document.getElementById('bv-ctl-pause'); if (b) b.textContent = '⏸'
  _scheduleMatch(rep, seq, 0, -1)   // call already locked — full run-through
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

// Shirt tags for the circles. Missions/matchdays field the actual squad (from
// grades); the bracket encounters (Adept Exam, Grand Tournament) are multi-village
// melees, so they field a LARGER board — many combatants a side — to read as the
// big event they are.
function _tags(rep) {
  const names = (rep.scores || []).map(s => (s.name || '').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase())
  if (rep.kind === 'tournament' || rep.kind === 'exam') {
    const homeN = rep.kind === 'tournament' ? 5 : 4
    const awayN = rep.kind === 'tournament' ? 10 : 8   // the rest of the field
    const home = names.length ? names.slice(0, homeN) : Array.from({ length: homeN }, (_, i) => String(i + 1))
    while (home.length < homeN) home.push(String(home.length + 1))
    const away = Array.from({ length: awayN }, (_, i) => String(i + 1))
    return { home, away }
  }
  const n = Math.min(5, Math.max(3, names.length || 3))
  const home = names.length ? names.slice(0, 5) : Array.from({ length: n }, (_, i) => String(i + 1))
  const away = Array.from({ length: home.length }, (_, i) => String(i + 1))
  return { home, away }
}

// Our side's final result, for the tableau: 'win' | 'loss' | 'draw'. A league
// draw is neither a win nor a loss — the board must not stage it as a defeat.
function _repResult(rep) {
  if (rep.kind === 'tournament') return rep.champion ? 'win' : 'loss'
  if (rep.kind === 'league') return rep.result === 'draw' ? 'draw' : rep.result === 'win' ? 'win' : 'loss'
  return rep.succeeded ? 'win' : 'loss'
}

const GRADE_COLOR = { A: '#c9a84c', B: '#8fbc8f', C: '#f0a030', D: '#f66' }
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
        <div class="bv-head-btns">
          <button class="bv-skip" onclick="bvToggleSettings()" title="Match settings">⚙</button>
          <button class="bv-skip" onclick="skipBattleViewer()">Skip ▸</button>
        </div>
      </div>
      <div class="bv-settings" id="bv-settings"></div>
      <div class="bv-pitch" id="bv-pitch">
        <div class="bv-pitch-ctl">
          <button class="bv-ctl-btn bv-ovl" id="bv-ovl-lanes" onclick="bvSetOverlay('lanes')" title="Passing lanes overlay">L</button>
          <button class="bv-ctl-btn bv-ovl" id="bv-ovl-pressure" onclick="bvSetOverlay('pressure')" title="Pressure overlay">P</button>
          <button class="bv-ctl-btn bv-ovl" id="bv-ovl-zones" onclick="bvSetOverlay('zones')" title="Zone control overlay">Z</button>
          <button class="bv-ctl-btn bv-ovl" id="bv-ovl-shape" onclick="bvSetOverlay('shape')" title="Formation shape overlay">S</button>
          <button class="bv-ctl-btn" id="bv-ctl-pause" onclick="bvTogglePause()" title="Pause / resume">⏸</button>
          <button class="bv-ctl-btn" id="bv-ctl-speed" onclick="bvCycleSpeed()" title="Playback speed">1×</button>
          <button class="bv-ctl-btn" onclick="replayBattle()" title="Replay from kickoff">↻</button>
        </div>
      </div>
      <div class="bv-pitch-legend" id="bv-pitch-legend"></div>
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
      <div class="bv-ticker" id="bv-ticker"></div>
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
  const pf = _prefs()
  if (rep.matchStamina?.length) {
    const comp = unitCompRead(rep.matchStamina.map(m => m.role))
    const start = rep.matchStamina.map(m => Math.min(100, m.stamina + comp.startBonus))
    ov.__cond = { tactic: pf.tactic, comp, start, stamina: [...start], members: rep.matchStamina }
    ov.__pitch?.updateStamina(ov.__cond.stamina)
    _renderTactics(ov)
    // Role legend — maps the board's circle colours to squad roles.
    const leg = document.getElementById('bv-pitch-legend')
    if (leg) {
      const roles = [...new Set(rep.matchStamina.map(m => m.role || 'flex'))]
      leg.innerHTML = roles.map(r => { const t = ROLE_TINT[r] || ROLE_TINT.flex; return `<span class="bv-leg"><i style="background:${t.fill}"></i>${t.label}</span>` }).join('')
        + `<span class="bv-leg"><i style="background:${_repArena(rep).palette.accent}"></i>Opposition</span>`
    }
  }

  // Possession-phase script (matchEngine): each beat expands into a period of
  // Match state for the possession sim: lazy per-period scripts (so situational
  // tactics can shape the play), event log, deterministic ticker RNG, tactics
  // rows for both sides, KO/points tracking, and bracket line rotation.
  const awayStyle = identityFor(rep.oppVillage || '').style
  ov.__match = {
    seedStr: `${rep.missionName || 'op'}|${rep.year ?? G.year}|${rep.month ?? G.month}`,
    nHome: home.length, nAway: away.length,
    homeTactics: tacticsForStyle('balanced'),
    awayTactics: tacticsForStyle(awayStyle),
    pts: 0, ko: { home: 0, away: 0 }, built: new Set(),
    isBracket: rep.kind === 'tournament' || rep.kind === 'exam',
    lineOffset: { home: 0, away: 0 },
  }
  ov.__evLog = []
  ov.__tickRng = mulberry32((ov.__match.seedStr.length * 2654435761) ^ 0x5f3759df)

  // Auto-resolve: settle instantly with the player's default tactic + battle call,
  // no waiting. The same closures apply, so the result is identical to watching.
  if (pf.autoResolve) { _finishInstant(pf.battleCall); return }

  _startClock()
  _scheduleMatch(rep, seq, 0, cb)
}

// Period/phase scheduling (blueprint §1.3): each beat = one period of
// PHASE_MS×PHASES_PER phases; the beat's text reveal fires at the period's end.
// Periods are BUILT at their boundary (`_startPeriod`) so situational tactics —
// late push, protect the lead, man down, redline — genuinely reshape the play.
// `fromBeat` lets the micro-call resume mid-match; `cb` = the bet-on beat index.
const PHASE_MS = 850
const PHASES_PER = 3
const PERIOD_MS = PHASE_MS * PHASES_PER
function _scheduleMatch(rep, seq, fromBeat, cb) {
  const ov = document.getElementById('bv-overlay'); if (!ov) return
  const stopBefore = cb >= 0 ? cb : seq.length
  const base = i => (i - fromBeat) * PERIOD_MS   // period i's window start on this clock
  for (let i = fromBeat; i < stopBefore; i++) {
    _sched(() => _startPeriod(seq, i), base(i) + 20)
    _sched(() => _revealBeat(seq, i), base(i) + PERIOD_MS)
  }
  if (cb >= 0 && stopBefore < seq.length + 1) {
    _sched(() => _promptCall(rep, seq, cb), base(stopBefore) + 200)
  } else {
    _sched(() => _revealOutcome(rep), base(seq.length) + 500)
  }
}

// Period boundary: evaluate situations (⚑), rotate bracket lines, build the
// period with the EFFECTIVE tempo, and schedule its phase events.
function _startPeriod(seq, i) {
  const ov = document.getElementById('bv-overlay'); if (!ov?.__match) return
  const m = ov.__match
  // Situations from live state: score so far, KOs, squad condition.
  const avgStamina = ov.__cond
    ? ov.__cond.stamina.reduce((a, v) => a + v, 0) / ov.__cond.stamina.length
    : 100
  const sits = evalSituations({
    periodIdx: i, totalPeriods: seq.length, pointsSoFar: m.pts,
    homeKo: m.ko.home, awayKo: m.ko.away, avgStamina,
  })
  sits.forEach(s => _tickRaw(`⚑ ${s.label} — ${s.note}`, 'bv-tick-sit'))
  const eff = effectiveTactics(m.homeTactics, sits)
  // Bracket boards rotate a fresh line each period — the "line change".
  if (m.isBracket) {
    m.lineOffset = { home: (i * 3) % Math.max(1, m.nHome), away: (i * 3) % Math.max(1, m.nAway) }
    if (i > 0) _tickRaw('⇄ Line change — fresh legs into the arena.', 'bv-tick-sit')
  }
  const per = buildPeriod({
    seedStr: m.seedStr, periodIdx: i, won: seq[i].won,
    nHome: m.nHome, nAway: m.nAway, phasesPerPeriod: PHASES_PER,
    tempoPasses: { home: TEMPO[eff.tempo]?.passes ?? 1, away: TEMPO[m.awayTactics.tempo]?.passes ?? 1 },
  })
  m.built.add(i)
  m.pts += per.phases.reduce((a, p) => a + p.point, 0)
  const t0 = _clock?.t || 0
  per.phases.forEach((ph, pi) => ph.events.forEach(ev => {
    _sched(() => _stagePhaseEvent(ev), t0 + (pi + ev.at) * PHASE_MS + 100)
  }))
}

// Stage one scripted event: choreograph it on the pitch, log it, tick it, tint zones.
// Bracket boards rotate through their larger field via the period's line offset.
function _stagePhaseEvent(ev) {
  const ov = document.getElementById('bv-overlay'); if (!ov) return
  const m = ov.__match
  let staged = ev
  if (m?.isBracket) {
    const off = m.lineOffset[ev.side === 'home' ? 'home' : 'away'] || 0
    const n = ev.side === 'home' ? m.nHome : m.nAway
    staged = { ...ev, actor: (ev.actor + off) % Math.max(1, n), target: ev.target != null ? (ev.target + off) % Math.max(1, n) : ev.target }
  }
  ov.__pitch?.phaseEvent(staged, ZONE_X[staged.zone] ?? 0.5)
  ov.__evLog.push(staged)
  ov.__pitch?.setZoneControl(zoneControlFrom(ov.__evLog))
  _tick(staged)
}

// Raw ticker line (situations, line changes) — bypasses the event templates.
function _tickRaw(text, cls = '') {
  const el = document.getElementById('bv-ticker'); if (!el) return
  const line = document.createElement('div')
  line.className = 'bv-tick-line ' + cls
  line.textContent = text
  el.prepend(line)
  while (el.children.length > 5) el.removeChild(el.lastChild)
}

// Commentary ticker — every board event, one line, same record (blueprint §6.2).
// Priority filter: at 2×+ only the high-signal events; carries/passes drop out.
const _TICK_PRIORITY = { strike: 3, block: 3, intercept: 3, turnover: 2, pass_fail: 2, pass: 1, carry: 1 }
function _tick(ev) {
  const el = document.getElementById('bv-ticker'); if (!el) return
  const speed = _clock?.speed || 1
  if (speed >= 4) return
  if (speed >= 2 && (_TICK_PRIORITY[ev.type] || 0) < 2) return
  const ov = document.getElementById('bv-overlay')
  const names = (side, idx) => {
    if (side === 'home') {
      const r = ov?.__rep
      return r?.matchStamina?.[idx]?.name || r?.scores?.[idx]?.name || (r?.squadName ? `${r.squadName} №${idx + 1}` : `№${idx + 1}`)
    }
    const oppn = ov?.__rep?.oppVillage || ov?.__rep?.scoreline?.away || 'Opposition'
    return `${oppn} №${(idx ?? 0) + 1}`
  }
  const roll = Math.floor((ov?.__tickRng?.() ?? 0) * 8)
  const line = document.createElement('div')
  line.className = 'bv-tick-line' + (ev.side === 'home' ? ' bv-tick-home' : '')
  line.textContent = tickerLine(ev, names, roll)
  el.prepend(line)
  while (el.children.length > 5) el.removeChild(el.lastChild)
}

// Reveal the whole match in one shot: run every beat's effects (drain, KO, call),
// apply the given battle call, then show the outcome. Shared by Skip (call='none')
// and auto-resolve (call = the player's default). No animation timers.
function _finishInstant(call) {
  _clearTimers()
  const ov = document.getElementById('bv-overlay'); if (!ov) return
  const rep = ov.__rep, seq = ov.__seq
  // Complete the event log for any periods never staged (skipped or auto-resolved)
  // so the post-match stats sheet always covers the full match, not a fragment.
  const m = ov.__match
  if (m && seq) {
    seq.forEach((b, i) => {
      if (m.built.has(i)) return
      const per = buildPeriod({
        seedStr: m.seedStr, periodIdx: i, won: b.won,
        nHome: m.nHome, nAway: m.nAway, phasesPerPeriod: PHASES_PER,
        tempoPasses: { home: TEMPO[m.homeTactics.tempo]?.passes ?? 1, away: TEMPO[m.awayTactics.tempo]?.passes ?? 1 },
      })
      m.built.add(i)
      per.phases.forEach(ph => ov.__evLog.push(...ph.events))
    })
    ov.__pitch?.setZoneControl(zoneControlFrom(ov.__evLog))
  }
  if (seq) seq.forEach((b, i) => _revealBeat(seq, i))
  if (rep && typeof rep.applyCall === 'function' && !rep._callDone) rep.applyCall(call)
  const el = document.getElementById('bv-call'); if (el) { el.classList.remove('bv-on'); el.innerHTML = '' }
  if (rep) _revealOutcome(rep)
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

/** Field overlay chip (L/P/Z/S) — one at a time; clicking again clears it. */
export function bvSetOverlay(mode) {
  const ov = document.getElementById('bv-overlay'); if (!ov?.__pitch) return
  const active = ov.__pitch.setOverlay(mode)
  document.querySelectorAll('.bv-ovl').forEach(b => b.classList.remove('bv-ovl-on'))
  if (active) document.getElementById('bv-ovl-' + active)?.classList.add('bv-ovl-on')
}

// ── Match settings popover (⚙) — auto-resolve + defaults, persisted on G ───────
export function bvToggleSettings() {
  const el = document.getElementById('bv-settings'); if (!el) return
  if (el.classList.contains('bv-on')) { el.classList.remove('bv-on'); el.innerHTML = ''; return }
  _renderSettings()
  el.classList.add('bv-on')
}
function _renderSettings() {
  const el = document.getElementById('bv-settings'); if (!el) return
  const p = _prefs()
  const calls = [{ id: 'commit', label: '⚔ Commit' }, { id: 'disengage', label: '🛡 Disengage' }]
  el.innerHTML = `
    <div class="bv-set-row">
      <label class="bv-set-auto"><input type="checkbox" ${p.autoResolve ? 'checked' : ''} onchange="bvSetPref('autoResolve', this.checked)"> ⚡ Auto-resolve encounters instantly</label>
    </div>
    <div class="bv-set-row"><span class="bv-set-lbl">Default tactic</span>
      ${MATCH_TACTICS.map(t => `<button class="bv-tac-btn${p.tactic === t.id ? ' bv-tac-sel' : ''}" onclick="bvSetPref('tactic','${t.id}')" title="${t.desc}">${t.icon} ${t.label}</button>`).join('')}
    </div>
    <div class="bv-set-row"><span class="bv-set-lbl">Default call</span>
      ${calls.map(c => `<button class="bv-tac-btn${p.battleCall === c.id ? ' bv-tac-sel' : ''}" onclick="bvSetPref('battleCall','${c.id}')">${c.label}</button>`).join('')}
    </div>
    <div class="bv-set-note">Auto-resolve settles matches with these defaults — no waiting, same result as watching.</div>`
}
/** Persist a match preference on G and re-render the popover. */
export function bvSetPref(key, value) {
  G.matchPrefs = { ..._prefs(), [key]: value }
  _renderSettings()
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
    // Opposition scouting: when the report names the opponent village, surface its
    // identity + match style — click a red circle to read who you're up against.
    const opp = rep.oppVillage
    if (opp) {
      const idn = identityFor(opp)
      const st = MATCH_STYLES[idn.style] || MATCH_STYLES.balanced
      const elem = idn.element ? ` · <span style="color:#87ceeb">${idn.element} affinity</span>` : ''
      el.innerHTML = `<b style="color:${_repArena(rep).palette.accent}">${opp}</b> · <span style="color:#c9a84c">${idn.label}</span> <span title="${st.desc}" style="color:#9a9080;cursor:help">${st.icon} ${st.label}</span>${elem}${idn.blurb ? `<span style="display:block;font-size:7px;color:#7a7060;margin-top:1px">${idn.blurb}</span>` : ''}`
    } else {
      el.innerHTML = `<b>${sel.name}</b> · <span style="color:#7a7060">opposition</span>${sel.ko ? ' · <span style="color:#8fbc8f">taken out of the fight</span>' : ''}`
    }
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
  // Animate the countdown, then auto-disengage if untouched. The visual bar must
  // run at the CLOCK's pace — at 2× the timer fires in half the real time.
  const speed = _clock?.speed || 1
  requestAnimationFrame(() => { const f = document.getElementById('bv-call-timer'); if (f) { f.style.transition = `width ${CALL_MS / speed}ms linear`; f.style.width = '0%' } })
  _sched(() => _applyCall('none'), (_clock?.t || 0) + CALL_MS)
}

// Apply the chosen call, dismiss the prompt, then finish the reveal from the bet beat.
// Guarded against double-fire (double-click / auto-timer racing a click): a second
// call would re-run _scheduleMatch and double-count points, KOs and events.
function _applyCall(call) {
  const ov = document.getElementById('bv-overlay'); if (!ov) return
  if (ov.__callHandled) return
  ov.__callHandled = true
  const rep = ov.__rep, seq = ov.__seq
  const cb = rep?.microCall?.beatIndex ?? -1
  if (rep && typeof rep.applyCall === 'function' && !rep._callDone) rep.applyCall(call)
  const el = document.getElementById('bv-call'); if (el) { el.classList.remove('bv-on'); el.innerHTML = '' }
  if (!seq) return
  _startClock()
  _scheduleMatch(rep, seq, Math.max(0, cb), -1)   // resume phases from the bet period
}

function _revealBeat(seq, i) {
  const b = seq[i]
  const ov = document.getElementById('bv-overlay')
  // Idempotence: a beat reveals once per run (skip re-reveals every beat) — else
  // the condition drain and KO bookkeeping would double-count.
  if (ov) {
    ov.__revealed = ov.__revealed || new Set()
    if (ov.__revealed.has(i)) return
    ov.__revealed.add(i)
  }
  // Role-aware spotlight + condition tick. The spotlight names the shinobi whose
  // role drives this beat (and lights their circle); the tick drains legs by
  // role × tactic × result, a medic clawing some back on wins. Needs the squad
  // roster (condition layer) — the beat plays generic otherwise.
  let spotHtml = '', spotIdx = -1, koIdx = -1
  if (ov?.__cond) {
    const c = ov.__cond
    // Drain first so "who's caught" reflects this exchange's toll.
    c.stamina = c.stamina.map((s, k) => {
      let v = s - beatDrain({ role: c.members[k].role, tactic: c.tactic, won: b.won, stamina: s, compDrainMult: c.comp.drainMult })
      if (b.won && c.comp.regenPerWin) v += c.comp.regenPerWin
      return Math.max(0, Math.min(100, v))
    })
    const roles = c.members.map(m => m.role)
    if (b.won) {
      // Won exchange: the role that drives this phase takes the credit.
      const role = spotlightRole(roles, b.name, i)
      spotIdx = role ? roles.indexOf(role) : -1
      const who = spotIdx >= 0 ? c.members[spotIdx] : null
      if (who) spotHtml = ` <span class="bv-beat-spot">— ${who.name} ${roleBeatFlavor(role, b.won, i)}.</span>`
    } else {
      // Lost exchange: the most-spent shinobi is the one caught out. Their legs,
      // not their role, decide it — the whole point of managing stamina.
      koIdx = c.stamina.reduce((best, s, k) => s < c.stamina[best] ? k : best, 0)
      spotIdx = koIdx
      const who = c.members[koIdx]
      if (who) spotHtml = ` <span class="bv-beat-spot" style="color:#cc5a4a">— ${who.name} ${roleBeatFlavor(who.role, false, i)}${c.stamina[koIdx] < 15 ? ', legs gone' : ''}.</span>`
    }
    ov.__pitch?.updateStamina(c.stamina)
    _renderTactics(ov)
  }
  // KO bookkeeping for the situation engine (man down / power phase).
  if (ov?.__match) {
    if (!b.won && koIdx >= 0) ov.__match.ko.home++
    else if (i % 2 === 1) ov.__match.ko[b.won ? 'away' : 'home']++   // mirrors the pitch's cosmetic KO
  }
  if (ov?.__pitch) ov.__pitch.playBeat(i, b, spotIdx, koIdx)
  const mom = document.getElementById('bv-mom')
  if (mom) { mom.style.width = b.momentum + '%'; mom.style.background = b.won ? 'linear-gradient(90deg,#3a6a3a,#8fbc8f)' : 'linear-gradient(90deg,#6a3030,#cc5a4a)' }
  const beat = document.getElementById('bv-beat-' + i); if (beat) beat.classList.add('bv-on')
  const mark = document.getElementById('bv-mark-' + i); if (mark) { mark.textContent = b.won ? '✓' : '✕'; mark.style.color = b.won ? '#8fbc8f' : '#cc5a4a' }
  const line = document.getElementById('bv-line-' + i); if (line) line.innerHTML = b.line + spotHtml
}

function _revealOutcome(rep) {
  const ovp = document.getElementById('bv-overlay')
  if (ovp?.__pitch) ovp.__pitch.finish(_repResult(rep))
  // Settle the condition sim: how the player paced the squad becomes real
  // fatigue/morale (once — replays reuse the locked result).
  let condFx = rep._condResult || null
  if (ovp?.__cond && typeof rep.applyCondition === 'function' && !rep._condDone) {
    const c = ovp.__cond
    const avg = Math.round(c.stamina.reduce((a, v) => a + v, 0) / c.stamina.length)
    condFx = rep.applyCondition(avg)
  }
  // Settle capture-the-scroll (once) — the objective bounty for holding the token.
  let scrollFx = rep._scrollResult || null
  if (typeof rep.applyScroll === 'function' && !rep._scrollDone) scrollFx = rep.applyScroll()
  _archiveMatch(rep)   // stash a closure-free copy for the replay archive
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
  const scrollNote = (scrollFx && scrollFx.held)
    ? `<div class="bv-call-note bv-scroll">📜 ${scrollFx.note}${scrollFx.ryo ? ` <b>(+${scrollFx.ryo.toLocaleString()} ryo)</b>` : ''}</div>`
    : ''
  const detail = (tourney)
    ? `<div class="bv-scoreline">Reached <b>${rep.reachedStage || 'the field'}</b>${rep.kiaTotal ? ` · ${rep.kiaTotal} fallen ☠` : ''}</div>`
    : (league && rep.scoreline)
      ? `<div class="bv-scoreline">${rep.scoreline.home} <b>${rep.scoreline.hs}–${rep.scoreline.as}</b> ${rep.scoreline.away}</div>`
      : (rep.scores || []).length
        ? `<div class="bv-grades">${rep.scores.map(sc => `<div class="bv-grade"><div class="bv-grade-n">${sc.name}</div><div class="bv-grade-g" style="color:${GRADE_COLOR[sc.grade] || '#888'}">${sc.grade}</div></div>`).join('')}</div>`
        : ''
  // Post-match stats sheet from the possession-sim event log (blueprint §6.3).
  const sheet = (ovp?.__evLog?.length) ? statsFrom(ovp.__evLog) : null
  const nameOfIdx = idx => rep.matchStamina?.[idx]?.name || rep.scores?.[idx]?.name || `№${+idx + 1}`
  const sheetHtml = sheet ? `<div class="bv-sheet">
    <div class="bv-sheet-row"><span>Possession</span>
      <span class="bv-sheet-bar"><i style="width:${sheet.possessionPct}%"></i></span>
      <b>${sheet.possessionPct}%</b></div>
    <div class="bv-sheet-row"><span>Strikes (blocked)</span><b>${sheet.strikesHome} (${sheet.blocksHome}) — ${sheet.strikesAway} (${sheet.blocksAway})</b></div>
    <div class="bv-sheet-row"><span>Pass completion</span><b>${sheet.passPct}%</b></div>
    ${Object.entries(sheet.byHomeActor).map(([idx, r]) =>
      `<div class="bv-sheet-line">${nameOfIdx(idx)} — ${r.strikes ? `✦${r.strikes} ` : ''}${r.intercepts ? `⚡${r.intercepts} ` : ''}${r.passes ? `↦${r.passes}` : ''}</div>`).join('')}
  </div>` : ''
  // Player of the Match — top grade, tie-broken by sim contribution then stamina.
  const stamByName = {}
  if (ovp?.__cond) ovp.__cond.members.forEach((m, k) => { stamByName[m.name] = ovp.__cond.stamina[k] })
  const bonusByName = {}
  if (sheet) Object.entries(sheet.byHomeActor).forEach(([idx, r]) => { bonusByName[nameOfIdx(idx)] = r.strikes * 3 + r.intercepts * 2 })
  const motm = playerOfMatch(rep.scores || [], stamByName, bonusByName)
  const motmHtml = motm ? `<div class="bv-motm">⭐ Player of the Match — <b>${motm.name}</b><span>${motm.reason}</span></div>` : ''
  el.innerHTML = `
    <div class="bv-result ${cls}">${label}</div>
    <div class="bv-verdict">${verdict}</div>
    ${callNote}
    ${condNote}
    ${scrollNote}
    ${motmHtml}
    ${detail}
    ${sheetHtml}
    <button class="bv-close" onclick="closeBattleViewer()">Close</button>`
  el.classList.add('bv-on')
}

// ── Match replay archive ──────────────────────────────────────────────────────
// Stash a closure-free snapshot of each watched match so it can be re-watched
// later from the missions Log. Archived reps carry no applyCall/applyCondition/
// applyScroll, so replaying them animates without re-applying any effects.
function _archiveMatch(rep) {
  if (rep._fromArchive || rep._archived) return
  rep._archived = true
  const snap = {
    missionName: rep.missionName, missionRk: rep.missionRk, kind: rep.kind,
    phases: (rep.phases || []).map(p => ({ name: p.name, won: p.won })),
    scores: (rep.scores || []).map(s => ({ name: s.name, role: s.role, grade: s.grade, detail: s.detail })),
    matchStamina: (rep.matchStamina || []).map(m => ({ name: m.name, role: m.role, stamina: m.stamina })),
    quality: rep.quality, succeeded: rep.succeeded, verdict: rep.verdict, spec: rep.spec,
    scoreline: rep.scoreline, oppVillage: rep.oppVillage, arena: rep.arena,
    result: rep.result, champion: rep.champion, reachedStage: rep.reachedStage,
    year: G.year, month: G.month, _fromArchive: true,
  }
  G.matchArchive = [snap, ...(G.matchArchive || [])].slice(0, 8)
}

/** Re-watch an archived match (read-only — no effects re-applied). */
export function watchArchivedMatch(idx) {
  const snap = (G.matchArchive || [])[idx]
  if (snap) openBattleViewer({ ...snap })
}

/** Player's micro-call choice from the prompt (Commit / Disengage). */
export function chooseBattleCall(call) { _applyCall(call) }

/** Jump straight to the final state. A pending micro-call auto-disengages. */
export function skipBattleViewer() { _finishInstant('none') }

export function closeBattleViewer() {
  _clearTimers()
  const ov = document.getElementById('bv-overlay')
  if (ov) { if (ov.__pitch) ov.__pitch.destroy(); ov.remove() }
}

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeBattleViewer() }, true)
}
