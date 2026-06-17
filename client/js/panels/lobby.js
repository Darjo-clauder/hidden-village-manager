import { RS, kickPlayer, transferHost, toggleClose, setTimeout_, setMaxPlayers, voteAdvance, inviteUrl } from '../room.js'
import { socket } from '../socket.js'

export function rLob() {
  const el = document.getElementById('p-lobby')
  if (!el) return

  const snap   = RS.snapshot
  const isHost = RS.isHost

  if (!snap) {
    el.innerHTML = '<div class="pt">Lobby</div><div style="color:#7a7060;font-size:9px;padding:10px">Not in a room.</div>'
    return
  }

  const onlinePlayers  = snap.players.filter(p => p.online)
  const offlinePlayers = snap.players.filter(p => !p.online)
  const readyCount     = snap.players.filter(p => p.ready).length
  const totalOnline    = onlinePlayers.length
  const paused         = snap.status === 'paused'

  const inviteLink = inviteUrl(snap.code)

  el.innerHTML = `
    <div class="pt">Lobby — Room <span style="color:#c9a84c;font-family:monospace">${snap.code}</span></div>

    <div style="display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
      <span style="font-size:9px;color:#7a7060">Turn ${snap.turnNumber}</span>
      <span style="font-size:9px;color:${paused?'#f99':'#8c8'}"> · ${paused ? 'PAUSED' : snap.status === 'lobby' ? 'lobby' : 'playing'}</span>
      <span style="font-size:9px;color:#7a7060"> · ${snap.playerCount}/${snap.maxPlayers} players</span>
      ${snap.closedToJoiners ? '<span style="font-size:9px;color:#f66"> · Closed</span>' : ''}
    </div>

    <!-- Invite link -->
    <div style="background:#0d0a04;border:1px solid #2e2820;padding:6px 8px;margin-bottom:10px;font-size:8px;color:#7a7060">
      <span style="color:#c9a84c">Invite Link: </span>
      <span id="lob-invite" style="color:#e8e0cc;cursor:pointer;text-decoration:underline" onclick="copyInvite()">${inviteLink}</span>
    </div>

    <!-- Player list -->
    <div style="margin-bottom:12px">
      ${snap.players.map(p => {
        const isMe   = p.socketId === RS.mySocketId
        const isHostP = p.socketId === snap.hostSocketId
        return `
        <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #1a150a">
          <span style="font-size:16px">${p.icon}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;color:#e8e0cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${p.name}${isMe ? ' <span style="color:#c9a84c">(you)</span>' : ''}${isHostP ? ' 👑' : ''}
            </div>
            <div style="font-size:8px;color:#7a7060">${p.kageName}</div>
          </div>
          <div style="flex-shrink:0">
            ${p.ready
              ? '<span style="color:#8f8;font-size:9px">✓ Ready</span>'
              : p.online
                ? '<span style="color:#f99;font-size:9px">⏳ Waiting</span>'
                : '<span style="color:#666;font-size:9px">📶 Offline</span>'}
          </div>
          ${isHost && !isMe ? `<button class="gb" style="font-size:8px;padding:2px 5px" onclick="kickPlayer('${p.socketId}','Removed by host.')">✕</button>` : ''}
          ${isHost && !isMe && p.online ? `<button class="gb" style="font-size:8px;padding:2px 5px" onclick="transferHost('${p.socketId}')">👑</button>` : ''}
        </div>`
      }).join('')}
    </div>

    <!-- Ready status bar -->
    <div style="font-size:9px;color:#7a7060;margin-bottom:8px">
      ${readyCount} / ${totalOnline} online players ready
      ${readyCount < totalOnline && offlinePlayers.length > 0 ? `
        <button class="gb" style="font-size:8px;padding:2px 6px;margin-left:8px" onclick="voteAdvance()">Vote to advance without offline players</button>
      ` : ''}
    </div>

    <!-- Host controls -->
    ${isHost ? `
    <div style="border-top:1px solid #2e2820;padding-top:10px;margin-top:4px">
      <div style="font-size:9px;color:#c9a84c;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px">Host Controls</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        <button class="gb" onclick="pauseRoom()">${paused ? 'Resume' : 'Pause'}</button>
        <button class="gb" onclick="toggleClose()">${snap.closedToJoiners ? 'Open to joiners' : 'Close to joiners'}</button>
        <div style="display:flex;align-items:center;gap:4px">
          <span style="font-size:8px;color:#7a7060">Timeout:</span>
          ${[5,10,15,30].map(m => `<button class="gb${snap.autoReadyTimeout===m?' sel':''}" style="font-size:8px;padding:2px 5px" onclick="setTimeout_(${m})">${m}m</button>`).join('')}
        </div>
        <div style="display:flex;align-items:center;gap:4px">
          <span style="font-size:8px;color:#7a7060">Max:</span>
          ${[2,3,4,5,6].map(n => `<button class="gb${snap.maxPlayers===n?' sel':''}" style="font-size:8px;padding:2px 5px" onclick="setMaxPlayers(${n})">${n}</button>`).join('')}
        </div>
      </div>
    </div>
    ` : ''}
  `
}

export function copyInvite() {
  const link = document.getElementById('lob-invite')?.textContent
  if (link) navigator.clipboard.writeText(link).then(() => {
    const el = document.getElementById('lob-invite')
    if (el) { const old = el.textContent; el.textContent = 'Copied!'; setTimeout(() => { el.textContent = old }, 1500) }
  })
}
