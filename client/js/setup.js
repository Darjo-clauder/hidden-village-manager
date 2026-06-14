import { spIcon, setSpIcon } from './state.js'
import { VILLAGE_ICONS } from './constants.js'
import { initState, schEx } from './state.js'
import { upUI, sp, aL } from './ui.js'
import { initSocket } from './socket.js'

export function showSetup() {
  document.getElementById('st').classList.remove('active')
  document.getElementById('sp').classList.add('active')
  document.getElementById('sp-icons').innerHTML = VILLAGE_ICONS.map(ic =>
    `<button class="sp-ico${ic === spIcon ? ' sel' : ''}" onclick="selIcon('${ic}',this)">${ic}</button>`
  ).join('')
}

export function selIcon(ic, el) {
  setSpIcon(ic)
  document.querySelectorAll('.sp-ico').forEach(b => b.classList.remove('sel'))
  el.classList.add('sel')
}

export function beginGame() {
  const vname = document.getElementById('sp-vname').value.trim() || 'Hidden Village'
  const kname = document.getElementById('sp-kname').value.trim() || 'Kage'
  document.getElementById('sb-icon').textContent = spIcon
  document.getElementById('sb-vname').textContent = vname
  initState()
  schEx()
  aL('Your tenure as Kage begins.', 'neutral')
  sp('roster')
  upUI()
  initSocket(vname, kname, spIcon)
  document.getElementById('sp').classList.remove('active')
  document.getElementById('sg').classList.add('active')
}
