import { villages, getRelStatus, setRel } from '../state.js'
import { socketToRoom } from '../rooms.js'
import db from '../db.js'

function roomEmit(io, socket, event, data) {
  const rc = socketToRoom.get(socket.id)
  if (rc) io.to(rc).emit(event, data)
  else    io.emit(event, data)
}

function saveRelations(v) {
  if (db && v.playerId) {
    db.from('villages').update({ relations: v.relations })
      .eq('player_id', v.playerId)
      .then(({ error }) => { if (error) console.error('rel save error:', error.message) })
  }
}

export function registerDiplomacy(io, socket) {
  socket.on('propose_alliance', ({ targetId }) => {
    const from = villages.get(socket.id)
    const target = villages.get(targetId)
    if (!from || !target) return
    if (getRelStatus(from, targetId) === 'war') {
      socket.emit('sv_notification', 'Cannot propose alliance while at war.')
      return
    }
    const tSocket = io.sockets.sockets.get(targetId)
    if (tSocket) tSocket.emit('alliance_proposed', { fromId: socket.id, fromName: from.name, fromIcon: from.icon })
    socket.emit('sv_notification', `Alliance proposal sent to ${target.name}.`)
  })

  socket.on('respond_alliance', ({ fromId, accepted }) => {
    const responder = villages.get(socket.id)
    const proposer = villages.get(fromId)
    if (!responder || !proposer) return

    if (accepted) {
      setRel(responder, proposer, 'allied', +30)
      saveRelations(responder)
      saveRelations(proposer)
      const pSocket = io.sockets.sockets.get(fromId)
      if (pSocket) pSocket.emit('alliance_accepted', { fromId: socket.id, fromName: responder.name, fromIcon: responder.icon })
      roomEmit(io, socket, 'relations_update', { a: socket.id, b: fromId, status: 'allied' })
    } else {
      const pSocket = io.sockets.sockets.get(fromId)
      if (pSocket) pSocket.emit('alliance_declined', { fromId: socket.id, fromName: responder.name })
    }
  })

  socket.on('break_alliance', ({ targetId }) => {
    const from = villages.get(socket.id)
    const target = villages.get(targetId)
    if (!from || !target) return
    setRel(from, target, 'neutral', -15)
    saveRelations(from)
    saveRelations(target)
    const tSocket = io.sockets.sockets.get(targetId)
    if (tSocket) tSocket.emit('alliance_broken', { fromId: socket.id, fromName: from.name, fromIcon: from.icon })
    roomEmit(io, socket, 'relations_update', { a: socket.id, b: targetId, status: 'neutral' })
    socket.emit('sv_notification', `Alliance with ${target.name} dissolved.`)
  })

  socket.on('declare_war', ({ targetId }) => {
    const from = villages.get(socket.id)
    const target = villages.get(targetId)
    if (!from || !target) return
    setRel(from, target, 'war', -40)
    saveRelations(from)
    saveRelations(target)
    const tSocket = io.sockets.sockets.get(targetId)
    if (tSocket) tSocket.emit('war_declared', { fromId: socket.id, fromName: from.name, fromIcon: from.icon })
    roomEmit(io, socket, 'relations_update', { a: socket.id, b: targetId, status: 'war' })
    console.log(`  WAR: ${from.name} → ${target.name}`)
  })
}
