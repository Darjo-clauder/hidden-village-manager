/**
 * Audio engine.
 *
 * The game shipped silent — no AudioContext anywhere — which reads as
 * unfinished no matter how deep the simulation underneath is. This is the
 * mixer plus a bank of *procedurally synthesised* effects: every sound here is
 * generated from oscillators and noise at runtime, so there are no binary
 * assets to ship, license or load. Same reasoning as the CSS paper grain.
 *
 * Palette is chosen to sit with the ink-and-parchment theme rather than a
 * generic UI kit: struck woodblock for taps, a plucked string (Karplus-Strong)
 * for confirmations, and a struck temple bell (FM) for the solemn beats.
 *
 * Graph:  [source] → sfxBus  ┐
 *         [source] → musicBus ┴→ masterBus → destination
 *
 * Browsers refuse to start audio before a user gesture, so the context is
 * created lazily on the first real interaction and every play() call is a
 * no-op until then. Nothing here throws if audio is unavailable.
 */

const LS_KEY = 'hvm_audio_v1'

const DEFAULTS = { master: 0.7, music: 0.5, sfx: 0.8, muted: false }

let ctx = null
let bus = null            // { master, music, sfx } GainNodes
let prefs = { ...DEFAULTS }
let noiseBuf = null

// ── Preferences ────────────────────────────────────────────────────────────
export function loadAudioPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) prefs = { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* corrupt or unavailable storage — defaults are fine */ }
  return { ...prefs }
}

export function getAudioPrefs() { return { ...prefs } }

/** Set one bus level (0..1) or the mute flag, persist, and apply live. */
export function setAudioPref(key, value) {
  if (!(key in DEFAULTS)) return
  prefs[key] = key === 'muted' ? !!value : Math.max(0, Math.min(1, Number(value) || 0))
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)) } catch { /* non-fatal */ }
  _applyGains()
  return { ...prefs }
}

function _applyGains() {
  if (!bus) return
  const m = prefs.muted ? 0 : prefs.master
  bus.master.gain.value = m
  bus.music.gain.value = prefs.music
  bus.sfx.gain.value = prefs.sfx
}

// ── Context ────────────────────────────────────────────────────────────────
/**
 * Create the graph. Safe to call repeatedly; only the first call builds it.
 * Must run inside (or after) a user gesture or the context stays suspended.
 */
export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return ctx }
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  try { ctx = new AC() } catch { return null }

  const master = ctx.createGain()
  const music = ctx.createGain()
  const sfx = ctx.createGain()
  music.connect(master); sfx.connect(master); master.connect(ctx.destination)
  bus = { master, music, sfx }
  _applyGains()

  // Two seconds of white noise, reused by every percussive voice.
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
  const d = noiseBuf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return ctx
}

export function audioState() {
  return { available: !!ctx, state: ctx ? ctx.state : 'uninitialised', prefs: { ...prefs } }
}

// ── Voices ─────────────────────────────────────────────────────────────────
function _env(node, t0, attack, decay, peak = 1) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay)
  node.connect(g)
  return g
}

/** Struck woodblock — filtered noise burst. The everyday UI tap. */
function _woodblock(t0, { freq = 1400, decay = 0.07, peak = 0.5 } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 7
  src.connect(bp)
  const g = _env(bp, t0, 0.002, decay, peak)
  g.connect(bus.sfx)
  src.start(t0); src.stop(t0 + decay + 0.05)
}

/**
 * Plucked string (Karplus-Strong): a short noise burst fed through a delay
 * line with a lossy feedback path, which is what gives it the koto-ish decay.
 */
function _pluck(t0, freq = 440, { decay = 0.6, peak = 0.35 } = {}) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf
  const burst = ctx.createGain()
  burst.gain.setValueAtTime(1, t0)
  burst.gain.setValueAtTime(0, t0 + 1 / freq)
  const delay = ctx.createDelay(1); delay.delayTime.value = 1 / freq
  const fb = ctx.createGain(); fb.gain.value = 0.93
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200
  src.connect(burst); burst.connect(delay)
  delay.connect(lp); lp.connect(fb); fb.connect(delay)   // lossy loop
  const g = _env(delay, t0, 0.005, decay, peak)
  g.connect(bus.sfx)
  src.start(t0); src.stop(t0 + 0.05)
}

/** Struck bell — two-operator FM, long decay. Reserved for solemn events. */
function _bell(t0, freq = 320, { decay = 2.4, peak = 0.32 } = {}) {
  const carrier = ctx.createOscillator(); carrier.frequency.value = freq
  const mod = ctx.createOscillator(); mod.frequency.value = freq * 1.41   // inharmonic → metallic
  const modGain = ctx.createGain(); modGain.gain.value = freq * 1.2
  mod.connect(modGain); modGain.connect(carrier.frequency)
  const g = _env(carrier, t0, 0.004, decay, peak)
  g.connect(bus.sfx)
  carrier.start(t0); mod.start(t0)
  carrier.stop(t0 + decay + 0.1); mod.stop(t0 + decay + 0.1)
}

// ── Bank ───────────────────────────────────────────────────────────────────
// Pentatonic degrees (Hz) so stacked notes stay consonant in any order.
const P = { d1: 293.66, d2: 329.63, d3: 392.00, d4: 440.00, d5: 523.25, d6: 587.33 }

const BANK = {
  click:   t => _woodblock(t, { freq: 1600, decay: 0.05, peak: 0.35 }),
  tab:     t => _woodblock(t, { freq: 1150, decay: 0.06, peak: 0.3 }),
  confirm: t => { _pluck(t, P.d3); _pluck(t + 0.07, P.d5) },
  deny:    t => _woodblock(t, { freq: 260, decay: 0.16, peak: 0.5 }),
  notify:  t => { _pluck(t, P.d5, { peak: 0.3 }); _pluck(t + 0.1, P.d6, { peak: 0.22 }) },
  coin:    t => { _pluck(t, P.d6, { decay: 0.35, peak: 0.22 }); _pluck(t + 0.05, P.d5, { decay: 0.3, peak: 0.18 }) },
  // Month advance — a low struck block, the drum that moves the calendar on.
  turn:    t => { _woodblock(t, { freq: 420, decay: 0.18, peak: 0.55 }); _woodblock(t + 0.09, { freq: 300, decay: 0.22, peak: 0.35 }) },
  success: t => { _pluck(t, P.d3); _pluck(t + 0.08, P.d4); _pluck(t + 0.16, P.d6, { decay: 0.9 }) },
  fail:    t => { _woodblock(t, { freq: 240, decay: 0.2, peak: 0.5 }); _bell(t + 0.05, 150, { decay: 1.1, peak: 0.16 }) },
  // A death in the village. Deliberately the longest, quietest sound here.
  toll:    t => { _bell(t, 190, { decay: 3.2, peak: 0.3 }); _bell(t + 0.5, 190, { decay: 3.0, peak: 0.18 }) },
  victory: t => { _pluck(t, P.d3); _pluck(t + 0.09, P.d5); _pluck(t + 0.18, P.d6); _bell(t + 0.28, 480, { decay: 2.2, peak: 0.2 }) },
}

export const SFX_NAMES = Object.keys(BANK)

/** Play a named effect. No-op before initAudio(), when muted, or if unknown. */
export function sfx(name) {
  if (!ctx || !bus || prefs.muted || !BANK[name]) return false
  if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); return false }
  try { BANK[name](ctx.currentTime + 0.001); return true } catch { return false }
}

/**
 * Music bus is built and mixed but intentionally empty: composed or licensed
 * tracks are a content decision, not an engineering one. Anything connected to
 * `bus.music` here inherits the volume control and mute for free.
 */
export function musicBus() { return bus ? bus.music : null }
