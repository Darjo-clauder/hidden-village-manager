import { villages, getRelStatus, setRel } from '../state.js'
import { socketToRoom } from '../rooms.js'

export function registerGift(io, socket) {
  socket.on('send_gift', ({ targetId }) => {
    const from = villages.get(socket.id)
    const target = villages.get(targetId)
    if (!from || !target) return

    const GIFT = 5000
    if ((from.ryo || 0) < GIFT) {
      socket.emit('sv_notification', 'Not enough ryo for gifts.')
      return
    }

    from.ryo -= GIFT
    target.ryo = (target.ryo || 0) + GIFT

    if (getRelStatus(from, targetId) === 'war') {
      setRel(from, target, 'neutral', +20)
      const rc = socketToRoom.get(socket.id)
      if (rc) io.to(rc).emit('relations_update', { a: socket.id, b: targetId, status: 'neutral' })
      else    io.emit('relations_update', { a: socket.id, b: targetId, status: 'neutral' })
    } else {
      setRel(from, target, getRelStatus(from, targetId), +10)
    }

    const tSocket = io.sockets.sockets.get(targetId)
    if (tSocket) {
      tSocket.emit('gift_received', { fromId: socket.id, fromName: from.name, fromIcon: from.icon, amount: GIFT })
    }

    socket.emit('gift_sent', { targetName: target.name, amount: GIFT })
  })
}
