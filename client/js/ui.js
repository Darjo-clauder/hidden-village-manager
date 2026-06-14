import { G, WS, ui, fmt } from './state.js'
import { SEASONS } from './constants.js'
import { schEx } from './state.js'

// Panel renderers — circular dep with panels is safe (all uses are in function bodies)
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
import { rWo } from './world.js'

export { schEx }

export function upUI() {
  const season = SEASONS[G.month - 1]
  const trI = G.tradeRoutes.filter(r => r.active).reduce((a, r) => a + r.income, 0) + G.contracts.filter(c => c.active).reduce((a, c) => a + c.income, 0)
  const jkI = G.beasts.filter(b => b.sealed && b.n === 'Matatabi' && b.jk).length * 3000
  document.getElementById('tryo').textContent = fmt(G.ryo)
  document.getElementById('trep').textContent = G.reputation
  document.getElementById('tmiss').textContent = G.aM.length
  document.getElementById('tinc').textContent = '+' + fmt(trI + jkI) + '/mo'
  document.getElementById('tdate').textContent = 'Y' + G.year + ' M' + G.month + ' ' + season
  document.getElementById('sbdt').textContent = 'Y' + G.year + 'M' + G.month
  document.getElementById('sbryo').textContent = fmt(G.ryo)
  document.getElementById('sbrep').textContent = G.reputation
  document.getElementById('sbf').textContent = G.shinobi.length + '/' + G.shinobi.filter(s => s.status === 'available').length + 'av'
  rP(ui.CP)
}

export function sp(id) {
  document.querySelectorAll('[id^="p-"]').forEach(p => p.style.display = 'none')
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'))
  document.getElementById('p-' + id).style.display = ''
  const nb = document.getElementById('nv-' + id)
  if (nb) nb.classList.add('active')
  ui.CP = id
  rP(id)
}

export function rP(id) {
  const map = { roster: rRo, squads: rSq, missions: rMi, upgrades: rUp, academy: rAc, economy: rEc, village: rVi, beasts: rBe, kage: rKa, exam: rEx, intel: rIn, log: rLo, world: rWo }
  map[id]?.()
}

export function cm(id) { document.getElementById('ov-' + id).classList.remove('open') }

export function ntf(msg) {
  const n = document.getElementById('nf')
  n.textContent = msg; n.classList.add('show')
  setTimeout(() => n.classList.remove('show'), 2600)
}

export function aL(msg, t = 'neutral') {
  G.log.push({ y: G.year, m: G.month, msg, t })
  if (G.log.length > 150) G.log.shift()
}

export function setOnline(on) {
  document.getElementById('sb-dot').classList.toggle('on', on)
  document.getElementById('sb-online-txt').textContent = on
    ? 'Online — ' + WS.villages.length + ' village' + (WS.villages.length !== 1 ? 's' : '')
    : 'Offline'
}
