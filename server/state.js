export const MAP_W = 80
export const MAP_H = 40

export const villages = new Map() // socketId → village

export function rndPos() {
  return {
    x: Math.floor(Math.random() * (MAP_W - 14)) + 7,
    y: Math.floor(Math.random() * (MAP_H - 8)) + 4,
  }
}

// Client-safe view of a village. Strips `playerId` — it's a bearer secret the
// server uses to load a player's save; broadcasting it let anyone load anyone
// else's game (IDOR). Clients only ever need the public fields.
export function publicVillage(v) {
  if (!v) return v
  const { playerId, ...pub } = v
  return pub
}

export function worldSnapshot() {
  return Array.from(villages.values()).map(publicVillage)
}

export function worldSnapshotForRoom(roomCode) {
  return Array.from(villages.values()).filter(v => v.roomCode === roomCode).map(publicVillage)
}

export function getRelStatus(v, otherId) {
  return v.relations?.[otherId]?.status || 'neutral'
}

export function setRel(a, b, status, relDelta = 0) {
  if (!a.relations[b.id]) a.relations[b.id] = { status: 'neutral', rel: 50 }
  if (!b.relations[a.id]) b.relations[a.id] = { status: 'neutral', rel: 50 }
  a.relations[b.id].status = status
  b.relations[a.id].status = status
  if (relDelta) {
    a.relations[b.id].rel = Math.max(0, Math.min(100, a.relations[b.id].rel + relDelta))
    b.relations[a.id].rel = Math.max(0, Math.min(100, b.relations[a.id].rel + relDelta))
  }
}
