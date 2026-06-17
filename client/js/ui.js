import { G, WS, ui, fmt } from './state.js'
import { SEASONS, MONTHS } from './constants.js'
import { schEx } from './state.js'

// Panel renderers
import { rRo } from './panels/roster.js'
import { rSq } from './panels/squads.js'
import { rMi } from './panels/missions.js'
import { rUp } from './panels/upgrades.js'
import { rAc } from './panels/academy.js'
import { rEc } from './panels/economy.js'
import { rVi } from './panels/village.js'
import { rBe } from './panels/beasts.js'
import { rKa } from './panels/kage.js'
import { rEx } from './panels/exam.js'
import { rIn } from './panels/intel.js'
import { rLo } from './panels/log.js'
import { rCh } from './panels/chronicles.js'
import { rMem } from './panels/memorial.js'
import { rFi } from './panels/finances.js'
import { rSt } from './panels/staff.js'
import { rSco } from './panels/scouting.js'
import { rYA } from './panels/youthacademy.js'
import { rMeet } from './panels/meetings.js'
import { rTr } from './panels/transfers.js'
import { rLeg } from './panels/legacy.js'
import { rLob } from './panels/lobby.js'
import { rDash } from './panels/dashboard.js'
import { rInbox, getInboxCount } from './panels/inbox.js'
import { rDep } from './panels/depthchart.js'
import { rWo } from './world.js'
import { rClans } from './panels/clans.js'
import { rSafehouses } from './panels/safehouses.js'

export { schEx }

export function upUI() {
  const season  = SEASONS[G.month - 1]
  const trI     = G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0)
                + G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0)
  const jkI     = G.beasts.filter(b => b.sealed && b.n === 'Matatabi' && b.jk).length * 3000
  const monthlyNet = trI + jkI - (G.staff || []).reduce((a, s) => a + (s.salary || 0), 0)

  const monthName = MONTHS[G.month - 1]?.n || season
  const morale    = G.morale ?? 75

  // ── Top bar stats ──────────────────────────────────────────────────────
  _set('tryo',    fmt(G.ryo))
  _set('trep',    G.reputation)
  _set('tmiss',   G.aM.length)
  _set('tinc',    (monthlyNet >= 0 ? '+' : '') + fmt(monthlyNet) + '/mo')
  _set('tdate',   'Y' + G.year + ' · ' + monthName)
  const legEl = document.getElementById('tlegend')
  if (legEl) {
    const leg   = G.legend || 0
    const title = leg >= 500 ? 'Legendary' : leg >= 250 ? 'War-Renowned' : leg >= 100 ? 'Rising' : ''
    legEl.textContent = leg + (title ? ' — ' + title : '')
  }

  // ── Top bar village identity ───────────────────────────────────────────
  _set('tb-vname',   G.vName || 'Your Village')
  _set('tb-kname',   G.kName || 'Kage')
  _set('tb-icon',    G.vIcon || '🍃')
  _set('tb-prestige', G.prestigeTier || 'D')

  // ── Top bar morale bar ─────────────────────────────────────────────────
  const moraleBar = document.getElementById('tb-morale-fill')
  const moraleVal = document.getElementById('tb-morale-val')
  if (moraleBar) {
    moraleBar.style.width = morale + '%'
    moraleBar.className   = 'tb-morale-fill' + (morale < 40 ? ' low' : morale < 60 ? ' warn' : '')
  }
  if (moraleVal) moraleVal.textContent = morale

  // ── Sidebar stats ──────────────────────────────────────────────────────
  _set('sbdt',  'Y' + G.year + 'M' + G.month)
  _set('sbryo', fmt(G.ryo))
  _set('sbrep', G.reputation)
  _set('sbf',   G.shinobi.length + '/' + G.shinobi.filter(s => s.status === 'available').length + 'av')
  _set('sb-vname', G.vName || 'Your Village')
  _set('sb-icon',  G.vIcon || '🍃')

  // ── People badge ───────────────────────────────────────────────────────
  const meetBadge = document.getElementById('meet-badge')
  if (meetBadge) meetBadge.style.display = (G.meetingQueue?.length > 0) ? '' : 'none'

  // ── Inbox badge ────────────────────────────────────────────────────────
  const inboxBadge = document.getElementById('inbox-badge')
  if (inboxBadge) {
    const count = getInboxCount()
    inboxBadge.textContent = count
    inboxBadge.style.display = count > 0 ? '' : 'none'
  }

  rP(ui.CP)
}

function _set(id, val) {
  const el = document.getElementById(id)
  if (el) el.textContent = val
}

export function sp(id) {
  document.querySelectorAll('[id^="p-"]').forEach(p => p.style.display = 'none')
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'))
  const panel = document.getElementById('p-' + id)
  if (!panel) return
  panel.style.display = ''
  const nb = document.getElementById('nv-' + id)
  if (nb) nb.classList.add('active')
  // Also activate the world nav button alias
  if (id === 'world') {
    const alt = document.getElementById('nv-world-mp')
    if (alt) alt.classList.add('active')
  }
  ui.CP = id
  rP(id)
}

export function rP(id) {
  const map = {
    dashboard: rDash, inbox: rInbox, depth: rDep,
    roster: rRo, squads: rSq, missions: rMi, upgrades: rUp,
    academy: rAc, economy: rEc, village: rVi, beasts: rBe,
    kage: rKa, exam: rEx, intel: rIn, log: rLo,
    chronicles: rCh, memorial: rMem, finances: rFi, staff: rSt,
    scouting: rSco, youthacademy: rYA, meetings: rMeet,
    transfers: rTr, legacy: rLeg, lobby: rLob, world: rWo, clans: rClans, safehouses: rSafehouses,
  }
  map[id]?.()
}

export function cm(id) {
  const ov = document.getElementById('ov-' + id)
  if (ov) ov.classList.remove('open')
}

export function ntf(msg) {
  const n = document.getElementById('nf')
  if (!n) return
  n.textContent = msg
  n.classList.add('show')
  setTimeout(() => n.classList.remove('show'), 2800)
}

export function aL(msg, t = 'neutral') {
  G.log.push({ y: G.year, m: G.month, msg, t })
  if (G.log.length > 150) G.log.shift()
}

export function setOnline(on) {
  const dot = document.getElementById('sb-dot')
  const txt = document.getElementById('sb-online-txt')
  if (dot) dot.classList.toggle('on', on)
  if (txt) txt.textContent = on
    ? 'Online — ' + WS.villages.length + ' village' + (WS.villages.length !== 1 ? 's' : '')
    : 'Offline'
}
