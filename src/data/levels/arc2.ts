import { stage } from '../arcs';
import { restY } from '../props';
import { CHEESE_RUN, SAY_PIGEON, STEPS_X, STEPS_BOTTOM_Z, LANE3_X, LANDING_Z, LANDING_Y, SENATE_START } from './senate';

const FOOT = STEPS_BOTTOM_Z + 9; // the walkway at the foot of the steps
const VENDOR = { x: LANE3_X - 2.8, z: STEPS_BOTTOM_Z + 3.8 };

/**
 * Act 2, stage 1: Steps (Senaatintori, "make a scene"). The Cathedral steps are lanes for rolling things, and a walkway at the foot
 * where a man walks his rounds. Three objectives: roll the cheese into the hot-dog cart, set a banana-peel trap, make the vendor
 * walk off his cart. Design: docs/design/act2.md.
 */
export const STEPS_STAGE = stage(2, 1, {
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
        { id: 'roll', text: 'Roll it down the right-hand lane into the hot-dog cart', kind: 'event', event: 'cheeseCart', after: 'take', recap: 'rolled it down into the hot-dog cart', hint: 'Put it down at the top of the right lane (E) and let it roll. Low rails keep it in the lane. Missed? Pick it up again.', markers: [{ x: VENDOR.x, z: VENDOR.z, r: 4, label: 'Hot-dog cart' }] },
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
        { id: 'fish', text: 'Take the fried fish from the foot of the steps', kind: 'event', event: 'grab:slippery', recap: 'You took a fried fish', hint: 'It lies by the steps, off to the right of the walkway.', markers: [{ x: STEPS_X + 8, z: STEPS_BOTTOM_Z + 6, r: 4, label: 'Fish' }] },
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
    { on: 'grab:cheese', witness: { x: LANE3_X, z: LANDING_Z, r: 10, emote: 'alert' }, say: 'The family gasps. Their cheese!' },
    { on: 'cheeseCart', mood: { role: 'hotdog', mood: 'angry' }, witness: { x: VENDOR.x, z: VENDOR.z, r: 14, emote: 'laugh' }, say: 'Cheese in the cart!', sound: 'clatter' },
    { on: 'slipped:walker', witness: { x: STEPS_X, z: FOOT, r: 14, emote: 'laugh' } },
    { on: 'grab:walkerBun', say: 'He never saw it.', sound: 'pop' },
    { on: 'poopNpc:hotdog', mood: { role: 'hotdog', mood: 'angry' }, send: { role: 'hotdog', goals: [{ x: STEPS_X - 16, z: STEPS_BOTTOM_Z + 12, name: 'wash' }] }, oblivious: { role: 'hotdog', seconds: 20 }, say: 'He storms off to wash.' },
    { on: 'grab:cartDog', witness: { x: VENDOR.x, z: VENDOR.z, r: 12, emote: 'point' } },
  ],
  triggers: [],
  extraTriggers: [
    { id: 'cheeseCart', kind: 'propInZone', event: 'cheeseCart', propType: 'cheese', zone: { minX: LANE3_X - 3, maxX: LANE3_X + 3, minZ: STEPS_BOTTOM_Z + 0.5, maxZ: STEPS_BOTTOM_Z + 7, maxY: 2 } },
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
    { type: 'fish', x: STEPS_X + 8, y: restY('fish'), z: STEPS_BOTTOM_Z + 6, tag: 'slippery' },
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
        { id: 'cap', text: 'Snatch a cap from a graduate', kind: 'event', event: 'snatch:cap', recap: 'You took a graduate\'s cap', hint: 'A few graduates hold their white caps in their hands.' },
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
    { on: 'pose:any', witness: { x: -156, z: -310, r: 14, emote: 'laugh' }, say: 'Say pigeon!' },
    { on: 'pose:new', say: 'A different pose again!' },
    { on: 'robbed:graduate', witness: { x: -156, z: -312, r: 12, emote: 'point' }, say: 'My cap!', sound: 'yelp' },
    { on: 'poopNpc:selfie', mood: { role: 'selfie', mood: 'angry' }, witness: { x: -156, z: -310, r: 12, emote: 'alert' } },
    { on: 'spread:2', say: 'The class scatters!', sound: 'gasp' },
  ],
  triggers: [],
  tourists: [],
  extraTourists: SAY_PIGEON.extraTourists,
  defense: false,
  parTime: 300,
});
