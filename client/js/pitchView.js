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

function _drawShinobi(ctx, s, color, edge, hot) {
  ctx.save()
  ctx.globalAlpha = 0.25
  ctx.beginPath(); ctx.arc(s.x - s.vx * 3, s.y - s.vy * 3, R_SHINOBI * 0.7, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill()
  ctx.restore()
  if (hot) { // hovered/selected — glow ring
    ctx.beginPath(); ctx.arc(s.x, s.y, R_SHINOBI + 3.5, 0, Math.PI * 2)
    ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.85; ctx.lineWidth = 1.5; ctx.stroke(); ctx.globalAlpha = 1
  }
  // Home circles are tinted by squad role (read the board at a glance); the
  // opposition stays the arena's single accent colour.
  const tint = s.role ? _roleTint(s.role) : null
  const fill = s.ko ? '#555' : (tint ? tint.fill : color)
  const stroke = tint ? tint.edge : edge
  ctx.beginPath(); ctx.arc(s.x, s.y, R_SHINOBI, 0, Math.PI * 2)
  ctx.fillStyle = fill; ctx.fill()
  ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke()
  if (s.tag) {
    ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'
    ctx.fillStyle = '#0a0a0a'
    ctx.fillText(s.tag, s.x, s.y + 2.5)
  }
  if (s.ko) {
    ctx.strokeStyle = '#cc5a4a'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(s.x - 4, s.y - 4); ctx.lineTo(s.x + 4, s.y + 4)
    ctx.moveTo(s.x + 4, s.y - 4); ctx.lineTo(s.x - 4, s.y + 4); ctx.stroke()
  }
  // Condition bar — the live stamina readout under your shinobi.
  if (s.stamina != null) {
    const w = 16, x0 = s.x - w / 2, y0 = s.y + R_SHINOBI + 3
    ctx.fillStyle = 'rgba(6,6,4,.8)'; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 4)
    const col = s.stamina >= 60 ? '#8fbc8f' : s.stamina >= 35 ? '#c9a84c' : s.stamina >= 15 ? '#f0a030' : '#cc5a4a'
    ctx.fillStyle = col; ctx.fillRect(x0, y0, w * Math.max(0, s.stamina) / 100, 2)
  }
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

  // Kickoff formations — arcs inside each half of the hex.
  const _formation = (list, side) => list.map((tag, i) => ({
    tag, side, idx: i,
    x: CX + (side === 'home' ? -1 : 1) * (HEX_R * 0.5 + _jit(i, side === 'home' ? 1 : 2) * 18),
    y: CY + (i - (list.length - 1) / 2) * 26 + _jit(i, side === 'home' ? 3 : 4) * 10,
    vx: 0, vy: 0, tx: 0, ty: 0, ko: false,
  }))
  const st = {
    home: _formation(home.length ? home : ['', '', ''], 'home'),
    away: _formation(away.length ? away : ['', '', ''], 'away'),
    raf: 0, running: true, paused: false, flash: 0, flashCol: '', hover: null, selected: null,
    obj: { x: CX, y: CY, tx: CX, ty: CY },   // contested objective token
    crowd: 0, roar: null,                     // crowd pulse + floating reaction text
  }
  // Tag home circles with their squad role → role-tinted rendering + legend.
  st.home.forEach((s, i) => { s.role = roster[i]?.role || null })
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

  function frame() {
    if (!st.running) return
    if (!st.paused) {
      _drawStadium(ctx, arena, st.crowd)
      if (st.crowd > 0) st.crowd -= 0.02
      // Objective token — a contested scroll dragged toward whoever's winning.
      st.obj.x += (st.obj.tx - st.obj.x) * 0.06
      st.obj.y += (st.obj.ty - st.obj.y) * 0.06
      _drawObjective(ctx, st.obj)
      const all = [[st.home, '#c9a84c', '#e8d5a3'], [st.away, arena.palette.accent, arena.palette.line]]
      all.forEach(([team, col, edge]) => team.forEach((s, i) => {
        s.vx += (s.tx - s.x) * 0.012 + _jit(i, performance.now() / 900 | 0) * 0.12
        s.vy += (s.ty - s.y) * 0.012 + _jit(i + 7, performance.now() / 900 | 0) * 0.12
        s.vx *= 0.9; s.vy *= 0.9
        s.x += s.vx; s.y += s.vy
        // keep everyone inside the hex (radial clamp is a good approximation)
        const dx = s.x - CX, dy = s.y - CY, d = Math.hypot(dx, dy * 1.15)
        if (d > HEX_R - R_SHINOBI) { const f = (HEX_R - R_SHINOBI) / d; s.x = CX + dx * f; s.y = CY + dy * f }
        _drawShinobi(ctx, s, col, edge, s === st.hover || s === st.selected || s === st.spot)
      }))
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
    st.raf = requestAnimationFrame(frame)
  }
  st.raf = requestAnimationFrame(frame)

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
      // Objective drifts toward the side that won this exchange.
      st.obj.tx = CX + (beat.won ? -1 : 1) * HEX_R * 0.42; st.obj.ty = cy * 0.5 + CY * 0.5
      // Crowd reacts: a roar when it's your beat, a groan (or a gasp on a KO) when it's theirs.
      st.crowd = 1
      st.roar = koHome ? { text: 'OOF!', color: '#cc5a4a', life: 1 }
        : beat.won ? { text: 'ROAAR!', color: '#8fbc8f', life: 1 }
        : { text: 'groan…', color: '#9a9080', life: 1 }
    },
    /** Final tableau — winners ring the centre, losers scatter to their end. */
    finish(won) {
      const winSide = won ? st.home : st.away
      const loseSide = won ? st.away : st.home
      winSide.forEach((s, k) => {
        const a = (k / winSide.length) * Math.PI * 2
        s.tx = CX + Math.cos(a) * 28; s.ty = CY + Math.sin(a) * 24; s.ko = false
      })
      loseSide.forEach((s, k) => { s.tx = CX + (won ? 1 : -1) * HEX_R * 0.72; s.ty = CY + (k - (loseSide.length - 1) / 2) * 24 })
      st.flash = 1; st.flashCol = won ? '#c9a84c' : '#cc5a4a'
      st.obj.tx = CX; st.obj.ty = CY   // objective claimed at the centre
      st.crowd = 1
      st.roar = won ? { text: 'CHAMPIONS!', color: '#c9a84c', life: 1.4 } : { text: '…', color: '#9a9080', life: 0.6 }
    },
    /** Back to kickoff formations — used by the replay control. */
    reset() {
      const re = (team, side) => team.forEach((s, i) => {
        s.ko = false; s.vx = 0; s.vy = 0
        s.x = CX + (side === 'home' ? -1 : 1) * (HEX_R * 0.5 + _jit(i, side === 'home' ? 1 : 2) * 18)
        s.y = CY + (i - (team.length - 1) / 2) * 26 + _jit(i, side === 'home' ? 3 : 4) * 10
        s.tx = s.x; s.ty = s.y
      })
      re(st.home, 'home'); re(st.away, 'away')
      st.flash = 0; st.selected = null; st.spot = null
      st.obj.x = CX; st.obj.y = CY; st.obj.tx = CX; st.obj.ty = CY; st.crowd = 0; st.roar = null
    },
    /** Live condition readout: set home-side stamina values (0-100, by index). */
    updateStamina(byIdx = []) {
      st.home.forEach((s, i) => { if (byIdx[i] != null) s.stamina = byIdx[i] })
    },
    pause() { st.paused = true },
    resume() { st.paused = false },
    destroy() { st.running = false; cancelAnimationFrame(st.raf); canvas.remove(); label.remove() },
  }
}
