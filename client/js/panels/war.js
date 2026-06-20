import { G, ui, sPow, sn, rnd, pk, clamp, fmt, addChronicle, addLegend } from '../state.js'
import { RANKS } from '../constants.js'
import { aL, ntf, upUI } from '../ui.js'
import { seedsFromTable } from '../../../shared/utils/season.js'
import { queuePressConference } from '../adv.js'

// ── Nation War ──────────────────────────────────────────────────────────────
// The annual "big leagues": a 5-village elite bracket where Jonin+ squads clash
// and shinobi DIE. Chunin Exam graduates feed up into this pool. Punishing — no
// one is safe — but tailed-beast hosts and bloodline clans survive more often.

export const WAR_STAGES = ['Mobilization', 'The Front', 'Decisive Engagement', 'Final Stand']
const WAR_MAX_SQUADS = 8  // up to 24 elite deployed
const ELITE_MIN_RI = 2    // Jonin and above

// Survival multiplier on KIA rolls: jinchuriki are hardest to kill, bloodline clans tougher.
function survivalMult(s) {
  const isJk = (G.beasts || []).some(b => b.sealed && b.jk === s.id)
  if (isJk) return 0.35
  if (s.clan) return 0.6
  return 1
}

function _squadPow(members, cohesion = 0) {
  if (!members.length) return 0
  const avg = members.reduce((a, s) => a + sPow(s), 0) / members.length
  return Math.round(avg * (1 + (cohesion || 0) / 300))
}

// Elite rival cells (Jonin+) drawn from a village roster.
function _rivalWarSquads(v) {
  const pool = (v.roster || []).filter(s => s.ri >= ELITE_MIN_RI).slice().sort(() => Math.random() - 0.5)
  const squads = []
  for (let i = 0; i + 3 <= pool.length && squads.length < 4; i += 3) {
    const members = pool.slice(i, i + 3)
    squads.push({ id: 'ws_' + v.n + '_' + squads.length, name: v.n.replace(/gakure$/, '') + ' Banner ' + (squads.length + 1), members })
  }
  return squads
}

function _buildWarField() {
  const seeds = G.season?.table ? seedsFromTable(G.season.table) : {}
  const nV = (G.villages?.length || 0) + 1
  const seedBonus = name => {
    const seed = seeds[name]
    if (!seed || nV < 2) return 0
    return Math.round((1 - (seed - 1) / (nV - 1)) * 10) / 100
  }
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
  if (!G.warCands.length) { ntf('Muster at least one elite squad!'); return }
  G.warActive = true
  ui.warSt = { round: 0 }
  ui.warField = _buildWarField()
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
    if (c.sqRef) { c.sqRef.fallen = c.sqRef.fallen || []; c.sqRef.fallen.push({ name: sn(s), mission: 'Nation War', year: G.year, month: G.month }) }
    G.memorial.push({ name: sn(s), rank: RANKS[s.ri], clan: s.clan, mission: 'Nation War — ' + stageName, year: G.year, month: G.month, wins: s.wins || 0, lastWords })
    if ((s.wins || 0) >= 30 || s.ri >= 3) { addChronicle('War Hero Fallen', `${sn(s)} (${RANKS[s.ri]}) was killed at ${stageName} in the Nation War. The village mourns.`, 'shinobi'); addLegend(8) }
    aL(`☠ ${sn(s)} KIA at ${stageName}.`, 'bad')
    G.shinobi = G.shinobi.filter(x => x.id !== s.id)
  } else if (c.vRef) {
    c.vRef.roster = (c.vRef.roster || []).filter(x => x.id !== s.id)
  }
}

// Roll casualties for a squad's members at a given KIA chance.
function _resolveCasualties(c, entry, kiaChance, stageName, res) {
  ;(c.members || []).slice().forEach(s => {
    const chance = clamp(kiaChance * survivalMult(s), 0.01, 0.9)
    if (Math.random() < chance) {
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
        const prob = clamp(0.5 + c.pow / 220 + (c.seedBonus || 0), 0.15, 0.95)
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
        const prob = clamp(0.45 + c.pow / 240, 0.1, 0.9)
        const held = Math.random() < prob
        if (held) { kept.push(c); if (c.isPlayer) res.push({ name: c.name, result: 'Held the line', good: true }) }
        else { entry.out.push(c); _resolveCasualties(c, entry, 0.22, stageName, res); if (c.isPlayer) res.push({ name: c.name, result: 'Routed at the front', good: false }) }
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
      const aWins = (A.c.pow + rnd(-10, 10)) >= (B.c.pow + rnd(-10, 10))
      const win = aWins ? A : B, lose = aWins ? B : A
      losers.add(lose.c)
      if (win.c.isPlayer) res.push({ name: win.c.name, result: `Broke ${lose.c.name} (${lose.entry.name})`, good: true })
      if (lose.c.isPlayer) res.push({ name: lose.c.name, result: `Overrun by ${win.c.name} (${win.entry.name})`, good: false })
      lo++; hi--
    }
    field.forEach(entry => {
      entry.alive.filter(c => losers.has(c)).forEach(c => { entry.out.push(c); _resolveCasualties(c, entry, 0.30, stageName, res) })
      entry.alive = entry.alive.filter(c => !losers.has(c))
    })
  } else {
    return _runWarFinal(field, res)
  }

  ui.warSt.round++
  upUI()
}

function _runWarFinal(field, res) {
  // Survivors of the final are war heroes.
  const playerEntry = field.find(e => e.isPlayer)
  ;(playerEntry?.alive || []).forEach(c => {
    (c.members || []).forEach(s => {
      if (!s) return
      s.warVeteran = (s.warVeteran || 0) + 1
      addLegend(3)
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
      aL('🏯 ' + G.vName + ' WINS the Nation War! The age belongs to us. +30 legend, +25 reputation.', 'good')
      addChronicle('Nation War Champion', `${G.vName} triumphed over the great powers to win the Year ${G.year} Nation War.`, 'legend')
      if (!G.pendingPress) queuePressConference('war_win')
    } else {
      G.morale = clamp((G.morale || 50) - 8, 0, 100)
      aL('🏯 ' + champ.name + ' wins the Nation War. ' + G.vName + ' counts its dead.', 'bad')
      addChronicle('Nation War', `${champ.name} won the Year ${G.year} Nation War.`, 'legend')
      if (!G.pendingPress) queuePressConference('war_loss')
    }
  }

  // Casualty tally + cleanup.
  const myFallen = playerEntry?.fallen?.length || 0
  if (myFallen > 0) aL(`The Nation War cost ${myFallen} of our shinobi their lives.`, 'bad')

  G.warCands.forEach(sqId => {
    const sq = G.squads.find(q => q.id === sqId); if (!sq) return
    sq.members.forEach(mid => { const s = G.shinobi.find(x => x.id === mid); if (s && s.status === 'war') s.status = (s.injDays || 0) > 0 ? 'injured' : 'available' })
  })

  G.warActive = false; G.warSched = false; G.warCands = []; G.warDoneYear = G.year
  ui.warField = null; ui.warSt = null

  G._warResult = { champ: champ ? { name: champ.name, ico: champ.ico, player: playerWon } : null, res, fallen: myFallen }
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
  const recap = last ? `<div style="border:1px solid ${last.champ?.player ? '#c9a84c' : '#5a2a2a'};background:#0d0606;padding:10px;margin-bottom:12px">
      <div style="font-size:11px;color:${last.champ?.player ? '#c9a84c' : '#e8a0a0'}">${last.champ ? `🏯 Last Nation War — Champion: ${last.champ.ico || ''} ${last.champ.name}${last.champ.player ? ' (you)' : ''}` : 'Nation War concluded.'}</div>
      ${last.fallen ? `<div style="font-size:8px;color:#f88;margin-top:4px">${last.fallen} of our shinobi fell.</div>` : ''}
    </div>` : ''

  if (!G.warSched) {
    return (el.innerHTML = tabHtml + recap +
      `<div style="border:1px solid #2e2a22;background:#0a0a0a;padding:12px">
        <div style="font-size:11px;color:#c9a84c;margin-bottom:6px">🏯 Nation War</div>
        <div style="font-size:9px;color:#7a7060;line-height:1.5">The Nation War is the annual clash of the great powers — fought by your <b>elite (Jonin and above)</b>, in squads, to the death. It is mustered each <b>Year-end (Month 12)</b>. Win the Chunin Exams to graduate prospects into your war pool; the standings seed the bracket.</div>
        <div style="font-size:8px;color:#5a5448;margin-top:8px">No war is mustering. The next Nation War mobilizes at Month 12.</div>
      </div>`)
  }

  const elite = _eliteSquads()
  return (el.innerHTML = tabHtml + recap +
    `<div style="border:1px solid #c9a84c;background:#0d0a04;padding:10px;margin-bottom:12px">
      <div style="font-size:11px;color:#c9a84c">🏯 The Nation War is mobilizing!</div>
      <div style="font-size:8px;color:#7a7060;margin-top:4px">Muster up to ${WAR_MAX_SQUADS} elite squads (Jonin+). Casualties are expected — jinchuriki and bloodline clans survive more often.</div>
    </div>` +
    '<div style="margin-bottom:12px">' +
    (elite.length ? elite.map(({ sq, members }) => {
      const ent = G.warCands.includes(sq.id)
      const protCount = members.filter(s => (G.beasts || []).some(b => b.sealed && b.jk === s.id) || s.clan).length
      return `<div class="pi" onclick="musterWar('${sq.id}')" style="${ent ? 'border-color:#c9a84c;background:rgba(201,168,76,0.08)' : ''}"><div><div style="font-size:10px;color:#e8e0cc">${sq.n}${sq.identity ? ` <span style="color:#c9a84c;font-size:8px">«${sq.identity.title}»</span>` : ''}</div><div style="font-size:8px;color:#7a7060">${members.length} elite · Pwr ${_squadPow(members, sq.cohesion)} · cohesion ${sq.cohesion ?? 0}${protCount ? ` · <span style="color:#8fbc8f">${protCount} protected</span>` : ''}</div><div style="font-size:7px;color:#5a5448">${members.map(s => sn(s) + ' (' + RANKS[s.ri][0] + ')').join(', ')}</div></div>${ent ? '<span style="color:#c9a84c">✓</span>' : ''}</div>`
    }).join('') : '<div style="color:#7a7060;font-size:9px">No eligible elite squads. Form a squad of all-Jonin+ shinobi (all available) in the Squads panel.</div>') +
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
    <div style="font-size:8px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Nation War — ${WAR_STAGES[r] || 'Final Stand'}</div>
    <div style="font-size:8px;color:#7a7060;margin-bottom:8px">${standing.length} villages in the field · ${totalAlive} squads standing · <span style="color:#f88">${totalFallen} fallen</span></div>
    <div style="display:grid;gap:8px;margin-bottom:10px">
      ${standing.map((e, i) => `<div style="border:1px solid ${e.isPlayer ? '#c9a84c' : '#2e2a22'};padding:7px;background:${e.isPlayer ? 'rgba(201,168,76,0.06)' : '#0a0a0a'}">
        <div style="font-size:9px;color:${e.isPlayer ? '#c9a84c' : '#9a9080'};margin-bottom:4px">${i === 0 ? '◆ ' : ''}${e.seed ? `<span style="color:#7a7060">#${e.seed}</span> ` : ''}${e.ico || '🏳'} ${e.name}${e.isPlayer ? ' (you)' : ''} <span style="color:#7a7060">— ${e.alive.length} squads${e.fallen?.length ? ` · <span style="color:#f88">${e.fallen.length} dead</span>` : ''}</span></div>
        ${e.alive.map(c => `<div style="font-size:8px;padding:2px 0;color:${c.isPlayer ? '#e8e0cc' : '#7a7060'}">${c.name} · ${(c.members || []).length}-ninja · Pwr ${c.pow}</div>`).join('')}
      </div>`).join('')}
    </div>
    <button class="gb" onclick="runWarRound()" style="background:#3a1a1a;border-color:#a05050">Run ${WAR_STAGES[r] || 'Final Stand'} ►</button>
  </div>`
}
