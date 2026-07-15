/**
 * Animated 2D pitch view — the FM24/FHM-style match window for the live battle
 * viewer, staged as a HEXAGON STADIUM: crowd stands ring a hex arena, themed by
 * the venue (see shared/constants/arenas.js), with moving circles for shinobi —
 * gold for your side, arena-accent for the opposition.
 *
 * Interactive: hover a circle for its name, click it to inspect (the viewer
 * shows role + match grade below the pitch); pause, speed and replay are
 * driven by the viewer's clock controls. Pure presentation over the already-
 * resolved beat sequence — no engine state is read or written.
 *
 * mountPitch(container, { arena, home, away, roster, onSelect }) → controller:
 *   playBeat(i, beat)  — animate one beat ({ won, momentum })
 *   finish(won)        — final tableau (winners ring the centre)
 *   reset()            — back to kickoff formations (for replay)
 *   pause()/resume()   — freeze / restart the animation loop
 *   destroy()          — stop rAF + drop the canvas
 */

const W = 400, H = 250            // internal canvas resolution (CSS scales it)
const R_SHINOBI = 7               // circle radius
const CX = W / 2, CY = H / 2
const HEX_R = 108                 // arena hexagon radius
const STAND_R = 124               // outer stands radius

// Role tint + glyph for the player's circles — read the board at a glance.
export const ROLE_TINT = {
  vanguard: { fill: '#e0774a', edge: '#f6a074', glyph: '⚔', label: 'Vanguard' },
  support:  { fill: '#5bb8c0', edge: '#8fe0e6', glyph: '✚', label: 'Support' },
  intel:    { fill: '#9a8fe0', edge: '#c2b8f6', glyph: '◆', label: 'Intel' },
  medical:  { fill: '#7ac97a', edge: '#a6e6a6', glyph: '✚', label: 'Medic' },
  flex:     { fill: '#c9a84c', edge: '#e8d5a3', glyph: '●', label: 'Flex' },
}
function _roleTint(role) { return ROLE_TINT[role] || ROLE_TINT.flex }

// Chakra-element flavour for combat FX — colour + glyph of the jutsu thrown.
export const ELEMENT_FX = {
  Fire:      { color: '#e0774a', glyph: '🔥' },
  Water:     { color: '#5b9bd0', glyph: '💧' },
  Wind:      { color: '#8fd0a0', glyph: '🌀' },
  Earth:     { color: '#c9a86a', glyph: '⛰' },
  Lightning: { color: '#e0d060', glyph: '⚡' },
}
function _elemFx(el) { return ELEMENT_FX[el] || { color: '#c9a84c', glyph: '✦' } }

// Deterministic per-index jitter so formations look organic but stable.
function _jit(i, salt = 0) { const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return (s - Math.floor(s)) - 0.5 }

function _hexPath(ctx, cx, cy, r) {
  ctx.beginPath()
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + k * Math.PI / 3   // flat-top hex
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
    k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
  }
  ctx.closePath()
}

function _px(v, axis) { // arena props are authored 0..100; map into the hex bounding box
  return axis === 'x' ? CX - HEX_R + (v / 100) * HEX_R * 2 : CY - HEX_R * 0.87 + (v / 100) * HEX_R * 1.74
}

function _drawStadium(ctx, arena, pulse = 0) {
  const { ground, groundAlt, line, glow, accent } = arena.palette
  // Beyond the stands — night.
  ctx.fillStyle = '#060604'; ctx.fillRect(0, 0, W, H)
  // Stands: a wider hex ring packed with a deterministic crowd. A crowd `pulse`
  // (a beat swing / KO just landed) brightens the stands — the roar of the crowd.
  _hexPath(ctx, CX, CY, STAND_R); ctx.fillStyle = pulse > 0 ? '#221d14' : '#141210'; ctx.fill()
  ctx.save()
  _hexPath(ctx, CX, CY, STAND_R); ctx.clip()
  for (let i = 0; i < 260; i++) {
    const a = _jit(i, 41) * Math.PI * 2 * 2
    const rr = HEX_R + 4 + (_jit(i, 43) + 0.5) * (STAND_R - HEX_R - 6)
    const x = CX + Math.cos(a) * rr * 1.04, y = CY + Math.sin(a) * rr * 0.94
    // pulse jostles a fraction of the crowd (stand up / wave) and warms the colour
    const up = pulse > 0 && _jit(i, 57) > 0.5 - pulse * 0.5 ? -1.5 : 0
    ctx.fillStyle = pulse > 0 && i % 2 ? accent : i % 3 ? '#2a251c' : glow
    ctx.globalAlpha = 0.7 + pulse * 0.3
    ctx.fillRect(x, y + up, 2, 2 + (up ? 1 : 0))
  }
  ctx.restore(); ctx.globalAlpha = 1
  // The arena floor — terrain banding clipped to the hex.
  ctx.save()
  _hexPath(ctx, CX, CY, HEX_R); ctx.clip()
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? groundAlt : ground
    ctx.fillRect(CX - HEX_R + i * (HEX_R * 2 / 8), CY - HEX_R, HEX_R * 2 / 8, HEX_R * 2)
  }
  // Venue props
  ctx.globalAlpha = 0.5
  ;(arena.props || []).forEach(p => {
    ctx.strokeStyle = glow; ctx.fillStyle = glow; ctx.lineWidth = 1.5
    const x = _px(p.x, 'x'), y = _px(p.y, 'y')
    if (p.type === 'ring') { ctx.beginPath(); ctx.arc(x, y, p.r / 100 * HEX_R * 2, 0, Math.PI * 2); ctx.stroke() }
    else if (p.type === 'disc') { ctx.beginPath(); ctx.arc(x, y, p.r / 100 * HEX_R * 2, 0, Math.PI * 2); ctx.fill() }
    else if (p.type === 'rect') { ctx.fillRect(x, y, p.w / 100 * HEX_R * 2, p.h / 100 * HEX_R * 1.74) }
    else if (p.type === 'diamond') {
      const r = p.r / 100 * HEX_R * 2
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill()
    } else if (p.type === 'hatch') {
      const x2 = x + p.w / 100 * HEX_R * 2, y2 = y + p.h / 100 * HEX_R * 1.74
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, x2 - x, y2 - y); ctx.clip()
      for (let hx = x - (y2 - y); hx < x2; hx += 9) { ctx.beginPath(); ctx.moveTo(hx, y2); ctx.lineTo(hx + (y2 - y), y); ctx.stroke() }
      ctx.restore()
    }
  })
  // Pitch grammar: halfway line + centre circle, clipped to the hex.
  ctx.globalAlpha = 0.55; ctx.strokeStyle = line; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(CX, CY - HEX_R); ctx.lineTo(CX, CY + HEX_R); ctx.stroke()
  ctx.beginPath(); ctx.arc(CX, CY, 24, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
  // Hex boundary — double line, stadium-grade.
  ctx.globalAlpha = 0.9; ctx.strokeStyle = line; ctx.lineWidth = 2
  _hexPath(ctx, CX, CY, HEX_R); ctx.stroke()
  ctx.globalAlpha = 0.35; ctx.lineWidth = 1
  _hexPath(ctx, CX, CY, HEX_R + 5); ctx.strokeStyle = accent; ctx.stroke()
  ctx.globalAlpha = 1
}

// Token anatomy (blueprint §2.1): role fill + element edge ring + stamina arc +
// facing wedge + role badge + possession pip. Every mark answers a question.
function _drawShinobi(ctx, s, color, edge, hot, carrying) {
  ctx.save()
  ctx.globalAlpha = 0.25
  ctx.beginPath(); ctx.arc(s.x - s.vx * 3, s.y - s.vy * 3, R_SHINOBI * 0.7, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill()
  ctx.restore()
  if (hot) { // hovered/selected/spotlit — glow ring
    ctx.beginPath(); ctx.arc(s.x, s.y, R_SHINOBI + 4.5, 0, Math.PI * 2)
    ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1
  }
  const tint = s.role ? _roleTint(s.role) : null
  const fill = s.ko ? '#555' : (tint ? tint.fill : color)
  const stroke = tint ? tint.edge : edge
  ctx.globalAlpha = s.ko ? 0.6 : 1
  // Element edge ring — a thin chakra-nature halo outside the token.
  if (s.element && !s.ko) {
    ctx.beginPath(); ctx.arc(s.x, s.y, R_SHINOBI + 1.6, 0, Math.PI * 2)
    ctx.strokeStyle = _elemFx(s.element).color; ctx.lineWidth = 1; ctx.globalAlpha = 0.55; ctx.stroke()
    ctx.globalAlpha = s.ko ? 0.6 : 1
  }
  // Facing wedge — orientation from velocity (only when actually moving).
  const spd = Math.hypot(s.vx, s.vy)
  if (spd > 0.25 && !s.ko) {
    const a = Math.atan2(s.vy, s.vx)
    ctx.beginPath()
    ctx.moveTo(s.x + Math.cos(a) * (R_SHINOBI + 4), s.y + Math.sin(a) * (R_SHINOBI + 4))
    ctx.lineTo(s.x + Math.cos(a + 2.6) * (R_SHINOBI + 0.5), s.y + Math.sin(a + 2.6) * (R_SHINOBI + 0.5))
    ctx.lineTo(s.x + Math.cos(a - 2.6) * (R_SHINOBI + 0.5), s.y + Math.sin(a - 2.6) * (R_SHINOBI + 0.5))
    ctx.closePath(); ctx.fillStyle = stroke; ctx.globalAlpha = 0.7; ctx.fill()
    ctx.globalAlpha = s.ko ? 0.6 : 1
  }
  // Body
  ctx.beginPath(); ctx.arc(s.x, s.y, R_SHINOBI, 0, Math.PI * 2)
  ctx.fillStyle = fill; ctx.fill()
  ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke()
  if (s.tag) {
    ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'
    ctx.fillStyle = '#0a0a0a'
    ctx.fillText(s.tag, s.x, s.y + 2.5)
  }
  // Role badge — small glyph disc at the token's shoulder.
  if (tint && !s.ko) {
    const bx = s.x + R_SHINOBI * 0.85, by = s.y - R_SHINOBI * 0.85
    ctx.beginPath(); ctx.arc(bx, by, 3.4, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(6,6,4,.9)'; ctx.fill()
    ctx.font = '5px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = tint.edge
    ctx.fillText(tint.glyph, bx, by + 1.8)
  }
  if (s.ko) {
    ctx.strokeStyle = '#cc5a4a'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(s.x - 4, s.y - 4); ctx.lineTo(s.x + 4, s.y + 4)
    ctx.moveTo(s.x + 4, s.y - 4); ctx.lineTo(s.x - 4, s.y + 4); ctx.stroke()
  }
  // Stamina arc — replaces the old bar; wraps the lower hemisphere, band-coloured.
  if (s.stamina != null && !s.ko) {
    const frac = Math.max(0, Math.min(1, s.stamina / 100))
    const col = s.stamina >= 60 ? '#8fbc8f' : s.stamina >= 35 ? '#c9a84c' : s.stamina >= 15 ? '#f0a030' : '#cc5a4a'
    ctx.beginPath(); ctx.arc(s.x, s.y, R_SHINOBI + 3, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5, false)
    ctx.strokeStyle = 'rgba(6,6,4,.75)'; ctx.lineWidth = 2.4; ctx.stroke()
    ctx.beginPath(); ctx.arc(s.x, s.y, R_SHINOBI + 3, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * frac, false)
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke()
  }
  // Possession pip — the carrier wears the gold mark.
  if (carrying) {
    ctx.beginPath(); ctx.arc(s.x, s.y + R_SHINOBI + 6, 2.2, 0, Math.PI * 2)
    ctx.fillStyle = '#e8c95f'; ctx.fill()
    ctx.beginPath(); ctx.arc(s.x, s.y + R_SHINOBI + 6, 3.6, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(232,201,95,.5)'; ctx.lineWidth = 1; ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// The contested objective — a scroll token both sides fight over. Its position
// tracks who's winning the match, giving the eye a single thing to follow.
function _drawObjective(ctx, obj) {
  ctx.save()
  ctx.translate(obj.x, obj.y)
  // glow
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(201,168,76,.18)'; ctx.fill()
  // scroll body
  ctx.fillStyle = '#e8d5a3'; ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-5, -3.5, 10, 7, 1.5) : ctx.rect(-5, -3.5, 10, 7)
  ctx.fill(); ctx.stroke()
  // ribbon tie
  ctx.strokeStyle = '#b03030'; ctx.lineWidth = 1.2
  ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke()
  ctx.restore()
}

// Resolve the current carrier record ({side, idx}) to its token.
function _carrierToken(st) {
  if (!st.carrier) return null
  const team = st.carrier.side === 'home' ? st.home : st.away
  return team[st.carrier.idx] || null
}

// Zone-control tint — five faint vertical bands over the arena floor, tilted
// toward whoever controls each (blueprint §2.5). Kept subtle: it's context, not paint.
const _ZONE_XS = [0.10, 0.30, 0.50, 0.70, 0.90]
function _drawZoneTint(ctx, ctl) {
  if (!ctl) return
  ctx.save()
  _hexPath(ctx, CX, CY, HEX_R); ctx.clip()
  const bandW = HEX_R * 2 / 5
  ctl.forEach((v, i) => {
    if (Math.abs(v) < 0.08) return
    ctx.fillStyle = v > 0 ? '#c9a84c' : '#cc5a4a'
    ctx.globalAlpha = Math.min(0.1, Math.abs(v) * 0.1)
    ctx.fillRect(CX - HEX_R + i * bandW, CY - HEX_R, bandW, HEX_R * 2)
  })
  ctx.restore(); ctx.globalAlpha = 1
}

// ── Combat FX — the difference between a fight and a shoving match ─────────────
// A small particle system layered over the moving circles: elemental jutsu
// projectiles that arc from a caster to a target and burst, melee slashes
// between clashing pairs, and support pulses. Each fx is a short-lived object
// advanced by `t` (0→1) every frame. Pure presentation — no bearing on outcome.
function _updateFx(st) {
  st.fx = (st.fx || []).filter(f => { f.t += f.speed; return f.t < 1 })
}
function _drawFx(ctx, fx) {
  ;(fx || []).forEach(f => {
    if (f.kind === 'proj') {
      const e = f.t, x = f.sx + (f.tx - f.sx) * e, y = f.sy + (f.ty - f.sy) * e
      ctx.save(); ctx.globalAlpha = 1 - e * 0.3
      ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2); ctx.fillStyle = f.color; ctx.fill()
      // little trailing wisp
      ctx.globalAlpha = (1 - e) * 0.4
      ctx.beginPath(); ctx.arc(x - (f.tx - f.sx) * 0.06, y - (f.ty - f.sy) * 0.06, 1.6, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
      if (e > 0.82) _burst(ctx, f.tx, f.ty, f.color, (e - 0.82) / 0.18)
    } else if (f.kind === 'slash') {
      ctx.save(); ctx.globalAlpha = Math.sin(f.t * Math.PI)
      ctx.strokeStyle = f.color; ctx.lineWidth = 1.6
      const mx = (f.sx + f.tx) / 2, my = (f.sy + f.ty) / 2, dx = (f.tx - f.sx) * 0.4, dy = (f.ty - f.sy) * 0.4
      ctx.beginPath(); ctx.moveTo(mx - dx - dy * 0.4, my - dy + dx * 0.4); ctx.lineTo(mx + dx + dy * 0.4, my + dy - dx * 0.4); ctx.stroke()
      ctx.restore()
    } else if (f.kind === 'pulse') {
      ctx.save(); ctx.globalAlpha = (1 - f.t) * 0.7
      ctx.beginPath(); ctx.arc(f.sx, f.sy, 4 + f.t * 12, 0, Math.PI * 2)
      ctx.strokeStyle = f.color; ctx.lineWidth = 1.4; ctx.stroke(); ctx.restore()
    } else if (f.kind === 'marker') {
      // Event marker (blueprint §2.4): glyph pops at the event point, drifts, fades.
      ctx.save(); ctx.globalAlpha = Math.min(1, (1 - f.t) * 1.6)
      ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'
      ctx.fillStyle = f.color
      ctx.fillText(f.glyph, f.sx + (f.dx || 0) * f.t * 6, f.sy - f.t * 8)
      ctx.restore()
    } else if (f.kind === 'passline') {
      // Pass: bright line passer→receiver that flashes then fades; failed passes
      // render red to the interception point.
      ctx.save(); ctx.globalAlpha = Math.sin(Math.min(1, f.t) * Math.PI) * 0.9
      ctx.strokeStyle = f.color; ctx.lineWidth = 1.4
      ctx.setLineDash(f.fail ? [3, 2] : [])
      ctx.beginPath(); ctx.moveTo(f.sx, f.sy); ctx.lineTo(f.tx, f.ty); ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }
  })
}
function _burst(ctx, x, y, color, e) {
  ctx.save(); ctx.globalAlpha = 1 - e
  ctx.strokeStyle = color; ctx.lineWidth = 1.4
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; const r = 3 + e * 9; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke() }
  ctx.restore()
}

export function mountPitch(container, { arena, home = [], away = [], homeLabel = '', awayLabel = '', roster = [], onSelect = null } = {}) {
  if (!container || !arena) return null
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  canvas.className = 'bv-pitch-canvas'
  const label = document.createElement('div')
  label.className = 'bv-pitch-label'
  label.textContent = arena.name
  container.appendChild(canvas)
  container.appendChild(label)
  const ctx = canvas.getContext('2d')

  // Kickoff formations — members clustered around each side's anchor. A small
  // squad forms a neat column; a large bracket field packs into a spread cluster
  // that stays inside the hex (golden-angle scatter keeps it even, not clumped).
  const _pos = (n, i, side) => {
    const ax = CX + (side === 'home' ? -1 : 1) * HEX_R * 0.44
    if (n <= 3) return { x: ax + _jit(i, side === 'home' ? 1 : 2) * 18, y: CY + (i - (n - 1) / 2) * 26 + _jit(i, 3) * 8 }
    const rad = Math.min(HEX_R * 0.52, 12 + n * 2.4)
    const ga = i * 2.399963           // golden angle
    const rr = rad * Math.sqrt((i + 0.5) / n)
    return { x: ax + Math.cos(ga) * rr * 0.9, y: CY + Math.sin(ga) * rr }
  }
  const _formation = (list, side) => list.map((tag, i) => {
    const p = _pos(list.length, i, side)
    return { tag, side, idx: i, x: p.x, y: p.y, vx: 0, vy: 0, tx: 0, ty: 0, ko: false }
  })
  const st = {
    home: _formation(home.length ? home : ['', '', ''], 'home'),
    away: _formation(away.length ? away : ['', '', ''], 'away'),
    raf: 0, running: true, paused: false, flash: 0, flashCol: '', hover: null, selected: null,
    obj: { x: CX, y: CY, tx: CX, ty: CY },   // contested objective token
    crowd: 0, roar: null,                     // crowd pulse + floating reaction text
    fx: [],                                   // transient combat effects (jutsu/slashes/pulses)
    carrier: null,                            // { side, idx } — who holds the scroll
    zoneCtl: null,                            // 5-band zone control (−1..+1 each)
  }
  // Tag home circles with their squad role + chakra element → tint + FX flavour.
  st.home.forEach((s, i) => { s.role = roster[i]?.role || null; s.element = roster[i]?.element || null })
  const _resetTargets = () => { [...st.home, ...st.away].forEach(s => { s.tx = s.x; s.ty = s.y }); st.obj.tx = CX; st.obj.ty = CY }
  _resetTargets()

  // ── Interaction: hover shows names, click inspects ─────────────────────────
  const _pt = e => {
    const r = canvas.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }
  }
  const _hit = p => [...st.home, ...st.away].find(s => (s.x - p.x) ** 2 + (s.y - p.y) ** 2 <= (R_SHINOBI + 4) ** 2) || null
  const _nameOf = s => s.side === 'home'
    ? (roster[s.idx]?.name || (homeLabel ? `${homeLabel} №${s.idx + 1}` : `№${s.idx + 1}`))
    : (awayLabel ? `${awayLabel} №${s.idx + 1}` : `Opponent №${s.idx + 1}`)
  canvas.addEventListener('pointermove', e => {
    st.hover = _hit(_pt(e))
    canvas.style.cursor = st.hover ? 'pointer' : 'default'
  })
  canvas.addEventListener('pointerleave', () => { st.hover = null })
  canvas.addEventListener('pointerdown', e => {
    const s = _hit(_pt(e))
    st.selected = s
    if (onSelect) onSelect(s ? { side: s.side, idx: s.idx, name: _nameOf(s), ko: s.ko, entry: s.side === 'home' ? roster[s.idx] || null : null } : null)
  })

  // Spawn the combat effects for a beat: the spotlight shinobi's signature action
  // (elemental jutsu / melee slash / support pulse) plus a little ambient skirmish
  // so the whole field looks like it's fighting, not just shoving.
  function _spawnBeatFx(st, i, beat) {
    if (!st.away.length || !st.home.length) return
    const cx = CX + _jit(i, 9) * 55, cy = CY + _jit(i, 11) * 35
    const actor = st.spot || st.home[Math.abs(i) % st.home.length]
    const target = st.away[Math.abs(i * 7 + 1) % st.away.length]
    const role = actor?.role
    if (role === 'medical' || role === 'support') {
      // Support: a pulse over their own side + a covering jutsu at the enemy.
      st.fx.push({ kind: 'pulse', sx: actor.x, sy: actor.y, t: 0, speed: 0.05, color: _roleTint(role).fill })
      const e = _elemFx(actor.element)
      st.fx.push({ kind: 'proj', sx: actor.x, sy: actor.y, tx: cx + 40, ty: cy, t: 0, speed: 0.06, color: e.color })
    } else if (role === 'vanguard' || !actor?.element) {
      // Vanguard / no element: melee — a slash between the actor and an enemy.
      st.fx.push({ kind: 'slash', sx: actor.x, sy: actor.y, tx: target.x, ty: target.y, t: 0, speed: 0.09, color: beat.won ? '#e8d5a3' : '#cc5a4a' })
    } else {
      // Elemental ninjutsu — a coloured jutsu arcs to an enemy and bursts.
      const e = _elemFx(actor.element)
      st.fx.push({ kind: 'proj', sx: actor.x, sy: actor.y, tx: target.x, ty: target.y, t: 0, speed: 0.055, color: e.color })
    }
    // Ambient skirmish: a couple of slashes between random opposing pairs.
    for (let k = 0; k < 2; k++) {
      const h = st.home[Math.abs(i * 3 + k) % st.home.length], a = st.away[Math.abs(i + k * 5) % st.away.length]
      st.fx.push({ kind: 'slash', sx: h.x, sy: h.y, tx: a.x, ty: a.y, t: 0, speed: 0.12, color: '#7a7060' })
    }
    if (st.fx.length > 40) st.fx = st.fx.slice(-40)
  }

  function drawFrame() {
    if (!st.paused) {
      _drawStadium(ctx, arena, st.crowd)
      _drawZoneTint(ctx, st.zoneCtl)
      if (st.crowd > 0) st.crowd -= 0.02
      // Objective token: rides with the carrier when someone holds it, else eases
      // toward its contested drift point.
      const car = _carrierToken(st)
      if (car) { st.obj.tx = car.x + 8; st.obj.ty = car.y - 8 }
      st.obj.x += (st.obj.tx - st.obj.x) * (car ? 0.25 : 0.06)
      st.obj.y += (st.obj.ty - st.obj.y) * (car ? 0.25 : 0.06)
      _drawObjective(ctx, st.obj)
      // Separation pass: tokens repel inside 1.5 diameters — no more stacking
      // into one indistinct blob (blueprint §5.2).
      const everyone = [...st.home, ...st.away]
      for (let a = 0; a < everyone.length; a++) for (let b = a + 1; b < everyone.length; b++) {
        const A = everyone[a], B = everyone[b]
        const dx = B.x - A.x, dy = B.y - A.y
        const d = Math.hypot(dx, dy) || 0.001
        const min = R_SHINOBI * 3
        if (d < min) {
          const push = (min - d) / min * 0.5
          const ux = dx / d, uy = dy / d
          A.vx -= ux * push; A.vy -= uy * push
          B.vx += ux * push; B.vy += uy * push
        }
      }
      const all = [[st.home, '#c9a84c', '#e8d5a3'], [st.away, arena.palette.accent, arena.palette.line]]
      all.forEach(([team, col, edge]) => team.forEach((s, i) => {
        // Snappy steering + role accel profile (§5.1); a spent squad visibly slows.
        const accel = 0.026 * (s.role === 'vanguard' ? 1.2 : s.role === 'medical' ? 0.85 : 1)
        const spdCap = s.stamina != null ? 0.6 + 0.4 * (s.stamina / 100) : 1
        s.vx += (s.tx - s.x) * accel + _jit(i, performance.now() / 900 | 0) * 0.07
        s.vy += (s.ty - s.y) * accel + _jit(i + 7, performance.now() / 900 | 0) * 0.07
        s.vx *= 0.86 * (0.9 + 0.1 * spdCap); s.vy *= 0.86 * (0.9 + 0.1 * spdCap)
        s.x += s.vx; s.y += s.vy
        // keep everyone inside the hex (radial clamp is a good approximation)
        const dx = s.x - CX, dy = s.y - CY, d = Math.hypot(dx, dy * 1.15)
        if (d > HEX_R - R_SHINOBI) { const f = (HEX_R - R_SHINOBI) / d; s.x = CX + dx * f; s.y = CY + dy * f }
        _drawShinobi(ctx, s, col, edge, s === st.hover || s === st.selected || s === st.spot, s === car)
      }))
      // Combat FX drawn over the circles — jutsu, slashes, pulses.
      _updateFx(st); _drawFx(ctx, st.fx)
      // Crowd reaction text — a roar on a big swing, a groan on a KO.
      if (st.roar && st.roar.life > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, st.roar.life)
        ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'
        ctx.fillStyle = st.roar.color
        ctx.fillText(st.roar.text, CX, 30 - (1 - st.roar.life) * 8)
        ctx.restore(); st.roar.life -= 0.02
      }
      if (st.flash > 0) {
        ctx.save(); ctx.globalAlpha = st.flash * 0.5
        ctx.beginPath(); ctx.arc(CX, CY, 30 * (1.4 - st.flash), 0, Math.PI * 2)
        ctx.strokeStyle = st.flashCol; ctx.lineWidth = 3; ctx.stroke(); ctx.restore()
        st.flash -= 0.03
      }
      // team labels in the stands
      if (homeLabel || awayLabel) {
        ctx.font = '8px monospace'; ctx.globalAlpha = 0.75
        ctx.fillStyle = '#c9a84c'; ctx.textAlign = 'left'; ctx.fillText(homeLabel, 8, 14)
        ctx.fillStyle = arena.palette.accent; ctx.textAlign = 'right'; ctx.fillText(awayLabel, W - 8, 14)
        ctx.globalAlpha = 1
      }
      // hover nameplate
      const hs = st.hover || st.selected
      if (hs) {
        const nm = _nameOf(hs)
        ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'
        const tw = ctx.measureText(nm).width + 8
        ctx.fillStyle = 'rgba(6,6,4,.85)'
        ctx.fillRect(hs.x - tw / 2, hs.y - R_SHINOBI - 15, tw, 11)
        ctx.fillStyle = hs.side === 'home' ? '#c9a84c' : arena.palette.accent
        ctx.fillText(nm, hs.x, hs.y - R_SHINOBI - 7)
      }
    }
  }
  function frame() {
    if (!st.running) return
    drawFrame()
    st.raf = requestAnimationFrame(frame)
  }
  st.raf = requestAnimationFrame(frame)
  // rAF is suspended in hidden/backgrounded tabs, but the match clock keeps
  // revealing beats — without a fallback the board would freeze and desync from
  // the text. A slow interval keeps the sim rendering while hidden (also what
  // makes headless verification possible).
  st.iv = setInterval(() => {
    if (typeof document !== 'undefined' && document.hidden && st.running) drawFrame()
  }, 66)

  return {
    /** Choreograph one beat: both sides converge, winner surges through, loser reels.
     *  `spotIdx` (home-side index) is the shinobi the narration names — they lead
     *  the charge and briefly wear a spotlight ring. `koIdx` (home-side) is the
     *  most-spent shinobi caught out on a lost exchange. */
    playBeat(i, beat, spotIdx = -1, koIdx = -1) {
      const cx = CX + _jit(i, 9) * 55, cy = CY + _jit(i, 11) * 35
      const winSide = beat.won ? st.home : st.away
      const loseSide = beat.won ? st.away : st.home
      winSide.forEach((s, k) => { s.tx = cx + _jit(k, 13) * 32; s.ty = cy + _jit(k, 15) * 28 })
      loseSide.forEach((s, k) => {
        s.tx = cx + (beat.won ? 50 : -50) + _jit(k, 17) * 18
        s.ty = cy + _jit(k, 19) * 45
        s.vx += (beat.won ? 2.2 : -2.2); s.vy += _jit(k, 21) * 3
      })
      // Whoever's caught out. On a lost exchange the caller passes the most-spent
      // home shinobi (koIdx) so pitch + narration agree. Otherwise (opposition
      // loses, no stamina model) rotate a cosmetic KO on odd beats.
      let koHome = false
      if (!beat.won && koIdx >= 0 && st.home[koIdx]) { st.home[koIdx].ko = true; koHome = true }
      else if (loseSide.length && i % 2 === 1) loseSide[i % loseSide.length].ko = true
      // Spotlight the acting shinobi — pull them to the front of the clash + ring.
      st.spot = (spotIdx >= 0 && st.home[spotIdx]) ? st.home[spotIdx] : null
      if (st.spot) { st.spot.tx = cx + (beat.won ? -6 : 6); st.spot.ty = cy - 4 }
      st.flash = 1; st.flashCol = beat.won ? '#8fbc8f' : '#cc5a4a'
      _spawnBeatFx(st, i, beat)
      // Objective drifts toward the side that won this exchange.
      st.obj.tx = CX + (beat.won ? -1 : 1) * HEX_R * 0.42; st.obj.ty = cy * 0.5 + CY * 0.5
      // Crowd reacts: a roar when it's your beat, a groan (or a gasp on a KO) when it's theirs.
      st.crowd = 1
      st.roar = koHome ? { text: 'OOF!', color: '#cc5a4a', life: 1 }
        : beat.won ? { text: 'ROAAR!', color: '#8fbc8f', life: 1 }
        : { text: 'groan…', color: '#9a9080', life: 1 }
    },
    /** Final tableau. `result`: 'win' (home rings the centre), 'loss' (away does),
     *  or 'draw' (both sides hold their own half at the line — nobody claims it).
     *  Accepts a legacy boolean for safety. */
    finish(result) {
      const res = result === true ? 'win' : result === false ? 'loss' : (result || 'loss')
      st.home.forEach(s => { s.ko = false }); st.away.forEach(s => { s.ko = false })
      if (res === 'draw') {
        // Honours even — each side lines up on its own side of halfway, objective dead centre.
        const line = (team, side) => team.forEach((s, k) => {
          s.tx = CX + (side === 'home' ? -1 : 1) * HEX_R * 0.30
          s.ty = CY + (k - (team.length - 1) / 2) * Math.min(24, HEX_R * 1.4 / team.length)
        })
        line(st.home, 'home'); line(st.away, 'away')
        st.obj.tx = CX; st.obj.ty = CY
        st.flash = 1; st.flashCol = '#c9a84c'; st.crowd = 0.6
        st.roar = { text: 'HONOURS EVEN', color: '#c9a84c', life: 1 }
        return
      }
      const won = res === 'win'
      const winSide = won ? st.home : st.away
      const loseSide = won ? st.away : st.home
      winSide.forEach((s, k) => {
        const a = (k / winSide.length) * Math.PI * 2
        s.tx = CX + Math.cos(a) * 28; s.ty = CY + Math.sin(a) * 24
      })
      loseSide.forEach((s, k) => { s.tx = CX + (won ? 1 : -1) * HEX_R * 0.72; s.ty = CY + (k - (loseSide.length - 1) / 2) * Math.min(24, HEX_R * 1.4 / loseSide.length) })
      st.flash = 1; st.flashCol = won ? '#c9a84c' : '#cc5a4a'
      st.obj.tx = won ? CX - HEX_R * 0.2 : CX + HEX_R * 0.2; st.obj.ty = CY   // claimed toward the victor
      st.crowd = 1
      st.roar = won ? { text: 'VICTORY!', color: '#c9a84c', life: 1.4 } : { text: '…', color: '#9a9080', life: 0.6 }
    },
    /** Back to kickoff formations — used by the replay control. */
    reset() {
      const re = (team, side) => team.forEach((s, i) => {
        s.ko = false; s.vx = 0; s.vy = 0
        const p = _pos(team.length, i, side)
        s.x = p.x; s.y = p.y; s.tx = s.x; s.ty = s.y
      })
      re(st.home, 'home'); re(st.away, 'away')
      st.flash = 0; st.selected = null; st.spot = null; st.carrier = null; st.zoneCtl = null
      st.obj.x = CX; st.obj.y = CY; st.obj.tx = CX; st.obj.ty = CY; st.crowd = 0; st.roar = null; st.fx = []
    },
    /** Live condition readout: set home-side stamina values (0-100, by index). */
    updateStamina(byIdx = []) {
      st.home.forEach((s, i) => { if (byIdx[i] != null) s.stamina = byIdx[i] })
    },
    /** Zone-control strip from the match engine (5 values, −1..+1). */
    setZoneControl(ctl) { st.zoneCtl = ctl },
    /**
     * Stage one possession-phase event from the match engine script
     * (carry/pass/pass_fail/intercept/strike/block/turnover). Moves the acting
     * tokens, hands the objective around, and pops the event marker — the
     * choreography layer of blueprint §1.3. zoneX = band centre (0..1).
     */
    phaseEvent(ev, zoneX = 0.5) {
      const px = CX - HEX_R + zoneX * HEX_R * 2
      const py = CY + _jit(ev.actor + (ev.at * 40 | 0), 23) * HEX_R * 0.55
      const team = ev.side === 'home' ? st.home : st.away
      const foes = ev.side === 'home' ? st.away : st.home
      const actor = team[ev.actor % team.length]; if (!actor) return
      const mark = (glyph, color) => st.fx.push({ kind: 'marker', glyph, color, sx: px, sy: py - 10, dx: ev.side === 'home' ? 1 : -1, t: 0, speed: 0.02 })
      if (ev.type === 'carry') {
        st.carrier = { side: ev.side, idx: ev.actor % team.length }
        actor.tx = px; actor.ty = py
        // nearest foe reacts — a token presses the new carrier
        const presser = foes[(ev.actor + 1) % foes.length]
        if (presser) { presser.tx = px + (ev.side === 'home' ? 18 : -18); presser.ty = py }
      } else if (ev.type === 'pass') {
        const rcv = team[ev.target % team.length]
        if (rcv) {
          rcv.tx = px; rcv.ty = py + _jit(ev.target, 29) * 20
          st.fx.push({ kind: 'passline', sx: actor.x, sy: actor.y, tx: rcv.tx, ty: rcv.ty, t: 0, speed: 0.05, color: '#e8d5a3' })
          st.carrier = { side: ev.side, idx: ev.target % team.length }
        }
      } else if (ev.type === 'pass_fail') {
        st.fx.push({ kind: 'passline', sx: actor.x, sy: actor.y, tx: px, ty: py, t: 0, speed: 0.05, color: '#cc5a4a', fail: true })
        st.carrier = null
        mark('✕', '#cc5a4a')
      } else if (ev.type === 'intercept') {
        st.carrier = { side: ev.side, idx: ev.actor % team.length }
        actor.tx = px; actor.ty = py
        actor.vx += (ev.side === 'home' ? -1.5 : 1.5)   // burst onto the loose scroll
        mark('⚡', '#87ceeb')
        st.crowd = Math.max(st.crowd, 0.5)
      } else if (ev.type === 'strike' || ev.type === 'block') {
        actor.tx = px + (ev.side === 'home' ? -14 : 14); actor.ty = py
        const e = _elemFx(actor.element)
        st.fx.push({ kind: 'proj', sx: actor.x, sy: actor.y, tx: px, ty: py, t: 0, speed: 0.07, color: e.color })
        if (ev.type === 'block') {
          const blocker = foes[(ev.target ?? 0) % foes.length]
          if (blocker) { blocker.tx = px; blocker.ty = py }
          mark('▣', '#9a9080')
        } else {
          mark('✦', ev.side === 'home' ? '#c9a84c' : arena.palette.accent)
          st.crowd = Math.max(st.crowd, ev.side === 'home' ? 1 : 0.6)
          if (ev.side === 'home') st.roar = { text: 'ROAAR!', color: '#8fbc8f', life: 0.9 }
        }
      } else if (ev.type === 'turnover') {
        st.carrier = null
        actor.tx = px; actor.ty = py
        mark('✕', '#9a9080')
      }
      if (st.fx.length > 48) st.fx = st.fx.slice(-48)
    },
    pause() { st.paused = true },
    resume() { st.paused = false },
    destroy() { st.running = false; cancelAnimationFrame(st.raf); clearInterval(st.iv); canvas.remove(); label.remove() },
  }
}
