/**
 * Season stats snapshot — pure, no DOM, no G mutation.
 * Call snapshotSeasonStats(G) at end of each season (December).
 */

export function snapshotSeasonStats(G) {
  const shinobi = G.shinobi || []
  const players = shinobi.map(s => ({
    id: s.id,
    name: (s.fn && s.ln) ? `${s.fn} ${s.ln}` : (s.fn || s.n || s.firstName || s.id),
    ri: s.ri ?? 0,
    rank: ['Genin', 'Chunin', 'Jonin', 'ANBU', 'S-Rank'][s.ri ?? 0] || 'Genin',
    clan: s.clan || '',
    wins: s.wins || 0,
    winsThisSeason: s._seasonWins || 0,
    missionsThisSeason: s._seasonMissions || 0,
    sRankWins: s._seasonSRankWins || 0,
    kia: false,
  }))

  const memorialThisSeason = (G.memorial || []).filter(m => m.year === G.year)

  const table = G.season?.table || {}
  const standings = Object.values(table).sort((a, b) => (b.pts || 0) - (a.pts || 0))

  return {
    year: G.year,
    prestige: G.prestigeTier || 'D',
    players,
    standings,
    kiaCount: memorialThisSeason.length,
    examWins: (G.dynastyRecords?.examWins || 0),
    warWins: (G.dynastyRecords?.warWins || 0),
    playerStanding: standings.findIndex(r => r.name === G.vName) + 1,
  }
}

export function leagueLeaders(snapshot) {
  const p = snapshot.players
  const topWins      = [...p].sort((a, b) => b.winsThisSeason - a.winsThisSeason).slice(0, 5)
  const topMissions  = [...p].sort((a, b) => b.missionsThisSeason - a.missionsThisSeason).slice(0, 5)
  const topSRank     = [...p].sort((a, b) => b.sRankWins - a.sRankWins).slice(0, 3)
  const topCareer    = [...p].sort((a, b) => b.wins - a.wins).slice(0, 5)
  return { topWins, topMissions, topSRank, topCareer }
}
