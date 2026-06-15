// Squad synergy: clan combos, cohesion bonus, chemistry effects.
// All functions are pure — no side effects, no imports from state.

const CLAN_COMBOS = {
  Uchiha:   { label: 'Sharingan Sync',    desc: '+18% power — twin Sharingan warp perception together.',     powerMod: 0.18 },
  Hyuga:    { label: 'Twin Byakugan',     desc: '+14% power — 360° sight, no blind spots.',                  powerMod: 0.14 },
  Nara:     { label: 'Shadow Twins',      desc: '+12% power — shadow jutsu stagger opponents.',              powerMod: 0.12 },
  Akimichi: { label: 'Meat Tank Formation', desc: '+12% power — human shields absorb punishment.',           powerMod: 0.12 },
  Yamanaka: { label: 'Mind Link',         desc: '+10% power — seamless telepathic coordination.',            powerMod: 0.10 },
  Inuzuka:  { label: 'Pack Tactics',      desc: '+14% power — fang attacks multiply with numbers.',          powerMod: 0.14 },
  Aburame:  { label: 'Hive Coordination', desc: '+10% power — insects swarm with coordinated precision.',    powerMod: 0.10 },
  Uzumaki:  { label: 'Seal Chain',        desc: '+16% power — sealing techniques amplify each other.',       powerMod: 0.16 },
  Senju:    { label: 'Mokuton Resonance', desc: '+20% power — wood release flourishes in tandem.',           powerMod: 0.20 },
}

// Ino-Shika-Cho requires all three clans in one squad
const INC_TRIO = { Nara: true, Akimichi: true, Yamanaka: true }

const CHEMISTRY = [
  {
    match: t => t.includes('Ambitious') && t.filter(x => x === 'Ambitious').length >= 2,
    label: 'Rival Spirits',
    desc: '+10% power, -6% success — two Ambitious shinobi push each other hard.',
    powerMod: 0.10, successMod: -0.06, color: '#fa0',
  },
  {
    match: t => t.includes('Protective') && t.includes('Reckless'),
    label: 'Cover Fire',
    desc: '+8% success — Protective cancels out Reckless\'s risk penalty.',
    powerMod: 0, successMod: 0.08, color: '#8fbc8f',
  },
  {
    match: t => t.includes('Loyal') && t.includes('Charismatic'),
    label: 'Band of Brothers',
    desc: '+6% success — Loyalty and charisma create unshakeable unit cohesion.',
    powerMod: 0, successMod: 0.06, color: '#8fbc8f',
  },
  {
    match: t => t.includes('Lone Wolf'),
    label: 'Friction',
    desc: '-4% success — Lone Wolf resents squad structure.',
    powerMod: 0, successMod: -0.04, color: '#f66',
  },
  {
    match: t => t.includes('Vengeful') && t.includes('Protective'),
    label: 'Sworn Vengeance',
    desc: '+12% power — they will not let each other fall.',
    powerMod: 0.12, successMod: 0, color: '#cc7fb8',
  },
  {
    match: t => t.includes('Hot-headed') && t.includes('Calm'),
    label: 'Yin-Yang',
    desc: '+4% success — Calm steadies the Hot-headed one at critical moments.',
    powerMod: 0, successMod: 0.04, color: '#87ceeb',
  },
  {
    match: t => t.includes('Stoic') && t.includes('Charismatic'),
    label: 'Silent Strength',
    desc: '+5% power — composed presence amplifies the leader\'s energy.',
    powerMod: 0.05, successMod: 0, color: '#87ceeb',
  },
  {
    match: t => t.includes('Bookworm') && t.includes('Hot-headed'),
    label: 'Theory Meets Fury',
    desc: '-3% success — constant tactical disagreements slow the team.',
    powerMod: 0, successMod: -0.03, color: '#fa0',
  },
]

export function sqSynergy(sq, shinobi) {
  const members = sq.members.map(id => shinobi.find(s => s.id === id)).filter(Boolean)
  const bonuses = []
  let powerMod = 0
  let successMod = 0

  // Check Ino-Shika-Cho trio
  const clans = members.map(s => s.clan).filter(Boolean)
  const clanSet = new Set(clans)
  if (Object.keys(INC_TRIO).every(c => clanSet.has(c))) {
    powerMod += 0.35
    successMod += 0.12
    bonuses.push({ label: 'Ino-Shika-Cho', desc: '+35% power, +12% success — the legendary formation reborn.', color: '#c9a84c' })
  } else {
    // Individual clan combos (only count if 2+ share same clan)
    const clanCounts = {}
    clans.forEach(c => { clanCounts[c] = (clanCounts[c] || 0) + 1 })
    Object.entries(clanCounts).forEach(([clan, count]) => {
      if (count >= 2) {
        const combo = CLAN_COMBOS[clan] || { label: clan + ' Kinship', desc: '+8% power — shared blood, shared instinct.', powerMod: 0.08 }
        powerMod += combo.powerMod
        bonuses.push({ label: combo.label, desc: combo.desc, color: '#87ceeb' })
      }
    })
  }

  // Chemistry effects
  const traits = members.map(s => s.pers.n)
  for (const chem of CHEMISTRY) {
    if (chem.match(traits)) {
      powerMod += chem.powerMod
      successMod += chem.successMod
      bonuses.push({ label: chem.label, desc: chem.desc, color: chem.color })
    }
  }

  // Cohesion bonus — cohesion 0–100 gives 0–40% power boost
  const cohesion = sq.cohesion ?? 0
  const cohesionPowerMod = cohesion * 0.004

  const totalPowerMult = 1 + powerMod + cohesionPowerMod

  return { powerMult: totalPowerMult, successMod, bonuses, cohesion }
}

export function cohesionLabel(c) {
  if (c >= 90) return 'Legendary'
  if (c >= 70) return 'Veteran'
  if (c >= 50) return 'Experienced'
  if (c >= 30) return 'Developing'
  if (c >= 10) return 'Green'
  return 'New'
}
