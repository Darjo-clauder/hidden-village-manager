// ── Network mode ──────────────────────────────────────────────────────────────
// Single source of truth for whether this session talks to a multiplayer server.
//
// The whole game sim runs client-side, so single-player is fully offline: no
// socket is ever opened. Multiplayer is an explicit opt-in taken from the lobby.
// This lets the same build ship as a serverless desktop app (Tauri/Steam) while
// still supporting a hosted or self-hosted online world.

export const NET = {
  online: false,   // true only on the lobby / online path; false for solo play
}

const LS_SERVER_URL = 'hvm_server_url'

export function isOnline()          { return NET.online }
export function setOnlineMode(on)   { NET.online = !!on }

/**
 * Server address for multiplayer.
 *   ''  (empty) → same-origin — used when the Node server also serves the page
 *                 (the classic web build). `io()` connects back to the host.
 *   URL         → an explicit host — required by desktop builds (Tauri), which
 *                 have no origin server. Persisted so the player only types it once.
 */
export function getServerUrl() {
  return (localStorage.getItem(LS_SERVER_URL) || '').trim()
}

export function setServerUrl(url) {
  const u = (url || '').trim()
  if (u) localStorage.setItem(LS_SERVER_URL, u)
  else   localStorage.removeItem(LS_SERVER_URL)
}
