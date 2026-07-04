/**
 * HTML-escape a value for safe interpolation into an innerHTML template string.
 *
 * The client renders almost everything via innerHTML, and some of that data
 * crosses the multiplayer trust boundary (village/warden names, icons, room
 * codes, server-sent event text). Those MUST be escaped at the sink or a rival
 * player can inject markup/script. Null/undefined → ''.
 *
 * Pure; unit-tested.
 */
const MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => MAP[c])
}
