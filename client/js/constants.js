export const CLANS=[{n:'Uchiha',t:'Sharingan',b:{ninjutsu:14,genjutsu:12}},{n:'Hyuga',t:'Byakugan',b:{taijutsu:14,chakra:8}},{n:'Nara',t:'Shadow Bind',b:{intelligence:16,ninjutsu:5}},{n:'Akimichi',t:'Multi-Size',b:{taijutsu:12,chakra:8}},{n:'Yamanaka',t:'Mind Transfer',b:{genjutsu:14,intelligence:10}},{n:'Inuzuka',t:'Fang Fang',b:{taijutsu:12,speed:12}},{n:'Aburame',t:'Insect Hive',b:{intelligence:12,genjutsu:8}},{n:'Uzumaki',t:'Seal Master',b:{chakra:22,ninjutsu:10}},{n:'Senju',t:'Wood Release',b:{chakra:18,ninjutsu:14}}]
export const RANKS=['Genin','Chunin','Jonin','ANBU','S-Rank']
export const RKC=['rk-g','rk-c','rk-j','rk-a','rk-s']
export const FNAMES=['Ryu','Sora','Hana','Kei','Taro','Mei','Ren','Yuki','Kaz','Aoi','Jin','Aya','Nao','Riku','Hiro','Shiro','Toma','Rei','Sai','Bunta']
export const LNAMES=['Kuroda','Nishida','Asano','Takahara','Minase','Hayashi','Mori','Fujita','Ito','Nakamura','Tanaka','Watanabe','Sato']
export const SPECS=['Ninjutsu','Taijutsu','Genjutsu','Medical','Sensor','ANBU Ops','Sealing','Infiltration']
export const SEASONS=['Winter','Winter','Spring','Spring','Spring','Summer','Summer','Summer','Fall','Fall','Fall','Winter']
export const PERSONALITIES=[{n:'Loyal',cat:'pos',desc:'Devoted. Salary -10%, morale bonus.',effect:{salary:-0.10}},{n:'Ambitious',cat:'pos',desc:'Stat gains 20% faster.',effect:{statBoost:true}},{n:'Reckless',cat:'neg',desc:'Injury chance +15%.',effect:{riskMod:0.15}},{n:'Cowardly',cat:'neg',desc:'Success -8% when underpowered.',effect:{sucMod:-0.08}},{n:'Stoic',cat:'neu',desc:'No special effects.',effect:{}},{n:'Charismatic',cat:'pos',desc:'Squad power +5 when leading.',effect:{squadBonus:5}},{n:'Lone Wolf',cat:'neg',desc:'+8% success solo.',effect:{soloBonus:0.08}},{n:'Bookworm',cat:'pos',desc:'Intelligence grows 2x.',effect:{intBoost:true}},{n:'Hot-headed',cat:'neg',desc:'Refuses D/C rank.',effect:{rankFilter:true}},{n:'Calm',cat:'pos',desc:'Injury duration -1 month.',effect:{injReduct:1}},{n:'Greedy',cat:'neg',desc:'20% more salary.',effect:{salary:0.20}},{n:'Honorable',cat:'pos',desc:'Refuses black market. +2 rep on A+ missions.',effect:{noBlack:true,repBonus:2}},{n:'Mysterious',cat:'neu',desc:'Potential hidden until Jonin.',effect:{hidePot:true}},{n:'Protective',cat:'pos',desc:'Shields squadmates from KIA.',effect:{kiaShield:true}},{n:'Vengeful',cat:'neu',desc:'+10% when squadmate was hurt.',effect:{vengeful:true}}]
export const ARCHETYPES=[
  {id:'orphan',n:'War Orphan',flavor:'Lost everything to conflict. Driven by grief and a need to protect what little remains.'},
  {id:'heir',n:'Clan Heir',flavor:'Born into expectation. The weight of lineage is in every step, every technique.'},
  {id:'prodigy',n:'Natural Prodigy',flavor:'Chakra flows as naturally as breathing. Potential is obvious — and draws dangerous attention.'},
  {id:'street',n:'Street Kid',flavor:'No clan, no legacy. Earned everything the hard way and trusts no one quickly.'},
  {id:'exile',n:'Exile\'s Child',flavor:'Raised in the shadow of a parent\'s disgrace. Desperate to rewrite the name.'},
  {id:'scholar',n:'Academy Scholar',flavor:'Top of the theory class, untested in the field. Head full of jutsu, hands still unbloodied.'},
]
export const BACKSTORIES=['Orphaned during a village raid. Joined to protect what remains.','Eldest of a prominent clan, carries heavy expectations.','A civilian who awakened chakra late — always proving themselves.','Former missing-nin who sought amnesty and a second chance.','Raised in a distant land, still adjusting to village life.','Childhood friend of a fallen comrade. Carries their dream.','Survivor of a tailed beast attack. Fears and respects them deeply.','Born into poverty, clawed up through sheer will.','A prodigy who burned out young, now rediscovering the path.','Descended from a legend, struggling to escape the shadow.','Peaceful by nature — became a ninja to stop wars, not fight them.','Grew up near the border. Has seen diplomatic failure firsthand.','Defected from a rival village. Loyalty quietly questioned.','Was once paralysed by a curse seal. Walks with a faint limp.','Lost their clan to illness. Channels grief into relentless training.','Ran away from the academy once. Came back. Never explains why.','Eldest of seven siblings — protective instincts run bone-deep.','Trained in secret for years before the village even noticed them.','Grew up in a brothel town. Understands people better than most ninja.','Was chosen for an elite program that was quietly cancelled. Still wonders why.','Former medic-nin who crossed a line in the field and carries it quietly.','Half-civilian, half-shinobi family. Never fully belonged to either world.','Spent three years on border patrol alone before requesting a transfer inward.','Watched their sensei die on a mission no one talks about. Filed it away.','Claims to have no clan. Genealogy suggests otherwise.']
export const TAILED_BEASTS=[{n:'Shukaku',tails:1,pow:60,element:'Sand',sealed:false,jk:null,benefit:'Jinchuriki +20 speed. Village defense +10.'},{n:'Matatabi',tails:2,pow:72,element:'Blue Fire',sealed:false,jk:null,benefit:'Jinchuriki +18 ninjutsu. Generates 3,000 ryo/month.'},{n:'Isobu',tails:3,pow:78,element:'Water',sealed:false,jk:null,benefit:'Jinchuriki +20 chakra. Village defense +15.'},{n:'Son Goku',tails:4,pow:84,element:'Lava',sealed:false,jk:null,benefit:'Jinchuriki +15 taijutsu, +15 ninjutsu.'},{n:'Kokuo',tails:5,pow:88,element:'Steam',sealed:false,jk:null,benefit:'Jinchuriki +20 chakra, +10 speed.'},{n:'Saiken',tails:6,pow:90,element:'Acid',sealed:false,jk:null,benefit:'Jinchuriki +25 chakra. Village defense +20.'},{n:'Chomei',tails:7,pow:92,element:'Scale Powder',sealed:false,jk:null,benefit:'Mission failure chance -10%.'},{n:'Gyuki',tails:8,pow:95,element:'Ink',sealed:false,jk:null,benefit:'Jinchuriki +25 all stats. Rivals grow wary.'},{n:'Kurama',tails:9,pow:100,element:'Pure Chakra',sealed:false,jk:null,benefit:'+30 reputation, +40 defense. Legendary status.'}]
export const VILLAGES_DEF=[{n:'Sunagakure',ico:'🌵',rel:50,str:70,kage:'Rasa',kageRank:'Kazekage',threat:0,personality:'Mercantile',grudgeTicks:0},{n:'Kirigakure',ico:'🌊',rel:30,str:85,kage:'Yagura',kageRank:'Mizukage',threat:0,personality:'Aggressive',grudgeTicks:0},{n:'Iwagakure',ico:'🪨',rel:20,str:80,kage:'Onoki',kageRank:'Tsuchikage',threat:0,personality:'Isolationist',grudgeTicks:0},{n:'Kumogakure',ico:'⚡',rel:40,str:75,kage:'A',kageRank:'Raikage',threat:0,personality:'Honorable',grudgeTicks:0}]
export const TRADE_ROUTES=[{id:'iron',n:'Iron Country Trade Route',desc:'Export weapons-grade steel.',cost:8000,income:2500,active:false},{id:'herbs',n:'Medicinal Herb Caravan',desc:'Export rare herbs to hospitals.',cost:5000,income:1500,active:false},{id:'silk',n:'Silk Road Partnership',desc:'Facilitate luxury goods.',cost:12000,income:3500,active:false},{id:'intel_t',n:'Intelligence Brokerage',desc:'Sell non-critical intel. Requires intel network.',cost:6000,income:2000,active:false,req:'intel'},{id:'jk_tour',n:'Jinchuriki Demonstration',desc:'Show off jinchuriki power to daimyo. Requires a jinchuriki.',cost:0,income:5000,active:false,req:'jk'}]
export const CONTRACTS=[{id:'vip',n:'VIP Escort Contract',desc:'Escort the daimyo family monthly.',cost:3000,income:4000,active:false},{id:'border',n:'Border Guard Contract',desc:'Patrol the northern border.',cost:5000,income:5500,active:false},{id:'train',n:'Train Daimyo Samurai',desc:'Monthly training sessions.',cost:2000,income:3200,active:false}]
export const BLACK_MARKET=[{id:'smuggle',n:'Smuggling Ring Cut',desc:'Take a cut from smugglers.',ryoGain:8000,repLoss:5,risk:0.15},{id:'scroll',n:'Sell Forbidden Scroll',desc:'A collector wants a forbidden jutsu scroll.',ryoGain:15000,repLoss:12,risk:0.25},{id:'hit',n:'Anonymous Assassination',desc:'A shadowy client wants a target eliminated.',ryoGain:12000,repLoss:8,risk:0.20},{id:'intel',n:'Sell Intel to Enemy',desc:'Pass information for cash.',ryoGain:10000,repLoss:15,risk:0.30}]
export const MISS_POOL=[{n:'Escort merchant caravan',rk:'D',ryo:800,rep:1,dur:1,risk:0.05,mp:10,sq:false},{n:'Retrieve missing cat',rk:'D',ryo:500,rep:1,dur:1,risk:0.02,mp:10,sq:false},{n:'Garden work for daimyo',rk:'D',ryo:600,rep:1,dur:1,risk:0.01,mp:10,sq:false},{n:'Deliver confidential letter',rk:'D',ryo:700,rep:1,dur:1,risk:0.03,mp:10,sq:false},{n:'Bodyguard through bandit pass',rk:'C',ryo:2200,rep:3,dur:2,risk:0.12,mp:35,sq:false},{n:'Intercept rogue nin',rk:'C',ryo:2800,rep:4,dur:2,risk:0.18,mp:40,sq:false},{n:'Recon border territory',rk:'B',ryo:5000,rep:7,dur:2,risk:0.25,mp:55,sq:false},{n:'Assassinate crime lord',rk:'B',ryo:6000,rep:8,dur:3,risk:0.30,mp:60,sq:false},{n:'Retrieve stolen clan scroll',rk:'A',ryo:10000,rep:15,dur:3,risk:0.35,mp:80,sq:false},{n:'Infiltrate enemy village',rk:'A',ryo:12000,rep:18,dur:3,risk:0.40,mp:85,sq:false},{n:'Protect Kage Summit',rk:'S',ryo:25000,rep:40,dur:2,risk:0.45,mp:120,sq:false},{n:'Clear Bandit Stronghold',rk:'B',ryo:9000,rep:10,dur:2,risk:0.20,mp:150,sq:true},{n:'Escort VIP through war zone',rk:'A',ryo:16000,rep:20,dur:3,risk:0.30,mp:180,sq:true},{n:'Destroy rogue nin hideout',rk:'A',ryo:18000,rep:25,dur:3,risk:0.35,mp:200,sq:true},{n:'Capture enemy commander',rk:'S',ryo:30000,rep:50,dur:3,risk:0.45,mp:250,sq:true}]
export const UPGRADES_DEF=[{id:'academy',n:'Academy',levels:['Basic','Improved (better prospects)','Elite (Jonin prospects)'],cost:[0,15000,40000]},{id:'hospital',n:'Field Hospital',levels:['None','Basic (-1 injury month)','Advanced (-2 months, KIA shield)'],cost:[0,12000,30000]},{id:'wall',n:'Village Walls',levels:['Palisade','Stone Wall (+15 def)','Ramparts (+35 def)'],cost:[0,20000,50000]},{id:'intel',n:'Intel Network',levels:['None','Informants (+5% success)','ANBU Net (+10%, early raid warning)'],cost:[0,18000,45000]},{id:'training',n:'Training Grounds',levels:['Open Field','Dedicated (2x growth)','Restricted (3x growth)'],cost:[0,10000,25000]},{id:'seal',n:'Barrier Seal',levels:['None','Basic (+10 def)','Full Array (+25 def)'],cost:[0,22000,55000]}]
export const RAID_POOL=[{n:'Bandit Army',str:40,desc:'Rogue chunin leads bandits.',ryo:5000,rep:5},{n:'Rival Incursion',str:70,desc:'Enemy shinobi probe borders.',ryo:12000,rep:15},{n:'Missing-Nin Cell',str:55,desc:'S-rank missing-nin attack.',ryo:8000,rep:10},{n:'Tailed Beast Rampage',str:90,desc:'Uncontrolled beast approaches.',ryo:20000,rep:25},{n:'Enemy ANBU Squad',str:65,desc:'Elite infiltrators detected.',ryo:10000,rep:12}]
export const VILLAGE_ICONS=['🍃','🌵','🌊','🪨','⚡','🌙','🔥','💨','🌸','❄️']

export const MONTHS=[
  {n:'Frost Moon',   season:'Winter',effects:{morale:-2,ryo:-400},  flavor:'The cold bites deep. Trade slows.'},
  {n:'Snow Moon',    season:'Winter',effects:{morale:-1},            flavor:'Snowfall blankets the world.'},
  {n:'Thaw Moon',    season:'Spring',effects:{morale:2},             flavor:'Roads clear. Spirits lift.'},
  {n:'Blossom Moon', season:'Spring',effects:{morale:3,ryo:1000},   flavor:'Cherry blossoms. Festivals bring coin.'},
  {n:'Seed Moon',    season:'Spring',effects:{morale:1},             flavor:'Planting season. Civilians are hopeful.'},
  {n:'Heat Moon',    season:'Summer',effects:{morale:-1},            flavor:'Oppressive heat slows the days.'},
  {n:'Storm Moon',   season:'Summer',effects:{morale:-3,ryo:-800},  flavor:'Monsoon season. Missions grow treacherous.'},
  {n:'Harvest Moon', season:'Summer',effects:{morale:1,ryo:1500},   flavor:'Early harvest. The village grows fat.'},
  {n:'Amber Moon',   season:'Fall',  effects:{morale:1,ryo:800},    flavor:'Caravans pass. Trade is brisk.'},
  {n:'War Moon',     season:'Fall',  effects:{morale:-2},            flavor:'Old wars are remembered. Tensions rise.'},
  {n:'Fog Moon',     season:'Fall',  effects:{morale:-1},            flavor:'Mist obscures all intentions.'},
  {n:'Long Night',   season:'Winter',effects:{morale:-3,ryo:-500},  flavor:'The longest dark. Shinobi grow restless.'},
]

export const JUTSU_LIST=[
  // Common — unlock at 10 B-rank wins (clan-specific) or 10 wins (generic)
  {id:'fireball',     n:'Great Fireball Jutsu',       tier:'common',  statKey:'ninjutsu',     clan:'Uchiha',    req:{winsB:10}, bonus:{powerMod:0.05},                desc:'The Uchiha\'s signature. A roaring sphere of fire.'},
  {id:'gentle',       n:'Gentle Fist Style',          tier:'common',  statKey:'taijutsu',     clan:'Hyuga',     req:{winsB:10}, bonus:{powerMod:0.05},                desc:'Precise strikes target the chakra network directly.'},
  {id:'shadow',       n:'Shadow Bind Jutsu',          tier:'common',  statKey:'intelligence', clan:'Nara',      req:{winsB:10}, bonus:{successMod:0.04},              desc:'A shadow that cannot be escaped.'},
  {id:'expansion',    n:'Multi-Size Technique',       tier:'common',  statKey:'taijutsu',     clan:'Akimichi',  req:{winsB:10}, bonus:{powerMod:0.06},                desc:'The body itself becomes the weapon.'},
  {id:'mindtransfer', n:'Mind Transfer Jutsu',        tier:'common',  statKey:'genjutsu',     clan:'Yamanaka',  req:{winsB:10}, bonus:{successMod:0.05},              desc:'Slip into the enemy\'s mind, unseen.'},
  {id:'fang',         n:'Fang Over Fang',             tier:'common',  statKey:'speed',        clan:'Inuzuka',   req:{winsB:10}, bonus:{powerMod:0.05},                desc:'A rotating drill of teeth and fury.'},
  {id:'bugswarm',     n:'Insect Jamming Technique',   tier:'common',  statKey:'intelligence', clan:'Aburame',   req:{winsB:10}, bonus:{successMod:0.04},              desc:'The hive listens only to you.'},
  {id:'chakrachains', n:'Chakra Chains',              tier:'common',  statKey:'chakra',       clan:'Uzumaki',   req:{winsB:10}, bonus:{powerMod:0.06},                desc:'Forged from living chakra. Binds even tailed beasts.'},
  {id:'woodrelease',  n:'Wood Release: Forest Surge', tier:'common',  statKey:'ninjutsu',     clan:'Senju',     req:{winsB:10}, bonus:{powerMod:0.07},                desc:'Life itself becomes armour and blade.'},
  // Uncommon — unlock at first S-rank completion
  {id:'rasengan',     n:'Rasengan',                   tier:'uncommon',statKey:'chakra',       clan:null,        req:{winsS:1},  bonus:{powerMod:0.10},                desc:'A spiralling orb of pure chakra. Foundational.'},
  {id:'chidori',      n:'Chidori',                    tier:'uncommon',statKey:'speed',        clan:null,        req:{winsS:1},  bonus:{powerMod:0.10},                desc:'A thousand chirping birds. One precise point.'},
  {id:'kaibreak',     n:'Kai — Illusion Break',       tier:'uncommon',statKey:'genjutsu',     clan:null,        req:{winsS:1},  bonus:{successMod:0.08},              desc:'Cut through any illusion with pure will.'},
  {id:'sagemode',     n:'Sage Sensing Mode',          tier:'uncommon',statKey:'intelligence', clan:null,        req:{winsS:1},  bonus:{successMod:0.08},              desc:'Feel the chakra of all things within range.'},
  {id:'earthwall',    n:'Earth Wall Barrier',         tier:'uncommon',statKey:'ninjutsu',     clan:null,        req:{winsB:20}, bonus:{powerMod:0.08},                desc:'Stone rises at a gesture. Let them break against it.'},
  {id:'waterdragon',  n:'Water Dragon Blast',         tier:'uncommon',statKey:'ninjutsu',     clan:null,        req:{winsB:20}, bonus:{powerMod:0.08},                desc:'The river bends to your will.'},
  // Rare — prodigy graduates or 50+ lifetime wins
  {id:'mangekyou',    n:'Mangekyou Sharingan',        tier:'rare',    statKey:'genjutsu',     clan:'Uchiha',    req:{prodigy:true}, bonus:{powerMod:0.18,successMod:0.08}, desc:'The eyes of sacrifice. Unmatched visual jutsu.'},
  {id:'tenseigan',    n:'Tenseigan Activation',       tier:'rare',    statKey:'chakra',       clan:'Hyuga',     req:{prodigy:true}, bonus:{powerMod:0.15,successMod:0.10}, desc:'The reincarnation eye. Dominion over all chakra.'},
  {id:'eightgates',   n:'Eight Inner Gates',          tier:'rare',    statKey:'taijutsu',     clan:null,        req:{wins:50},  bonus:{powerMod:0.20},                desc:'Beyond mortal limits. The body is the jutsu.'},
  {id:'kotoamatsukami',n:'Kotoamatsukami',            tier:'rare',    statKey:'genjutsu',     clan:'Uchiha',    req:{prodigy:true}, bonus:{successMod:0.15},           desc:'The highest illusion. The victim never even knows.'},
  {id:'adamantine',   n:'Adamantine Sealing Chains',  tier:'rare',    statKey:'chakra',       clan:'Uzumaki',   req:{wins:50},  bonus:{powerMod:0.15,successMod:0.05}, desc:'Chains that bind gods. Nothing escapes them.'},
]

export const WORLD_CHOICE_EVENTS=[
  {id:'drought',n:'The Great Drought',desc:'Crops fail across the land. Civilians look to you for aid.',effects:{worldFlag:'drought'},choices:[
    {l:'Open granaries (-8k ryo, +10 morale, +5 rep)',fn:'drought_aid'},
    {l:'Ration supplies (-3k ryo, +3 morale)',fn:'drought_partial'},
    {l:'Seal borders (-8 morale, -5 rep)',fn:'drought_none'},
  ]},
  {id:'plague',n:'Plague at the Gates',desc:'A mysterious illness spreads through border towns.',effects:{worldFlag:'plague'},choices:[
    {l:'Deploy medics (-10k ryo, +8 rep, +6 morale)',fn:'plague_cure'},
    {l:'Quarantine district (-5k ryo, -3 morale)',fn:'plague_quar'},
    {l:'Ignore it (-10 rep when it spreads)',fn:'plague_none'},
  ]},
  {id:'wanderer',n:'The Wandering Sage',desc:'A legendary sage offers to train one of your shinobi.',effects:{},choices:[
    {l:'Accept (random Jonin+ gains rare jutsu)',fn:'sage_accept'},
    {l:'Honor them (+5 rep, +10 rel all)',fn:'sage_honor'},
    {l:'Turn them away',fn:'sage_refuse'},
  ]},
  {id:'eclipse',n:'Solar Eclipse',desc:'A rare eclipse darkens the sky. Mystics call it an omen.',effects:{},choices:[
    {l:'Hold festival (+5 morale, -2k ryo)',fn:'eclipse_fest'},
    {l:'Mobilize defense (+20 temp def)',fn:'eclipse_def'},
    {l:'Ignore it',fn:'eclipse_none'},
  ]},
  {id:'scroll',n:'Ancient Scroll Discovered',desc:'Explorers found a cache of forbidden jutsu scrolls.',effects:{},choices:[
    {l:'Study them (random shinobi gains jutsu)',fn:'scroll_study'},
    {l:'Sell them (+15k ryo)',fn:'scroll_sell'},
    {l:'Destroy them (+5 rep)',fn:'scroll_destroy'},
  ]},
]

// ── Injury system ─────────────────────────────────────────────────────────────
export const INJURY_TYPES = [
  { id:'muscle',   n:'Muscle Strain',        minMo:1, maxMo:1, statLoss:false, trauma:false, color:'#fa0',  desc:'Strained muscle tissue. Short rest required.' },
  { id:'chakra',   n:'Chakra Exhaustion',    minMo:1, maxMo:2, statLoss:false, trauma:false, color:'#87ceeb', desc:'Overloaded chakra pathways. Jutsu impossible until healed.' },
  { id:'bone',     n:'Bone Fracture',        minMo:2, maxMo:3, statLoss:false, trauma:false, color:'#f99',  desc:'Clean fracture requiring full rest and immobilisation.' },
  { id:'severe',   n:'Severe Wound',         minMo:3, maxMo:6, statLoss:true,  trauma:false, color:'#f44',  desc:'Life-threatening injuries. Risk of permanent stat loss on return.' },
  { id:'trauma',   n:'Psychological Trauma', minMo:2, maxMo:6, statLoss:false, trauma:true,  color:'#cc7fb8', desc:'The mind carries wounds the body cannot show.' },
]
// Base injury chance by mission rank (even on success)
export const RANK_INJ_CHANCE = { D:0.02, C:0.05, B:0.10, A:0.18, S:0.28 }
// Workload added per mission rank (0–100 scale)
export const RANK_WORKLOAD = { D:5, C:10, B:18, A:28, S:40 }
// Which injury types can appear per rank
export const RANK_INJ_POOL = {
  D: ['muscle'],
  C: ['muscle','chakra'],
  B: ['muscle','chakra','bone'],
  A: ['chakra','bone','severe'],
  S: ['bone','severe','trauma'],
}
export const TRAUMA_TRAITS = ['Withdrawn','Haunted','Vengeful']

// ── Staff system ──────────────────────────────────────────────────────────────
export const STAFF_ROLES = [
  { id:'head_sensei', n:'Head Sensei',       max:1, stats:['pedagogy','discipline','ninjutsu','experience'], salBase:8000,  desc:'Oversees academy education. Boosts all prospect stat growth.',      effectDesc:'+1 prospect growth per 5 rating points.' },
  { id:'team_sensei', n:'Team Sensei',       max:4, stats:['pedagogy','tactics','empathy','ninjutsu'],      salBase:4000,  desc:'Mentors squads. Improves cohesion and mission success rates.',       effectDesc:'+2% squad mission success per team sensei on staff.' },
  { id:'scout_jonin', n:'Scout Jonin',       max:5, stats:['perception','stealth','endurance','ninjutsu'],  salBase:3500,  desc:'Performs independent scouting of prospects.',                         effectDesc:'Scouting cost −15% per scout jonin (max −60%).' },
  { id:'head_scout',  n:'Head of Scouting',  max:1, stats:['perception','tactics','intelligence','leadership'], salBase:9000, desc:'Coordinates all scouting ops. Unlocks elite candidates.',        effectDesc:'Unlocks Jonin-rank prospects. −20% scouting cost.' },
  { id:'medical',     n:'Medical Ninja',     max:3, stats:['medical','chakra','precision','empathy'],       salBase:5000,  desc:'Reduces injury risk and recovery time for all shinobi.',             effectDesc:'Injury risk −3% and −0.5mo duration per medical ninja.' },
  { id:'strategist',  n:'Strategist',        max:1, stats:['tactics','intelligence','foresight','diplomacy'], salBase:7000, desc:'Advises on mission selection and risk management.',               effectDesc:'All mission success +5%.' },
  { id:'council',     n:'Council Advisor',   max:1, stats:['diplomacy','charisma','intelligence','experience'], salBase:6000, desc:'Manages village politics and reputation.',                     effectDesc:'Reputation gain +10%. Kage event outcomes improved.' },
  { id:'treasurer',   n:'Treasurer',         max:1, stats:['accounting','intelligence','foresight','discipline'], salBase:6500, desc:'Manages village finances and trade negotiations.',           effectDesc:'Trade income +3% per 5 rating. Financial crisis recovery faster.' },
  { id:'anbu_cmdr',   n:'ANBU Commander',    max:1, stats:['tactics','ninjutsu','stealth','leadership'],    salBase:10000, desc:'Commands ANBU and S-rank operations.',                               effectDesc:'S-rank/ANBU mission success +10%. Defection events rarer.' },
]

// ── Finance system ─────────────────────────────────────────────────────────────
export const FINANCE_TIERS = [
  { n:'Thriving',    minNet: 5000,    color:'#c9a84c', morale: 5,  desc:'Treasury overflows. Morale soars, trade flourishes.' },
  { n:'Stable',      minNet: 0,       color:'#8fbc8f', morale: 0,  desc:'Income meets expenditure. Village operates normally.' },
  { n:'Strained',    minNet: -5000,   color:'#f0a030', morale:-3,  desc:'Spending outpaces income. Staff grow restless.' },
  { n:'Crisis',      minNet: -15000,  color:'#f99',    morale:-8,  desc:'Deficit spiraling. Trade routes threatened, staff may leave.' },
  { n:'Bankruptcy',  minNet: -Infinity, color:'#f66',  morale:-15, desc:'Treasury collapsed. Shinobi deserting. Village on the brink.' },
]
export const FINANCIAL_EVENTS = [
  { id:'daimyo_withdraw', n:'Daimyo Withdrawal',   desc:'The daimyo has withdrawn his monthly stipend without warning.', ryo:-15000, rep:-5,  morale:-3 },
  { id:'black_market_loss',n:'Black Market Loss',  desc:'A black market intermediary absconded with village funds.',     ryo:-8000,  rep:-3,  morale:-2 },
  { id:'bonus_trade',     n:'Bonus Trade Season',  desc:'Rare goods flood the market — merchants seek your escorts.',    ryo:12000,  morale:3 },
  { id:'war_reparations', n:'War Reparations',     desc:'A defeated rival village pays tribute under treaty terms.',     ryo:20000,  rep:10,  morale:5 },
]
// ── Scouting regions ──────────────────────────────────────────────────────────
export const REGIONS = [
  { id:'fire',      n:'Land of Fire',      icon:'🔥', clanAffinity:['Uchiha','Senju'],            statBonus:{ ninjutsu:5, intelligence:3 }, desc:'Rich chakra potential. Ninjutsu-heavy bloodlines.' },
  { id:'lightning', n:'Land of Lightning',  icon:'⚡', clanAffinity:['Hyuga'],                     statBonus:{ speed:5, taijutsu:3 },         desc:'Fast and aggressive. Speed and taijutsu specialists.' },
  { id:'water',     n:'Land of Water',      icon:'🌊', clanAffinity:['Inuzuka','Aburame'],         statBonus:{ chakra:4, genjutsu:4 },        desc:'Hidden talent and illusion arts. Rare genjutsu bloodlines.' },
  { id:'wind',      n:'Land of Wind',       icon:'💨', clanAffinity:[],                            statBonus:{ speed:6, taijutsu:2 },         desc:'Desert-bred endurance. Natural speed from harsh conditions.' },
  { id:'earth',     n:'Land of Earth',      icon:'🪨', clanAffinity:['Nara','Akimichi','Yamanaka'], statBonus:{ taijutsu:4, chakra:4 },        desc:'Clan-rich territory. Tactical bloodlines and strong physiques.' },
  { id:'iron',      n:'Land of Iron',       icon:'⚔️', clanAffinity:[],                            statBonus:{ taijutsu:8 },                  desc:'Samurai country. Non-chakra fighters with exceptional taijutsu.' },
]

// ── Youth Academy development ─────────────────────────────────────────────────
export const DEV_TRACKS = [
  { id:'balanced',  n:'Balanced',  icon:'⚖',  growBonus:{},                              growRandom:3, desc:'Even growth across all attributes.' },
  { id:'ninjutsu',  n:'Ninjutsu',  icon:'🔥', growBonus:{ ninjutsu:2, intelligence:1 }, growRandom:0, desc:'Elemental jutsu and chakra transformation.' },
  { id:'taijutsu',  n:'Taijutsu',  icon:'👊', growBonus:{ taijutsu:2, speed:1 },        growRandom:0, desc:'Physical arts, stamina, close combat.' },
  { id:'genjutsu',  n:'Genjutsu',  icon:'🌀', growBonus:{ genjutsu:2, chakra:1 },       growRandom:0, desc:'Illusionary arts and chakra manipulation.' },
  { id:'stealth',   n:'Stealth',   icon:'🌑', growBonus:{ speed:2, intelligence:1 },    growRandom:0, desc:'Infiltration and covert operations.' },
  { id:'medical',   n:'Medical',   icon:'💊', growBonus:{ chakra:2, intelligence:1 },   growRandom:0, desc:'Healing arts and precision chakra control.' },
]
export const INTENSITY_LEVELS = [
  { id:'low',    n:'Low',    mult:0.5, burnoutRisk:0, desc:'Safe pace. No burnout risk.' },
  { id:'medium', n:'Medium', mult:1.0, burnoutRisk:2, desc:'Standard pace. Manageable burnout risk.' },
  { id:'high',   n:'High',   mult:1.5, burnoutRisk:5, desc:'Accelerated growth. Significant burnout risk.' },
]

// ── Regional meta shift events (affect scouting yield quality per region) ────
export const REGION_EVENTS = [
  { id:'drought',  n:'Drought',         icon:'☀',  qualityMod:-0.18, desc:'Resources are scarce — fewer prospects, lower confidence.' },
  { id:'war',      n:'Border Conflict', icon:'⚔',  qualityMod:-0.25, desc:'Active fighting disrupts scouting routes.' },
  { id:'festival', n:'Regional Festival', icon:'🎉', qualityMod:0.22, desc:'Talent gathers publicly — prospects easier to assess.' },
  { id:'trade',    n:'Trade Boom',      icon:'💰', qualityMod:0.12, desc:'Prosperity draws ambitious youth to attention.' },
]

// ── Hidden development curve archetypes (youth academy) ──────────────────────
export const DEV_CURVES = [
  { id:'early',    n:'Early Developer', peakAge:20, desc:'Matures fast — strong early, may plateau sooner.' },
  { id:'standard', n:'Standard',        peakAge:25, desc:'Conventional growth arc, peaks in prime years.' },
  { id:'late',     n:'Late Bloomer',    peakAge:29, desc:'Slow start, but grows well past typical peak age.' },
]

// ── Personality Matrix descriptors ────────────────────────────────────────────
export const PM_DESC = {
  loyalty: [
    { max:5,  short:'mercenary',       full:'motivated by ryo — will leave for a better offer' },
    { max:10, short:'pragmatic',       full:'loyalty real but conditional on fair treatment' },
    { max:15, short:'dependable',      full:'reliably committed under normal circumstances' },
    { max:20, short:'fiercely loyal',  full:'deeply rooted — would take a major incident to consider leaving' },
  ],
  ambition: [
    { max:5,  short:'content',            full:'satisfied with current standing, not seeking advancement' },
    { max:10, short:'quietly driven',     full:'has goals but won\'t push for them aggressively' },
    { max:15, short:'ambitious',          full:'actively seeking rank and recognition' },
    { max:20, short:'restless ambition',  full:'needs constant progression or grows deeply unsettled' },
  ],
  professionalism: [
    { max:5,  short:'erratic',      full:'conduct is unpredictable — hard to manage reliably' },
    { max:10, short:'inconsistent', full:'professionalism varies significantly by circumstance' },
    { max:15, short:'professional', full:'reliable conduct across most situations' },
    { max:20, short:'exemplary',    full:'a model of discipline — sets the standard' },
  ],
  temperament: [
    { max:5,  short:'volatile',      full:'prone to emotional outbursts — needs careful handling' },
    { max:10, short:'moody',         full:'emotional state shifts and affects performance' },
    { max:15, short:'even-keeled',   full:'generally steady under pressure' },
    { max:20, short:'unshakeable',   full:'calm and composed in any situation' },
  ],
  adaptability: [
    { max:5,  short:'rigid',           full:'struggles significantly with change or new environments' },
    { max:10, short:'cautious',        full:'adapts, but slowly and with some resistance' },
    { max:15, short:'flexible',        full:'adjusts well to most new situations' },
    { max:20, short:'highly adaptable',full:'thrives in unfamiliar conditions — welcomes challenge' },
  ],
}

// ── 1-on-1 meeting types ──────────────────────────────────────────────────────
export const MEETING_TYPES = [
  { id:'underused',   n:'Wants More Missions',      icon:'⚔',  urgency:'low',
    desc:'%name% feels underutilized. Without regular deployment, their edge will dull.',
    responses: [
      { id:'promise', n:'Promise more deployment', effect:{ indMorale:8,  commitment:5  }, desc:'Commit to prioritizing them in upcoming missions.' },
      { id:'explain', n:'Explain the strategy',   effect:{ indMorale:3,  commitment:2  }, desc:'Lay out the tactical reasons for limited use.' },
      { id:'dismiss', n:'Dismiss the concern',    effect:{ indMorale:-10,commitment:-8 }, desc:'Tell them to wait their turn.' },
    ] },
  { id:'promotion',   n:'Promotion Overdue',         icon:'🏅', urgency:'medium',
    desc:'%name% believes they have earned advancement. Patience is wearing thin.',
    responses: [
      { id:'promote',  n:'Promote immediately',   effect:{ indMorale:15, commitment:12, promote:true }, desc:'Fast-track their promotion now.' },
      { id:'timeline', n:'Set a clear timeline',  effect:{ indMorale:6,  commitment:4              }, desc:'Commit to a promotion within 3 months.' },
      { id:'deny',     n:'Tell them to earn it',  effect:{ indMorale:-12,commitment:-10            }, desc:'Make clear they need better results first.' },
    ] },
  { id:'grieving',    n:'Grieving a Squadmate',      icon:'🕯', urgency:'medium',
    desc:'%name% is struggling after losing someone close. They need to feel supported.',
    responses: [
      { id:'counsel',   n:'Offer personal counselling', effect:{ indMorale:12, commitment:6, traumaClear:true }, desc:'Sit with them — give proper time for grief.' },
      { id:'lightduty', n:'Assign light duties',        effect:{ indMorale:5,  commitment:3              }, desc:'Give them time and easier assignments.' },
      { id:'push',      n:'Tell them to push through',  effect:{ indMorale:-6, commitment:-5             }, desc:'Insist the village needs them operational.' },
    ] },
  { id:'squad_clash', n:'Squad Personality Clash',   icon:'💥', urgency:'medium',
    desc:'%name% has serious issues with a squadmate. Performance is suffering.',
    responses: [
      { id:'reassign', n:'Reassign them',             effect:{ indMorale:8,  commitment:4,  reassign:true }, desc:'Move them to a different squad.' },
      { id:'mediate',  n:'Mediate the conflict',      effect:{ indMorale:4,  commitment:2              }, desc:'Bring both parties together to resolve tensions.' },
      { id:'ignore',   n:'Tell them to sort it out',  effect:{ indMorale:-8, commitment:-6             }, desc:'Leave them to deal with it themselves.' },
    ] },
  { id:'leaving',     n:'Considering Leaving',        icon:'🚪', urgency:'critical',
    desc:'%name% is seriously considering a transfer request. This may be your last chance.',
    responses: [
      { id:'ryo_bonus', n:'Offer a ryo bonus',    effect:{ indMorale:10, commitment:20, ryo:-5000       }, desc:'Show financial appreciation — 5,000 ryo bonus.' },
      { id:'appeal',    n:'Make a personal appeal',effect:{ indMorale:6,  commitment:12              }, desc:'Appeal to their history and belonging here.' },
      { id:'let_go',    n:'Accept their decision', effect:{ indMorale:0,  commitment:-40, transfer:true }, desc:'Respect their wishes and begin transfer proceedings.' },
    ] },
  { id:'milestone',   n:'Personal Milestone',         icon:'🌟', urgency:'low',
    desc:'%name% has reached a significant milestone. Acknowledging it strengthens the relationship.',
    responses: [
      { id:'celebrate',   n:'Celebrate publicly',    effect:{ indMorale:12, commitment:8, legend:2 }, desc:'Host a recognition ceremony. The village takes notice.' },
      { id:'acknowledge', n:'Private recognition',   effect:{ indMorale:6,  commitment:4           }, desc:'A personal word of appreciation.' },
      { id:'nothing',     n:'Keep focus forward',    effect:{ indMorale:-3, commitment:-2          }, desc:'Stay professional — there\'s still work to do.' },
    ] },
]

// ── Transfer windows ──────────────────────────────────────────────────────────
export const TRANSFER_WINDOWS = [
  { id:'spring', n:'Spring Transfer Window', month:3, duration:2, icon:'🌸', desc:'Month of the Crane — primary recruitment window (6 weeks)' },
  { id:'autumn', n:'Autumn Transfer Window', month:9, duration:1, icon:'🍂', desc:'Month of the Wolf — secondary recruitment window (4 weeks)' },
]

// ── Transfer market categories ─────────────────────────────────────────────────
export const TRANSFER_CATS = [
  { id:'free_agent',        n:'Free Agent',         icon:'🌐', color:'#8fbc8f', loyaltyBonus:0,   dipRisk:0,  desc:'Unaffiliated — no fee negotiation required.' },
  { id:'village_listed',    n:'Village Transfer',   icon:'🏯', color:'#c9a84c', loyaltyBonus:-3,  dipRisk:0,  desc:'Listed by their village — negotiation required.' },
  { id:'missing_nin',       n:'Missing-Nin',        icon:'💀', color:'#f66',    loyaltyBonus:-10, dipRisk:15, desc:'High stats, low loyalty, diplomatic risk.' },
  { id:'retired_return',    n:'Retired Return',     icon:'🎌', color:'#87ceeb', loyaltyBonus:8,   dipRisk:0,  desc:'Known quantity — high loyalty, lower ceiling.' },
  { id:'foreign_specialist',n:'Foreign Specialist', icon:'⭐', color:'#cc7fb8', loyaltyBonus:-2,  dipRisk:5,  desc:'Unique stat profiles not seen domestically.' },
]

// ── Bingo Book presence tiers ─────────────────────────────────────────────────
export const BINGO_TIERS = [
  { presence:0, n:'Unknown',   icon:'◯', assasRisk:0,    prestigeBonus:0,  color:'#555' },
  { presence:1, n:'Listed',    icon:'●', assasRisk:0.03, prestigeBonus:2,  color:'#c9a84c' },
  { presence:2, n:'Featured',  icon:'◉', assasRisk:0.06, prestigeBonus:5,  color:'#f0a030' },
  { presence:3, n:'Legendary', icon:'★', assasRisk:0.10, prestigeBonus:10, color:'#f66' },
]

// ── Dressing room harmony crisis events ───────────────────────────────────────
export const HARMONY_EVENTS = [
  { id:'argument',  n:'Public Argument',       harmonyThresh:35, morale:-4,  indMorale:-6,  desc:'A heated argument erupted in the common room.' },
  { id:'fistfight', n:'Training Ground Brawl', harmonyThresh:25, morale:-7,  indMorale:-10, desc:'A fight broke out in the training grounds.' },
  { id:'faction',   n:'Faction Forming',       harmonyThresh:15, morale:-12, indMorale:-8,  desc:'Cliques are forming — the locker room is divided.' },
]

// ── Village prestige tiers (D→S by legend score) ─────────────────────────────
export const PRESTIGE_TIERS = [
  { id:'D', min:0,   n:'D — Village Unknown',   color:'#777',    staffTier:0, scoutSlots:1, examHostEligible:false },
  { id:'C', min:50,  n:'C — Rising Village',    color:'#8fbc8f', staffTier:1, scoutSlots:2, examHostEligible:true  },
  { id:'B', min:150, n:'B — Established Power', color:'#c9a84c', staffTier:2, scoutSlots:3, examHostEligible:true  },
  { id:'A', min:300, n:'A — Regional Power',    color:'#f0a030', staffTier:3, scoutSlots:5, examHostEligible:true  },
  { id:'S', min:500, n:'S — Legendary Village', color:'#f66',    staffTier:4, scoutSlots:5, examHostEligible:true  },
]

// ── ANBU operation types ──────────────────────────────────────────────────────
export const ANBU_OPS = [
  { id:'recon',      n:'Recon',           icon:'👁',  minDur:1, maxDur:2, cost:3000,  catchRisk:0.12, desc:'Reveals roster size and economy level of target village.' },
  { id:'deep_cover', n:'Deep Cover',      icon:'🕵',  minDur:2, maxDur:3, cost:6000,  catchRisk:0.22, desc:'Reveals defenses and active squad composition.' },
  { id:'assn_intel', n:'Assassination Intel', icon:'💀', minDur:3, maxDur:4, cost:10000, catchRisk:0.32, desc:'Reveals Kage stats, active jutsu, and strategic weaknesses.' },
]

// ── Five Kage Summit agenda items ─────────────────────────────────────────────
export const SUMMIT_AGENDA = [
  { id:'trade_pact',    n:'Regional Trade Pact',    minVotes:3, desc:'All villages gain +1,500 ryo/month for 3 months.', effect:'ryo_bonus' },
  { id:'war_ban',       n:'War Moratorium',          minVotes:4, desc:'All active conflicts paused for 2 months.',        effect:'peace' },
  { id:'missing_bounty',n:'Missing-Nin Bounties',    minVotes:2, desc:'+8,000 ryo bonus for active missing-nin capture.', effect:'bounty' },
  { id:'beast_protocol',n:'Tailed Beast Protocol',   minVotes:3, desc:'Tailed beast weaponization banned for 3 months.',  effect:'beast_truce' },
  { id:'exam_expand',   n:'Expand Chunin Exam',      minVotes:3, desc:'Next exam accepts 8 nominees per village.',         effect:'exam_expand' },
]

// ── S-rank competitive bid contracts ─────────────────────────────────────────
export const SRANK_CONTRACTS = [
  { id:'escort_kage',  n:'Escort the Five Kage',     baseRyo:35000, rep:50, prestige:15, risk:0.45, sq:true,  desc:'Guard all five Kage at a covert summit. Highest honor for any force.', complication:'Spy embedded in delegation. Rep −20.' },
  { id:'seal_bijuu',   n:'Seal a Rampaging Beast',   baseRyo:40000, rep:60, prestige:20, risk:0.50, sq:true,  desc:'Hunt and seal a tailed beast threatening the region.', complication:null },
  { id:'fortress',     n:'Destroy Enemy Fortress',   baseRyo:28000, rep:40, prestige:10, risk:0.40, sq:true,  desc:'Raze a fortified stronghold. No survivors, no witnesses.', complication:'Civilian casualties reported. Rep −15, morale −8.' },
  { id:'assn_warlord', n:'Assassinate a Warlord',    baseRyo:32000, rep:45, prestige:12, risk:0.48, sq:false, desc:'Eliminate a warlord threatening regional stability.', complication:'Succession war followed. Allied village rel −10.' },
  { id:'rescue_dipl',  n:'Rescue Captured Diplomat', baseRyo:25000, rep:35, prestige:8,  risk:0.35, sq:false, desc:'Extract a captured diplomat from enemy territory.', complication:null },
]

// ── Hall of Legends requirements ──────────────────────────────────────────────
export const HALL_REQS = { minMonths:120, minWins:100, minRi:3 }

// ── War arc phases ────────────────────────────────────────────────────────────
export const WAR_PHASES = [
  { id:'mobilization', n:'Mobilization',  months:1, desc:'Forces massing on both sides.' },
  { id:'conflict',     n:'Active Conflict',months:3, desc:'Monthly combat exchanges and raids.' },
  { id:'ceasefire',    n:'Ceasefire',     months:1, desc:'Negotiations underway — combat paused.' },
  { id:'reparations',  n:'Reparations',   months:6, desc:'Losing village pays monthly tribute.' },
]

// ── Dynasty grade thresholds ──────────────────────────────────────────────────
export const DYNASTY_GRADES = [
  { grade:'S', min:85 }, { grade:'A', min:70 }, { grade:'B', min:55 },
  { grade:'C', min:40 }, { grade:'D', min:0  },
]

// ── Mission commission income (village's cut from client payments)
export const MISSION_COMMISSION = { D:50, C:150, B:400, A:1000, S:3000 }
// Building maintenance cost per upgrade level (per building, per level)
export const BUILDING_MAINTENANCE = { academy:500, hospital:600, wall:300, intel:800, training:400, seal:500 }
// Daimyo bonus by legend tier
export const DAIMYO_BONUS = [
  { at:500, amount:10000, label:'Legendary Village' },
  { at:250, amount:5000,  label:'War-Renowned Village' },
  { at:100, amount:2000,  label:'Rising Village' },
]
