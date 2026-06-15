import { villages } from './state.js'

const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a
const pk = a => a[Math.floor(Math.random() * a.length)]

// Each event: { text, effect?, chain? }
// effect: { ryo, morale, reputation } — applied to ALL connected clients
// chain: another event object fired 2–4 ticks after this one
// Placeholders: {village} = random connected village name, {rival} = another village

export const WORLD_EVENTS = [
  // ── Tailed beast ───────────────────────────────────────────────────────────
  { text: 'A tailed beast has been sighted near the border of the Land of Wind. Villages are on high alert.', effect: { morale: -3 },
    chain: { text: 'A patrol sent to investigate the border sighting has gone missing. No chakra signals detected.', effect: { morale: -5, reputation: -2 } } },
  { text: 'Reports of Shukaku stirring beneath the desert — Sand ninja scramble to contain it.', effect: { morale: -4 } },
  { text: 'Kurama\'s chakra signature was detected deep in Fire Country. ANBU are investigating.', effect: { morale: -5, reputation: -3 },
    chain: { text: 'The Kurama chakra signature has vanished. No village claims responsibility. Kage are demanding answers.', effect: { reputation: -4 } } },
  { text: 'A jinchuriki went berserk in the Land of Water. Three villages have closed their gates.', effect: { morale: -6, ryo: -3000 } },
  { text: 'Mysterious chakra readings suggest a tailed beast is moving through the northern mountains.', effect: { morale: -3 } },
  { text: 'The Nine-Tails\' roar was heard as far south as the Land of Earth. Something has disturbed it.', effect: { morale: -8, reputation: -2 },
    chain: { text: 'The disturbance near the Nine-Tails has subsided, but two ANBU teams are unaccounted for.', effect: { morale: -5 } } },
  { text: 'Rumors of a second tailed beast unsealing have circulated through black market intel channels.', effect: { morale: -4 } },
  { text: 'A two-tails sighting near the border of {village}\'s territory has prompted emergency drills.', effect: { morale: -3, ryo: -1500 } },
  { text: 'The five-tails was spotted heading east. Villages along the route are evacuating civilians.', effect: { ryo: -2000, morale: -5 } },
  { text: 'A sealed beast\'s chakra is leaking from its jinchuriki. Emergency containment protocols activated.', effect: { morale: -7 } },

  // ── Rival village / tournament ──────────────────────────────────────────────
  { text: 'The Five Kage have announced a grand Chunin Exam to be held at a neutral location.', effect: { reputation: 2 } },
  { text: 'Kumogakure is hosting an open tournament. Prize: 50,000 ryo and diplomatic prestige.', effect: { morale: 3 } },
  { text: 'A joint military exercise between Konoha and Suna has rattled the other great villages.', effect: { morale: -2, reputation: -2 } },
  { text: 'The Iron Country daimyo called a summit — all kage have been formally invited.', effect: { reputation: 3 } },
  { text: 'Kirigakure\'s Mizukage has challenged any village to a public show of force.', effect: { morale: 2 } },
  { text: '{rival} has publicly announced a major military expansion. Surrounding villages are uneasy.', effect: { morale: -4, reputation: -2 } },
  { text: 'A surprise Kage Summit convened overnight. The agenda has not been disclosed.', effect: { morale: -2 } },
  { text: 'Iwagakure has declared a day of mourning for fallen shinobi. Other villages are invited to pay respects.', effect: { morale: 3, reputation: 2 } },
  { text: 'Sunagakure announced a new Kazekage. The transition of power is being watched closely.', effect: { morale: 2 } },
  { text: 'A formal ranking of village power was published by a neutral observer. {village} is mentioned in the list.', effect: { reputation: 3 } },
  { text: 'Kumogakure and Kirigakure are rumored to be discussing a joint military treaty. Other villages are nervous.', effect: { morale: -3, reputation: -2 } },
  { text: 'The Land of Fire\'s daimyo is reviewing all ninja contracts. Several villages may lose income.', effect: { ryo: -2500, morale: -3 },
    chain: { text: 'The daimyo\'s review concluded. Several contracts were suspended. Villages report income drops.', effect: { ryo: -4000 } } },

  // ── Trade disruptions ───────────────────────────────────────────────────────
  { text: 'Bandit activity along the main trade road has disrupted caravans across three countries.', effect: { ryo: -2000 } },
  { text: 'A merchant guild collapsed overnight — trade prices are unstable across the continent.', effect: { ryo: -3000, morale: -2 } },
  { text: 'The Iron Country has imposed new tariffs. Trade revenue is expected to dip this season.', effect: { ryo: -1500 } },
  { text: 'Pirates seized a silk shipment in the eastern sea. The Shipping Guild demands action.', effect: { ryo: -2500 } },
  { text: 'A drought in the Land of Rain has caused grain prices to spike across the region.', effect: { ryo: -1000, morale: -2 } },
  { text: 'A new trade route through the Land of Iron has opened, bypassing existing ninja contracts.', effect: { ryo: -2000 } },
  { text: 'The chakra paper supply chain is disrupted after a factory fire. Missions requiring seals are affected.', effect: { ryo: -1500, morale: -2 } },
  { text: 'A currency devaluation in the Land of Water has rippled into exchange rates across all countries.', effect: { ryo: -2000 } },
  { text: 'The merchant routes through {rival}\'s territory have been closed to outsiders.', effect: { ryo: -3000 } },
  { text: 'A rare ore vein was discovered in the north. Mining villages are rushing to stake a claim.', effect: { ryo: 2000, morale: 3 } },
  { text: 'A surplus of weapons-grade steel has flooded the market. Equipment costs have dropped.', effect: { ryo: 1500, morale: 2 } },
  { text: 'A trade caravan representing {village} arrived safely after months in hostile territory.', effect: { ryo: 3000, reputation: 2 } },

  // ── Missing-nin / criminal ──────────────────────────────────────────────────
  { text: 'A notorious missing-nin cell known as the Ash Blades has struck two villages this month.', effect: { morale: -5, reputation: -2 },
    chain: { text: 'The Ash Blades were tracked to a safehouse in the Land of Wind. A coalition strike is being planned.', effect: { morale: 2 } } },
  { text: 'The black market for forbidden scrolls is booming. Enforcement across all villages is tightening.', effect: { morale: -3, ryo: -1000 } },
  { text: 'An S-rank missing-nin was spotted travelling alone through the Land of Fire.', effect: { morale: -6 } },
  { text: 'A sleeper cell of rogue nin was uncovered inside a major village. Trust is at a low.', effect: { morale: -5, reputation: -4 } },
  { text: 'Intelligence suggests missing-nin are recruiting at the border towns. Vigilance advised.', effect: { morale: -4 } },
  { text: 'A missing-nin with a Bingo Book bounty of 80,000 ryo was spotted near {village}\'s trade route.', effect: { morale: -5 } },
  { text: 'Three Jonin-level missing-nin formed a new cell calling themselves the Iron Veil. Threat level high.', effect: { morale: -6, reputation: -3 },
    chain: { text: 'The Iron Veil attacked a civilian transport. Villages are raising security patrols.', effect: { ryo: -2000, morale: -4 } } },
  { text: 'A high-value informant went silent after claiming to know the location of a missing-nin base.', effect: { morale: -3 } },
  { text: 'A rogue Kage candidate was stripped of rank and disappeared. They are now considered missing-nin.', effect: { morale: -4, reputation: -2 } },
  { text: 'The Bingo Book has been updated with thirty new entries. Several are former Allied forces.', effect: { morale: -4 } },

  // ── Political / diplomatic ──────────────────────────────────────────────────
  { text: 'Iwagakure has formally protested a border patrol crossing — tensions are rising with Stone.', effect: { morale: -3, reputation: -2 } },
  { text: 'An unexpected ceasefire was declared between two warring factions in the Land of Frost.', effect: { morale: 3 } },
  { text: 'The daimyo of the Land of Lightning has replaced his council. Political winds are shifting.', effect: { morale: -2 } },
  { text: 'A trade agreement between Suna and Kumo has left other villages feeling sidelined.', effect: { reputation: -2 } },
  { text: 'An anonymous letter claiming to be from a Kage was sent to every major village. Its contents are secret.', effect: { morale: -3 } },
  { text: '{rival} has cut diplomatic ties with two neighboring villages simultaneously.', effect: { morale: -4, reputation: -2 } },
  { text: 'A peace summit between rival villages collapsed in the third hour. Both sides blame the other.', effect: { morale: -4, reputation: -3 },
    chain: { text: 'Following the failed summit, {rival} has placed border troops on elevated alert.', effect: { morale: -5 } } },
  { text: 'A Kage has retired unexpectedly. The selection process for a replacement is underway.', effect: { morale: 2 } },
  { text: 'An assassination attempt on a foreign daimyo failed. All villages are under suspicion.', effect: { morale: -5, reputation: -5 } },
  { text: 'A new treaty was signed between three minor countries, creating a new trade bloc.', effect: { ryo: 1000 } },
  { text: '{village}\'s reputation has reached other regions. Envoys have begun making inquiries.', effect: { reputation: 4 } },
  { text: 'The Allied Shinobi Forces issued a threat assessment. Several villages were named.', effect: { reputation: -2, morale: -3 } },
  { text: 'A formal apology letter was delivered from {rival} to surrounding nations. The intent is unclear.', effect: { morale: 2 } },

  // ── Environmental / natural ─────────────────────────────────────────────────
  { text: 'A severe drought has gripped the Land of Wind. Water trade has become fiercely competitive.', effect: { ryo: -2000, morale: -3 } },
  { text: 'Flooding in the Land of Rain has displaced thousands. Refugees are moving toward neighboring countries.', effect: { ryo: -1500, morale: -3 } },
  { text: 'An unusual chakra storm was observed over the Valley of the End — its origin is unknown.', effect: { morale: -4 } },
  { text: 'Forest fires in the Land of Fire have burned through key supply routes.', effect: { ryo: -2500, morale: -4 },
    chain: { text: 'The Land of Fire fires have been contained, but rebuilding the supply routes will take months.', effect: { ryo: -3000 } } },
  { text: 'A volcanic eruption near Iwagakure has cut off a critical mountain pass.', effect: { ryo: -2000, morale: -3 } },
  { text: 'An unseasonable blizzard has locked down the Land of Snow. All northern missions are suspended.', effect: { ryo: -1000, morale: -2 } },
  { text: 'A massive landslide destroyed the main road connecting the Land of Earth to its neighbors.', effect: { ryo: -3000 } },
  { text: 'A chakra-rich spring was discovered in the mountains. Its origin is being investigated.', effect: { morale: 3 } },
  { text: 'Earthquake activity near the coast has disrupted fishing villages. Food prices are rising.', effect: { ryo: -1500, morale: -3 } },
  { text: 'Unusual weather patterns are affecting agricultural yields across the continent.', effect: { ryo: -1000, morale: -2 } },
  { text: 'A rare celestial alignment caused visible chakra disruption across the northern nations.', effect: { morale: -2 } },

  // ── Economy / market ────────────────────────────────────────────────────────
  { text: 'The chakra paper market crashed after a major forgery scandal shook the supply chain.', effect: { ryo: -2000, morale: -2 } },
  { text: 'A new medical technique developed in the Land of Rivers is commanding enormous contracts.', effect: { ryo: 2500 } },
  { text: 'The weapon smiths\' union declared a strike — equipment costs are rising everywhere.', effect: { ryo: -2000, morale: -3 } },
  { text: 'An unexpected surplus of herbs has crashed medical supply prices. Hospitals benefit.', effect: { ryo: 1500, morale: 2 } },
  { text: 'A new financial instrument backed by mission contracts is destabilizing the ninja economy.', effect: { ryo: -3000, morale: -4 } },
  { text: 'The ryo exchange rate has shifted in favor of the Land of Fire. Village coffers grow slightly.', effect: { ryo: 2000, morale: 2 } },
  { text: 'A Kage has ordered a massive public works project. Construction contracts are being offered.', effect: { ryo: 2500, morale: 3 } },
  { text: 'A major banking house has frozen accounts pending investigation. Payroll is disrupted continent-wide.', effect: { ryo: -4000, morale: -5 },
    chain: { text: 'The banking freeze has been lifted. Funds are being returned, but the damage was done.', effect: { ryo: 2000, morale: 2 } } },
  { text: 'An auction for a legendary jutsu scroll drew bidders from every major village.', effect: { morale: 3 } },
  { text: 'A guild of merchant ninja has announced that escort contracts will pay 15% more starting next month.', effect: { ryo: 2000, morale: 3 } },

  // ── Intel / espionage ───────────────────────────────────────────────────────
  { text: 'A network of informants across three countries was burned simultaneously. The source is unknown.', effect: { morale: -5, reputation: -3 } },
  { text: 'Intercepted communiqués suggest a major village is planning a covert operation in the north.', effect: { morale: -4 } },
  { text: 'A double agent operating for two years was exposed. Both sides claim they knew the whole time.', effect: { morale: -3, reputation: -2 } },
  { text: 'Classified village rosters were leaked and are circulating on the black market.', effect: { morale: -5, reputation: -4 } },
  { text: 'An ANBU defection has given an unknown party access to mission archives. The fallout is contained — for now.', effect: { reputation: -5, morale: -4 } },
  { text: 'A previously unknown intelligence network was discovered operating across all five major countries.', effect: { morale: -6 } },
  { text: 'A spy embedded in {rival}\'s administration was extracted successfully. Their intel is being decoded.', effect: { reputation: 3, morale: 2 } },

  // ── Medical / research ──────────────────────────────────────────────────────
  { text: 'A new poison with no known antidote has appeared in the field. Medical teams are scrambling.', effect: { morale: -5, ryo: -2000 } },
  { text: 'A breakthrough in chakra-enhanced surgery has reduced recovery times significantly.', effect: { morale: 4, ryo: 1500 } },
  { text: 'An outbreak of a chakra-disrupting illness has been reported in the Land of Rain.', effect: { morale: -5, ryo: -2000 },
    chain: { text: 'The illness in the Land of Rain has been contained. Relief missions are underway.', effect: { morale: 3, ryo: -1500 } } },
  { text: 'A new training method developed by a hermit sage is being adopted by elite jonin worldwide.', effect: { morale: 4 } },
  { text: 'Research into sealed beast chakra integration has produced promising results. Villages take notice.', effect: { reputation: 3 } },

  // ── Prestige / reputation ───────────────────────────────────────────────────
  { text: '{village} is mentioned in a prominent bard\'s epic. Reputation spreads beyond normal channels.', effect: { reputation: 5, morale: 4 } },
  { text: 'A prestigious mission contract was publicly awarded to a village today. Others submit proposals.', effect: { reputation: 4, ryo: 2000 } },
  { text: '{rival} publicly criticized the quality of missions in the surrounding region. {village} is among those named.', effect: { reputation: -4, morale: -3 } },
  { text: 'A celebrated retired Kage praised the new generation of shinobi. Morale rises across the region.', effect: { morale: 5 } },
  { text: 'A ranking of most effective shinobi villages was released. {village} appears favorably.', effect: { reputation: 5, morale: 4 } },
  { text: 'Several villages were publicly criticized for poor mission completion rates.', effect: { reputation: -3, morale: -2 } },
]

const pendingChains = []
const EVENT_COOLDOWN_MS = 12_000
let lastEventAt = 0

function resolveText(text) {
  const vs = [...villages.values()]
  const villageName = vs.length ? pk(vs).name : 'a hidden village'
  const others = vs.filter(v => v.name !== villageName)
  const rivalName = others.length ? pk(others).name : 'a rival village'
  return text.replace(/\{village\}/g, villageName).replace(/\{rival\}/g, rivalName)
}

function fireEvent(io, ev) {
  const text = resolveText(ev.text)
  io.emit('world_event', { text, ts: Date.now(), effect: ev.effect || null })
  if (ev.chain) {
    pendingChains.push({ event: ev.chain, ticksLeft: rnd(2, 4) })
  }
}

export function rollWorldEvent(io) {
  // Tick down and fire any pending chains
  for (let i = pendingChains.length - 1; i >= 0; i--) {
    pendingChains[i].ticksLeft--
    if (pendingChains[i].ticksLeft <= 0) {
      const chain = pendingChains.splice(i, 1)[0]
      fireEvent(io, chain.event)
    }
  }

  const now = Date.now()
  if (now - lastEventAt < EVENT_COOLDOWN_MS) return
  if (Math.random() > 0.22) return

  lastEventAt = now
  fireEvent(io, WORLD_EVENTS[Math.floor(Math.random() * WORLD_EVENTS.length)])
}
