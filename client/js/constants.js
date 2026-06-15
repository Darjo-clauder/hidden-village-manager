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
