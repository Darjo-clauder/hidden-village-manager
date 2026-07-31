/**
 * Options screen.
 *
 * The game had no settings of any kind — no volume, no text size, no way to
 * turn motion off — which is a hard gap for a paid release. This is the one
 * place a player changes how the game presents itself.
 *
 * Display prefs live here in `hvm_display_v1`; audio levels stay owned by
 * audio.js (`hvm_audio_v1`) and are only surfaced by this screen. Everything
 * applies live on change, so there is no apply/cancel step to get wrong.
 */

import { getAudioPrefs, setAudioPref, sfx } from './audio.js'
import { G } from './state.js'

const LS_KEY = 'hvm_display_v1'
const DEFAULTS = { fsScale: 1, reduceMotion: false }

let disp = { ...DEFAULTS }

const TEXT_SIZES = [
  { id: 0.9,  label: 'Compact' },
  { id: 1,    label: 'Default' },
  { id: 1.15, label: 'Large' },
  { id: 1.3,  label: 'Larger' },
]

export function loadDisplayPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) disp = { ...DEFAULTS, ...JSON.parse(raw) }
  } catch { /* corrupt or unavailable storage — defaults are fine */ }
  applyDisplayPrefs()
  return { ...disp }
}

export function getDisplayPrefs() { return { ...disp } }

function _persist() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(disp)) } catch { /* non-fatal */ }
}

/** Push display prefs onto the document root, where the stylesheet reads them. */
export function applyDisplayPrefs() {
  const root = document.documentElement
  root.style.setProperty('--fs-scale', String(disp.fsScale))
  root.setAttribute('data-reduce-motion', disp.reduceMotion ? '1' : '0')
}

export function setDisplayPref(key, value) {
  if (!(key in DEFAULTS)) return
  disp[key] = key === 'reduceMotion' ? !!value : Number(value) || 1
  _persist(); applyDisplayPrefs(); renderSettings()
}

// ── Screen ─────────────────────────────────────────────────────────────────
export function openSettings() {
  const ov = document.getElementById('ov-settings')
  if (!ov) return
  renderSettings()
  ov.classList.add('open')
  sfx('click')
}

export function closeSettings() {
  document.getElementById('ov-settings')?.classList.remove('open')
  sfx('click')
}

/** Volume slider handler — previews the bus being adjusted so it's audible. */
export function setVolume(bus, value) {
  setAudioPref(bus, Number(value) / 100)
  renderSettings()
  if (bus !== 'music') sfx('click')
}

export function toggleMute() {
  const a = getAudioPrefs()
  setAudioPref('muted', !a.muted)
  renderSettings()
  if (a.muted) sfx('confirm')   // was muted, now on — confirm it audibly
}

export function toggleReduceMotion() { setDisplayPref('reduceMotion', !disp.reduceMotion) }

export function setTextSize(scale) { setDisplayPref('fsScale', scale) }

function _slider(label, hint, bus, value) {
  return `<div class="set-row">
    <span class="set-label">${label}<span class="set-hint">${hint}</span></span>
    <input type="range" min="0" max="100" value="${Math.round(value * 100)}"
           oninput="setVolume('${bus}',this.value)" aria-label="${label}">
    <span class="set-val">${Math.round(value * 100)}%</span>
  </div>`
}

export function renderSettings() {
  const host = document.getElementById('set-body')
  if (!host) return
  const a = getAudioPrefs()
  const cb = !!G._a11yColorblind

  host.innerHTML = `
    <div class="set-group">
      <div class="sect">Audio</div>
      <div class="set-row">
        <span class="set-label">Sound<span class="set-hint">Master switch for all audio</span></span>
        <button class="set-toggle ${a.muted ? '' : 'on'}" onclick="toggleMute()">${a.muted ? 'Muted' : 'On'}</button>
      </div>
      ${_slider('Master volume', 'Overall level', 'master', a.master)}
      ${_slider('Music', 'Ambient score', 'music', a.music)}
      ${_slider('Effects', 'Interface and match sounds', 'sfx', a.sfx)}
    </div>

    <div class="set-group">
      <div class="sect">Display</div>
      <div class="set-row">
        <span class="set-label">Text size<span class="set-hint">Rescales the whole interface proportionally</span></span>
        <div class="set-seg">
          ${TEXT_SIZES.map(s => `<button class="${disp.fsScale === s.id ? 'on' : ''}" onclick="setTextSize(${s.id})">${s.label}</button>`).join('')}
        </div>
      </div>
      <div class="set-row">
        <span class="set-label">Reduce motion<span class="set-hint">Stops animation and the news ticker</span></span>
        <button class="set-toggle ${disp.reduceMotion ? 'on' : ''}" onclick="toggleReduceMotion()">${disp.reduceMotion ? 'On' : 'Off'}</button>
      </div>
      <div class="set-row">
        <span class="set-label">Colourblind mode<span class="set-hint">Adds pattern tags alongside nation colours</span></span>
        <button class="set-toggle ${cb ? 'on' : ''}" onclick="toggleColorblind();renderSettings()">${cb ? 'On' : 'Off'}</button>
      </div>
    </div>
  `
}
