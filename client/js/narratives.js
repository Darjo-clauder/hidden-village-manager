// Mission flavor text — ~200 total lines across ranks, outcomes, traits, squad, and rank-up.

const NARRATIVES = {
  D: {
    success: [
      '{name} returned before dusk, mission scroll delivered without incident.',
      'A routine task, but {name} handled it with quiet professionalism.',
      'The client was satisfied. {name} collected the fee and said nothing extra.',
      '{name} completed the errand without drawing a single eye.',
      'Low rank, low risk — {name} made it look even easier than that.',
      'The village cat was retrieved. {name} has seen better days, but the mission is done.',
      '{name} filed the mission report before the ink was even dry on the contract.',
      'Small job. Completed. {name} is already looking at what comes next.',
      'The client tipped generously. {name} didn\'t ask why.',
      'D-rank work isn\'t glamorous, but {name} treats every assignment like it matters.',
      'Package delivered, receipt signed. {name} made it look trivial.',
      '{name} navigated three checkpoints and arrived on time. No one noticed.',
      'The escort arrived safely. {name} never unsheathed a weapon.',
      'Even routine missions have their dignity. {name} kept that.',
      'Quick, clean, done. {name} moves on without ceremony.',
    ],
    failure: [
      '{name} came back empty-handed. Mistakes happen on D-rank too.',
      'A simple job, and somehow {name} managed to complicate it.',
      'The client complained. {name} shrugged. The ryo stayed in someone else\'s pocket.',
      '{name} underestimated the terrain. Even couriers face the unexpected.',
      'No injuries, but no payment either. {name} learned something today.',
      'The cat escaped again. {name} refuses to elaborate.',
      '{name} was an hour late. The window closed. Lesson noted.',
      'Wrong address, wrong package, wrong outcome. {name} owns it.',
      'An embarrassing stumble on a D-rank. {name} won\'t say it out loud, but they\'re stung.',
      'The client cancelled mid-job. {name} had nothing to show for it.',
      'Minor mission, major frustration. {name} took it harder than they should have.',
      'A locked gate, a missed deadline, a quiet walk home. {name} counts it.',
      '{name} slipped up at the last step. The simplest jobs have their own way of humbling you.',
      'It should have taken twenty minutes. It took three hours and still failed.',
      '{name} got turned around in the forest. By the time they arrived, it was too late.',
    ],
  },
  C: {
    success: [
      '{name} neutralised the threat and filed a clean report — no loose ends.',
      'Outnumbered briefly, but {name} adapted and brought the mission home.',
      '{name} escorted the target through the pass without losing a step.',
      'The rogue nin was intercepted. {name} didn\'t even break a sweat.',
      'Border intelligence confirmed: {name}\'s recon was textbook accurate.',
      '{name} returned with three scars and twice the intel requested.',
      'The ambush was anticipated. {name} had planned for it.',
      '{name} blended into the crowd, completed the objective, and vanished.',
      'Clean extraction. The client never even knew there had been danger.',
      '{name} improvised when the plan fell apart, and still delivered.',
      'Two guards, one window, zero evidence. {name} made it work.',
      'The intel was verified on-site. {name} was already three steps ahead.',
      'Quiet infiltration, quiet exit. {name} left no traces.',
      '{name} talked their way past the checkpoint and did the rest with chakra.',
      'The assignment required speed and nerve. {name} had both.',
    ],
    failure: [
      '{name} was outmanoeuvred. The mission objective slipped away.',
      'A C-rank shouldn\'t end this way, but {name} ran into something worse.',
      'The intercept failed. {name} is bruised — in body and in pride.',
      'Overconfidence cost the mission. {name} admits it, quietly.',
      '{name} called for retreat. The right call, but the ryo is gone.',
      'The assignment unravelled fast. {name} barely made it back.',
      'The target had already moved. {name} chased shadows for two days.',
      'A missed signal, a wrong turn, a ruined extraction. {name} catalogues the errors.',
      '{name} was forced to abort. The mission file will stay open.',
      'The backup plan failed too. {name} improvised an exit and lived to report it.',
      'Burned cover, lost ryo, one minor injury. Could have been worse.',
      'The job demanded subtlety. {name} tried. The result speaks for itself.',
      '{name} underestimated the opposition. A C-rank cell with A-rank coordination.',
      'The rendezvous never happened. {name} waited too long and the opportunity collapsed.',
      'Intelligence was wrong. {name} walked into a trap and got out — barely.',
    ],
  },
  B: {
    success: [
      '{name} moved through enemy territory like a ghost and came out clean.',
      'The crime lord is dead. {name} didn\'t leave a calling card.',
      'Recon complete — {name} brought back maps the enemy didn\'t know were drawn.',
      '{name} held the perimeter alone for two hours. The mission succeeded.',
      'Surgical. Precise. {name} completed the B-rank like it was personal.',
      '{name} outthought the target at every turn. Textbook execution.',
      'The objective was compromised before arrival. {name} adapted on the fly and finished it anyway.',
      'Night operation, hostile zone, zero backup. {name} walked out with the intel.',
      '{name} eliminated the threat before it reached the village. Quietly.',
      'The extraction took twice as long as planned. {name} never panicked.',
      'Against trained opposition, {name} came out ahead. They won\'t forget this one.',
      '{name} held the line until the window opened, then moved.',
      'No backup, no fail-safe, no hesitation. {name} finished it.',
      'Three checkpoints bypassed, one guard neutralised, objective secured. {name} didn\'t miss a beat.',
      'The B-rank demanded everything {name} had. They gave more.',
    ],
    failure: [
      'The operation was compromised early. {name} extracted under fire.',
      '{name} was identified. Abort was the only option — they made it out, barely.',
      'A double-cross no one anticipated. {name} took the hit for the squad.',
      'The target had backup. {name} fought clear but couldn\'t finish the job.',
      '{name}\'s cover broke at the worst moment. Mission scrubbed.',
      'Too many variables, not enough time. {name} calls it a near-miss.',
      'Unexpected ANBU presence. {name} pulled back before it became worse.',
      'The extraction point was already burned. {name} found another way out.',
      'Three things went wrong at once. {name} survived one and failed the others.',
      'The asset was gone before {name} arrived. They came back with nothing.',
      '{name} was outranked in chakra and outgunned in numbers. They survived. That\'s what matters.',
      'A mission that nearly cost everything. {name} is alive. The objective is not complete.',
      'Tactical failure, strategic retreat, personal cost. {name} marks it as a lesson.',
      'The plan held for six hours and fell apart in the last ten minutes.',
      '{name} was compromised by something that wasn\'t in the briefing.',
    ],
  },
  A: {
    success: [
      '{name} walked into the enemy village and walked back out. Alone.',
      'The stolen scroll has been recovered. {name} won\'t discuss the details.',
      'Elite opposition, no backup, and {name} still delivered. Legendary.',
      '{name} turned the Kage\'s flanks without triggering a single alarm.',
      'Every contingency failed except {name}. That was enough.',
      'The dossier said impossible. {name} handed it in before sunrise.',
      '{name} dismantled the cell from the inside. No survivors to report back.',
      'The target is eliminated. The village is safe. {name} said it would happen.',
      'Whatever {name} did in those three days — the results speak without a debrief.',
      'Four elite jonin, one contested objective. {name} secured it.',
      'Speed, intelligence, and ruthlessness. {name} used all three.',
      'The mission lasted seventy-two hours. {name} slept four of them. Still won.',
      'The enemy didn\'t know {name} was there until it was already over.',
      '{name} operated deep in hostile territory and came back intact. That alone is remarkable.',
      'Flawless execution on an A-rank that should have required a squad. {name} did it solo.',
    ],
    failure: [
      'The enemy was ready. {name} suspects a leak — and survived to say so.',
      '{name} reached the objective and found nothing. Someone got there first.',
      'A-rank missions don\'t forgive mistakes. {name} made one.',
      'The extraction window closed. {name} improvised an escape at great cost.',
      'Outnumbered three to one at the final stage. {name} retreated.',
      '{name} was hunted through the forest for six hours. Came back. Barely.',
      'The operation was burned before it started. {name} has questions about the briefing.',
      'Hostile terrain, missing intel, and a target that anticipated every move. {name} aborted.',
      '{name} got two objectives in and missed the third. The third was the one that mattered.',
      'The village they infiltrated was already on lockdown. {name} spent the mission just surviving.',
      'Three separate things failed. {name} can explain each one. None of them excuse the result.',
      'Forced retreat under heavy fire. {name} left something behind that can\'t be recovered.',
      'An A-rank that became a survival mission. {name} came back. The mission did not.',
      '{name} was betrayed by information that turned out to be fabricated.',
      'The enemy knew the playbook. {name} had to improvise, and the improvisation wasn\'t enough.',
    ],
  },
  S: {
    success: [
      '{name} faced the unthinkable and didn\'t flinch. The world shifted quietly.',
      'An S-rank mission fulfilled. Even the Kage paused upon reading the report.',
      '{name} stood between destruction and survival — and chose correctly.',
      'History will not record what {name} did tonight. But it mattered.',
      'The threat has been neutralised. {name} says nothing and asks for rest.',
      'Whatever happened out there, {name} came back different. And victorious.',
      'The kind of mission they write about in sealed archives. {name} completed it.',
      '{name} operated beyond the edge of what shinobi are supposed to be capable of.',
      'The world is measurably safer tonight because of what {name} did.',
      'S-rank. Completed. No casualties. That almost never happens. {name} made it happen.',
      '{name} looked the abyss in the face and made it blink.',
      'The operation spanned four countries. {name} handled all of it.',
      'Every piece of preparation paid off. And then the plan collapsed, and {name} improvised the rest.',
      'Legendary outcome on a mission rated near-impossible. {name} didn\'t flinch once.',
      'The debrief will take three days. The mission took {name} alone.',
    ],
    failure: [
      'S-rank missions kill legends. {name} survived — that itself is a victory of sorts.',
      'The objective failed. But {name} uncovered something far more dangerous.',
      '{name} was overpowered by a force that shouldn\'t exist. The mission is shelved.',
      'Even {name} has limits. Today found them.',
      'Catastrophic opposition. {name} extracted the essential intel and ran.',
      'The mission collapsed at the final moment. {name} returned with scars and silence.',
      'The S-rank was rated based on incomplete intelligence. {name} paid the price.',
      '{name} encountered something classified far above this mission\'s clearance level. They survived.',
      'Three days of preparation undone in forty minutes. {name} is back. The mission isn\'t.',
      'Whatever they sent against {name} shouldn\'t have been out there. The debrief is restricted.',
      'S-rank failure. {name} is alive. That\'s the only line in the report that isn\'t difficult to read.',
      'The enemy had been preparing for exactly this. {name} barely walked away.',
      'Failed at the last threshold. {name} will not discuss what was on the other side of it.',
      'The mission was rated S-rank for the target. It should have been rated higher.',
      '{name} returned changed. The objective was not completed. The reason is classified.',
    ],
  },
}

// Trait-reactive narrative lines — used when shinobi has a named trait
const TRAIT_NARRATIVES = {
  Reckless: {
    success: [
      '{name}\'s recklessness was the plan all along — or at least, that\'s what the report claims.',
      'Three unnecessary risks taken. All three paid off. {name} calls it instinct.',
      '{name} charged where a careful shinobi would have waited. Today, speed was right.',
    ],
    failure: [
      '{name} pushed too hard, too fast — the Reckless trait lived up to its name.',
      'The aggressive line cost {name} the objective. They knew the risk going in.',
      '{name} took the aggressive option. It didn\'t work this time.',
    ],
  },
  Calm: {
    success: [
      'No wasted movement, no panic. {name}\'s calm was the decisive factor.',
      '{name} assessed, breathed, and executed. Steady hands close difficult missions.',
      'Under pressure, {name} only slowed down. That composure made the difference.',
    ],
    failure: [
      'Even {name}\'s composure had limits today. A rare crack in the exterior.',
      '{name} assessed the situation and made the right call — it just wasn\'t enough.',
      'Patience and calm weren\'t enough this time. The odds were simply stacked against {name}.',
    ],
  },
  Loyal: {
    success: [
      '{name} carried the village\'s name into dangerous territory. Brought it back clean.',
      'Loyalty to the mission, to the client, to the village. {name} honored all three.',
      '{name} stayed the course when retreat would have been excusable. That loyalty paid off.',
    ],
    failure: [
      '{name} refused to abandon the objective even when the odds turned. Loyalty cost this one.',
      'The mission fell apart, but {name} stayed until there was nothing left to stay for.',
      '{name} held the line past the breaking point. Loyal to the end — and past it.',
    ],
  },
  Ambitious: {
    success: [
      '{name} took this personally. That hunger drove the mission to completion.',
      'They wanted the win more than anyone in the briefing room. {name} proved it.',
      'Ambition and result aligned today. {name} won\'t stop here.',
    ],
    failure: [
      '{name} reached for something just out of grasp. The ambition was there. The margin wasn\'t.',
      'Wanting it badly isn\'t the same as being ready. {name} filed that away.',
      'The Ambitious trait pushed {name} too far into contested territory.',
    ],
  },
  Protective: {
    success: [
      '{name} put themselves between the mission and failure. It held.',
      'The objective survived because {name} refused to let it die.',
      'Protective instinct converted into tactical advantage. {name} covered every angle.',
    ],
    failure: [
      '{name} spent the mission protecting instead of completing — priorities collided.',
      'The defensive posture cost time. {name} came back intact but empty-handed.',
      '{name}\'s instinct was to shield rather than strike. It wasn\'t the right call today.',
    ],
  },
  'Lone Wolf': {
    success: [
      '{name} operated alone by choice and preference. The outcome reflects it.',
      'No coordination required. {name} needed only themselves.',
      'Sent alone, worked alone, succeeded alone. {name} wouldn\'t have it any other way.',
    ],
    failure: [
      '{name} could have used backup. Chose not to ask for it. Paid the price.',
      'The Lone Wolf approach ran out of angles. This one needed two people.',
      '{name} refused support on principle. A costly principled stand.',
    ],
  },
  Honorable: {
    success: [
      '{name} completed the mission without compromising a single principle. That\'s rare.',
      'They did it the hard way because the easy way wasn\'t clean enough. {name} succeeded anyway.',
      'Honor and effectiveness — {name} proved tonight they aren\'t mutually exclusive.',
    ],
    failure: [
      '{name} refused to take the shortcut that would have completed it. Principles held. Mission didn\'t.',
      'An honorable retreat. {name} walked away from a compromise they wouldn\'t make.',
      'The mission required something {name} wouldn\'t do. They came back with their integrity and nothing else.',
    ],
  },
}

// Squad-specific narratives — reference the team, not one shinobi
const SQUAD_NARRATIVES = {
  D: {
    success: [
      '{name} worked together like they\'d trained for exactly this — because they had.',
      'Simple task, clean teamwork. {name} got it done without a single crossed signal.',
      'Even a D-rank is smoother with backup. {name} proved the point.',
    ],
    failure: [
      '{name} couldn\'t align on the approach and the job showed it.',
      'Miscommunication is expensive at any rank. {name} learned that today.',
      'Three shinobi, three plans, no coordination. {name} returned with nothing to show.',
    ],
  },
  C: {
    success: [
      '{name} functioned as a unit — each shinobi covering the angles the others couldn\'t.',
      'Clean sweep. {name} coordinated perfectly under pressure.',
      'The squad moved like one organism. {name} made it look rehearsed.',
    ],
    failure: [
      '{name} split the objective and lost both halves.',
      'The squad couldn\'t converge at the right moment. {name} came back short.',
      'Individual competence, collective failure. {name} has some talking to do.',
    ],
  },
  B: {
    success: [
      '{name} operated as a team in the truest sense — each carrying their share and more.',
      'High stakes, high coordination. {name} didn\'t leave anything on the field.',
      'They read each other without signals. {name} finished the B-rank together.',
    ],
    failure: [
      'The squad\'s timing was off from the start. {name} couldn\'t recover it.',
      '{name} held together long enough to extract — the mission itself didn\'t survive.',
      'Under coordinated opposition, {name}\'s formation broke. They came back intact, mission incomplete.',
    ],
  },
  A: {
    success: [
      '{name} entered hostile territory as a unit and left as legends.',
      'The coordination between {name}\'s members bordered on precognition. The mission reflected it.',
      'A-rank, squad deployment, full success. {name} executed without a single break in formation.',
    ],
    failure: [
      '{name} was fractured by the opposition early. They extracted, but the cost was steep.',
      'The squad held until it couldn\'t. {name} came back — the objective didn\'t.',
      'Elite enemy response overwhelmed {name}\'s formation. Retreat was the only right call.',
    ],
  },
  S: {
    success: [
      '{name} completed an S-rank as a unit. The shinobi world will feel the effect.',
      'Everything about this mission was wrong on paper. {name} made it right together.',
      '{name} moved through the mission like a coordinated force of nature. Victory was total.',
    ],
    failure: [
      '{name} made it back. That\'s the only win to report from an S-rank that went wrong.',
      'They pushed further than any squad should have. {name} extracted what they could.',
      'The S-rank broke the formation early. {name} improvised survival and called it a partial extraction.',
    ],
  },
}

// Rank-up narratives — used when a mission directly causes a promotion
const RANK_UP_NARRATIVES = {
  Genin: [
    'Academy lessons end here. {name} steps into the real world as a Genin.',
    'The village has formally recognized {name}. Genin rank — the first threshold crossed.',
    '{name} graduates from theory to practice. A Genin now, and something more by the end of it.',
  ],
  Chunin: [
    '{name} carries more than skill now — they carry responsibility. Chunin rank earned.',
    'Leadership capacity confirmed. {name} is now Chunin, and the village expects more of them.',
    'A hard-earned promotion. {name} becomes Chunin and doesn\'t smile about it. They know what it costs.',
  ],
  Jonin: [
    'Jonin rank. {name} has crossed a threshold most shinobi never reach.',
    'The village\'s elite acknowledge {name} as one of their own. Jonin status confirmed.',
    '{name} doesn\'t feel different — but the mission roster they\'re cleared for says otherwise. Jonin.',
  ],
  ANBU: [
    '{name} enters the shadows. ANBU rank — their name leaves the public record.',
    'Classified. {name} has crossed into ANBU. Most shinobi pretend they don\'t exist.',
    'The mask is earned. {name} becomes ANBU, and the world will not know why they\'re missing.',
  ],
  'S-Rank': [
    'S-Rank. {name}\'s name is spoken in hushed tones now. Even Kage take note.',
    'There is no higher designation. {name} has reached the apex of the shinobi world.',
    'Few shinobi reach S-Rank. Fewer survive it. {name} has done both.',
  ],
}

export function pickNarrative(rank, outcome, shinobiName, traitName = null) {
  // Try trait-reactive first (40% chance if applicable)
  if (traitName && TRAIT_NARRATIVES[traitName] && Math.random() < 0.40) {
    const pool = TRAIT_NARRATIVES[traitName][outcome]
    if (pool?.length) {
      return pool[Math.floor(Math.random() * pool.length)].replace(/\{name\}/g, shinobiName || 'Your shinobi')
    }
  }
  const pool = NARRATIVES[rank]?.[outcome]
  if (!pool) return ''
  return pool[Math.floor(Math.random() * pool.length)].replace(/\{name\}/g, shinobiName || 'Your shinobi')
}

export function pickSquadNarrative(rank, outcome, squadName) {
  const pool = SQUAD_NARRATIVES[rank]?.[outcome]
  if (!pool?.length) return pickNarrative(rank, outcome, squadName)
  return pool[Math.floor(Math.random() * pool.length)].replace(/\{name\}/g, squadName || 'The squad')
}

export function pickRankUpNarrative(shinobiName, newRank) {
  const pool = RANK_UP_NARRATIVES[newRank]
  if (!pool?.length) return ''
  return pool[Math.floor(Math.random() * pool.length)].replace(/\{name\}/g, shinobiName)
}
