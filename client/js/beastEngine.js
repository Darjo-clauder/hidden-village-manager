/**
 * Primal Engine
 * All beast personality data, lore, sync progression, events, and passive effects.
 * Called each month from adv.js via tickBeasts().
 */

export const BEAST_DATA = {
  Sakeru: {
    tails: 1, element: 'Sand/Wind', pow: 60,
    personality: 'Paranoid & Aggressive',
    flavors: ['Sakeru regards the seal as an insult. Its hatred is constant, petty, and exhausting.','The One-Tail radiates instability like heat from sand. Nearby civilians grow skittish.','Sakeru whispers through the seal at night — not threats, but confessions of terror.'],
    syncCeiling: 4, // Never reaches Stage 5
    captureMonths: 5,
    // Stat bonuses by sync stage [0=rejected, 1–5]
    statBonus: [
      {},
      { speed: -5, morale: -15 }, // Stage 1
      { speed: 12, morale: -10 }, // Stage 2
      { speed: 20, wind: true, morale: -6 }, // Stage 3
      { speed: 28, ninjutsu: 10, morale: -3 }, // Stage 4
      { speed: 35, ninjutsu: 15, chakra: 10 }, // Stage 5 (unreachable)
    ],
    passiveVillage: { morale: -4, def: 8 }, // while holding
    uniqueAbility: { stage: 4, desc: 'Sand Armor — vessel immune to KIA on one mission per year.' },
    loreBonus: { id: 'shukaku_lore', desc: '+15% ryo from all mission contracts' },
    destabilizeChance: 0.30, // monthly chance of negative village event
    extractionAttractionMult: 1.2, // how aggressively rivals pursue
    lore: [
      { stage: 1, title: 'The First Tanuki', body: 'Ancient texts from Suna speak of a sand demon that devoured entire battalions. Sakeru predates the village itself — it was the land\'s first and most violent tenant.' },
      { stage: 2, title: 'The Cursed Vessel', body: 'Every Sakeru vessel in recorded history suffered sleep deprivation and paranoia. The beast feeds on fear and cultivates it deliberately within its host.' },
      { stage: 3, title: 'The Desert\'s Heartbeat', body: 'Sakeru was not always feared. Before the era of vessel, nomads left offerings at sand formations shaped like tanuki. They called it the sand\'s heartbeat.' },
      { stage: 4, title: 'A Conversation at Last', body: 'What few Sakeru hosts survived long enough to write anything agreed on one thing: once you stop fearing it, the One-Tail becomes merely difficult, not impossible. It respects no one. But it tolerates survivors.' },
      { stage: 5, title: 'The Demon\'s Truce', body: 'Full cooperation with Sakeru has never been confirmed in writing. The closest record is a fragment: "It does not trust me. But it has decided I am not worth destroying. Today, that is enough."' },
    ],
  },

  Niryuu: {
    tails: 2, element: 'Blue Fire', pow: 72,
    personality: 'Volatile but not Malicious',
    flavors: ['Niryuu\'s moods shift like flame — warm and playful one week, wild and dangerous the next.','The Second Primal shows no malice. Just enormous energy with no off switch.','Niryuu once spent three days aggressively purring at its host. Nobody knows why.'],
    syncCeiling: 5,
    captureMonths: 4,
    statBonus: [
      {},
      { ninjutsu: -3, speed: -3, morale: -12 },
      { ninjutsu: 10, speed: 8, morale: -5 },
      { ninjutsu: 18, speed: 15, morale: 0 },
      { ninjutsu: 22, speed: 18, chakra: 10, morale: 3 },
      { ninjutsu: 28, speed: 22, chakra: 15, morale: 6 },
    ],
    passiveVillage: { morale: 0, academyGrowth: 0.15 }, // +15% speed growth in academy
    uniqueAbility: { stage: 4, desc: 'Blue Fire — vessel adds +25 ninjutsu to one squad mission per month.' },
    loreBonus: { id: 'matatabi_lore', desc: '+15% speed stat growth in academy' },
    destabilizeChance: 0.15,
    moodSwingChance: 0.25, // special: random positive OR negative village event
    extractionAttractionMult: 0.9,
    lore: [
      { stage: 1, title: 'The Blue Flame Cat', body: 'Niryuu first appears in records as a wall of blue fire that rolled across a battlefield and then... stopped. An eyewitness wrote: "It looked at us. Then it sat down. I don\'t know what it wanted."' },
      { stage: 2, title: 'Fire Without Malice', body: 'Unlike Sakeru or Kureni, Niryuu has never been recorded intentionally targeting civilians. Its destructions are accidental. It simply doesn\'t pay attention to how large it is.' },
      { stage: 3, title: 'The Playful Nature', body: 'Three vessel from different eras described the same phenomenon: Niryuu playing. Not in the dangerous sense — in the cat sense. Pouncing at things. Missing on purpose. Apparently finding this very funny.' },
      { stage: 4, title: 'Moods and Meaning', body: 'Scholars mapped Niryuu\'s mood cycles and found a pattern. Three weeks of calm, followed by one week of unpredictability. The underlying cause remains unknown. The Second Primal will not say.' },
      { stage: 5, title: 'A Partner of Sorts', body: 'Full sync with Niryuu doesn\'t produce the reverential bond described in Kureni texts. More like a very large cat that has decided you are acceptable. Occasionally it purrs. You feel it in your bones.' },
    ],
  },

  Tairyuu: {
    tails: 3, element: 'Water', pow: 78,
    personality: 'Reclusive & Defensive',
    flavors: ['Tairyuu retreats from every approach. Patience is the only language it understands.','The Third Primal has seen too many vessel. It simply waits for this one to break too.','Tairyuu does not hate. It has given up expecting anything different.'],
    syncCeiling: 4, // Hard ceiling — never fully trusts
    captureMonths: 5,
    statBonus: [
      {},
      { chakra: -3, morale: -8 },
      { chakra: 12, morale: -3 },
      { chakra: 18, morale: 2 },
      { chakra: 22, taijutsu: 8, morale: 5 },
      { chakra: 28, taijutsu: 12, morale: 8 },
    ],
    passiveVillage: { def: 20, morale: 0 },
    uniqueAbility: { stage: 4, desc: 'Mirror Dragon — adds +30 to village defense calculations while vessel is present.' },
    loreBonus: { id: 'isobu_lore', desc: '+20% defensive raid success rate' },
    destabilizeChance: 0.05,
    extractionAttractionMult: 0.85,
    lore: [
      { stage: 1, title: 'The Sleeping Giant', body: 'For most of recorded history, Tairyuu slept beneath a lake. No one bothered it. It bothered no one. The decision to seal it was purely political — a show of power that the Third Primal found entirely pointless.' },
      { stage: 2, title: 'Defensive by Nature', body: 'Every documented hostile act by Tairyuu was a response to aggression. It has never attacked first. This makes it substantially harder to study — provoking it for research purposes is the researcher\'s last recorded activity.' },
      { stage: 3, title: 'The Pattern of Loss', body: 'Tairyuu has been sealed and lost more times than any other primal. Each time, it retreats further into itself. Scholars estimate it has stopped expecting permanence entirely.' },
      { stage: 4, title: 'A Strange Negotiation', body: 'The only successful Tairyuu host on record described their relationship as "formal." Respectful distance. No intimacy, no warmth. But reliability — the Third Primal always shows up when it matters. It simply refuses to explain itself.' },
      { stage: 5, title: 'The Unreachable Shore', body: 'No confirmed Stage 5 account exists for Tairyuu. The closest: "I think it likes me. I think it will never say so. I have stopped asking." This is accepted as the deepest possible bond with the Third Primal.' },
    ],
  },

  'Kaenkou': {
    tails: 4, element: 'Lava', pow: 84,
    personality: 'Proud & Honorable',
    flavors: ['Kaenkou will not be owned. It will be respected, or it will fight.','The Fourth Primal treats every interaction as a negotiation of honor. Lose respect once and earn back twice.','Kaenkou once refused to lend its power for two months because its host didn\'t say please.'],
    syncCeiling: 5,
    captureMonths: 6,
    statBonus: [
      {},
      { taijutsu: -5, ninjutsu: -5, morale: -10 },
      { taijutsu: 8, ninjutsu: 8, morale: -4 },
      { taijutsu: 15, ninjutsu: 15, morale: 3 },
      { taijutsu: 20, ninjutsu: 20, morale: 8 },
      { taijutsu: 28, ninjutsu: 28, chakra: 12, morale: 12 },
    ],
    passiveVillage: { morale: 3, rep: 0 },
    uniqueAbility: { stage: 4, desc: 'Son\'s Respect — all diplomatic negotiations get +25% success modifier this month (once per season).' },
    loreBonus: { id: 'songoku_lore', desc: '+25% diplomatic negotiation outcomes' },
    destabilizeChance: 0.10,
    respectSystem: true, // disrespect events push back sync
    extractionAttractionMult: 1.0,
    lore: [
      { stage: 1, title: 'The Monkey King\'s Name', body: 'Kaenkou named itself. This matters to it enormously. Every host who failed to use its name — addressing it only as "beast" or "primal" — found cooperation dropped to zero within weeks.' },
      { stage: 2, title: 'The Code of the Fourth Primal', body: 'Kaenkou operates by rules it will not fully explain. It will share power freely with someone it deems honorable. Strip that honor away — by lying, by cruelty, by weakness — and it withdraws entirely.' },
      { stage: 3, title: 'An Ancient Grudge', body: 'Kaenkou harbors specific hatred for anyone who speaks of primal as weapons. This appears to be a matter of profound personal offense. Hosts who agreed were punished. Those who asked why were answered — once, briefly, with "because we are not."' },
      { stage: 4, title: 'What Respect Looks Like', body: 'The most successful Kaenkou host described a daily practice: formal greeting, formal dismissal. Not performance — the Fourth Primal can tell. Genuine acknowledgement. "I see you. You are not a tool." That\'s all it wanted.' },
      { stage: 5, title: 'Ally', body: 'Kaenkou called its best-known host "friend." Once. The host described spending the rest of their life trying to deserve that word. Apparently they succeeded. The Fourth Primal attended their funeral. In full form. The village was fine.' },
    ],
  },

  Hasoku: {
    tails: 5, element: 'Steam', pow: 88,
    personality: 'Gentle & Wise',
    flavors: ['Hasoku is patient in the way ancient things are patient — it has simply lived through too much to rush.','The Fifth Primal observes more than it speaks. When it does speak, it tends to be right.','Hasoku once solved a food shortage crisis through sealed-chakra dream-advice. Its host was confused but grateful.'],
    syncCeiling: 5,
    captureMonths: 6,
    statBonus: [
      {},
      { chakra: -2, morale: -5 },
      { chakra: 10, speed: 6, morale: 2 },
      { chakra: 18, speed: 10, morale: 6 },
      { chakra: 22, speed: 14, morale: 10 },
      { chakra: 28, speed: 18, ninjutsu: 10, morale: 14 },
    ],
    passiveVillage: { morale: 5, academyGrowth: 0.20 },
    uniqueAbility: { stage: 4, desc: 'Steam Aura — all squadmates in the same unit gain +5 to all stats while vessel is present.' },
    loreBonus: { id: 'kokuo_lore', desc: '+20% academy development rate' },
    destabilizeChance: 0.02,
    extractionAttractionMult: 0.8,
    lore: [
      { stage: 1, title: 'The Gentle Giant', body: 'Hasoku\'s power records are dominated not by destruction but by endurance. It outlasted every other entity in three separate conflicts by simply refusing to stop. It is not the most dramatic primal. It is the last one standing.' },
      { stage: 2, title: 'The Fifth Primal Speaks', body: 'Unlike other primal, Hasoku communicates openly from early in the sealing relationship. Its advice is calm, measured, and frequently several weeks ahead of its usefulness. Only in retrospect does the host realize how right it was.' },
      { stage: 3, title: 'Wisdom and Humility', body: 'Hasoku claims no special insight into the future. "I simply remember more than you do," it told one host. When pressed on what it remembered, it paused for a long time and said: "Everything. That\'s the problem."' },
      { stage: 4, title: 'The Steam That Heals', body: 'Hasoku\'s steam affinity has a regenerative component not fully understood by sealing scholars. Hosts universally report faster recovery from injury. Village medical staff near Hasoku vessel note anomalously low mortality rates.' },
      { stage: 5, title: 'Something Like Peace', body: 'The deepest Hasoku bond on record was described as "carrying something very wise in a very small place." The beast itself, when asked to describe full sync, said only: "This is what I hoped it would feel like."' },
    ],
  },

  Suiro: {
    tails: 6, element: 'Acid/Water', pow: 90,
    personality: 'Cheerful & Cooperative',
    flavors: ['Suiro thinks the sealing is an adventure. It is the only primal ever described as enthusiastic about the process.','The Sixth Primal greets every morning with visible delight. Its host finds this exhausting and also kind of nice.','Suiro once spent an entire month narrating its host\'s dreams. Nobody asked it to. It was very cheerful about this.'],
    syncCeiling: 5,
    captureMonths: 3, // Fastest to sync
    statBonus: [
      {},
      { chakra: 5, morale: 0 }, // Stage 1: barely a rejection
      { chakra: 15, morale: 5 },
      { chakra: 20, morale: 8 },
      { chakra: 25, morale: 12 },
      { chakra: 30, morale: 15, ninjutsu: 12 },
    ],
    passiveVillage: { injuryRecovery: -1, morale: 3 }, // -1 month injury recovery village-wide
    uniqueAbility: { stage: 3, desc: 'Medical Aura — village-wide injury recovery reduced by 1 month.' }, // Unlocks at Stage 3
    loreBonus: { id: 'saiken_lore', desc: '−30% injury recovery time' },
    destabilizeChance: 0.01,
    extractionAttractionMult: 0.75,
    lore: [
      { stage: 1, title: 'The Cooperative Slug', body: 'Suiro is the only primal that has cooperated with its own sealing. Twice. The sealing masters involved described the experience as "unexpectedly easy" and then felt vaguely unsettled by that for years afterward.' },
      { stage: 2, title: 'Acid and Kindness', body: 'Suiro\'s acid release is terrifyingly destructive. Its personality is unfailingly cheerful. Medical scholars who study this paradox report it finds the contradiction amusing.' },
      { stage: 3, title: 'The Healer\'s Beast', body: 'An unusual property of Suiro\'s chakra has been observed near every long-term host: people heal faster. Not dramatically, but measurably. No mechanism has been identified. Suiro, when asked, said it was just being nice.' },
      { stage: 4, title: 'Bubble and Bond', body: 'Suiro communicates largely through enthusiastic bubble imagery in the host\'s dreams. Scholars have spent considerable effort decoding the bubble language. They have so far identified twenty-three distinct bubble shapes and what they mean. Suiro thinks this is very funny.' },
      { stage: 5, title: 'The Brightest Bond', body: 'Every confirmed Stage 5 Suiro host used different words but described the same thing: an unshakeable sense that something enormous was on their side and found everything about them endearing. One simply wrote: "It cheers for me. I had forgotten what that felt like."' },
    ],
  },

  Hanaku: {
    tails: 7, element: 'Scale Powder', pow: 92,
    personality: 'Optimistic & Lucky',
    flavors: ['Hanaku believes everything will work out. Statistically, this has been more accurate than it has any right to be.','The Seventh Primal radiates what can only be described as good vibes. Enemies find this deeply suspicious.','Hanaku once told its host not to worry about a mission. The host didn\'t. It went fine. This happened fourteen times in a row.'],
    syncCeiling: 5,
    captureMonths: 4,
    statBonus: [
      {},
      { morale: -5 },
      { speed: 8, morale: 3 },
      { speed: 14, ninjutsu: 8, morale: 6 },
      { speed: 18, ninjutsu: 12, morale: 10 },
      { speed: 22, ninjutsu: 16, chakra: 10, morale: 14 },
    ],
    passiveVillage: { missionLuck: 0.10, morale: 4 }, // +10% mission success village-wide
    uniqueAbility: { stage: 4, desc: 'Lucky Scales — once per month, a failed mission becomes a marginal success instead.' },
    loreBonus: { id: 'chomei_lore', desc: '+10% mission luck on all shinobi' },
    destabilizeChance: 0.01,
    extractionAttractionMult: 0.7,
    lore: [
      { stage: 1, title: 'The Rhinoceros Beetle', body: 'Hanaku\'s physical form is technically a rhinoceros beetle. It is very large. It has seven tails. Records from its earliest appearances note that researchers expected it to be frightening and instead found it "reassuringly cheerful, which was more unsettling."' },
      { stage: 2, title: 'The Luck Effect', body: 'Three independent studies of villages holding Hanaku all found the same statistical anomaly: marginally better outcomes on tasks with unpredictable elements. No causal mechanism. No explanation from Hanaku. Just: slightly better luck.' },
      { stage: 3, title: 'Wings and Optimism', body: 'Hanaku\'s scale powder blinds and disorients enemies — but its primary use in recorded history has been as a light source. Its host once deployed it to help civilians find their way home in a fog. Hanaku was very pleased with this.' },
      { stage: 4, title: 'The Beast That Believes in You', body: 'Hanaku\'s most unusual quality is not its power. It is its persistent, unshakeable belief that things will be fine. Hosts describe this as either the most comforting or the most exasperating thing about the arrangement.' },
      { stage: 5, title: 'Against All Odds', body: 'Hanaku full sync hosts have the best survival rates of any primal on record. Statisticians cannot explain this. Hanaku, when pressed, just vibrated its wings. This is believed to mean "I told you so."' },
    ],
  },

  Hachitsuno: {
    tails: 8, element: 'Ink/Lightning', pow: 95,
    personality: 'Confident & Brotherly',
    flavors: ['Hachitsuno does not trust easily. It trusts completely. There is no middle state.','The Eighth Primal is a creature of absolute loyalty once the bond forms — and absolute silence before.','Hachitsuno once wrestled its host for three weeks before acknowledging them. It was testing, not refusing.'],
    syncCeiling: 5,
    captureMonths: 8, // Hardest to capture
    statBonus: [
      {},
      { taijutsu: -8, morale: -12 },
      { taijutsu: 10, chakra: 8, morale: -4 },
      { taijutsu: 18, chakra: 15, morale: 4 },
      { taijutsu: 24, chakra: 20, morale: 10 },
      { taijutsu: 30, chakra: 25, ninjutsu: 15, morale: 16 },
    ],
    passiveVillage: { fear: 15, morale: 2 }, // diplomatic fear from other villages
    uniqueAbility: { stage: 4, desc: 'Hachitsuno\'s Ink — vessel can produce chakra constructs that persist for one month (treat as a deployed ally).' },
    loreBonus: { id: 'gyuki_lore', desc: '+20% taijutsu on all S-rank missions' },
    destabilizeChance: 0.04,
    extractionAttractionMult: 1.3, // High-value target
    lore: [
      { stage: 1, title: 'The Many-Limbed', body: 'Hachitsuno\'s form — enormous, plated, with a forest of inkdark limbs no two accounts agree on — has generated more academic debate than any other primal. Hachitsuno finds this debate boring and has said so.' },
      { stage: 2, title: 'The Test of Strength', body: 'Every Hachitsuno host describes an identical early experience: being physically challenged. Not attacked — challenged. Pushed to limits. Hachitsuno wants to know who it\'s dealing with before it offers anything.' },
      { stage: 3, title: 'Once Given, Never Withdrawn', body: 'The Eighth Primal\' loyalty, once established, has never been voluntarily revoked in any recorded case. "I don\'t quit," it told one host. "Don\'t make me regret that."' },
      { stage: 4, title: 'Brothers in Arms', body: 'Multiple Hachitsuno hosts described the same moment when the relationship shifted from grudging cooperation to genuine partnership: Hachitsuno calling them, for the first time, by name. Not "host." Not "vessel." Their name.' },
      { stage: 5, title: 'The Perfect Team', body: 'A full Hachitsuno sync is the closest thing to a true partnership between primal and human that any record describes. Both parties describe it the same way. Hachitsuno\'s version, recorded once: "Finally."' },
    ],
  },

  Kureni: {
    tails: 9, element: 'Pure Chakra', pow: 100,
    personality: 'Hostile & Proud',
    flavors: ['Kureni has decided you are worth hating. This is, technically, a compliment — it has ignored lesser hosts entirely.','The Ninth Primal does not negotiate. It condemns, resists, and waits. It has infinite patience for waiting.','Kureni called its host "tolerable" once. The host wept. This was, apparently, the highest praise available.'],
    syncCeiling: 5,
    captureMonths: 9, // Longest capture mission
    statBonus: [
      {},
      { ninjutsu: -10, chakra: -10, morale: -20 },
      { ninjutsu: 15, chakra: 15, morale: -12 },
      { ninjutsu: 25, chakra: 22, morale: -5 },
      { ninjutsu: 32, chakra: 30, morale: 2 },
      { ninjutsu: 40, chakra: 38, taijutsu: 20, morale: 10 },
    ],
    passiveVillage: { rep: 30, def: 40, morale: -8, fear: 30 },
    uniqueAbility: { stage: 5, desc: 'Ninth Primal Chakra Mode — vessel becomes unkillable on a mission this month. Used once per year.' },
    loreBonus: { id: 'kurama_lore', desc: '+15% all mission success rates' },
    destabilizeChance: 0.20,
    loyaltyRisk: true, // periodically tests host loyalty
    extractionAttractionMult: 1.5, // Highest value target
    lore: [
      { stage: 1, title: 'The Ninth Primal\' Fury', body: 'Kureni\'s attack on the Hidden Village in recorded history was not an accident and not mindless rage. It was Kureni being used as a weapon and being furious about it. The fury has never fully subsided.' },
      { stage: 2, title: 'A Prison It Did Not Choose', body: 'Kureni has been sealed more than any other primal. It views this as an ongoing injustice. It is not wrong. Every new host inherits the weight of that history.' },
      { stage: 3, title: 'What Kureni Wants', body: 'After centuries of conflict and scholarship, researchers converged on a single answer to the question of what the Ninth Primal actually wants: to be acknowledged as what it is, rather than feared for what it could do. This is either profound or obvious, depending on who you ask.' },
      { stage: 4, title: 'The Long Road to Trust', body: 'The only confirmed Stage 4 Kureni relationships all share a common element: time. Extraordinary amounts of it. And a host who never gave up. Kureni respects stubbornness, though it would not frame it that way.' },
      { stage: 5, title: 'Ally', body: 'There are no records of full Kureni sync in formal scholarship because no formal scholar survived long enough to document it. What exists are letters. One line recurs across all of them, in different hands, across different centuries: "It said my name like it meant it."' },
    ],
  },
}

// Sync stage labels
export const SYNC_STAGES = [
  { n: 'Unsealed',     color: 'var(--text-dim)' },
  { n: 'Rejection',    color: 'var(--red)' },
  { n: 'Suppression',  color: 'var(--orange)' },
  { n: 'Coexistence',  color: 'var(--gold)' },
  { n: 'Cooperation',  color: 'var(--green)' },
  { n: 'Full Sync',    color: 'var(--blue)' },
]

// Stage thresholds in sync months
export const STAGE_THRESHOLDS = [0, 3, 6, 12, 18, 999]

/** Compute current sync stage from syncMonths. */
export function getSyncStage(beast) {
  if (!beast.sealed || !beast.jk) return 0
  const m = beast.syncMonths || 0
  const ceil = BEAST_DATA[beast.n]?.syncCeiling ?? 5
  for (let i = STAGE_THRESHOLDS.length - 1; i >= 1; i--) {
    if (m >= STAGE_THRESHOLDS[i - 1] && i <= ceil) return i
  }
  return 1
}

/** Apply stat bonuses to a vessel shinobi based on current stage. */
export function applyBeastStats(s, beast) {
  const data = BEAST_DATA[beast.n]
  if (!data) return
  const stage = getSyncStage(beast)
  // statBonus entries are ABSOLUTE per-stage totals. Apply only the delta from the
  // previously-applied bonus so repeated calls and stage transitions are idempotent
  // (B-IDEMP-1): re-applying the same stage is a no-op; advancing applies the difference.
  const bonus = stage === 0 ? {} : (data.statBonus[stage] || {})
  const STAT_KEYS = ['ninjutsu', 'taijutsu', 'chakra', 'speed', 'genjutsu', 'intelligence']
  const prev = s._beastBonusApplied || {}
  STAT_KEYS.forEach(k => {
    const delta = (bonus[k] || 0) - (prev[k] || 0)
    if (delta !== 0) s.stats[k] = Math.max(0, Math.min(99, (s.stats[k] || 0) + delta))
  })
  s._beastBonusApplied = STAT_KEYS.reduce((o, k) => { if (bonus[k] !== undefined) o[k] = bonus[k]; return o }, {})
}

/**
 * MIG-1: heal vessel stats inflated by the pre-fix cumulative bug.
 * Pre-fix, applyBeastStats added Σ statBonus[1..stage]; the correct total is statBonus[stage].
 * Subtract the over-application Σ statBonus[1..stage-1] once, and seed _beastBonusApplied so
 * post-fix ticks stay correct. Runs once per save (G._beastStatsMigrated guard).
 * Note: stats that saturated at 0/99 during original application can't be perfectly recovered;
 * unsaturated stats heal exactly.
 */
export function migrateBeastStats(G) {
  if (!G || G._beastStatsMigrated) return
  G._beastStatsMigrated = true
  const STAT_KEYS = ['ninjutsu', 'taijutsu', 'chakra', 'speed', 'genjutsu', 'intelligence']
  for (const beast of G.beasts || []) {
    if (!beast.sealed || !beast.jk) continue
    const data = BEAST_DATA[beast.n]; if (!data) continue
    const stage = getSyncStage(beast)
    if (stage === 0) continue
    const s = (G.shinobi || []).find(x => x.id === beast.jk)
    if (!s || !s.stats || s._beastBonusApplied) continue // skip if already on post-fix accounting
    const over = {}
    for (let i = 1; i < stage; i++) {
      const b = data.statBonus[i] || {}
      STAT_KEYS.forEach(k => { if (b[k] !== undefined) over[k] = (over[k] || 0) + b[k] })
    }
    STAT_KEYS.forEach(k => {
      if (over[k]) s.stats[k] = Math.max(0, Math.min(99, (s.stats[k] || 0) - over[k]))
    })
    const cur = data.statBonus[stage] || {}
    s._beastBonusApplied = STAT_KEYS.reduce((o, k) => { if (cur[k] !== undefined) o[k] = cur[k]; return o }, {})
  }
}

/**
 * Probability of successfully capturing a wild beast (M-CAP-1).
 * Base 35% shifted ±1%/point of power gap, clamped to a fair [5%, 95%] band so the
 * outcome is never a foregone conclusion in either direction.
 */
export function captureChance(attackerPow, beastPow) {
  return Math.max(0.05, Math.min(0.95, 0.35 + (attackerPow - beastPow) * 0.01))
}

/** Run monthly beast tick — returns array of event objects { title, body, type }. */
export function tickBeast(beast, G) {
  if (!beast.sealed || !beast.jk) return []
  const data = BEAST_DATA[beast.n]
  if (!data) return []
  const events = []
  const stage = getSyncStage(beast)

  // Advance sync month
  beast.syncMonths = (beast.syncMonths || 0) + 1

  const vessel = G.shinobi.find(s => s.id === beast.jk)
  if (!vessel) return []

  // ── Stage transition notifications ──────────────────────────────────────
  const newStage = getSyncStage(beast)
  if (newStage !== stage && newStage > 0) {
    const stageInfo = SYNC_STAGES[newStage]
    applyBeastStats(vessel, beast)
    events.push({
      title: `${beast.n}: ${stageInfo.n}`,
      body: `The bond between ${vessel.fn} ${vessel.ln} and ${beast.n} has advanced to ${stageInfo.n}. New capabilities are unlocking.`,
      type: 'good',
    })
    // Give XP / morale hit at key stages
    if (newStage === 3) {
      G.morale = Math.min(100, (G.morale || 75) + 5)
      events.push({ title: 'Village Accepts the Vessel', body: 'As the seal stabilizes, civilian fear begins to subside. Morale improves.', type: 'good' })
    }
    if (newStage === 5) {
      vessel.title = `Vessel of ${beast.n}`
      G.reputation = Math.min(999, (G.reputation || 0) + 20)
      G.legend = (G.legend || 0) + 30
      events.push({
        title: `Full Sync Achieved — ${beast.n}`,
        body: `${vessel.fn} ${vessel.ln} has achieved complete resonance with ${beast.n}. The beast is now a named ally of your village. Other nations take notice.`,
        type: 'legend',
      })
    }
  }

  // ── Stage 1: Rejection events ────────────────────────────────────────────
  if (newStage === 1) {
    G.morale = Math.max(0, (G.morale || 75) - 3)
    vessel.commitment = Math.max(0, (vessel.commitment || 50) - 5)
    if (Math.random() < 0.4) {
      events.push({ title: `${beast.n} Rejection Pain`, body: `${vessel.fn} ${vessel.ln} collapsed during training. The beast fights every seal pulse. Unrest spreading through the shinobi ranks.`, type: 'bad' })
      G.morale = Math.max(0, G.morale - 4)
    }
  }

  // ── Stage 2: Suppression events ─────────────────────────────────────────
  if (newStage === 2) {
    G.morale = Math.max(0, (G.morale || 75) - 1)
    if (Math.random() < 0.25) {
      events.push({ title: `${beast.n} Instability`, body: `Chakra leaked through the seal briefly. Emergency containment squad was scrambled. ${vessel.fn} ${vessel.ln} is physically recovered but shaken.`, type: 'warn' })
    }
  }

  // ── Beast-specific monthly effects ──────────────────────────────────────

  // Sakeru: destabilize
  if (beast.n === 'Sakeru' && Math.random() < data.destabilizeChance) {
    const roll = Math.random()
    if (roll < 0.5) {
      G.morale = Math.max(0, G.morale - 5)
      events.push({ title: 'Sakeru Paranoia Wave', body: 'A pulse of the One-Tail\'s anxiety swept through the village. Civilians reported nightmares. Guard shifts saw two fights break out.', type: 'bad' })
    } else {
      events.push({ title: 'Sand Storm Warning', body: 'Sakeru\'s sealed chakra caused an unusual sand storm near the village border. No casualties. Several very confused merchants.', type: 'warn' })
    }
  }
  G.morale = Math.max(0, G.morale + (data.passiveVillage?.morale || 0))

  // Niryuu: mood swing
  if (beast.n === 'Niryuu' && Math.random() < (data.moodSwingChance || 0)) {
    if (Math.random() < 0.5) {
      G.morale = Math.min(100, G.morale + 8)
      events.push({ title: 'Niryuu Warmth', body: `${vessel.fn} ${vessel.ln} reported Niryuu in an especially cooperative mood. Training felt effortless. The entire squad came back glowing.`, type: 'good' })
    } else {
      G.morale = Math.max(0, G.morale - 6)
      events.push({ title: 'Niryuu Mood Swing', body: `${vessel.fn} ${vessel.ln} had to abort a training session when Niryuu became unpredictable. No injuries. But the gym is on fire.`, type: 'warn' })
    }
  }

  // Kureni: morale hit
  if (beast.n === 'Kureni') {
    G.morale = Math.max(0, G.morale - 2)
    if (data.loyaltyRisk && newStage <= 3 && Math.random() < 0.15) {
      events.push({
        title: 'Kureni Loyalty Test',
        body: `Kureni pushed against the seal with unusual force — not trying to escape, but testing. ${vessel.fn} ${vessel.ln} held. Barely.`,
        type: 'warn',
      })
    }
  }

  // Kaenkou: respect check
  if (beast.n === 'Kaenkou' && data.respectSystem && newStage >= 2) {
    // If village relations are poor (reputation < 30), Kaenkou resists
    if ((G.reputation || 0) < 30 && Math.random() < 0.3) {
      beast.syncMonths = Math.max(0, (beast.syncMonths || 0) - 1)
      events.push({ title: 'Kaenkou — Disrespect Felt', body: 'Kaenkou sensed your village\'s diminished standing and withdrew cooperation this month. Sync progress was reversed slightly. The Fourth Primal will not partner with a village it cannot respect.', type: 'warn' })
    }
  }

  // Suiro: injury recovery passive
  if (beast.n === 'Suiro' && newStage >= 3) {
    G.shinobi.filter(s => s.status === 'injured' && s.injDays > 0).forEach(s => {
      if (Math.random() < 0.25) {
        s.injDays = Math.max(0, s.injDays - 30)
      }
    })
  }

  // Hanaku: mission luck (applied in adv.js via passive check)
  // Hachitsuno: passive fear (applied as diplomacy modifier)
  if (beast.n === 'Hachitsuno' && newStage >= 3) {
    G.villages?.forEach(v => {
      if (v.rel !== undefined) {
        // Rivals are slightly more wary — small fear modifier visible on map
        v.fear = Math.min(100, (v.fear || 0) + 2)
      }
    })
  }

  // ── Escape events ────────────────────────────────────────────────────────
  if (newStage <= 2 && (G.morale || 75) < 30) {
    const traumaRecent = G.log?.slice(-3).some(e => e.t === 'bad')
    if (traumaRecent && Math.random() < 0.20) {
      _triggerEscapeEvent(beast, vessel, G, events, newStage)
    }
  }

  // ── Lore unlock ─────────────────────────────────────────────────────────
  const loreList = data.lore || []
  const loreUnlocked = beast.loreUnlocked || []
  const eligibleLore = loreList.filter(l => newStage >= l.stage && !loreUnlocked.includes(l.stage))
  if (eligibleLore.length > 0) {
    const lore = eligibleLore[0]
    loreUnlocked.push(lore.stage)
    beast.loreUnlocked = loreUnlocked
    events.push({ title: `Lore Unlocked: ${lore.title}`, body: lore.body, type: 'lore' })
    // Check if all lore unlocked
    if (loreUnlocked.length >= loreList.length && !beast.loreBonusActive) {
      beast.loreBonusActive = true
      events.push({
        title: `${beast.n} Lore Mastered`,
        body: `All historical records of ${beast.n} have been uncovered. A permanent village bonus is now active: ${data.loreBonus.desc}.`,
        type: 'legend',
      })
      events.push({
        title: `Complete Lore — ${beast.n}`,
        body: `The complete history of ${beast.n} is now known to your village.`,
        type: 'lore',
        narrative: `The complete history of ${beast.n} is now known to your village. The knowledge carries weight — and responsibility.`,
      })
    }
  }

  return events
}

function _triggerEscapeEvent(beast, vessel, G, events, stage) {
  const roll = Math.random()
  if (stage === 1 && roll < 0.15) {
    // Full rampage (rare, Stage 1 only)
    G.ryo = Math.max(0, G.ryo - 20000)
    G.morale = Math.max(0, G.morale - 20)
    G.reputation = Math.max(0, G.reputation - 15)
    beast.escapeHistory = beast.escapeHistory || []
    beast.escapeHistory.push({ y: G.year, m: G.month, type: 'rampage' })
    events.push({
      title: `${beast.n} Full Rampage!`,
      body: `The seal failed briefly. ${beast.n} tore through the eastern district before ${vessel.fn} ${vessel.ln} regained control. Significant infrastructure damage. Neighboring villages are alarmed. This event has been recorded in the Chronicles.`,
      type: 'critical',
    })
    G.log?.push({ y: G.year, m: G.month, msg: `${beast.n} rampage — major village damage.`, t: 'bad' })
  } else {
    // Partial release (common)
    G.ryo = Math.max(0, G.ryo - 5000)
    G.morale = Math.max(0, G.morale - 8)
    beast.escapeHistory = beast.escapeHistory || []
    beast.escapeHistory.push({ y: G.year, m: G.month, type: 'partial' })
    events.push({
      title: `${beast.n} Partial Release`,
      body: `${beast.n}'s chakra leaked beyond the seal for several hours. ${vessel.fn} ${vessel.ln} lost control temporarily. The containment squad was deployed. Economic damage and civilian panic. World map shows a crisis indicator this month.`,
      type: 'bad',
    })
    // Add to noticeboard for resolution meeting
    G.noticeboard = G.noticeboard || []
    G.noticeboard.push({
      id: 'escape_' + Date.now(),
      title: `${beast.n} Containment Crisis`,
      text: 'A partial release requires your attention. Deploy a containment squad or schedule an emergency one-on-one meeting with the vessel.',
      priority: 'urgent', cat: 'Primals', dismissed: false,
    })
  }
}

/** Compute all active passive bonuses from sealed beasts. */
export function getBeastPassives(G) {
  const passives = {
    missionLuck: 0,
    defBonus: 0,
    injuryRecoveryMod: 0,
    academyGrowthMod: 0,
    moraleBonus: 0,
    repBonus: 0,
    featuredBonuses: [],
  }
  ;(G.beasts || []).forEach(b => {
    if (!b.sealed || !b.jk) return
    const data = BEAST_DATA[b.n]
    if (!data) return
    const stage = getSyncStage(b)
    if (stage === 0) return
    const pv = data.passiveVillage || {}
    if (pv.missionLuck) passives.missionLuck += pv.missionLuck
    if (pv.def) passives.defBonus += pv.def
    if (pv.injuryRecovery) passives.injuryRecoveryMod += pv.injuryRecovery
    if (pv.academyGrowth) passives.academyGrowthMod += pv.academyGrowth
    if (pv.morale) passives.moraleBonus += pv.morale
    if (pv.rep) passives.repBonus += pv.rep
    if (b.loreBonusActive) passives.featuredBonuses.push(data.loreBonus)
  })
  return passives
}

/** Inter-beast pair dynamics — modifies diplomacy and other state. */
export function applyBeastPairEffects(G) {
  const sealed = (G.beasts || []).filter(b => b.sealed && b.jk).map(b => b.n)
  // Sakeru + Tairyuu: clashing natures
  if (sealed.includes('Sakeru') && sealed.includes('Tairyuu')) {
    G.villages?.forEach(v => { v.rel = Math.max(0, (v.rel || 50) - 10) })
  }
  // Kureni + Hachitsuno: trade bonus
  if (sealed.includes('Kureni') && sealed.includes('Hachitsuno')) {
    G._kurenigykiBonus = true
  } else {
    G._kurenigykiBonus = false
  }
  // Niryuu + Hanaku: both vessel get morale
  if (sealed.includes('Niryuu') && sealed.includes('Hanaku')) {
    G.shinobi?.forEach(s => {
      if (G.beasts.some(b => (b.n === 'Niryuu' || b.n === 'Hanaku') && b.jk === s.id)) {
        s.commitment = Math.min(100, (s.commitment || 50) + 3)
      }
    })
  }
}
