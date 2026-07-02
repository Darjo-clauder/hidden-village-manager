// ── Client-side Room State (RS) ───────────────────────────────────────────────
// RS holds pre-join room preferences. Set these before calling initSocket().

export const RS = {
  // Set before connecting:
  mode:             null,     // 'create' | 'join' | 'browse' | null
  pendingCode:      '',       // code to join (join mode)
  pendingIsPrivate: true,
  pendingMaxPlayers: 4,
  pendingAutoReadyTimeout: 15,

  // Set after joining:
  roomCode:       null,
  snapshot:       null,       // last room_state_update snapshot
  isHost:         false,
  mySocketId:     null,
}

// ── endTurn ───────────────────────────────────────────────────────────────────
// Called by the "End Turn" button. Runs the monthly tick, syncs to server,
// then marks this player as ready in the room.

import { socket } from './socket.js'
import { G } from './state.js'
import { syncToServer } from './socket.js'
import { saveLocal } from './save.js'

let _adv = null   // injected after adv is available to avoid circular imports

export function setAdvFn(fn) { _adv = fn }

// Advance the month. The sim is client-side, so this always runs — offline or
// online. Locally we persist every turn; online we additionally sync the summary
// to the server and signal readiness for the shared world.
export function endTurn() {
  if (_adv) _adv()
  saveLocal()
  if (socket?.connected) {
    syncToServer()
    socket.emit('player_ready')
  }
}

// ── Invite link helpers ───────────────────────────────────────────────────────

export function inviteUrl(code) {
  const u = new URL(window.location.href)
  u.searchParams.set('room', code)
  return u.toString()
}

export function parseInviteCode() {
  return new URL(window.location.href).searchParams.get('room') || null
}

// ── Host admin actions (called from lobby panel buttons) ──────────────────────

export function kickPlayer(targetSocketId, reason) {
  socket?.emit('kick_player', { targetSocketId, reason })
}

export function transferHost(targetSocketId) {
  socket?.emit('transfer_host', { targetSocketId })
}

export function pauseRoom() {
  socket?.emit('pause_room')
}

export function resumeRoom() {
  socket?.emit('resume_room')
}

export function toggleClose() {
  socket?.emit('close_room')
}

export function setTimeout_(minutes) {
  socket?.emit('set_timeout', { minutes })
}

export function setMaxPlayers(max) {
  socket?.emit('set_max_players', { max })
}

export function voteAdvance() {
  socket?.emit('vote_advance')
}

export function unreadyTurn() {
  socket?.emit('player_unready')
}
