import { stage } from '../arcs';
import { restY } from '../props';
import { CHEESE_RUN, DING_DONG, SAY_PIGEON, STEPS_X, STEPS_BOTTOM_Z, LANE3_X, LANDING_Z, LANDING_Y, SENATE_START } from './senate';
import { TRAM, TRAM_SURFING, TURF_WAR, NEW_LOOK, EMPEROR } from './senate2';
import { CONCERT_NIGHT, LIBRARY_RULE, KEY_TO_THE_CITY, LIBRARY, STAGE } from './senate3';
import { CAPTAIN_GULL } from './mischief2';
import { card, quest } from './arc1';

const FOOT = STEPS_BOTTOM_Z + 9; // the walkway at the foot of the steps
const VENDOR = { x: LANE3_X - 2.8, z: STEPS_BOTTOM_Z + 3.8 };

/**
 * Act 2, stage 1: Steps (Senaatintori, "make a scene"). The Cathedral steps are lanes for rolling things, and a walkway at the foot
 * where a man walks his rounds. Three objectives: roll the cheese into the hot-dog cart, set a banana-peel trap, make the vendor
 * walk off his cart. Design: docs/design/act2.md.
 */
export const STEPS_STAGE = stage(2, 1, {
  timetable: ['rain'],
  name: '2.1 Steps',
  blurb: 'The Cathedral steps: roll things, trip people.',
  district: 'senaatintori',
  sky: 'morning',
  start: SENATE_START,
  intro: { title: 'Senate Square', text: 'Afternoon on the Cathedral steps. Round things roll down the lanes, and anything on the walkway trips whoever walks into it.' },
  quests: [],
  extraQuests: [
    {
      id: 'cheese',
      title: 'Leipäjuusto Downhill',
      teaser: 'Roll the round cheese into the hot-dog cart.',
      timed: false,
      chain: true,
      joke: { joke: 'A family\'s bread cheese rolls down forty steps and lands in the hot-dog cart while the vendor stares.', insight: 'Round things roll straight down a lane: choose the right-hand one.', reaction: 'The family gasps at the empty blanket; the vendor yells at the cart; the queue laughs.' },
      objectives: [
        { id: 'take', text: 'Pick up the round cheese on the landing at the top of the steps', kind: 'event', event: 'grab:cheese', recap: 'You took the family\'s cheese', hint: 'Fly up the Cathedral steps (the white stairway) and grab it with E.', markers: [{ x: LANE3_X, z: LANDING_Z, r: 4, y: LANDING_Y, label: 'Round cheese' }] },
        { id: 'roll', text: 'Roll it down the right-hand lane into the hot-dog cart', kind: 'event', event: 'cheeseCart', after: 'take', recap: 'rolled it down into the hot-dog cart', hint: 'Stand at the top of the steps facing down the right-hand lane and TOSS it (Q): round things roll. Any lane that ends at the foot of the steps, by the cart, counts. Missed? Pick it up again.', markers: [{ x: VENDOR.x, z: VENDOR.z, r: 4, label: 'Hot-dog cart' }] },
      ],
    },
    {
      id: 'peel',
      title: 'Cold Fish',
      teaser: 'Make the man on his rounds lose his footing.',
      timed: false,
      chain: true,
      joke: { joke: 'A man who walks the same route every day steps on a fried fish and flies, his lunch with him.', insight: 'Things on the ground trip whoever walks into them, and he walks the same route.', reaction: 'He slips, the bun flies, and the onlookers wince and laugh.' },
      objectives: [
        { id: 'fish', text: 'Take the fried fish from the foot of the steps', kind: 'event', event: 'grab:slippery', recap: 'You took a fried fish', hint: 'It lies on the pavement at the west end of the steps, away from the cart.', markers: [{ x: STEPS_X - 12, z: STEPS_BOTTOM_Z + 6, r: 4, label: 'Fish' }] },
        { id: 'trap', text: 'Put it down on his walkway', kind: 'event', event: 'fishTrap', after: 'fish', recap: 'put it on his walkway', hint: 'The man in the green coat walks back and forth along the foot of the steps. Put the fish down (E) on the pavement in front of him.', markers: [{ x: STEPS_X, z: FOOT, r: 5, label: 'His walkway' }] },
        { id: 'slip', text: 'Watch him walk into it', kind: 'event', event: 'slipped:walker', after: 'trap', recap: 'he slipped on it', hint: 'Wait for him to come past. The fish only works once.' },
        { id: 'bun', text: 'Take his bun while he sits there', kind: 'event', event: 'grab:walkerBun', after: 'slip', recap: 'and his bun was yours', hint: 'It flew out of his hand. Grab it before he gets up.' },
      ],
    },
    {
      id: 'hotdog',
      title: 'Hot-dog Hazard',
      teaser: 'Make the vendor leave his cart.',
      timed: false,
      chain: true,
      joke: { joke: 'The hot-dog vendor, splatted, storms off to wash and leaves his cart open to the queue and a seagull.', insight: 'A man who has been splatted leaves his post to clean up.', reaction: 'He fumes, marches off, and the queue stares at the empty cart.' },
      objectives: [
        { id: 'splat', text: 'Splat the hot-dog vendor', kind: 'event', event: 'poopNpc:hotdog', recap: 'You splatted the vendor', hint: 'He is by the cart at the foot of the steps. Poop (F) from above.', markers: [{ x: VENDOR.x, z: VENDOR.z, r: 4, label: 'Hot-dog vendor' }] },
        { id: 'dog', text: 'Take a hot dog from the empty cart', kind: 'event', event: 'grab:cartDog', after: 'splat', recap: 'and took a hot dog from his empty cart', hint: 'He has gone to wash. The sausages lie on the counter.' },
      ],
    },
  ],
  coopRequired: [
    (CHEESE_RUN.coopQuests ?? [])[0],
    {
      id: 'stairRelay',
      title: 'Stairway relay',
      teaser: 'Keep it in the air between you.',
      timed: false,
      objectives: [{ id: 'stairRelay', text: 'Pass something between you in mid-air twice', kind: 'event', event: 'coop:pass', count: 2, hint: 'One drops it in front of the other, who catches it before it lands (E). Twice.' }],
    },
  ],
  reactions: [
    { on: 'grab:walkerBun', say: 'He sits in his puddle with nothing at all.', witness: { role: 'walker', r: 8, emote: 'anger' } },
    { on: 'grab:cheese', witness: { x: LANE3_X, z: LANDING_Z, r: 10, emote: 'alert' }, say: 'The family gasps. Their cheese!' },
    { on: 'cheeseCart', mood: { role: 'hotdog', mood: 'angry' }, witness: { x: VENDOR.x, z: VENDOR.z, r: 14, emote: 'laugh' }, say: 'Cheese in the cart!', sound: 'clatter' },
    { on: 'slipped:walker', witness: { x: STEPS_X, z: FOOT, r: 14, emote: 'laugh' } },
    { on: 'grab:walkerBun', say: 'He never saw it.', sound: 'pop' },
    { on: 'poopNpc:hotdog', mood: { role: 'hotdog', mood: 'angry' }, send: { role: 'hotdog', goals: [{ x: STEPS_X - 16, z: STEPS_BOTTOM_Z + 12, name: 'wash' }] }, oblivious: { role: 'hotdog', seconds: 20 }, say: 'He storms off to wash.' },
    { on: 'grab:cartDog', witness: { x: VENDOR.x, z: VENDOR.z, r: 12, emote: 'point' } },
  ],
  triggers: [],
  extraTriggers: [
    { id: 'cheeseCart', kind: 'propInZone', event: 'cheeseCart', propType: 'cheese', zone: { minX: STEPS_X - 14, maxX: LANE3_X + 4, minZ: STEPS_BOTTOM_Z + 0.5, maxZ: STEPS_BOTTOM_Z + 8, maxY: 2 } },
    { id: 'fishTrap', kind: 'propInZone', event: 'fishTrap', propType: 'fish', tag: 'slippery', zone: { minX: STEPS_X - 5, maxX: STEPS_X + 5, minZ: FOOT - 1.8, maxZ: FOOT + 1.8, maxY: 1.5 } },
  ],
  tourists: [],
  extraTourists: [
    { x: VENDOR.x, z: VENDOR.z, heading: Math.PI / 2, role: 'hotdog', stationary: true, color: 0xf2c14e },
    { x: STEPS_X - 12, z: FOOT, heading: -Math.PI / 2, holds: 'bun', holdTag: 'walkerBun', role: 'walker', color: 0x4f9d69, patrol: [{ x: STEPS_X + 12, z: FOOT }, { x: STEPS_X - 12, z: FOOT }] },
    { x: -170, z: -298, heading: 0.8, ice: true, color: 0x7fd1ae },
    { x: -143, z: -296, heading: -0.8, ice: true, color: 0xffc971 },
  ],
  extraProps: [
    { type: 'cheese', x: LANE3_X, y: restY('cheese', LANDING_Y), z: LANDING_Z, tag: 'cheese' },
    { type: 'fish', x: STEPS_X - 12, y: restY('fish'), z: STEPS_BOTTOM_Z + 6, tag: 'slippery' },
    { type: 'sausage', x: VENDOR.x + 1.6, y: restY('sausage'), z: VENDOR.z + 0.5, tag: 'cartDog' },
    { type: 'sausage', x: VENDOR.x + 1.6, y: restY('sausage'), z: VENDOR.z - 0.5, tag: 'cartDog' },
  ],
  defense: false,
  parTime: 300,
});

/**
 * Act 2, stage 2: Say Pigeon! Graduation photos on the steps. New: Pose (keys 1 to 4). Three objectives: ruin three photos with
 * three different poses, steal a cap, splat the photographer.
 */
export const SAY_PIGEON_STAGE = stage(2, 2, {
  name: '2.2 Say Pigeon!',
  blurb: 'Graduation photos: pose in every one.',
  district: 'senaatintori',
  start: SENATE_START,
  intro: { title: 'Say Pigeon!', text: 'Spring: graduation photos on the steps. A photographer counts 3, 2, 1: be in front of her phone at the click.' },
  quests: [],
  extraQuests: [
    {
      id: 'photos',
      title: 'Class of 2026',
      teaser: 'Ruin three graduation photos, three different ways.',
      timed: false,
      chain: true,
      joke: { joke: 'In the class photo a seagull is waving; in the next it is laughing; in the third it points at the camera.', insight: 'A pose in front of her phone at the click (keys 1 to 4) ruins the photo, and a different pose ruins it differently.', reaction: 'The photographer groans, the class laughs, and the picture goes in the newspaper.' },
      objectives: [
        { id: 'one', text: 'Pose in front of the photographer at the click (keys 1 to 4)', kind: 'event', event: 'pose:any', recap: 'You waved in the first photo', hint: 'A photographer counts 3, 2, 1 over her head. Stand right in front of her phone and strike a pose (1 wave, 2 laugh, 3 point, 4 facepalm) just before the click.', markers: [{ x: -168, z: -308, r: 6, label: 'Photographer' }] },
        { id: 'two', text: 'Strike a different pose in the next photo', kind: 'event', event: 'pose:new', after: 'one', recap: 'laughed in the second', hint: 'The same pose twice is boring. Pick another key.' },
        { id: 'three', text: 'And a different one in the third', kind: 'event', event: 'pose:new', after: 'two', recap: 'and pointed in the third', hint: 'One more, with yet another pose.' },
      ],
    },
    {
      id: 'caps',
      title: 'Cap toss',
      teaser: 'Steal a graduate\'s cap and crash the next photo.',
      timed: false,
      chain: true,
      joke: { joke: 'A graduate chases a gull with his cap into the very photo he came to be in.', insight: 'The graduate chases you, and the next photo is right there.', reaction: 'He yells and chases, and the whole class laughs when you fly through the shot.' },
      objectives: [
        { id: 'cap', text: 'Take a graduate\'s cap', kind: 'event', event: 'grab:cap', recap: 'You took a graduate\'s cap', hint: 'A few graduates hold their white caps in their hands.' },
        { id: 'chase', text: 'He comes after you', kind: 'event', event: 'robbed:graduate', after: 'cap', recap: 'he came after you', hint: 'He chases you with his arms up.' },
        { id: 'photo', text: 'Fly through the next photo with the cap', kind: 'event', event: 'photobomb', after: 'chase', recap: 'and you flew through the photo', hint: 'Get in front of a photographer at the click.' },
      ],
    },
    {
      id: 'shutterbug',
      title: 'Camera shy',
      teaser: 'Splat a photographer and watch the class scatter.',
      timed: false,
      chain: true,
      joke: { joke: 'One splat on the photographer and the whole class panics out of the picture.', insight: 'A fright jumps to whoever stands close.', reaction: 'The photographer wipes his lens, the others scatter, the photo is ruined for good.' },
      objectives: [
        { id: 'splat', text: 'Splat a photographer', kind: 'event', event: 'poopNpc:selfie', recap: 'You splatted a photographer', hint: 'From above, between photos.' },
        { id: 'scatter', text: 'The class scatters', kind: 'event', event: 'spread:2', after: 'splat', recap: 'and the class scattered', hint: 'The people standing close panic too.' },
      ],
    },
  ],
  coopRequired: [
    (SAY_PIGEON.coopQuests ?? [])[0],
    {
      id: 'duoPose',
      title: 'Duo pose',
      teaser: 'Strike it together.',
      timed: false,
      objectives: [{ id: 'duoPose', text: 'Both gulls pose in the same photo', kind: 'event', event: 'coop:pose', hint: 'Both stand in front of her phone and press a pose key before the click.' }],
    },
  ],
  reactions: [
    { on: 'pose:new', nth: 2, say: 'Three photos, three gulls. The album is ruined.', witness: { role: 'selfie', r: 6, emote: 'facepalm' } },
    { on: 'photobomb', say: 'The graduation photo: one graduate, one gull, one cap.', witness: { role: 'graduate', r: 8, emote: 'laugh' } },
    { on: 'spread:2', witness: { role: 'selfie', r: 8, emote: 'laugh' } },
    { on: 'pose:any', witness: { x: -156, z: -310, r: 14, emote: 'laugh' }, say: 'Say pigeon!' },
    { on: 'pose:new', say: 'A different pose again!' },
    { on: 'grab:cap', witness: { x: -156.5, z: -312, r: 10, emote: 'alert' }, say: 'A seagull has the cap!' },
    { on: 'robbed:graduate', witness: { x: -156, z: -312, r: 12, emote: 'point' }, say: 'My cap!', sound: 'yelp' },
    { on: 'poopNpc:selfie', mood: { role: 'selfie', mood: 'angry' }, witness: { x: -156, z: -310, r: 12, emote: 'alert' } },
    { on: 'spread:2', say: 'The class scatters!', sound: 'gasp' },
  ],
  triggers: [],
  tourists: [],
  // the class stands close together, so one splat on a photographer frightens the people next to her, and they frighten the next
  extraTourists: [
    { x: -159.1, z: -310, heading: 0, ice: true, role: 'selfie', stationary: true, color: 0xff8fa3 },
    { x: -156.5, z: -310, heading: 0, role: 'selfie', stationary: true, color: 0x9ec9f0 },
    { x: -153.9, z: -310, heading: 0, role: 'selfie', stationary: true, color: 0xc7b5e0 },
    { x: -158.5, z: -313.2, heading: 0.2, holds: 'cap', hat: 'cap', hatColor: 0xffffff, role: 'graduate', relentless: true, color: 0x2f3a55 },
    { x: -154.5, z: -313.2, heading: -0.2, holds: 'cap', hat: 'cap', hatColor: 0xffffff, role: 'graduate', relentless: true, color: 0x2f3a55 },
    { x: -160.8, z: -313.6, heading: 0.3, role: 'student', stationary: true, color: 0x2f3a55 },
    { x: -156.5, z: -314.4, heading: 0, role: 'student', stationary: true, color: 0x2f3a55 },
    { x: -152.2, z: -313.6, heading: -0.3, role: 'student', stationary: true, color: 0x2f3a55 },
  ],
  defense: false,
  parTime: 300,
});

/**
 * Act 2, stage 3: Ding Dong. The Cathedral bell rings every half minute and everyone looks up at the tower for six seconds; the tram
 * runs on a timetable and a bottle on the track stops it. Three objectives: Bell Heist, Lunch Express, Bell Splat.
 */
export const DING_DONG_STAGE = stage(2, 3, {
  name: '2.3 Ding Dong',
  blurb: 'When the bell rings, nobody is looking.',
  district: 'senaatintori',
  start: SENATE_START,
  intro: { title: 'Ding Dong', text: 'Noon. The Cathedral bell rings every half minute and everyone looks up at the tower. A bottle on the tram track stops the tram.' },
  bells: { x: -138.95, z: -370.49, first: 8, every: 28, duration: 6 },
  tram: TRAM,
  quests: [],
  extraQuests: [
    card({ ...quest(DING_DONG, 'bell'), objectives: [
      { id: 'wait', text: 'Wait for the bell to ring', kind: 'event', event: 'bell', hint: 'The bell rings every half minute. Be near the picnickers when it starts.', markers: [{ x: -164, z: -314, r: 4, label: 'Picnickers' }] },
      { id: 'first', text: 'Snatch a sandwich while everyone looks up', kind: 'event', event: 'bellSnatch', after: 'wait', hint: 'For about six seconds nobody is watching the picnic.' },
      { id: 'second', text: 'And the second one before they look down', kind: 'event', event: 'bellSnatch', after: 'first', hint: 'Quick: one more before the ringing stops.' },
    ] }, { joke: 'Two picnickers who would never let go of their sandwiches stare at a church tower while a gull empties the blanket.', insight: 'The bell makes the whole square look up, for six seconds.', reaction: 'Everybody gasps at the tower, then at the empty blanket.' }, { wait: 'The bell rang', first: 'you took one sandwich', second: 'and then the other' }),
    card(quest(TRAM_SURFING, 'lunch'), { joke: 'A tram driver climbs out to clear a bottle from the track and finds his lunch gone.', insight: 'A bottle on the rails stops the tram, and the driver has to get out.', reaction: 'The tram bell rings, the driver climbs down grumbling, and the lunch is yours.' }, { stop: 'You blocked the track with a bottle', lunch: 'and took the driver\'s lunch' }),
    {
      id: 'bellsplat',
      title: 'Bell Splat',
      teaser: 'Splat someone while everyone looks up.',
      timed: false,
      chain: true,
      joke: { joke: 'Grandma gets splatted while the entire square looks at a bell, and nobody saw a thing.', insight: 'During the bell nobody is looking at you or at her.', reaction: 'She is outraged, drops her bun, and everyone turns round too late.' },
      objectives: [
        { id: 'wait', text: 'Wait for the bell', kind: 'event', event: 'bell', recap: 'The bell rang', hint: 'The bell rings every half minute.' },
        { id: 'splat', text: 'Splat someone while the bell rings', kind: 'event', event: 'bellPoop', after: 'wait', recap: 'you splatted grandma while everyone looked up', hint: 'Poop (F) on someone during the six seconds of ringing.', markers: [{ x: -146, z: -293, r: 5, label: 'Grandma' }] },
        { id: 'bun', text: 'Take her bun', kind: 'event', event: 'grab:grannyBun', after: 'splat', recap: 'and took her bun', hint: 'She dropped it. Grab it.' },
      ],
    },
  ],
  coopRequired: [
    (DING_DONG.coopQuests ?? [])[0],
    { id: 'bellBombers', title: 'Bell bombers', teaser: 'Two splats under the bell.', timed: false, objectives: [{ id: 'bellBombers', text: 'Both gulls splat someone within five seconds', kind: 'event', event: 'coop:poopNpc', hint: 'One gull each.' }] },
  ],
  reactions: [
    { on: 'bellSnatch', nth: 2, say: 'Two bells, two sandwiches, one gull.', witness: { role: 'picnic', r: 6, emote: 'anger' } },
    { on: 'grab:grannyBun', say: 'Granny: "My bun! You little..."', witness: { role: 'granny', r: 8, emote: 'anger' } },
    { on: 'bell', witness: { x: -156, z: -300, r: 40, emote: 'alert' } },
    { on: 'bellSnatch', say: 'A sandwich short!', sound: 'pop' },
    { on: 'tramBlocked', oblivious: { role: 'driver', seconds: 25 }, witness: { x: -150, z: -273, r: 14, emote: 'alert' } },
    { on: 'grab:lunch', witness: { x: -172, z: -273, r: 12, emote: 'laugh' }, say: 'His lunch box is empty.' },
    { on: 'bellPoop', mood: { role: 'granny', mood: 'angry' }, say: 'SPLAT, and nobody saw.', witness: { x: -146, z: -293, r: 14, emote: 'laugh' } },
    { on: 'grab:grannyBun', say: 'Finders keepers.' },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    ...(DING_DONG.extraTourists ?? []).slice(0, 2),
    ...(TRAM_SURFING.extraTourists ?? []).slice(0, 1),
    { x: -146, z: -293, heading: 0.6, holds: 'bun', holdTag: 'grannyBun', role: 'granny', stationary: true, color: 0xc7b5e0 },
  ],
  extraProps: TRAM_SURFING.extraProps,
  defense: false,
  parTime: 330,
  reward: 'flock',
});

/**
 * Act 2, stage 4: Turf War. The Pigeon Gang owns the statue (a bun makes friends, salmiakki makes enemies), a workman can be wound up
 * and cheered up, and a captain's cap makes nobody see a gull (Disguise). Objectives: Forgive and Forget, Hard Hat Soft Heart, Captain Gull.
 */
const CAP_SHIFT = { x: -142, z: -268 }; // the Kauppatori layout of the cap puzzle moved onto Senate Square
const shifted = <T extends { x: number; z: number }>(t: T): T => ({ ...t, x: t.x + CAP_SHIFT.x, z: t.z + CAP_SHIFT.z });
export const TURF_WAR_STAGE = stage(2, 4, {
  name: '2.4 Turf War',
  blurb: 'Win the pigeons, scare them, wear the cap.',
  district: 'senaatintori',
  start: SENATE_START,
  intro: { title: 'Turf War', text: 'Evening. The Pigeon Gang owns the statue and has opinions. A bun makes friends; salmiakki does not. And a certain red cap makes you invisible.' },
  pigeons: { x: EMPEROR.x, z: EMPEROR.z },
  quests: [],
  extraQuests: [
    card({ ...quest(TURF_WAR, 'both'), id: 'forgive', title: 'Forgive and forget', teaser: 'Befriend the pigeons, then betray them.' }, { joke: 'The pigeons adopt you with a bun, and you scare them off with sweets they hate.', insight: 'Buns make friends, salmiakki makes enemies, and they forgive in a minute.', reaction: 'They swarm you happily, then scatter in disgust while the tourists point.' }, { friends: 'You befriended the Pigeon Gang with a bun', scatter: 'and scattered them with salmiakki' }),
    card(quest(NEW_LOOK, 'wardrobe'), { joke: 'A foreman is wound up until he buys flowers for his feelings, and a gull takes the bouquet.', insight: 'An angry person who wants comfort follows your taunt to the stall that sells it.', reaction: 'He fumes, follows, buys, beams, and fumes again when the bouquet goes.' }),
    card({ ...quest(CAPTAIN_GULL, 'captainchain'), objectives: quest(CAPTAIN_GULL, 'captainchain').objectives.map((o) => ({ ...o, markers: o.markers?.map((m) => ({ ...m, x: m.x + CAP_SHIFT.x, z: m.z + CAP_SHIFT.z })) })) }, { joke: 'A seagull in a captain\'s cap strolls up and takes a cone from three guards who never see a gull.', insight: 'The cap makes nobody see a gull: walk right up.', reaction: 'The guards look straight through it, then stare at the empty hand.' }, { wear: 'You put on the captain\'s cap', cone: 'and took a cone from under their noses' }),
  ],
  coopRequired: [
    (TURF_WAR.coopQuests ?? [])[0],
    { id: 'dressing', title: 'Dressing room', teaser: 'One drops, the other catches.', timed: false, objectives: [{ id: 'dressing', text: 'One gull drops an item, the other picks it up', kind: 'event', event: 'coop:handover', hint: 'Pass it.' }] },
  ],
  reactions: [
    { on: 'robbed:hardhat', say: 'His comfort flowers, gone too.', witness: { role: 'hardhat', r: 8, emote: 'anger' } },
    { on: 'pigeonsFriends', witness: { x: EMPEROR.x, z: EMPEROR.z, r: 14, emote: 'heart' }, say: 'The Pigeon Gang adopts you.' },
    { on: 'pigeonsScattered', witness: { x: EMPEROR.x, z: EMPEROR.z, r: 14, emote: 'laugh' }, say: 'Salmiakki! They flee in disgust.', sound: 'gasp' },
    { on: 'pecked:cap', say: 'The guards salute a very small captain.', witness: { x: -152, z: -285, r: 10, emote: 'question' } },
    { on: 'grab:capCone', witness: { x: -152, z: -285, r: 10, emote: 'alert' } },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    ...(TURF_WAR.extraTourists ?? []),
    ...(NEW_LOOK.extraTourists ?? []).slice(1),
    ...(CAPTAIN_GULL.extraTourists ?? []).map(shifted),
  ],
  stations: NEW_LOOK.stations,
  extraProps: [...(TURF_WAR.extraProps ?? []), ...(NEW_LOOK.extraProps ?? [])],
  switches: (CAPTAIN_GULL.switches ?? []).map(shifted),
  defense: false,
  parTime: 360,
  reward: 'disguise',
});

/**
 * Act 2, stage 5: The Key to the City (the end of Senaatintori). Everything of acts 1 and 2 is in play: the pigeons, the bell, the tram,
 * the cameras, the quiet library and a concert at night. Objectives: Ceremony Crashers, Shhh!, Jumbotron.
 */
export const KEY_STAGE = stage(2, 5, {
  name: '2.5 The Key to the City',
  blurb: 'Ceremony, library and concert: crash all three.',
  district: 'senaatintori',
  sky: 'golden',
  start: SENATE_START,
  intro: { title: 'The Key to the City', text: 'Dusk. The mayor is about to hand the golden key to a celebrity. The pigeons, the bell, the cameras and the library are all in play. Make a scene.' },
  tram: TRAM,
  pigeons: { x: EMPEROR.x, z: EMPEROR.z },
  bells: { x: -138.95, z: -370.49, first: 15, every: 30, duration: 6 },
  quiet: LIBRARY_RULE.quiet,
  quietBreaks: { first: 18, every: 40, duration: 12 },
  quests: [],
  extraQuests: [
    {
      id: 'ceremony',
      title: 'Ceremony Crashers',
      teaser: 'Win the pigeons, pose for the front page, and take the golden key.',
      timed: false,
      chain: true,
      joke: { joke: 'During the mayor\'s big moment a seagull poses for the front page, takes the golden key while the bell rings, and gives it to the pigeons.', insight: 'The bell makes everyone look up at the tower: that is when the key is unguarded.', reaction: 'The pigeons adopt you, the front page gets a bird, the mayor looks at the bell, and the key is gone.' },
      objectives: [
        { id: 'pigeons', text: 'Win the Pigeon Gang over with a bun', kind: 'event', event: 'pigeonsFriends', recap: 'You won the Pigeon Gang over', hint: 'Take a bun (the picnic bench, or the one lying by the statue) and put it down by the statue.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 8, label: 'Pigeon Gang' }] },
        { id: 'photo', text: 'Pose in the front-page photo (keys 1 to 4)', kind: 'event', event: 'pose:any', after: 'pigeons', recap: 'posed for the front page', hint: 'The front-page photographer counts 3, 2, 1 in front of the stage. Strike a pose at the click.', markers: [{ x: -156.5, z: -312, r: 4, label: 'Photographer' }] },
        { id: 'bell', text: 'Wait for the bell', kind: 'event', event: 'bell', after: 'photo', recap: 'waited for the bell', hint: 'The bell rings every 30 seconds.' },
        { id: 'key', text: 'Grab the golden key from the podium', kind: 'event', event: 'grab:key', after: 'bell', recap: 'took the key while everyone looked up', hint: 'Everyone looks at the tower for six seconds. The mayor guards the podium the rest of the time.', markers: [{ x: -156.5, z: -322, r: 3, label: 'Key' }] },
        { id: 'nest', text: 'Drop it at the foot of the emperor\'s statue', kind: 'event', event: 'keyNest', after: 'key', recap: 'and gave it to the pigeons', hint: 'The pigeons will guard it.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 4, label: 'Nest' }] },
      ],
    },
    card({ ...quest(LIBRARY_RULE, 'shhh'), objectives: [
      { id: 'snacks', text: 'Take three snacks from the revising students', kind: 'event', event: 'snatch', count: 3, recap: 'You took three snacks, quietly', hint: 'Walk up on foot: flying or diving near the library makes a racket (and heat).', markers: [{ x: LIBRARY.x - 8.5, z: LIBRARY.z, r: 6, label: 'Library steps' }] },
      { id: 'hushed', text: 'Get shushed by the librarian', kind: 'event', event: 'hushed', after: 'snacks', recap: 'got shushed', hint: 'Flap near the library.' },
      { id: 'splat', text: 'Splat the librarian', kind: 'event', event: 'poopNpc:librarian', after: 'hushed', recap: 'and splatted the librarian', hint: 'Make her drop her book loudly.', markers: [{ x: LIBRARY.x - 11, z: LIBRARY.z + 8, r: 5, label: 'Librarian' }] },
    ] }, { joke: 'In the quietest library in Helsinki a seagull steals three snacks, and the only thing that makes a noise is the librarian.', insight: 'Walking is silent, flying is not.', reaction: 'The students gasp at their empty hands; the librarian shushes, then shrieks.' }),
    card({ ...quest(CONCERT_NIGHT, 'screen'), objectives: [
      { id: 'bomb', text: 'Photobomb the camera crew (three times)', kind: 'event', event: 'photobomb', count: 3, recap: 'You got on the big screen three times', hint: 'The two camera people count 3, 2, 1. Be in front of the lens at the click.', markers: [{ x: -172, z: -309, r: 3, label: 'Camera' }, { x: -172, z: -297, r: 3, label: 'Camera' }] },
      { id: 'phones', text: 'In the quiet bit, press V to caw so every phone rings', kind: 'event', event: 'mimicQuiet', after: 'bomb', recap: 'rang every phone in the quiet bit', hint: 'The band goes silent for 12 seconds every 40 seconds. Caw (V) then.', markers: [{ x: -166, z: -303, r: 6, label: 'Crowd' }] },
      { id: 'baton', text: 'Take the conductor\'s baton', kind: 'event', event: 'grab:baton', after: 'phones', recap: 'took the conductor\'s baton', hint: 'He stands at the front of the stage.' },
      { id: 'around', text: 'Carry the baton round the stage: conduct!', kind: 'event', event: 'conducted', after: 'baton', recap: 'and conducted the band', hint: 'Walk or fly the baton past the three corners of the stage.' },
    ] }, { joke: 'A seagull gets on the jumbotron, rings every phone in the crowd during the silent bit, then conducts the band.', insight: 'The band goes quiet on a timer: caw then.', reaction: 'The crowd cheers at the screen, every phone rings at once, the conductor stares at his empty hand.' }),
  ],
  coopRequired: [
    { id: 'ceremonyPincer', title: 'Ceremony pincer', teaser: 'One shows off, one steals.', timed: false, objectives: [{ id: 'ceremonyPincer', text: 'One gull taunts (hold T), the other snatches', kind: 'event', event: 'coop:decoy', hint: 'One gull holds T near the mayor: everyone watches it. The other grabs the key.' }] },
    (CONCERT_NIGHT.coopQuests ?? [])[0],
  ],
  reactions: [
    { on: 'pigeonsFriends', witness: { x: EMPEROR.x, z: EMPEROR.z, r: 14, emote: 'heart' }, say: 'The Pigeon Gang adopts you.' },
    { on: 'pose:any', witness: { x: -156.5, z: -314, r: 14, emote: 'laugh' }, say: 'Front page!' },
    { on: 'bell', witness: { x: -156, z: -310, r: 40, emote: 'alert' } },
    { on: 'grab:key', witness: { x: -156.5, z: -322, r: 14, emote: 'alert' }, say: 'The key! The mayor looks at the bell.', sound: 'gasp' },
    { on: 'keyNest', witness: { x: EMPEROR.x, z: EMPEROR.z, r: 14, emote: 'laugh' }, say: 'The pigeons guard the key.', sound: 'pop' },
    { on: 'hushed', say: 'SHHH!', sound: 'whistle' },
    { on: 'poopNpc:librarian', witness: { x: LIBRARY.x - 11, z: LIBRARY.z + 8, r: 14, emote: 'laugh' } },
    { on: 'mimicQuiet', witness: { x: -166, z: -303, r: 16, emote: 'alert' }, say: 'Every phone in the crowd rings!', sound: 'chime' },
    { on: 'conducted', say: 'The band follows the gull. The conductor follows the band.', witness: { role: 'conductor', r: 10, emote: 'facepalm' } },
    { on: 'grab:baton', witness: { x: -179, z: -301, r: 10, emote: 'point' } },
  ],
  extraTriggers: [
    { id: 'keyNest', kind: 'propInZone', event: 'keyNest', propType: 'ring', tag: 'key', zone: { minX: EMPEROR.x - 4.2, maxX: EMPEROR.x + 4.2, minZ: EMPEROR.z - 4.2, maxZ: EMPEROR.z + 4.2, maxY: 4 } },
    ...(CONCERT_NIGHT.extraTriggers ?? []),
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    ...(KEY_TO_THE_CITY.extraTourists ?? []), // includes the picnicker with the bun for the pigeons (the library's bun is a snack for the other to-do)
    ...(LIBRARY_RULE.extraTourists ?? []),
    ...(CONCERT_NIGHT.extraTourists ?? []).map((t) => (t.role === 'conductor' ? { ...t, y: STAGE.top } : t)),
  ],
  extraProps: [...(KEY_TO_THE_CITY.extraProps ?? []), ...(CONCERT_NIGHT.extraProps ?? []), { type: 'bun', x: -147, y: restY('bun'), z: -296 }], // a spare bun by the statue, so the pigeons can always be won
  defense: false,
  parTime: 480,
  reward: 'pigeons',
});
