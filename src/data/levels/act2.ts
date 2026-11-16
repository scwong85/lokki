import type { LevelDef } from './types';
import { restY } from '../props';
import { counter, CAFE } from '../places';

/** The tour group stands around the west of the square; the photo frame is on the east quay, the photographer behind it. */
export const FRAME = { minX: 12, maxX: 22, minZ: -19, maxZ: -11 };
export const PHOTOGRAPHER = { x: 17, z: -7.5 };

const tourists = Array.from({ length: 8 }, (_, i) => ({
  x: -14 + (i % 4) * 4.2,
  z: -24 + Math.floor(i / 4) * 4.5,
  heading: i * 0.8,
  role: 'tour',
  stationary: true,
  color: [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0x9fd18f, 0xc7b5e0, 0xf29e7a, 0x7fd1ae, 0xeeeeee][i],
}));

/**
 * Level 9: Caw of the Wild (Mimic is yours for this level). Headline puzzle ("Group Photo"): a tour guide wants all her
 * tourists in one photo. They wander off. Crow calls make them walk over to see what it is: herd them into the frame, then
 * splat the photographer at the click.
 */
export const CAW_OF_THE_WILD: LevelDef = {
  id: 'caw-of-the-wild',
  name: '9. Caw of the Wild',
  blurb: 'Your first skill level: the crow call (V).',
  district: 'kauppatori',
  requires: 'harbour-day',
  skills: ['mimic'],
  quests: [],
  extraQuests: [
    {
      id: 'photo',
      title: 'Group Photo',
      teaser: 'Herd the tour group into the photo with crow calls.',
      timed: false,
      objectives: [
        {
          id: 'herd',
          text: 'Get six of the tour group into the photo frame',
          kind: 'event',
          event: 'groupPhoto',
          hint: 'Press V: a crow call. The tourists walk over to see where it came from. Call from the frame, then step back.',
          markers: [{ x: (FRAME.minX + FRAME.maxX) / 2, z: (FRAME.minZ + FRAME.maxZ) / 2, r: 5, label: 'Photo frame' }],
        },
        {
          id: 'splat',
          text: 'Splat the photographer',
          kind: 'event',
          event: 'poopNpc:photographer',
          after: 'herd',
          hint: 'He is busy with his camera, right behind the frame.',
          markers: [{ x: PHOTOGRAPHER.x, z: PHOTOGRAPHER.z, r: 3, label: 'Photographer' }],
        },
      ],
    },
    {
      id: 'straggler',
      title: 'Nobody is watching',
      teaser: 'Snatch the straggler\'s ice cream while they watch the photo.',
      timed: false,
      objectives: [{ id: 'ice', text: 'Snatch an ice cream', kind: 'event', event: 'snatch:icecream', hint: 'The straggler on the quay holds one. A crow call elsewhere keeps the others busy.' }],
    },
    {
      id: 'chorus',
      title: 'Cawcophony',
      timed: false,
      objectives: [{ id: 'caw', text: 'Caw five times', kind: 'event', event: 'caw', count: 5, hint: 'V again and again (it recharges).' }],
    },
  ],
  secret: ['chorus'],
  coopQuests: [{ id: 'duoCaw', title: 'Duet', timed: false, objectives: [{ id: 'duoCaw', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'groupPhoto', kind: 'npcsInZone', event: 'groupPhoto', role: 'tour', zone: FRAME, count: 6 }],
  tourists: [],
  extraTourists: [
    ...tourists,
    { x: PHOTOGRAPHER.x, z: PHOTOGRAPHER.z, heading: 0, role: 'photographer', stationary: true, color: 0x3d4a66 },
    { x: 30, z: -10, heading: 1.2, ice: true, color: 0xffc971 },
  ],
  defense: false,
  parTime: 300,
  reward: 'mimic',
};

/**
 * Level 10: The Invisible Maze (Hawk-eye is yours). Headline puzzle ("Laser Heist"): the golden ice cream sits in the middle
 * of the market, behind scare lines you cannot see. Hawk-eye (H) shows them for a few seconds: memorise, then slip through.
 */
export const INVISIBLE_MAZE: LevelDef = {
  id: 'invisible-maze',
  name: '10. The Invisible Maze',
  blurb: 'The lines are invisible. Use hawk-eye (H).',
  district: 'kauppatori',
  requires: 'caw-of-the-wild',
  skills: ['hawkeye'],
  quests: [],
  extraQuests: [
    {
      id: 'laser',
      title: 'Laser Heist',
      teaser: 'Steal the golden ice cream from behind the invisible lines.',
      timed: false,
      objectives: [
        {
          id: 'gold',
          text: 'Grab the golden ice cream',
          kind: 'event',
          event: 'grab:gold',
          hint: 'Press H to see the scare lines for a moment, then fly the gaps (they hang at about 3 m). Hit one and you drop it.',
          markers: [{ x: 0, z: -23, r: 4, label: 'Golden ice cream' }],
        },
        { id: 'out', text: 'Carry it out of the market', kind: 'event', event: 'goldOut', after: 'gold', hint: 'Out to the quay.', markers: [{ x: 0, z: -2, r: 6, label: 'Out' }] },
      ],
    },
    {
      id: 'eyes',
      title: 'Eagle eyes',
      teaser: 'Use hawk-eye three times.',
      timed: false,
      objectives: [{ id: 'hawk', text: 'Use hawk-eye (H) three times', kind: 'event', event: 'hawk', count: 3, hint: 'It recharges quickly with this skill.' }],
    },
    {
      id: 'trip',
      title: 'Tripwire',
      timed: false,
      objectives: [{ id: 'trip', text: 'Fly into a scare line on purpose', kind: 'event', event: 'lineHit', hint: 'Ouch.' }],
    },
  ],
  secret: ['trip'],
  coopQuests: [{ id: 'duoMaze', title: 'Spotter', timed: false, objectives: [{ id: 'duoMaze', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'goldOut', kind: 'carryCheckpoints', propType: 'icecream', points: [{ x: 0, z: -2, r: 7 }], events: ['goldOut'], maxY: 12 }],
  tourists: [],
  extraTourists: [{ x: -12, z: -10, heading: 0.6, ice: true, color: 0x7fd1ae }],
  extraProps: [{ type: 'icecream', x: 0, y: restY('icecream'), z: -23, tag: 'gold' }],
  defense: true,
  deploy: ['lines'],
  hiddenLines: true,
  parTime: 300,
  reward: 'hawkeye',
};

/**
 * Level 11: Heavy Lifting (Fat bird is yours: chairs are heavy). Headline puzzle ("Café Tower"): carry three chairs to the
 * marked spot on the quay and stack them into a tower (physics comedy when it wobbles).
 */
export const STACK = { minX: -26.5, maxX: -21.5, minZ: -18.5, maxZ: -13.5 };
export const CAFE_ZONE = { minX: CAFE.x - 7, maxX: CAFE.x + 7, minZ: CAFE.z - 7, maxZ: CAFE.z + 7 };
export const HEAVY_LIFTING: LevelDef = {
  id: 'heavy-lifting',
  name: '11. Heavy Lifting',
  blurb: 'Fat bird: carry chairs and build something.',
  district: 'kauppatori',
  requires: 'invisible-maze',
  skills: ['fatbird'],
  quests: [],
  extraQuests: [
    {
      id: 'tower',
      title: 'Café Tower',
      teaser: 'Stack three chairs into a tower.',
      timed: false,
      objectives: [
        { id: 'three', text: 'Bring three chairs to the marked spot', kind: 'event', event: 'chairs3', hint: 'Grab a chair (E, heavy!) and drop it in the ring.', markers: [{ x: (STACK.minX + STACK.maxX) / 2, z: (STACK.minZ + STACK.maxZ) / 2, r: 3.5, label: 'Tower spot' }] },
        { id: 'stack', text: 'Put one on top of another', kind: 'event', event: 'tower', after: 'three', hint: 'Drop a chair from above onto the others so it stays on top.' },
      ],
    },
    {
      id: 'mover',
      title: 'Furniture mover',
      teaser: 'Carry a chair to the café.',
      timed: false,
      objectives: [{ id: 'cafe', text: 'Drop a chair in the café garden', kind: 'event', event: 'chairCafe', hint: 'The café is on the west side of the square.', markers: [{ x: CAFE.x, z: CAFE.z, r: 6, label: 'Café' }] }],
    },
    {
      id: 'crash',
      title: 'Timber!',
      timed: false,
      objectives: [{ id: 'tip', text: 'Knock a chair over', kind: 'event', event: 'tipChair', hint: 'Bump a standing chair or let the tower fall.' }],
    },
  ],
  secret: ['crash'],
  coopQuests: [{ id: 'duoLift', title: 'Team lift', timed: false, objectives: [{ id: 'duoLift', text: 'One gull drops a chair, the other grabs it', kind: 'event', event: 'coop:handover', hint: 'Pass a chair.' }] }],
  triggers: [],
  extraTriggers: [
    { id: 'chairs3', kind: 'propInZone', event: 'chairs3', propType: 'chair', zone: STACK, count: 3 },
    { id: 'tower', kind: 'propInZone', event: 'tower', propType: 'chair', zone: { ...STACK, minY: 0.8 }, count: 1 },
    { id: 'chairCafe', kind: 'propInZone', event: 'chairCafe', propType: 'chair', zone: CAFE_ZONE },
  ],
  tourists: [],
  extraTourists: [{ x: 8, z: -18, heading: 0.4, ice: true, color: 0xffc971 }],
  extraProps: [
    { type: 'chair', x: -10, y: restY('chair'), z: -12 },
    { type: 'chair', x: -8, y: restY('chair'), z: -12, rotY: 0.4 },
    { type: 'chair', x: -6, y: restY('chair'), z: -12, rotY: 1 },
    { type: 'chair', x: -4, y: restY('chair'), z: -12, rotY: 2 },
  ],
  defense: false,
  parTime: 300,
  reward: 'fatbird',
};

/**
 * Level 12: Gull's Eleven (Flock call is yours). Headline puzzle ("The Big Heist"): three vendors guard three stalls. A decoy
 * flock makes a racket: vendors stare at the noise and ignore gulls for a few seconds. Steal one thing from each stall within the minute.
 */
export const GULLS_ELEVEN: LevelDef = {
  id: 'gulls-eleven',
  name: '12. Gull\'s Eleven',
  blurb: 'Flock call (G): the decoys, the plan, the heist.',
  district: 'kauppatori',
  requires: 'heavy-lifting',
  skills: ['flock'],
  quests: [],
  extraQuests: [
    {
      id: 'heist',
      title: 'The Big Heist',
      teaser: 'One thing from each of the three stalls, in a minute.',
      timed: true,
      timeKey: 'timeLimit',
      startOn: ['grab:heistA', 'grab:heistB', 'grab:heistC'],
      startMarkers: [{ ...counter(2, 2), r: 3, label: 'Stall A' }, { ...counter(4, 2), r: 3, label: 'Stall B' }, { ...counter(6, 2), r: 3, label: 'Stall C' }],
      objectives: [
        { id: 'a', text: 'Take the bun from the west stall', kind: 'event', event: 'grab:heistA', hint: 'The vendors spray gulls. Press G: a decoy flock makes a racket and they stare at it.', markers: [{ ...counter(2, 2), r: 3, label: 'Bun' }] },
        { id: 'b', text: 'Take the fish from the middle stall', kind: 'event', event: 'grab:heistB', markers: [{ ...counter(4, 2), r: 3, label: 'Fish' }] },
        { id: 'c', text: 'Take the sweets from the east stall', kind: 'event', event: 'grab:heistC', markers: [{ ...counter(6, 2), r: 3, label: 'Sweets' }] },
      ],
    },
    {
      id: 'decoy',
      title: 'Plan B',
      teaser: 'Call the flock twice.',
      timed: false,
      objectives: [{ id: 'flock', text: 'Use the flock call (G) twice', kind: 'event', event: 'flock', count: 2, hint: 'It recharges slowly: plan the order.' }],
    },
    {
      id: 'stare',
      title: 'Staring contest',
      timed: false,
      objectives: [{ id: 'stare', text: 'Make vendors stare at a noise five times', kind: 'event', event: 'vendorDistract', count: 5, hint: 'Noise near a vendor: the flock call, a bottle, a crow.' }],
    },
  ],
  secret: ['stare'],
  coopQuests: [{ id: 'duoHeist', title: 'Inside job', timed: false, objectives: [{ id: 'duoHeist', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  tourists: [],
  extraProps: [
    { type: 'bun', x: counter(2, 2).x, y: restY('bun', 1.0), z: counter(2, 2).z, tag: 'heistA' },
    { type: 'fish', x: counter(4, 2).x, y: restY('fish', 1.0), z: counter(4, 2).z, tag: 'heistB' },
    { type: 'candy', x: counter(6, 2).x, y: restY('candy', 1.0), z: counter(6, 2).z, tag: 'heistC' },
  ],
  defense: true,
  deploy: ['vendors'],
  startHeat: 22,
  parTime: 240,
  reward: 'flock',
};

/**
 * Level 13: Coo Coo Undercover (Disguise is yours). Headline puzzle ("Pigeons Only"): the Warden lets pigeons eat crumbs in
 * the café garden but chases gulls. Press B to turn into a pigeon: vendors and the Warden ignore you, but only while you
 * walk like one: flying or running blows the disguise. Steal the cake.
 */
export const COO_COO: LevelDef = {
  id: 'coo-coo-undercover',
  name: '13. Coo Coo Undercover',
  blurb: 'Disguise (B): act like a pigeon. Walk, do not fly.',
  district: 'kauppatori',
  requires: 'gulls-eleven',
  skills: ['disguise'],
  pigeonRules: true,
  quests: [],
  extraQuests: [
    {
      id: 'cake',
      title: 'Pigeons Only',
      teaser: 'Walk into the café garden as a pigeon and take the cake.',
      timed: false,
      objectives: [
        { id: 'cake', text: 'Take the whole cake from the café counter', kind: 'event', event: 'grab:cake', hint: 'Press B to become a pigeon, then WALK to the café (flying or running gives you away). The Warden is on patrol.', markers: [{ x: CAFE.x + 2, z: CAFE.z + 1, r: 4, label: 'Cake' }] },
      ],
    },
    {
      id: 'crumbs',
      title: 'Crumbs',
      teaser: 'Peck a crumb under the tables.',
      timed: false,
      objectives: [{ id: 'crumb', text: 'Grab a crumb from the ground', kind: 'event', event: 'grab:crumb', hint: 'A bun lies near the first tables.', markers: [{ x: -14, z: -14, r: 3, label: 'Crumbs' }] }],
    },
    {
      id: 'patience',
      title: 'Method acting',
      timed: false,
      objectives: [{ id: 'act', text: 'Keep the disguise until it wears off by itself', kind: 'event', event: 'disguiseEnded', hint: 'Do not fly or run while disguised.' }],
    },
  ],
  secret: ['patience'],
  coopQuests: [{ id: 'duoCoo', title: 'Flock of pigeons', timed: false, objectives: [{ id: 'duoCoo', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  tourists: [],
  extraTourists: [{ x: -26, z: -20, heading: 0.6, ice: true, color: 0x7fd1ae }],
  extraProps: [
    { type: 'bun', x: CAFE.x + 2, y: restY('bun', 0.9), z: CAFE.z + 1, tag: 'cake' },
    { type: 'bun', x: -14, y: restY('bun'), z: -14, tag: 'crumb' },
  ],
  defense: true,
  deploy: ['warden'],
  parTime: 270,
  reward: 'disguise',
};

/**
 * Level 14: Thermal Express (Strong wings are yours). Headline puzzle ("Express Delivery"): deliver a warm cinnamon bun to the top
 * of the Uspenski dome before it goes cold. Warm rooftops make rising air: glide into the pale columns and rise.
 */
/** The big onion of the Uspenski restyle (the corner average of the building's footprint, see `building()` in world/city.ts). It was 20 m off before M30, so the landing zone missed the dome. */
export const DOME = { x: 272.5, z: -160.4 };
export const THERMAL_EXPRESS: LevelDef = {
  id: 'thermal-express',
  name: '14. Thermal Express',
  blurb: 'Ride the warm air to the Uspenski dome.',
  district: 'kauppatori',
  requires: 'coo-coo-undercover',
  skills: ['flight'],
  thermals: [
    { x: 55, z: -42, r: 15, lift: 28 },
    { x: 112, z: -76, r: 15, lift: 28 },
    { x: 170, z: -110, r: 15, lift: 28 },
    { x: 222, z: -138, r: 15, lift: 28 },
  ],
  quests: [],
  extraQuests: [
    {
      id: 'express',
      title: 'Express Delivery',
      teaser: 'Get the warm bun to the dome before it goes cold.',
      timed: true,
      timeKey: 'expressTime',
      startOn: ['grab:warmBun'],
      startMarkers: [{ x: 4, z: -14, r: 3, label: 'Warm bun' }],
      objectives: [{ id: 'dome', text: 'Land on the Uspenski dome with the bun', kind: 'event', event: 'domeTop', hint: 'Follow the pale columns of warm air to the north-east: glide into one and rise, then glide on to the next.', markers: [{ x: DOME.x, z: DOME.z, r: 12, label: 'Uspenski dome', y: 26 }] }],
    },
    {
      id: 'riders',
      title: 'Thermal rider',
      teaser: 'Ride three thermals.',
      timed: false,
      objectives: [{ id: 'ride', text: 'Fly into three rising columns of warm air', kind: 'event', event: 'thermal', count: 3, hint: 'Glide in, do not flap.' }],
    },
    {
      id: 'high',
      title: 'Higher',
      timed: false,
      objectives: [{ id: 'alt', text: 'Climb above 80 m', kind: 'event', event: 'altitude80', hint: 'Stay in a thermal.' }],
    },
  ],
  secret: ['high'],
  coopQuests: [{ id: 'duoTherm', title: 'Pair flying', timed: false, objectives: [{ id: 'duoTherm', text: 'One gull drops it, the other grabs it', kind: 'event', event: 'coop:handover', hint: 'Pass the bun.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'domeTop', kind: 'carryLanded', event: 'domeTop', propType: 'bun', minY: 20, zone: { minX: DOME.x - 14, maxX: DOME.x + 14, minZ: DOME.z - 14, maxZ: DOME.z + 14 } }],
  tourists: [],
  extraProps: [{ type: 'bun', x: 4, y: restY('bun'), z: -14, tag: 'warmBun' }],
  defense: false,
  parTime: 300,
  reward: 'flight',
};
