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

function _drawStadium(ctx, arena) {
  const { ground, groundAlt, line, glow, accent } = arena.palette
  // Beyond the stands — night.
  ctx.fillStyle = '#060604'; ctx.fillRect(0, 0, W, H)
  // Stands: a wider hex ring packed with a deterministic crowd.
  _hexPath(ctx, CX, CY, STAND_R); ctx.fillStyle = '#141210'; ctx.fill()
  ctx.save()
  _hexPath(ctx, CX, CY, STAND_R); ctx.clip()
  for (let i = 0; i < 260; i++) {
    const a = _jit(i, 41) * Math.PI * 2 * 2
    const rr = HEX_R + 4 + (_jit(i, 43) + 0.5) * (STAND_R - HEX_R - 6)
    const x = CX + Math.cos(a) * rr * 1.04, y = CY + Math.sin(a) * rr * 0.94
    ctx.fillStyle = i % 3 ? '#2a251c' : glow
    ctx.globalAlpha = 0.7
    ctx.fillRect(x, y, 2, 2)
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
  ctx.beginPath(); ctx.arc(s.x, s.y, R_SHINOBI, 0, Math.PI * 2)
  ctx.fillStyle = s.ko ? '#555' : color; ctx.fill()
  ctx.lineWidth = 1.5; ctx.strokeStyle = edge; ctx.stroke()
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
  }
  const _resetTargets = () => { [...st.home, ...st.away].forEach(s => { s.tx = s.x; s.ty = s.y }) }
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
      _drawStadium(ctx, arena)
      const all = [[st.home, '#c9a84c', '#e8d5a3'], [st.away, arena.palette.accent, arena.palette.line]]
      all.forEach(([team, col, edge]) => team.forEach((s, i) => {
        s.vx += (s.tx - s.x) * 0.012 + _jit(i, performance.now() / 900 | 0) * 0.12
        s.vy += (s.ty - s.y) * 0.012 + _jit(i + 7, performance.now() / 900 | 0) * 0.12
        s.vx *= 0.9; s.vy *= 0.9
        s.x += s.vx; s.y += s.vy
        // keep everyone inside the hex (radial clamp is a good approximation)
        const dx = s.x - CX, dy = s.y - CY, d = Math.hypot(dx, dy * 1.15)
        if (d > HEX_R - R_SHINOBI) { const f = (HEX_R - R_SHINOBI) / d; s.x = CX + dx * f; s.y = CY + dy * f }
        _drawShinobi(ctx, s, col, edge, s === st.hover || s === st.selected)
      }))
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
    /** Choreograph one beat: both sides converge, winner surges through, loser reels. */
    playBeat(i, beat) {
      const cx = CX + _jit(i, 9) * 55, cy = CY + _jit(i, 11) * 35
      const winSide = beat.won ? st.home : st.away
      const loseSide = beat.won ? st.away : st.home
      winSide.forEach((s, k) => { s.tx = cx + _jit(k, 13) * 32; s.ty = cy + _jit(k, 15) * 28 })
      loseSide.forEach((s, k) => {
        s.tx = cx + (beat.won ? 50 : -50) + _jit(k, 17) * 18
        s.ty = cy + _jit(k, 19) * 45
        s.vx += (beat.won ? 2.2 : -2.2); s.vy += _jit(k, 21) * 3
      })
      if (loseSide.length && i % 2 === 1) loseSide[i % loseSide.length].ko = true
      st.flash = 1; st.flashCol = beat.won ? '#8fbc8f' : '#cc5a4a'
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
      st.flash = 0; st.selected = null
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
