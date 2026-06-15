export const WORLD_EVENTS = [
  // Tailed beast
  'A tailed beast has been sighted near the border of the Land of Wind. Villages are on high alert.',
  'Reports of Shukaku stirring beneath the desert — Sand ninja scramble to contain it.',
  'Kurama\'s chakra signature was detected deep in Fire Country. ANBU are investigating.',
  'A jinchuriki went berserk in the Land of Water. Three villages have closed their gates.',
  'Mysterious chakra readings suggest a tailed beast is moving through the northern mountains.',

  // Rival village tournaments / events
  'The Five Kage have announced a grand Chunin Exam to be held at a neutral location.',
  'Kumogakure is hosting an open tournament. Prize: 50,000 ryo and diplomatic prestige.',
  'A joint military exercise between Konoha and Suna has rattled the other great villages.',
  'The Iron Country daimyo called a summit — all kage have been formally invited.',
  'Kirigakure\'s Mizukage has challenged any village to a public show of force.',

  // Trade disruptions
  'Bandit activity along the main trade road has disrupted caravans across three countries.',
  'A merchant guild collapsed overnight — trade prices are unstable across the continent.',
  'The Iron Country has imposed new tariffs. Trade revenue is expected to dip this season.',
  'Pirates seized a silk shipment in the eastern sea. The Shipping Guild demands action.',
  'A drought in the Land of Rain has caused grain prices to spike across the region.',

  // Missing-nin / criminal activity
  'A notorious missing-nin cell known as the Ash Blades has struck two villages this month.',
  'The black market for forbidden scrolls is booming. Enforcement across all villages is tightening.',
  'An S-rank missing-nin was spotted travelling alone through the Land of Fire.',
  'A sleeper cell of rogue nin was uncovered inside a major village. Trust is at a low.',
  'Intelligence suggests missing-nin are recruiting at the border towns. Vigilance advised.',

  // Political / diplomatic
  'Iwagakure has formally protested a border patrol crossing — tensions are rising with Stone.',
  'An unexpected ceasefire was declared between two warring factions in the Land of Frost.',
  'The daimyo of the Land of Lightning has replaced his council. Political winds are shifting.',
  'A trade agreement between Suna and Kumo has left other villages feeling sidelined.',
  'An anonymous letter claiming to be from a Kage was sent to every major village. Its contents are secret.',

  // Environmental / natural
  'A severe drought has gripped the Land of Wind. Water trade has become fiercely competitive.',
  'Flooding in the Land of Rain has displaced thousands. Refugees are moving toward neighboring countries.',
  'An unusual chakra storm was observed over the Valley of the End — its origin is unknown.',
  'Forest fires in the Land of Fire have burned through key supply routes.',
  'A volcanic eruption near Iwagakure has cut off a critical mountain pass.',

  // Market / economy
  'A rare ore vein was discovered in the north. Mining villages are rushing to stake a claim.',
  'The chakra paper market crashed after a major forgery scandal shook the supply chain.',
  'A new medical technique developed in the Land of Rivers is commanding enormous contracts.',
  'The weapon smiths\' union declared a strike — equipment costs are rising everywhere.',
  'An unexpected surplus of herbs has crashed medical supply prices. Hospitals benefit.',
]

const EVENT_COOLDOWN_MS = 15_000

let lastEventAt = 0

export function rollWorldEvent(io) {
  const now = Date.now()
  if (now - lastEventAt < EVENT_COOLDOWN_MS) return
  if (Math.random() > 0.22) return

  lastEventAt = now
  const text = WORLD_EVENTS[Math.floor(Math.random() * WORLD_EVENTS.length)]
  io.emit('world_event', { text, ts: now })
}
