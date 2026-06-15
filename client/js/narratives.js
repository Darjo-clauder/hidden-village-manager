// Mission flavor text keyed by rank and outcome.
// pick(rank, 'success'|'failure', shinobiName) → string

const NARRATIVES = {
  D: {
    success: [
      '{name} returned before dusk, mission scroll delivered without incident.',
      'A routine task, but {name} handled it with quiet professionalism.',
      'The client was satisfied. {name} collected the fee and said nothing extra.',
      '{name} completed the errand without drawing a single eye.',
      'Low rank, low risk — {name} made it look even easier than that.',
      'The village cat was retrieved. {name} has seen better days, but the mission is done.',
    ],
    failure: [
      '{name} came back empty-handed. Mistakes happen on D-rank too.',
      'A simple job, and somehow {name} managed to complicate it.',
      'The client complained. {name} shrugged. The ryo stayed in someone else\'s pocket.',
      '{name} underestimated the terrain. Even couriers face the unexpected.',
      'No injuries, but no payment either. {name} learned something today.',
      'The cat escaped again. {name} refuses to elaborate.',
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
    ],
    failure: [
      '{name} was outmanoeuvred. The mission objective slipped away.',
      'A C-rank shouldn\'t end this way, but {name} ran into something worse.',
      'The intercept failed. {name} is bruised — in body and in pride.',
      'Overconfidence cost the mission. {name} admits it, quietly.',
      '{name} called for retreat. The right call, but the ryo is gone.',
      'The assignment unravelled fast. {name} barely made it back.',
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
    ],
    failure: [
      'The operation was compromised early. {name} extracted under fire.',
      '{name} was identified. Abort was the only option — they made it out, barely.',
      'A double-cross no one anticipated. {name} took the hit for the squad.',
      'The target had backup. {name} fought clear but couldn\'t finish the job.',
      '{name}\'s cover broke at the worst moment. Mission scrubbed.',
      'Too many variables, not enough time. {name} calls it a near-miss.',
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
    ],
    failure: [
      'The enemy was ready. {name} suspects a leak — and survived to say so.',
      '{name} reached the objective and found nothing. Someone got there first.',
      'A-rank missions don\'t forgive mistakes. {name} made one.',
      'The extraction window closed. {name} improvised an escape at great cost.',
      'Outnumbered three to one at the final stage. {name} retreated.',
      '{name} was hunted through the forest for six hours. Came back. Barely.',
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
    ],
    failure: [
      'S-rank missions kill legends. {name} survived — that itself is a victory of sorts.',
      'The objective failed. But {name} uncovered something far more dangerous.',
      '{name} was overpowered by a force that shouldn\'t exist. The mission is shelved.',
      'Even {name} has limits. Today found them.',
      'Catastrophic opposition. {name} extracted the essential intel and ran.',
      'The mission collapsed at the final moment. {name} returned with scars and silence.',
    ],
  },
}

export function pickNarrative(rank, outcome, shinobiName) {
  const pool = NARRATIVES[rank]?.[outcome]
  if (!pool) return ''
  const line = pool[Math.floor(Math.random() * pool.length)]
  return line.replace(/\{name\}/g, shinobiName || 'Your shinobi')
}
