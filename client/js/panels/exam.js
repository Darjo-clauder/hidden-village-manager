import { G, ui, sPow, rnd, sn } from '../state.js'
import { RANKS } from '../constants.js'
import { aL, ntf, upUI, schEx } from '../ui.js'

export function rEx() {
  const el = document.getElementById('exl')
  if (G.examActive) { rExA(el); return }
  if (!G.examSched) {
    el.innerHTML = '<div style="color:#7a7060;font-size:10px">No exam scheduled.<br><br><button class="gb" onclick="schEx()">Request exam</button></div>'
    return
  }
  const cands = G.shinobi.filter(s => (s.ri === 0 || s.ri === 1) && s.status === 'available')
  el.innerHTML =
    '<div style="font-size:9px;color:#7a7060;margin-bottom:12px">Enter genin/chunin (max 4).</div>' +
    '<div style="margin-bottom:12px">' +
    (cands.map(s => {
      const ent = G.examCands.includes(s.id)
      return `<div class="pi" onclick="tEC('${s.id}')" style="${ent ? 'border-color:#c9a84c;background:rgba(201,168,76,0.08)' : ''}"><div><div style="font-size:10px;color:#e8e0cc">${sn(s)}</div><div style="font-size:8px;color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</div></div>${ent ? '<span style="color:#c9a84c">✓</span>' : ''}</div>`
    }).join('') || '<div style="color:#7a7060;font-size:9px">No eligible candidates.</div>') +
    '</div>' +
    (G.examCands.length ? '<button class="gb" onclick="startEx()">Start Exam ►</button>' : '') +
    (G.examResults.length ? '<div style="margin-top:14px;font-size:8px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:7px">Recent Results</div>' + G.examResults.slice(-8).map(r => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${r.promoted ? '#8fbc8f' : '#7a7060'}">${r.name}: ${r.result}${r.promoted ? ' → Promoted!' : ''}</div>`).join('') : '')
}

export function tEC(id) {
  if (G.examCands.includes(id)) G.examCands = G.examCands.filter(x => x !== id)
  else if (G.examCands.length < 4) G.examCands.push(id)
  rEx()
}

export function startEx() {
  if (!G.examCands.length) { ntf('Add candidates!'); return }
  G.examActive = true; ui.exSt = { round: 0, survivors: [...G.examCands] }
  G.examCands.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s) s.status = 'exam' })
  rEx()
}

function rExA(el) {
  const rounds = ['Written Test', 'Forest Survival', 'Combat Rounds', 'Final Evaluation'], r = ui.exSt.round
  el.innerHTML = `<div style="background:#0d0d0d;border:1px solid #c9a84c;padding:14px"><div style="font-size:8px;letter-spacing:3px;color:#c9a84c;text-transform:uppercase;margin-bottom:8px">Round ${r + 1}: ${rounds[r] || 'Finals'}</div><div style="margin-bottom:10px">${ui.exSt.survivors.map(id => { const s = G.shinobi.find(x => x.id === id); return s ? `<div style="font-size:9px;padding:3px 0;border-bottom:1px solid #2e2a22;color:#e8e0cc">${sn(s)} <span style="color:#7a7060">${RANKS[s.ri]} · Pwr ${sPow(s)}</span></div>` : '' }).join('')}</div><button class="gb" onclick="runRound()">Run Round ${r + 1} ►</button></div>`
}

export function runRound() {
  const rounds = ['Written Test', 'Forest Survival', 'Combat Rounds', 'Final Evaluation'], r = ui.exSt.round
  let surv = [...ui.exSt.survivors]; const res = []
  if (r === 0) {
    surv = surv.filter(id => { const s = G.shinobi.find(x => x.id === id); if (!s) return false; const p = Math.random() < (0.5 + s.stats.intelligence / 200); res.push({ id, name: sn(s), result: p ? 'Passed written test' : 'Failed written test', promoted: false }); return p })
  } else if (r === 1) {
    surv = surv.filter(id => { const s = G.shinobi.find(x => x.id === id); if (!s) return false; const p = Math.random() < (0.4 + (s.stats.speed + s.stats.chakra) / 400); res.push({ id, name: sn(s), result: p ? 'Survived the forest' : 'Eliminated in forest', promoted: false }); return p })
  } else if (r === 2) {
    const sh = [...surv].sort(() => Math.random() - 0.5), lose = []
    for (let i = 0; i < sh.length - 1; i += 2) {
      const a = G.shinobi.find(x => x.id === sh[i]), b = G.shinobi.find(x => x.id === sh[i + 1])
      if (!a || !b) continue
      const aw = sPow(a) + rnd(-8, 8) >= sPow(b) + rnd(-8, 8)
      if (aw) lose.push(b.id); else lose.push(a.id)
      res.push({ id: a.id, name: sn(a), result: aw ? 'Defeated ' + sn(b) : 'Lost to ' + sn(b), promoted: false })
      res.push({ id: b.id, name: sn(b), result: aw ? 'Lost to ' + sn(a) : 'Defeated ' + sn(a), promoted: false })
    }
    surv = surv.filter(id => !lose.includes(id))
  } else {
    surv.forEach(id => {
      const s = G.shinobi.find(x => x.id === id); if (!s) return
      const prom = Math.random() < 0.65
      if (prom && s.ri < 4) { s.ri++; s.salary = 500 + s.ri * 400; res.push({ id, name: sn(s), result: 'Promoted to ' + RANKS[s.ri] + '!', promoted: true }); aL(sn(s) + ' promoted via Exam!', 'good') }
      else res.push({ id, name: sn(s), result: 'Good showing, not promoted.', promoted: false })
      s.status = 'available'; s.missId = null
    })
    G.examCands.forEach(id => { const s = G.shinobi.find(x => x.id === id); if (s && s.status === 'exam') s.status = 'available' })
    G.examResults.push(...res); G.examActive = false; G.examSched = false; G.examCands = []; ui.exSt = null
    schEx()
    document.getElementById('ef-c').innerHTML = '<div style="font-size:9px;color:#7a7060;margin-bottom:10px">Exam complete!</div>' + res.map(r => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${r.promoted ? '#8fbc8f' : '#e8e0cc'}"><span style="color:#c9a84c">${r.name}</span> — ${r.result}</div>`).join('')
    document.getElementById('ov-examfight').classList.add('open'); upUI(); return
  }
  ui.exSt.survivors = surv; ui.exSt.round++; G.examResults.push(...res)
  document.getElementById('ef-c').innerHTML =
    `<div style="font-size:9px;color:#7a7060;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px">Round ${r + 1}: ${rounds[r]}</div>` +
    res.map(x => `<div style="font-size:9px;padding:4px 0;border-bottom:1px solid #2e2a22;color:${x.result.includes('Passed') || x.result.includes('Survived') || x.result.includes('Defeated') ? '#8fbc8f' : '#f66'}"><span style="color:#c9a84c">${x.name}</span> — ${x.result}</div>`).join('') +
    `<div style="margin-top:8px;font-size:9px;color:#7a7060">${surv.length} advance.</div>`
  document.getElementById('ov-examfight').classList.add('open'); upUI()
}
