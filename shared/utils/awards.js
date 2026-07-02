/**
 * Season awards — pure, no DOM, no G mutation.
 * Returns an object of { mvp, rookieOfYear, warHero, ironwall } each with
 * { label, name, reason } or null if no eligible candidates.
 */

export function computeAwards(G, snapshot) {
  const players = snapshot?.players || []
  const warVets = (G.warVets || [])        // shinobi who survived Nation War this year
  const memorial = (G.memorial || []).filter(m => m.year === G.year)

  // MVP — most wins this season
  const sorted = [...players].filter(p => p.winsThisSeason > 0).sort((a, b) => b.winsThisSeason - a.winsThisSeason)
  const mvp = sorted[0]
    ? { label: 'Season MVP', name: sorted[0].name, reason: `${sorted[0].winsThisSeason} wins this season (${sorted[0].sRankWins} S-rank)` }
    : null

  // Rookie of the Year — best season from a Initiate (ri=0) or brand-new Adept (ri=1, wins < 10)
  const rookies = players.filter(p => p.ri <= 1 && (p.wins - p.winsThisSeason) < 5 && p.winsThisSeason > 0)
  const topRookie = [...rookies].sort((a, b) => b.winsThisSeason - a.winsThisSeason)[0]
  const rookieOfYear = topRookie
    ? { label: 'Rookie of the Year', name: topRookie.name, reason: `${topRookie.winsThisSeason} wins as a ${topRookie.rank} in their first active season` }
    : null

  // War Hero — survived Nation War with most kills (warVets have .kills)
  const topHero = warVets.length > 0
    ? [...warVets].sort((a, b) => (b.kills || 0) - (a.kills || 0))[0]
    : null
  const warHero = topHero?.kills > 0
    ? { label: 'Nation War Hero', name: topHero.name || topHero.n, reason: `${topHero.kills} kills in the Nation War` }
    : null

  // Iron Wall — survived all year with zero deaths on their squad (squad with no KIA)
  const ironwall = memorial.length === 0
    ? { label: 'Iron Wall', name: G.vName || 'The Village', reason: 'No shinobi lost in Year ' + (snapshot?.year || G.year) }
    : null

  return { mvp, rookieOfYear, warHero, ironwall }
}
