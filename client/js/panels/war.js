import { G, ui, sPow, sn, rnd, pk, clamp, fmt, addChronicle, addLegend } from '../state.js'
import { RANKS } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'
import { seedsFromTable } from '../../../shared/utils/season.js'
import { queuePressConference, maybeInduct } from '../adv.js'
import { t } from '../../../shared/utils/i18n.js'
import { kageMod, kagePerk } from '../../../shared/constants/kageDev.js'
import { identityFor, identityStageAdv } from '../../../shared/constants/villageIdentity.js'
import { openBattleViewer } from '../liveBattle.js'
import { arenaFor } from '../../../shared/constants/arenas.js'
import { squadPower, seedEdge, survivalMult as _survivalMult, warMobilizeProb, warFrontProb, warCasualtyChance, duelScore } from '../../../shared/utils/stageMath.js'

/** Replay the player's run through the last Grand Tournament as a live bracket. */
export function watchTournament() {
  const run = G._warRun
  if (!run || !run.stages || !run.stages.length) return
  const phases = run.stages.map(s => ({ name: s.name, won: s.advanced }))
  const lastAdvanced = [...run.stages].reverse().find(s => s.advanced)
  const reachedStage = run.champion ? WAR_STAGES[WAR_STAGES.length - 1] : (lastAdvanced ? lastAdvanced.name : run.stages[0].name)
  const kiaTotal = run.fallen || run.stages.reduce((a, s) => a + (s.kia || 0), 0)
  const verdict = run.champion ? 'Champions of the age — they conquered the great powers.'
    : `Eliminated at ${reachedStage}. The village counts its dead.`
  openBattleViewer({
    missionName: `Year ${run.year} Grand Tournament`, missionRk: 'Grand Tournament',
    kind: 'tournament', phases, champion: run.champion, reachedStage, kiaTotal, verdict,
    succeeded: run.champion,
    arena: arenaFor('tournament'),   // the Grand Colosseum
  })
}

// ── Grand Tournament ──────────────────────────────────────────────────────────────
// The annual "big leagues": a 5-village elite bracket where Veteran+ squads clash
// and shinobi DIE. Adept Exam graduates feed up into this pool. Punishing — no
// one is safe — but primal vessels and bloodline clans survive more often.

export const WAR_STAGES = ['Mobilization', 'The Front', 'Decisive Engagement', 'Final Stand']
const WAR_MAX_SQUADS = 8  // up to 24 elite deployed
const ELITE_MIN_RI = 2    // Veteran and above

// Per-stage command order the player issues before each war round — risk vs lives.
export const WAR_COMMANDS = [
  { id: 'press',    label: 'Press Attack',       icon: '⚔', adv: 0.10,  kiaMult: 1.3, desc: '+advance, but heavier casualties when a squad falls.' },
  { id: 'hold',     label: 'Hold Formation',     icon: '⚖', adv: 0,     kiaMult: 1.0, desc: 'Balanced command.' },
  { id: 'withdraw', label: 'Tactical Withdrawal', icon: '🛡', adv: -0.07, kiaMult: 0.55, desc: '−advance, but far fewer deaths — preserve your elite.' },
]
function _command() { return WAR_COMMANDS.find(c => c.id === (ui.warSt?.command || 'hold')) || WAR_COMMANDS[1] }
// Player squads follow command orders; rival banners fight to their village identity
// (blitz mobilizes fast then fades, fortress holds the front, opportunist peaks late).
function _cmdAdv(c, kind = 'early') {
  if (c.isPlayer) return _command().adv + kageMod(G, 'tactics')
  return identityStageAdv(identityFor(c.vRef?.n || '').style, kind)
}
function _cmdKia(c, base) {
  if (!c.isPlayer) return base
  const perkMult = kagePerk(G) === 'war_casualties' ? 0.75 : 1   // Warlord signature
  return base * _command().kiaMult * perkMult
}
export function setWarCommand(id) { if (ui.warSt) { ui.warSt.command = id; upUI() } }

// Survival multiplier on KIA rolls: vessel are hardest to kill, bloodline clans tougher.
function survivalMult(s) {
  const isJk = (G.beasts || []).some(b => b.sealed && b.jk === s.id)
  return _survivalMult({ isVessel: isJk, hasClan: !!s.clan })
}

function _squadPow(members, cohesion = 0) {
  return squadPower(members.map(s => sPow(s)), cohesion)
}

// Elite rival cells (Veteran+) drawn from a village roster.
function _rivalWarSquads(v) {
  const pool = (v.roster || []).filter(s => s.ri >= ELITE_MIN_RI).slice().sort(() => Math.random() - 0.5)
  const squads = []
  for (let i = 0; i + 3 <= pool.length && squads.length < 4; i += 3) {
    const members = pool.slice(i, i + 3)
    squads.push({ id: 'ws_' + v.n + '_' + squads.length, name: v.n + ' Banner ' + (squads.length + 1), members })
  }
  return squads
}

function _buildWarField() {
  const seeds = G.season?.table ? seedsFromTable(G.season.table) : {}
  const nV = (G.villages?.length || 0) + 1
  const seedBonus = name => seedEdge(seeds[name], nV)
  const playerEntry = {
    vid: 'player', name: G.vName, ico: G.vIcon, isPlayer: true, seed: seeds[G.vName] || null, fallen: [],
    alive: G.warCands.map(sqId => {
      const sq = G.squads.find(q => q.id === sqId); if (!sq) return null
      const members = (sq.members || []).map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
      if (!members.length) return null
      const _warPrepBonus = ((G.budgetPriority?.warPrep || 33) - 33) / 100 * 0.4  // ±26% pow shift
      return { id: sqId, name: sq.n, sqRef: sq, members, pow: Math.round(_squadPow(members, sq.cohesion) * (1 + _warPrepBonus)), isPlayer: true, seedBonus: seedBonus(G.vName) }
    }).filter(Boolean),
    out: [],
  }
  const rivalEntries = (G.villages || []).map(v => ({
    vid: v.n, name: v.n, ico: v.ico, isPlayer: false, seed: seeds[v.n] || null, fallen: [],
    alive: _rivalWarSquads(v).map(sq => ({ id: sq.id, name: sq.name, members: sq.members, vRef: v, pow: _squadPow(sq.members, rnd(0, 25)), isPlayer: false, seedBonus: seedBonus(v.n) })),
    out: [],
  }))
  return [playerEntry, ...rivalEntries]
}

export function musterWar(id) {
  if (G.warActive) return
  if (G.warCands.includes(id)) G.warCands = G.warCands.filter(x => x !== id)
  else if (G.warCands.length < WAR_MAX_SQUADS) G.warCands.push(id)
  upUI()
}

export function startWar() {
  if (!G.warCands.length) { ntf(t('toast.war.muster')); return }
  G.warActive = true
  ui.warSt = { round: 0 }
  ui.warField = _buildWarField()
  G._warRun = { year: G.year, stages: [], champion: false }   // live-viewer recap bookkeeping
  G.warCands.forEach(sqId => {
    const sq = G.squads.find(q => q.id === sqId); if (!sq) return
    sq.members.forEach(mid => { const s = G.shinobi.find(x => x.id === mid); if (s) s.status = 'war' })
  })
  upUI()
}

// Kill a member: full handling for player shinobi, roster removal for rivals.
function _killMember(s, entry, c, stageName) {
  if (entry.isPlayer) {
    const lastWords = `Fell at ${stageName}.`
    entry.fallen.push({ name: sn(s), rank: RANKS[s.ri], year: G.year })
    if (c.sqRef) { c.sqRef.fallen = c.sqRef.fallen || []; c.sqRef.fallen.push({ name: sn(s), mission: 'Grand Tournament', year: G.year, month: G.month }) }
    G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: 'Grand Tournament — ' + stageName, year: G.year, month: G.month, wins: s.wins || 0, lastWords })
    if ((s.wins || 0) >= 30 || s.ri >= 3) { addChronicle('War Hero Fallen', `${sn(s)} (${RANKS[s.ri]}) was killed at ${stageName} in the Grand Tournament. The village mourns.`, 'shinobi'); addLegend(8) }
    aL(t('toast.war.kia', { name: sn(s), stage: stageName }), 'bad')
    G.shinobi = G.shinobi.filter(x => x.id !== s.id)
  } else if (c.vRef) {
    c.vRef.roster = (c.vRef.roster || []).filter(x => x.id !== s.id)
  }
}

// Roll casualties for a squad's members at a given KIA chance.
function _resolveCasualties(c, entry, kiaChance, stageName, res) {
  ;(c.members || []).slice().forEach(s => {
    const chance = warCasualtyChance(kiaChance, survivalMult(s))
    if (Math.random() < chance) {
      if (entry.isPlayer) maybeInduct(s, 'fallen')   // a legend who falls in the tournament is remembered
      _killMember(s, entry, c, stageName)
      if (entry.isPlayer) res.push({ name: sn(s), result: `KIA at ${stageName}`, good: false, kia: true })
    }
  })
}

export function runWarRound() {
  if (!G.warActive || !ui.warField) return
  const r = ui.warSt.round
  const field = ui.warField
  const res = []
  const stageName = WAR_STAGES[r]

  if (r === 0) {
    // Mobilization — readiness attrition; no deaths yet.
    field.forEach(entry => {
      const kept = []
      entry.alive.forEach(c => {
        const prob = warMobilizeProb({ pow: c.pow, seedBonus: c.seedBonus || 0, cmdAdv: _cmdAdv(c, 'early') })
        const ready = Math.random() < prob
        if (ready) kept.push(c); else entry.out.push(c)
        if (c.isPlayer) res.push({ name: c.name, result: ready ? 'Mobilized for the front' : 'Failed to mobilize in time', good: ready })
      })
      entry.alive = kept
    })
  } else if (r === 1) {
    // The Front — pitched battle; eliminated squads take casualties.
    field.forEach(entry => {
      const kept = []
      entry.alive.forEach(c => {
        const prob = warFrontProb({ pow: c.pow, cmdAdv: _cmdAdv(c, 'endurance') })
        const held = Math.random() < prob
        if (held) { kept.push(c); if (c.isPlayer) res.push({ name: c.name, result: 'Held the line', good: true }) }
        else { entry.out.push(c); _resolveCasualties(c, entry, _cmdKia(c, 0.22), stageName, res); if (c.isPlayer) res.push({ name: c.name, result: 'Routed at the front', good: false }) }
      })
      entry.alive = kept
    })
  } else if (r === 2) {
    // Decisive Engagement — seeded squad duels; losers face heavy casualties.
    const pool = []
    field.forEach(entry => entry.alive.forEach(c => pool.push({ c, entry })))
    pool.sort((a, b) => b.c.pow - a.c.pow)
    pool.forEach((p, i) => { p.seed = i + 1 })
    const losers = new Set()
    let lo = 0, hi = pool.length - 1
    while (lo < hi) {
      const A = pool[lo], B = pool[hi]
      const aWins = duelScore({ pow: A.c.pow, jitter: rnd(-10, 10), cmdAdv: _cmdAdv(A.c, 'late') }) >= duelScore({ pow: B.c.pow, jitter: rnd(-10, 10), cmdAdv: _cmdAdv(B.c, 'late') })
      const win = aWins ? A : B, lose = aWins ? B : A
      losers.add(lose.c)
      if (win.c.isPlayer) res.push({ name: win.c.name, result: `Broke ${lose.c.name} (${lose.entry.name})`, good: true })
      if (lose.c.isPlayer) res.push({ name: lose.c.name, result: `Overrun by ${win.c.name} (${win.entry.name})`, good: false })
      lo++; hi--
    }
    field.forEach(entry => {
      entry.alive.filter(c => losers.has(c)).forEach(c => { entry.out.push(c); _resolveCasualties(c, entry, _cmdKia(c, 0.30), stageName, res) })
      entry.alive = entry.alive.filter(c => !losers.has(c))
    })
  } else {
    return _runWarFinal(field, res)
  }

  _recordWarStage(field, stageName, res)
  ui.warSt.round++
  upUI()
}

// Record the player's advancement through one tournament stage for the recap viewer.
// Only records stages the player actually contested (stops at first elimination).
function _recordWarStage(field, stageName, res) {
  if (!G._warRun) return
  const stages = G._warRun.stages
  const entered = stages.length === 0 || stages[stages.length - 1].advanced
  if (!entered) return
  const pe = field.find(e => e.isPlayer)
  stages.push({ name: stageName, advanced: !!pe && pe.alive.length > 0, kia: res.filter(x => x.kia).length })
}

function _runWarFinal(field, res) {
  // Survivors of the final are war heroes.
  const playerEntry = field.find(e => e.isPlayer)
  ;(playerEntry?.alive || []).forEach(c => {
    (c.members || []).forEach(s => {
      if (!s) return
      s.warVeteran = (s.warVeteran || 0) + 1
      addLegend(3)
      G._kageXpPending = (G._kageXpPending || 0) + 10
      res.push({ name: sn(s), result: 'Survived the Final Stand — war hero', good: true })
    })
  })

  // Champion = most surviving squads, tiebreak combined power.
  const finalists = field.filter(e => e.alive.length > 0)
    .map(e => ({ e, count: e.alive.length, pow: e.alive.reduce((a, c) => a + c.pow, 0) }))
    .sort((a, b) => b.count - a.count || b.pow - a.pow)
  const champ = finalists[0]?.e
  const playerWon = !!champ?.isPlayer

  if (champ) {
    G.warChampion = { year: G.year, village: champ.name, ico: champ.ico, player: playerWon }
    G.warHistory = G.warHistory || []
    G.warHistory.push({ year: G.year, champion: champ.name, player: playerWon })
    if (playerWon) {
      addLegend(30); G.reputation = clamp((G.reputation || 0) + 25, 0, 999); G.morale = clamp((G.morale || 50) + 10, 0, 100)
      aL(t('toast.war.won', { village: G.vName }), 'good')
      addChronicle('Grand Tournament Champion', `${G.vName} triumphed over the great powers to win the Year ${G.year} Grand Tournament.`, 'legend')
      if (!G.pendingPress) queuePressConference('war_win')
    } else {
      G.morale = clamp((G.morale || 50) - 8, 0, 100)
      aL(t('toast.war.lost', { champ: champ.name, village: G.vName }), 'bad')
      addChronicle('Grand Tournament', `${champ.name} won the Year ${G.year} Grand Tournament.`, 'legend')
      if (!G.pendingPress) queuePressConference('war_loss')
    }
  }

  // Casualty tally + cleanup.
  const myFallen = playerEntry?.fallen?.length || 0
  if (myFallen > 0) aL(t('toast.war.cost', { n: myFallen }), 'bad')

  G.warCands.forEach(sqId => {
    const sq = G.squads.find(q => q.id === sqId); if (!sq) return
    sq.members.forEach(mid => { const s = G.shinobi.find(x => x.id === mid); if (s && s.status === 'war') s.status = (s.injDays || 0) > 0 ? 'injured' : 'available' })
  })

  G.warActive = false; G.warSched = false; G.warCands = []; G.warDoneYear = G.year
  ui.warField = null; ui.warSt = null

  G._warResult = { champ: champ ? { name: champ.name, ico: champ.ico, player: playerWon } : null, res, fallen: myFallen }
  if (G._warRun) {
    const stages = G._warRun.stages
    const entered = stages.length === 0 || stages[stages.length - 1].advanced
    if (entered) stages.push({ name: WAR_STAGES[3], advanced: (playerEntry?.alive?.length || 0) > 0, kia: res.filter(x => x.kia).length })
    G._warRun.champion = playerWon
    G._warRun.fallen = myFallen
  }
  upUI()
}

// ── Render ──────────────────────────────────────────────────────────────────
export function renderWar(el, tabHtml) {
  if (G.warActive && ui.warField) return _renderActiveWar(el, tabHtml)
  return _renderWarMuster(el, tabHtml)
}

function _eliteSquads() {
  return (G.squads || []).map(sq => {
    const members = (sq.members || []).map(id => G.shinobi.find(s => s.id === id)).filter(Boolean)
    return { sq, members }
  }).filter(o => o.members.length && o.members.every(s => s.status === 'available' && s.ri >= ELITE_MIN_RI))
}

function _renderWarMuster(el, tabHtml) {
  const last = G._warResult
  const canWatch = !!(G._warRun && G._warRun.stages && G._warRun.stages.length)
  const recap = last ? `<div style="border:1px solid ${last.champ?.player ? '#c9a84c' : '#5a2a2a'};background:#0d0606;padding:10px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="font-size:11px;color:${last.champ?.player ? '#c9a84c' : '#e8a0a0'}">${last.champ ? `🏯 Last Grand Tournament — Champion: ${last.champ.ico || ''} ${last.champ.name}${last.champ.player ? ' (you)' : ''}` : 'Grand Tournament concluded.'}</div>
        ${canWatch ? `<button class="gb" style="font-size:7px;padding:2px 8px;border-color:#c9a84c;color:#c9a84c;white-space:nowrap" onclick="watchTournament()">▶ Watch your run</button>` : ''}
      </div>
      ${last.fallen ? `<div style="font-size:8px;color:#f88;margin-top:4px">${last.fallen} of our shinobi fell.</div>` : ''}
    </div>` : ''

  if (!G.warSched) {
    return (el.innerHTML = tabHtml + recap +
      `<div style="border:1px solid #2e2a22;background:#0a0a0a;padding:12px">
        <div style="font-size:11px;color:#c9a84c;margin-bottom:6px">🏯 Grand Tournament</div>
        <div style="font-size:9px;color:#7a7060;line-height:1.5">The Grand Tournament is the annual clash of the great powers — fought by your <b>elite (Veteran and above)</b>, in squads, to the death. It is mustered each <b>Year-end (Month 12)</b>. Win the Adept Exams to graduate prospects into your tournament pool; the standings seed the bracket.</div>
        <div style="font-size:8px;color:#5a5448;margin-top:8px">No tournament is mustering. The next Grand Tournament mobilizes at Month 12.</div>
      </div>`)
  }

  const elite = _eliteSquads()
  return (el.innerHTML = tabHtml + recap +
    `<div style="border:1px solid #c9a84c;background:#0d0a04;padding:10px;margin-bottom:12px">
      <div style="font-size:11px;color:#c9a84c">🏯 The Grand Tournament is mobilizing!</div>
      <div style="font-size:8px;color:#7a7060;margin-top:4px">Muster up to ${WAR_MAX_SQUADS} elite squads (Veteran+). Casualties are expected — vessel and bloodline clans survive more often.</div>
    </div>` +
    '<div style="margin-bottom:12px">' +
    (elite.length ? elite.map(({ sq, members }) => {
      const ent = G.warCands.includes(sq.id)
      const protCount = members.filter(s => (G.beasts || []).some(b => b.sealed && b.jk === s.id) || s.clan).length
      return `<div class="pi" onclick="musterWar('${sq.id}')" style="${ent ? 'border-color:#c9a84c;background:rgba(201,168,76,0.08)' : ''}"><div><div style="font-size:10px;color:#e8e0cc">${sq.n}${sq.identity ? ` <span style="color:#c9a84c;font-size:8px">«${sq.identity.title}»</span>` : ''}</div><div style="font-size:8px;color:#7a7060">${members.length} elite · Pwr ${_squadPow(members, sq.cohesion)} · cohesion ${sq.cohesion ?? 0}${protCount ? ` · <span style="color:#8fbc8f">${protCount} protected</span>` : ''}</div><div style="font-size:7px;color:#5a5448">${members.map(s => sn(s) + ' (' + RANKS[s.ri][0] + ')').join(', ')}</div></div>${ent ? '<span style="color:#c9a84c">✓</span>' : ''}</div>`
    }).join('') : '<div style="color:#7a7060;font-size:9px">No eligible elite squads. Form a squad of all-Veteran+ shinobi (all available) in the Squads panel.</div>') +
    '</div>' +
    (G.warCands.length ? '<button class="gb" onclick="startWar()">Commit to War ►</button>' : ''))
}

function _renderActiveWar(el, tabHtml) {
  const r = ui.warSt.round
  const field = ui.warField
  const standing = field.filter(e => e.alive.length > 0)
    .sort((a, b) => b.alive.length - a.alive.length || b.alive.reduce((x, c) => x + c.pow, 0) - a.alive.reduce((x, c) => x + c.pow, 0))
  const totalAlive = field.reduce((a, e) => a + e.alive.length, 0)
  const totalFallen = field.reduce((a, e) => a + (e.fallen?.length || 0), 0)
  el.innerHTML = tabHtml + `<div style="background:#0d0808;border:1px solid #c9a84c;padding:14px">
    <div style="font-size:8px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Grand Tournament — ${WAR_STAGES[r] || 'Final Stand'}</div>
    <div style="font-size:8px;color:#7a7060;margin-bottom:8px">${standing.length} villages in the field · ${totalAlive} squads standing · <span style="color:#f88">${totalFallen} fallen</span></div>
    <div style="display:grid;gap:8px;margin-bottom:10px">
      ${standing.map((e, i) => `<div style="border:1px solid ${e.isPlayer ? '#c9a84c' : '#2e2a22'};padding:7px;background:${e.isPlayer ? 'rgba(201,168,76,0.06)' : '#0a0a0a'}">
        <div style="font-size:9px;color:${e.isPlayer ? '#c9a84c' : '#9a9080'};margin-bottom:4px">${i === 0 ? '◆ ' : ''}${e.seed ? `<span style="color:#7a7060">#${e.seed}</span> ` : ''}${e.ico || '🏳'} ${e.name}${e.isPlayer ? ' (you)' : ''} <span style="color:#7a7060">— ${e.alive.length} squads${e.fallen?.length ? ` · <span style="color:#f88">${e.fallen.length} dead</span>` : ''}</span></div>
        ${e.alive.map(c => `<div style="font-size:8px;padding:2px 0;color:${c.isPlayer ? '#e8e0cc' : '#7a7060'}">${c.name} · ${(c.members || []).length}-ninja · Pwr ${c.pow}</div>`).join('')}
      </div>`).join('')}
    </div>
    <div style="margin-bottom:10px">
      <div style="font-size:7px;letter-spacing:2px;color:#7a7060;text-transform:uppercase;margin-bottom:4px">Command Order — your squads only</div>
      <div style="display:flex;gap:5px">
        ${WAR_COMMANDS.map(cmd => {
          const sel = (ui.warSt.command || 'hold') === cmd.id
          return `<div onclick="setWarCommand('${cmd.id}')" title="${cmd.desc}" style="flex:1;text-align:center;padding:5px 4px;cursor:pointer;border:1px solid ${sel ? '#c9a84c' : '#2e2a22'};background:${sel ? 'rgba(201,168,76,.10)' : 'transparent'}">
            <div style="font-size:12px">${cmd.icon}</div>
            <div style="font-size:8px;color:${sel ? '#c9a84c' : '#9a9080'};font-weight:${sel ? 'bold' : 'normal'}">${cmd.label}</div>
            <div style="font-size:6px;color:#555;margin-top:1px">${cmd.adv > 0 ? '+' : ''}${Math.round(cmd.adv * 100)}% · ${cmd.kiaMult < 1 ? '−' : cmd.kiaMult > 1 ? '+' : ''}${Math.abs(Math.round((cmd.kiaMult - 1) * 100))}% KIA</div>
          </div>`
        }).join('')}
      </div>
    </div>
    <button class="gb" onclick="runWarRound()" style="background:#3a1a1a;border-color:#a05050">Run ${WAR_STAGES[r] || 'Final Stand'} ►</button>
  </div>`
}
