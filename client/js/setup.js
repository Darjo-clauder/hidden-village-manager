import { G, spIcon, setSpIcon, initState, schEx, applyScenario } from './state.js'
import { VILLAGE_ICONS, START_SCENARIOS } from './constants.js'
import { upUI, sp, aL } from './ui.js'
import { initSocket, socket } from './socket.js'
import { RS, parseInviteCode } from './room.js'
import { seedPhase1 } from '../../seeds/phase1.js'

export function showLobby() {
  document.getElementById('st').classList.remove('active')
  document.getElementById('sl').classList.add('active')
  // Pre-fill join code from URL invite link
  const code = parseInviteCode()
  const joinInput = document.getElementById('sl-join-code')
  if (joinInput && code) joinInput.value = code
  // Refresh browser list
  if (socket?.connected) socket.emit('list_rooms')
}

export function showSetup() {
  document.getElementById('st').classList.remove('active')
  document.getElementById('sp').classList.add('active')

  document.getElementById('sp-icons').innerHTML = VILLAGE_ICONS.map(ic =>
    `<button class="sp-ico${ic === spIcon ? ' sel' : ''}" onclick="selIcon('${ic}',this)">${ic}</button>`
  ).join('')

  _renderScenarioPicker()

  // Show a "Continue" banner if a previous session exists in localStorage
  const prev = document.getElementById('sp-continue-banner')
  if (prev) prev.remove()
  const savedName = localStorage.getItem('vName')
  const savedIcon = localStorage.getItem('vIcon') || '🍃'
  if (savedName && localStorage.getItem('villageId')) {
    const banner = document.createElement('div')
    banner.id = 'sp-continue-banner'
    banner.style.cssText = 'padding:10px 12px;border:1px solid #c9a84c;background:#0d0a04;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;gap:10px'
    banner.innerHTML = `
      <div>
        <div style="font-size:9px;color:#c9a84c;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Saved Session Found</div>
        <div style="font-size:11px;color:#e8e0cc">${savedIcon} ${savedName}</div>
      </div>
      <button class="gb" onclick="restoreGame()" style="font-size:9px;white-space:nowrap">Continue ▸</button>
    `
    document.getElementById('sp').insertBefore(banner, document.getElementById('sp').firstChild)
  }
}

export function selIcon(ic, el) {
  setSpIcon(ic)
  document.querySelectorAll('.sp-ico').forEach(b => b.classList.remove('sel'))
  el.classList.add('sel')
}

// ── Start scenario picker ─────────────────────────────────────────────────────
let _selScenario = 'standard'

function _renderScenarioPicker() {
  const host = document.getElementById('sp-scenarios')
  if (!host) return
  host.innerHTML = START_SCENARIOS.map(s => `
    <button class="sp-scn${s.id === _selScenario ? ' sel' : ''}" onclick="selScenario('${s.id}',this)"
      style="display:block;width:100%;text-align:left;padding:8px 10px;margin-bottom:5px;cursor:pointer;
             border:1px solid ${s.id === _selScenario ? '#c9a84c' : '#2e2a22'};
             background:${s.id === _selScenario ? 'rgba(201,168,76,.08)' : 'transparent'};color:#e8e0cc">
      <div style="font-size:10px;font-weight:600;color:${s.id === _selScenario ? '#c9a84c' : '#e8e0cc'}">${s.icon} ${s.n}</div>
      <div style="font-size:8px;color:#7a7060;margin-top:2px;line-height:1.4">${s.desc}</div>
    </button>`).join('')
}

export function selScenario(id, el) {
  _selScenario = id
  _renderScenarioPicker()
}

export function beginGame() {
  const vname = document.getElementById('sp-vname').value.trim() || 'Hidden Village'
  const kname = document.getElementById('sp-kname').value.trim() || 'Kage'
  _startGame(vname, kname, spIcon, _selScenario)
}

/**
 * Re-enter a saved session without going through the setup form.
 * G state arrives via socket 'load_state' event after the server responds.
 */
export function restoreGame() {
  const vname = localStorage.getItem('vName') || 'Hidden Village'
  const kname = localStorage.getItem('kName') || 'Kage'
  const icon  = localStorage.getItem('vIcon') || '🍃'
  _startGame(vname, kname, icon)
}

function _startGame(vname, kname, icon, scenario = 'standard') {
  document.getElementById('sb-icon').textContent  = icon
  document.getElementById('sb-vname').textContent = vname
  initState()
  G.vName = vname
  G.kName = kname
  G.vIcon = icon
  seedPhase1(G)
  applyScenario(G, scenario)
  schEx()
  aL('Your tenure as Kage begins.', 'neutral')
  sp('dashboard')
  upUI()
  initSocket(vname, kname, icon)
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.getElementById('sg').classList.add('active')
}

// ── Lobby screen flows ────────────────────────────────────────────────────────

/** From the lobby screen: create a new room. Opens setup form if no saved village. */
export function createRoomFlow() {
  const vname = localStorage.getItem('vName')
  const isPrivate  = document.getElementById('sl-create-private')?.checked ?? true
  const maxPlayers = Number(document.getElementById('sl-create-max')?.value) || 4
  const timeout    = Number(document.getElementById('sl-create-timeout')?.value) || 15

  RS.mode                    = 'create'
  RS.pendingIsPrivate        = isPrivate
  RS.pendingMaxPlayers       = maxPlayers
  RS.pendingAutoReadyTimeout = timeout

  if (vname && localStorage.getItem('villageId')) {
    restoreGame()
  } else {
    document.getElementById('sl').classList.remove('active')
    document.getElementById('sp').classList.add('active')
  }
}

/** From the lobby screen: join a room by code. */
export function joinRoomFlow() {
  const code = (document.getElementById('sl-join-code')?.value || '').trim().toUpperCase()
  if (!code || code.length !== 6) {
    const errEl = document.getElementById('lob-join-error')
    if (errEl) errEl.textContent = 'Enter a 6-character room code.'
    return
  }

  RS.mode        = 'join'
  RS.pendingCode = code

  const vname = localStorage.getItem('vName')
  if (vname && localStorage.getItem('villageId')) {
    restoreGame()
  } else {
    document.getElementById('sl').classList.remove('active')
    document.getElementById('sp').classList.add('active')
  }
}

/** Refresh the public room browser. */
export function browseRooms() {
  if (socket?.connected) socket.emit('list_rooms')
  else ntfGlobal('Connect first to browse rooms.')
}

function ntfGlobal(msg) {
  const n = document.getElementById('nf')
  if (!n) return
  n.textContent = msg; n.classList.add('show')
  setTimeout(() => n.classList.remove('show'), 2600)
}

/** Join a specific room from the browser list. */
export function joinRoomByCode(code) {
  const codeInput = document.getElementById('sl-join-code')
  if (codeInput) codeInput.value = code
  joinRoomFlow()
}
