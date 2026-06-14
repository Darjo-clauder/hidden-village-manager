import { villages, getRelStatus, setRel } from '../state.js'
import { resolveRaid } from '../combat.js'

export function registerRaid(io, socket) {
  socket.on('launch_raid', ({ targetId }) => {
    const attacker = villages.get(socket.id)
    const defender = villages.get(targetId)
    if (!attacker || !defender) return

    if (getRelStatus(attacker, targetId) === 'allied') {
      socket.emit('sv_notification', 'Cannot raid an ally.')
      return
    }

    const { atkRoll, defRoll, attackerWins, ryoStolen } = resolveRaid(attacker, defender)

    if (attackerWins) {
      attacker.ryo = (attacker.ryo || 0) + ryoStolen
      defender.ryo = Math.max(0, (defender.ryo || 0) - ryoStolen)
    }

    if (getRelStatus(attacker, targetId) !== 'war') {
      setRel(attacker, defender, 'war', -25)
      io.emit('relations_update', { a: socket.id, b: targetId, status: 'war' })
    }

    socket.emit('raid_result', {
      targetId, targetName: defender.name, targetIcon: defender.icon,
      won: attackerWins, atkRoll, defRoll,
      ryoStolen, repChange: attackerWins ? 10 : -3, isAttacker: true,
    })

    const dSocket = io.sockets.sockets.get(targetId)
    if (dSocket) {
      dSocket.emit('raid_result', {
        fromId: socket.id, fromName: attacker.name, fromIcon: attacker.icon,
        won: !attackerWins, atkRoll, defRoll,
        ryoStolen, isAttacker: false,
      })
    }

    console.log(`  RAID: ${attacker.name} vs ${defender.name} → ${attackerWins ? 'attacker wins' : 'defender holds'}`)
  })
}
