// Off-season slate slice of the monthly tick, extracted from adv.js (R22).
// Operates on the global G singleton (same architecture as adv.js / tick/rivals.js).
//
// Months 1–3 have no league fixtures, so they get: friendlies in M1/M3 and the
// annual Minor Nations Invitational (4-team knockout) in M2. No league-standings
// impact — purses + morale + a cup for the chronicle, feeding the SEASON tab's
// exhibition slate, plus ambient rival-exhibition news.
import { G, clamp, fmt, pk } from '../state.js'
import { aL } from '../ui.js'
import { t as tr } from '../../../shared/utils/i18n.js'
import { addLegend, addChronicle } from '../state.js'
import { addNewsItem } from '../news.js'
import { simMatch, styledScore } from '../../../shared/utils/season.js'
import { MINOR_NATIONS, minorStrength, pickMinorNation, adjustMinorRel } from '../../../shared/constants/minorNations.js'
import { identityFor } from '../../../shared/constants/villageIdentity.js'

export function tickOffSeason() {
  if (!G.isOffSeason) return
  const _exStyle = { aggressive: 'blitz', defensive: 'fortress' }[G.coachingPhilosophy] || 'balanced'
  const _pStr = Math.max(10, G._playerStrength || 50)
  G.exhibitions = G.exhibitions || []
  const _pushEx = e => { G.exhibitions.push(e); if (G.exhibitions.length > 12) G.exhibitions.shift() }

  if (G.month === 2) {
    // Minor Nations Invitational — player + 3 minors, semifinal + final in one tick.
    const draw = [...MINOR_NATIONS].sort(() => Math.random() - 0.5).slice(0, 3)
    const sfOpp = draw[0]
    const sf = simMatch(_pStr, minorStrength(sfOpp), Math.random, _exStyle, 'balanced')
    let [ps, os] = styledScore(sf)
    // Cup ties need a winner — sudden death on a coin.
    const pAdv = sf.winner === 'a' || (sf.winner === 'draw' && Math.random() < 0.5)
    if (sf.winner === 'draw') { if (pAdv) ps++; else os++ }
    _pushEx({ year: G.year, month: G.month, opp: sfOpp.n, ico: sfOpp.ico, tier: sfOpp.tier, ps, os, result: pAdv ? 'W' : 'L', cup: 'SF' })
    // Other semifinal between the two remaining minors.
    const sf2 = simMatch(minorStrength(draw[1]), minorStrength(draw[2]), Math.random)
    const finOpp = (sf2.winner === 'b' || (sf2.winner === 'draw' && Math.random() < 0.5)) ? draw[2] : draw[1]
    if (pAdv) {
      aL(tr('toast.adv.invAdvance', { ico: sfOpp.ico, opp: sfOpp.n, ps, os }), 'good')
      const fin = simMatch(_pStr, minorStrength(finOpp), Math.random, _exStyle, 'balanced')
      let [fp, fo] = styledScore(fin)
      const champ = fin.winner === 'a' || (fin.winner === 'draw' && Math.random() < 0.5)
      if (fin.winner === 'draw') { if (champ) fp++; else fo++ }
      _pushEx({ year: G.year, month: G.month, opp: finOpp.n, ico: finOpp.ico, tier: finOpp.tier, ps: fp, os: fo, result: champ ? 'W' : 'L', cup: 'F' })
      if (champ) {
        G.ryo += 6000
        G.morale = clamp(G.morale + 3, 0, 100)
        addLegend(2)
        aL(tr('toast.adv.invChampion', { ico: finOpp.ico, opp: finOpp.n, ps: fp, os: fo, ryo: fmt(6000) }), 'good')
        addChronicle('Invitational Champions', `${G.vName} swept the Minor Nations Invitational, beating ${sfOpp.n} and ${finOpp.n} to take the cup.`, 'village')
      } else {
        G.ryo += 2500
        G.morale = clamp(G.morale + 1, 0, 100)
        aL(tr('toast.adv.invRunnerUp', { ico: finOpp.ico, opp: finOpp.n, ps: fp, os: fo, ryo: fmt(2500) }), 'neutral')
      }
      G.invitationalHistory = G.invitationalHistory || []
      G.invitationalHistory.push({ year: G.year, champion: champ ? G.vName : finOpp.n, runnerUp: champ ? finOpp.n : G.vName, playerResult: champ ? 'champion' : 'runner-up' })
      if (G.invitationalHistory.length > 10) G.invitationalHistory.shift()
    } else {
      G.morale = clamp(G.morale - 1, 0, 100)
      aL(tr('toast.adv.invOut', { ico: sfOpp.ico, opp: sfOpp.n, ps, os }), 'bad')
      // Final plays out without you — the world keeps moving.
      const fin2 = simMatch(minorStrength(sfOpp), minorStrength(finOpp), Math.random)
      const champN = (fin2.winner === 'b' || (fin2.winner === 'draw' && Math.random() < 0.5)) ? finOpp : sfOpp
      const runN = champN === sfOpp ? finOpp : sfOpp
      aL(tr('toast.adv.invNeutralFinal', { champIco: champN.ico, champ: champN.n, run: runN.n }), 'neutral')
      G.invitationalHistory = G.invitationalHistory || []
      G.invitationalHistory.push({ year: G.year, champion: champN.n, runnerUp: runN.n, playerResult: 'semifinal' })
      if (G.invitationalHistory.length > 10) G.invitationalHistory.shift()
    }
  } else {
    // M1 / M3 friendly.
    const nation = pickMinorNation()
    const res = simMatch(_pStr, minorStrength(nation), Math.random, _exStyle, 'balanced')
    const [ps, os] = styledScore(res)   // player is side 'a'
    const won = res.winner === 'a', drew = res.winner === 'draw'
    _pushEx({ year: G.year, month: G.month, opp: nation.n, ico: nation.ico, tier: nation.tier, ps, os, result: won ? 'W' : drew ? 'D' : 'L' })
    if (won) {
      const purse = nation.tier === 'C' ? 3500 : 2000
      G.ryo += purse
      G.morale = clamp(G.morale + 2, 0, 100)
      aL(tr('toast.adv.exhibitionWin', { ico: nation.ico, opp: nation.n, ps, os, ryo: fmt(purse) }), 'good')
    } else if (drew) {
      aL(tr('toast.adv.exhibitionDraw', { ico: nation.ico, opp: nation.n, ps, os }), 'neutral')
    } else {
      G.morale = clamp(G.morale - 1, 0, 100)
      aL(tr('toast.adv.exhibitionLoss', { ico: nation.ico, opp: nation.n, ps, os }), 'bad')
    }
    // Playing a friendly builds rapport regardless of result — the fixture is the goodwill.
    G.minorRelations = G.minorRelations || {}
    adjustMinorRel(G.minorRelations, nation.n, 2)
  }

  // Ambient world life: a rival plays its own off-season friendly — news-ticker flavor.
  if ((G.villages || []).length) {
    const rv = pk(G.villages)
    const mn = pickMinorNation()
    const rres = simMatch(rv.strength || 60, minorStrength(mn), Math.random, identityFor(rv.n).style, 'balanced')
    const [ra, rb] = styledScore(rres)
    addNewsItem(rres.winner === 'draw'
      ? tr('news.world.rivalExhibitionDraw', { aIco: rv.ico, a: rv.n, bIco: mn.ico, b: mn.n, sa: ra, sb: rb })
      : rres.winner === 'a'
        ? tr('news.world.rivalExhibition', { aIco: rv.ico, a: rv.n, bIco: mn.ico, b: mn.n, sa: ra, sb: rb })
        : tr('news.world.rivalExhibitionUpset', { aIco: rv.ico, a: rv.n, bIco: mn.ico, b: mn.n, sa: rb, sb: ra }))
  }
}
