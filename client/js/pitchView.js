/**
 * Animated 2D pitch view — the FM24/FHM-style match window for the live battle
 * viewer. A themed top-down arena (see shared/constants/arenas.js) with moving
 * circles for shinobi: gold for your side, arena-accent for the opposition.
 *
 * Pure presentation driven by the already-resolved beat sequence — each beat
 * choreographs both squads toward a clash point, the winning side surges and
 * the losing side is knocked back. No engine state is read or written.
 *
 * mountPitch(container, { arena, home, away }) → controller:
 *   playBeat(i, beat)  — animate one beat ({ won, momentum })
 *   finish(won)        — final tableau (winners ring the centre)
 *   destroy()          — stop rAF + drop the canvas
 */

const W = 400, H = 230          // internal canvas resolution (CSS scales it)
const R_SHINOBI = 7             // circle radius

function _px(v, axis) { return axis === 'x' ? v / 100 * W : v / 100 * H }

// Deterministic per-index jitter so formations look organic but stable.
function _jit(i, salt = 0) { const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453; return (s - Math.floor(s)) - 0.5 }

function _drawArena(ctx, arena) {
  const { ground, groundAlt, line, glow } = arena.palette
  // Terrain banding — FM pitch stripes, arena-flavoured.
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? groundAlt : ground
    ctx.fillRect(i * (W / 8), 0, W / 8, H)
  }
  // Props
  ctx.save()
  ctx.globalAlpha = 0.5
  ;(arena.props || []).forEach(p => {
    ctx.strokeStyle = glow; ctx.fillStyle = glow; ctx.lineWidth = 1.5
    const x = _px(p.x, 'x'), y = _px(p.y, 'y')
    if (p.type === 'ring') { ctx.beginPath(); ctx.arc(x, y, _px(p.r, 'x'), 0, Math.PI * 2); ctx.stroke() }
    else if (p.type === 'disc') { ctx.beginPath(); ctx.arc(x, y, _px(p.r, 'x'), 0, Math.PI * 2); ctx.fill() }
    else if (p.type === 'rect') { ctx.fillRect(x, y, _px(p.w, 'x'), _px(p.h, 'y')) }
    else if (p.type === 'diamond') {
      const r = _px(p.r, 'x')
      ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill()
    } else if (p.type === 'hatch') {
      const x2 = x + _px(p.w, 'x'), y2 = y + _px(p.h, 'y')
      ctx.beginPath()
      for (let hx = x - (y2 - y); hx < x2; hx += 9) { ctx.moveTo(hx, y2); ctx.lineTo(hx + (y2 - y), y) }
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, x2 - x, y2 - y); ctx.clip()
      for (let hx = x - (y2 - y); hx < x2; hx += 9) { ctx.beginPath(); ctx.moveTo(hx, y2); ctx.lineTo(hx + (y2 - y), y); ctx.stroke() }
      ctx.restore()
    }
  })
  ctx.restore()
  // Boundary + halfway line + centre mark — the sports-sim grammar.
  ctx.strokeStyle = line; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.5
  ctx.strokeRect(6, 6, W - 12, H - 12)
  ctx.beginPath(); ctx.moveTo(W / 2, 6); ctx.lineTo(W / 2, H - 6); ctx.stroke()
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 24, 0, Math.PI * 2); ctx.stroke()
  ctx.globalAlpha = 1
}

function _drawShinobi(ctx, s, color, edge) {
  // Motion trail
  ctx.save()
  ctx.globalAlpha = 0.25
  ctx.beginPath(); ctx.arc(s.x - s.vx * 3, s.y - s.vy * 3, R_SHINOBI * 0.7, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill()
  ctx.restore()
  ctx.beginPath(); ctx.arc(s.x, s.y, R_SHINOBI, 0, Math.PI * 2)
  ctx.fillStyle = color; ctx.fill()
  ctx.lineWidth = 1.5; ctx.strokeStyle = edge; ctx.stroke()
  if (s.tag) {
    ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center'
    ctx.fillStyle = '#0a0a0a'
    ctx.fillText(s.tag, s.x, s.y + 2.5)
  }
  if (s.ko) { // knocked back — struck-out marker
    ctx.strokeStyle = '#cc5a4a'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(s.x - 4, s.y - 4); ctx.lineTo(s.x + 4, s.y + 4)
    ctx.moveTo(s.x + 4, s.y - 4); ctx.lineTo(s.x - 4, s.y + 4); ctx.stroke()
  }
}

export function mountPitch(container, { arena, home = [], away = [], homeLabel = '', awayLabel = '' } = {}) {
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

  const mk = (list, side) => list.map((tag, i) => ({
    tag,
    x: side === 'home' ? W * 0.25 + _jit(i, 1) * 40 : W * 0.75 + _jit(i, 2) * 40,
    y: H * (0.25 + (i / Math.max(1, list.length - 1)) * 0.5) + _jit(i, side === 'home' ? 3 : 4) * 16,
    vx: 0, vy: 0, tx: 0, ty: 0, ko: false,
  }))
  const st = {
    home: mk(home.length ? home : ['', '', ''], 'home'),
    away: mk(away.length ? away : ['', '', ''], 'away'),
    raf: 0, running: true, flash: 0, flashCol: '',
  }
  st.home.forEach(s => { s.tx = s.x; s.ty = s.y })
  st.away.forEach(s => { s.tx = s.x; s.ty = s.y })

  function frame() {
    if (!st.running) return
    _drawArena(ctx, arena)
    // steer everyone toward their targets
    const all = [[st.home, '#c9a84c', '#e8d5a3'], [st.away, arena.palette.accent, arena.palette.line]]
    all.forEach(([team, col, edge]) => team.forEach((s, i) => {
      s.vx += (s.tx - s.x) * 0.012 + _jit(i, performance.now() / 900 | 0) * 0.12
      s.vy += (s.ty - s.y) * 0.012 + _jit(i + 7, performance.now() / 900 | 0) * 0.12
      s.vx *= 0.9; s.vy *= 0.9
      s.x += s.vx; s.y += s.vy
      _drawShinobi(ctx, s, s.ko ? '#555' : col, edge)
    }))
    if (st.flash > 0) { // clash flash at centre
      ctx.save(); ctx.globalAlpha = st.flash * 0.5
      ctx.beginPath(); ctx.arc(W / 2, H / 2, 30 * (1.4 - st.flash), 0, Math.PI * 2)
      ctx.strokeStyle = st.flashCol; ctx.lineWidth = 3; ctx.stroke(); ctx.restore()
      st.flash -= 0.03
    }
    if (homeLabel || awayLabel) {
      ctx.font = '8px monospace'; ctx.globalAlpha = 0.7
      ctx.fillStyle = '#c9a84c'; ctx.textAlign = 'left'; ctx.fillText(homeLabel, 10, 16)
      ctx.fillStyle = arena.palette.accent; ctx.textAlign = 'right'; ctx.fillText(awayLabel, W - 10, 16)
      ctx.globalAlpha = 1
    }
    st.raf = requestAnimationFrame(frame)
  }
  st.raf = requestAnimationFrame(frame)

  return {
    /** Choreograph one beat: both sides converge, winner surges through, loser reels. */
    playBeat(i, beat) {
      const cx = W / 2 + _jit(i, 9) * 60, cy = H / 2 + _jit(i, 11) * 40
      const winSide = beat.won ? st.home : st.away
      const loseSide = beat.won ? st.away : st.home
      winSide.forEach((s, k) => { s.tx = cx + _jit(k, 13) * 34; s.ty = cy + _jit(k, 15) * 30 })
      loseSide.forEach((s, k) => {
        const back = beat.won ? 1 : -1 // losers pushed toward their own end
        s.tx = cx + back * (40 + _jit(k, 17) * 20) * (beat.won ? 1 : -1) + (beat.won ? 55 : -55)
        s.ty = cy + _jit(k, 19) * 55
        s.vx += (beat.won ? 2.2 : -2.2); s.vy += _jit(k, 21) * 3
      })
      // one straggler on the losing side marks the hit
      if (loseSide.length && i % 2 === 1) loseSide[i % loseSide.length].ko = true
      st.flash = 1; st.flashCol = beat.won ? '#8fbc8f' : '#cc5a4a'
    },
    /** Final tableau — winners ring the centre, losers scatter to their end. */
    finish(won) {
      const winSide = won ? st.home : st.away
      const loseSide = won ? st.away : st.home
      winSide.forEach((s, k) => {
        const a = (k / winSide.length) * Math.PI * 2
        s.tx = W / 2 + Math.cos(a) * 28; s.ty = H / 2 + Math.sin(a) * 24; s.ko = false
      })
      loseSide.forEach((s, k) => { s.tx = won ? W * 0.9 : W * 0.1; s.ty = H * (0.2 + k * 0.18) })
      st.flash = 1; st.flashCol = won ? '#c9a84c' : '#cc5a4a'
    },
    destroy() { st.running = false; cancelAnimationFrame(st.raf); canvas.remove(); label.remove() },
  }
}
