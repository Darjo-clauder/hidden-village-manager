export function resolveRaid(attacker, defender) {
  const atkRoll = attacker.power + Math.floor(Math.random() * 25)
  const defRoll = defender.power + Math.floor(Math.random() * 25)
  const attackerWins = atkRoll > defRoll
  const ryoStolen = attackerWins ? Math.max(500, Math.floor((defender.ryo || 10000) * 0.12)) : 0
  return { atkRoll, defRoll, attackerWins, ryoStolen }
}
