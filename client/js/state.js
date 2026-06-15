import {
  CLANS, RANKS, FNAMES, LNAMES, SPECS, PERSONALITIES, BACKSTORIES, ARCHETYPES,
  TAILED_BEASTS, VILLAGES_DEF, MISS_POOL, TRADE_ROUTES, CONTRACTS,
} from './constants.js'

// ── utilities ──────────────────────────────────────────────────────────────
export const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
export const pk = a => a[Math.floor(Math.random() * a.length)]
export const clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v))
export const fmt = n => Number(n).toLocaleString()
export const sn = s => s.fn + ' ' + s.ln

// ── game state ─────────────────────────────────────────────────────────────
export const G = {}
export const WS = { villages: [], myId: null, myVillage: null, pendingAlliances: [] }

// ui state — mutable object so any module can assign properties
export const ui = { CP: 'roster', MT: 'solo', ET: 'trade', aT: null, sqAT: null, csL: null, csM: [], exSt: null, pKE: null }

// setup / diplomacy state
export let spIcon = '🍃'
export function setSpIcon(ic) { spIcon = ic }
export let _dipCb = null
export function setDipCb(cb) { _dipCb = cb }

// ── shinobi constructor ────────────────────────────────────────────────────
export function mS(ri = 0) {
  const hC = Math.random() < 0.28, clan = hC ? pk(CLANS) : null
  const age = ri === 0 ? rnd(12, 15) : ri === 1 ? rnd(16, 22) : ri === 2 ? rnd(20, 30) : rnd(25, 35)
  let base = { ninjutsu: rnd(12, 40), taijutsu: rnd(12, 40), genjutsu: rnd(8, 32), chakra: rnd(18, 48), intelligence: rnd(12, 40), speed: rnd(12, 40) }
  if (clan) Object.keys(clan.b).forEach(k => { base[k] = clamp((base[k] || 0) + clan.b[k], 0, 99) })
  const m = 1 + ri * 0.28
  Object.keys(base).forEach(k => { base[k] = clamp(Math.round(base[k] * m), 1, 99) })
  const p = pk(PERSONALITIES), sal = Math.round((500 + ri * 400) * (1 + (p.effect.salary || 0)))
  const origin = Math.random() < 0.05 ? pk(['Sunagakure', 'Kirigakure', 'Iwagakure', 'Kumogakure']) : null
  return { id: Math.random().toString(36).slice(2), fn: pk(FNAMES), ln: pk(LNAMES), clan: clan?.n || null, trait: clan?.t || null, spec: pk(SPECS), age, ri, stats: base, potential: rnd(ri * 20 + 45, 99), status: 'available', injDays: 0, missId: null, squadId: null, salary: sal, months: 0, wins: 0, pers: p, backstory: pk(BACKSTORIES), archetype: pk(ARCHETYPES), scouted: false, monthsWaiting: 0, rivalId: null, origin, jk: null }
}

// ── stat helpers ───────────────────────────────────────────────────────────
export function sPow(s) {
  const v = Object.values(s.stats)
  let p = Math.round(v.reduce((a, b) => a + b, 0) / v.length)
  if (s.jk) { const b = G.beasts.find(x => x.n === s.jk); if (b) p += Math.round(b.pow * 0.4) }
  return p
}

export function sqP(sq) {
  return sq.members.reduce((a, id) => { const s = G.shinobi.find(x => x.id === id); return a + (s ? sPow(s) : 0) }, 0)
}

// ── kage events ────────────────────────────────────────────────────────────
// fn signature: (G, log) — log is aL, passed by caller to avoid circular dep
export const KAGE_EVENTS = [
  { n: 'Five Kage Summit', desc: 'All Kage gathering diplomatically.', choices: [
    { l: 'Attend (+8 rel all, -5k ryo)', fn: (G, log) => { G.villages.forEach(v => v.rel = clamp(v.rel + 8, 0, 100)); G.ryo -= 5000; log('Attended Summit.', 'good') } },
    { l: 'Send envoy (+4 rel all, -2k ryo)', fn: (G, log) => { G.villages.forEach(v => v.rel = clamp(v.rel + 4, 0, 100)); G.ryo -= 2000; log('Envoy sent.', 'neutral') } },
    { l: 'Boycott (-5 rel, +5 rep)', fn: (G, log) => { G.villages.forEach(v => v.rel = clamp(v.rel - 5, 0, 100)); G.reputation = clamp(G.reputation + 5, 0, 999); log('Boycotted summit.', 'neutral') } },
  ] },
  { n: 'Enemy Spy Caught', desc: 'A rival village spy is in custody.', choices: [
    { l: 'Interrogate (+3k ryo intel)', fn: (G, log) => { G.ryo += 3000; log('Spy interrogated.', 'neutral') } },
    { l: 'Execute (+8 rep, risk war)', fn: (G, log) => { const v = pk(G.villages); v.rel = clamp(v.rel - 15, 0, 100); v.threat = clamp(v.threat + 20, 0, 100); G.reputation = clamp(G.reputation + 8, 0, 999); log('Spy executed. Tensions rise.', 'warn') } },
    { l: 'Turn double agent (+5k ryo)', fn: (G, log) => { G.ryo += 5000; log('Spy turned.', 'good') } },
  ] },
  { n: 'Refugee Crisis', desc: 'Civilians flee toward your village.', choices: [
    { l: 'Accept all (-8k ryo, +10 morale, +5 rep)', fn: (G, log) => { G.ryo -= 8000; G.morale = clamp(G.morale + 10, 0, 100); G.reputation = clamp(G.reputation + 5, 0, 999); log('Refugees accepted.', 'good') } },
    { l: 'Accept shinobi-capable (+1 prospect)', fn: (G, log) => { G.prospects.push(mS(0)); log('One recruit accepted.', 'neutral') } },
    { l: 'Seal gates (-8 morale, -8 rep)', fn: (G, log) => { G.morale = clamp(G.morale - 8, 0, 100); G.reputation = clamp(G.reputation - 8, 0, 999); log('Gates sealed.', 'bad') } },
  ] },
  { n: 'Alliance Proposal', desc: 'A rival offers a military alliance.', choices: [
    { l: 'Accept (+25 rel, -10k ryo, +10 rep)', fn: (G, log) => { const v = pk(G.villages); v.rel = clamp(v.rel + 25, 0, 100); v.allied = true; G.ryo -= 10000; G.reputation = clamp(G.reputation + 10, 0, 999); log('Alliance forged!', 'good') } },
    { l: 'Negotiate (+12 rel)', fn: (G, log) => { pk(G.villages).rel = clamp(pk(G.villages).rel + 12, 0, 100); log('Partial deal reached.', 'neutral') } },
    { l: 'Decline', fn: (G, log) => { log('Declined.', 'neutral') } },
  ] },
  { n: 'Tailed Beast Sighting', desc: 'A wild beast roams near your borders.', choices: [
    { l: 'Launch capture mission', fn: (G, log) => { const b = G.beasts.find(x => !x.sealed); if (b) { b.captPending = true; log('Capture mission launched.', 'warn') } else log('No beasts to capture.', 'neutral') } },
    { l: 'Warn all villages (+8 rel)', fn: (G, log) => { G.villages.forEach(v => v.rel = clamp(v.rel + 8, 0, 100)); log('Warned neighbours.', 'good') } },
    { l: 'Fortify (+20 temp def)', fn: (G, log) => { G.tempDef = 20; log('Fortifications raised.', 'neutral') } },
  ] },
]

// ── game init & helpers ────────────────────────────────────────────────────
export function initState() {
  Object.keys(G).forEach(k => delete G[k])
  Object.assign(G, {
    year: 1, month: 1, ryo: 60000, reputation: 10, morale: 75,
    shinobi: [], squads: [], aM: [], log: [], prospects: [],
    villages: JSON.parse(JSON.stringify(VILLAGES_DEF)),
    beasts: JSON.parse(JSON.stringify(TAILED_BEASTS)),
    avM: [], upgrades: { academy: 0, hospital: 0, wall: 0, intel: 0, training: 0, seal: 0 },
    raid: null, raidW: 0, defSh: null, tempDef: 0,
    examSched: false, examMonth: null, examActive: false, examResults: [], examCands: [],
    tradeRoutes: JSON.parse(JSON.stringify(TRADE_ROUTES)),
    contracts: JSON.parse(JSON.stringify(CONTRACTS)),
    keQ: [...KAGE_EVENTS].sort(() => Math.random() - 0.5), keCD: 0,
  });
  [2, 2, 1, 1, 1, 0, 0, 0].forEach(r => G.shinobi.push(mS(r)))
  rfM(); rfP()
}

export function schEx() {
  if (!G.examSched) { G.examMonth = G.month + rnd(3, 6); G.examSched = true }
}

export function rfM() {
  const s = MISS_POOL.filter(m => !m.sq).sort(() => Math.random() - 0.5).slice(0, 7)
  const sq = MISS_POOL.filter(m => m.sq).sort(() => Math.random() - 0.5).slice(0, 4)
  G.avM = [...s, ...sq].map(m => ({ ...m, id: Math.random().toString(36).slice(2) }))
}

export function rfP() {
  const lv = G.upgrades.academy
  const maxProspects = rnd(4, 6) + lv * 2

  // Age existing prospects
  G.prospects.forEach(p => { p.monthsWaiting = (p.monthsWaiting || 0) + 1 })

  // Add new prospects to fill up to the cap
  const toAdd = Math.max(0, maxProspects - G.prospects.length)
  for (let i = 0; i < toAdd; i++) {
    const s = mS(lv >= 2 && Math.random() < 0.1 ? 2 : 0)
    if (lv > 0) Object.keys(s.stats).forEach(k => { s.stats[k] = clamp(s.stats[k] + lv * 5, 0, 99) })
    G.prospects.push(s)
  }

  // 15% chance to spawn a rival pair among unrivaled prospects
  if (Math.random() < 0.15) {
    const unrivaled = G.prospects.filter(p => !p.rivalId)
    if (unrivaled.length >= 2) {
      const a = unrivaled[Math.floor(Math.random() * unrivaled.length)]
      const others = unrivaled.filter(p => p.id !== a.id)
      const b = others[Math.floor(Math.random() * others.length)]
      a.rivalId = b.id; b.rivalId = a.id
    }
  }
}
