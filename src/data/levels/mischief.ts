import type { LevelDef } from './types';
import { WRONG_FERRY } from '../places';

/** Where the inspector paces on the quay (east of the selfie spot). */
export const PATROL_A = { x: 6, z: -20 };
export const PATROL_B = { x: 26, z: -20 };

/**
 * M1. Wet Floor: a trap level. A hi-vis inspector paces the quay with his lunch. Nobody has to be fetched: splat the pavement on
 * his route and let him walk into it. He slips, his lunch flies, and it is yours (docs/design/mischief-mechanics.md, "Slip").
 */
export const WET_FLOOR: LevelDef = {
  id: 'wet-floor',
  name: 'M1. Wet Floor',
  blurb: 'Set a trap with your bottom. Watch a very serious man find out.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'wetfloor',
      title: 'Wet Floor',
      teaser: 'Make the inspector lose his footing, and his lunch.',
      timed: false,
      chain: true,
      objectives: [
        {
          id: 'trap',
          text: 'Splat the pavement on the inspector\'s route',
          kind: 'event',
          event: 'trapSet',
          hint: 'The man in the hi-vis vest paces up and down the quay. Aim a poop (F) at the ground inside the ring. It stays wet for a while.',
          markers: [{ x: 16, z: -20, r: 4, label: 'His route' }],
        },
        { id: 'slip', text: 'Watch him walk into it', kind: 'event', event: 'slipped:inspector', after: 'trap', hint: 'Wait for him to come past. A second splat in front of him works too.' },
        { id: 'lunch', text: 'Take his lunch while he sits there', kind: 'event', event: 'grab:inspLunch', after: 'slip', hint: 'It flew out of his hand. Grab it before he gets up.' },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'lunch', hint: 'Keep it and stay far from everyone until the bar fills.' },
      ],
    },
  ],
  splatZones: [{ event: 'trapSet', zone: { minX: 8, maxX: 24, minZ: -21.6, maxZ: -18.4 } }],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: PATROL_A.x, z: PATROL_A.z, heading: -Math.PI / 2, holds: 'bun', holdTag: 'inspLunch', role: 'inspector', color: 0xd6f23c, hat: 'cap', hatColor: 0xffffff, patrol: [PATROL_B, PATROL_A] },
    { x: -22, z: -22, heading: 0.6, ice: true, color: 0x7fd1ae },
    { x: -6, z: -14, heading: 1.2, ice: true, color: 0xffc971 },
  ],
  defense: false,
  parTime: 240,
};

/**
 * M2. Pied Piper: a parade level. Hold T and bored tourists fall into a conga line behind you. Gather four, parade them round the
 * quay, and lead them onto the wrong ferry.
 */
export const PIED_PIPER: LevelDef = {
  id: 'pied-piper',
  name: 'M2. Pied Piper',
  blurb: 'Hold T and the whole tour group follows. Take them somewhere silly.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'piper',
      title: 'Pied Piper',
      teaser: 'Start a conga line and lead it onto the wrong ferry.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'gather', text: 'Get four tourists following you', kind: 'event', event: 'piperGather', hint: 'Hold T (taunt) near the bored tourists on the quay. They fall in behind you and keep following a few seconds after you let go.' },
        { id: 'west', text: 'Parade them to the west end of the quay', kind: 'event', event: 'piperWest', after: 'gather', hint: 'Fly low and slowly, and keep taunting so nobody gets left behind.', markers: [{ x: -22, z: -18, r: 9, label: 'West end' }] },
        { id: 'east', text: 'Now parade them all the way east', kind: 'event', event: 'piperEast', after: 'west', hint: 'Along the quay in front of the stalls.', markers: [{ x: 18, z: -18, r: 9, label: 'East end' }] },
        { id: 'ferry', text: 'Lead them to the ferry', kind: 'event', event: 'piperFerry', after: 'east', hint: 'The ferry is at the south end of the quay.', markers: [{ x: WRONG_FERRY.x, z: WRONG_FERRY.z, r: 8, label: 'Ferry' }] },
        { id: 'wave', text: 'Wave them off', kind: 'event', event: 'wrongFerry', after: 'ferry', hint: 'They think it is the Suomenlinna tour. It is not.' },
      ],
    },
  ],
  parade: {
    stops: [
      { event: 'piperGather', need: 4, text: 'A conga line forms behind you!' },
      { event: 'piperWest', need: 4, at: { x: -22, z: -18, r: 9 }, text: 'West end: still with you!' },
      { event: 'piperEast', need: 4, at: { x: 18, z: -18, r: 9 }, text: 'East end: still with you!' },
      {
        event: 'piperFerry',
        need: 4,
        at: { x: WRONG_FERRY.x, z: WRONG_FERRY.z, r: 8 },
        text: 'They are boarding the ferry...',
        send: { role: 'bored', goals: [0, 1, 2, 3, 4, 5].map((i) => ({ x: WRONG_FERRY.x - 2 + i * 1.2, z: WRONG_FERRY.z, name: 'ferry' })) },
      },
    ],
  },
  triggers: [],
  tourists: [],
  extraTourists: [-22, -14, -6, 4, 12, 20].map((x, i) => ({ x, z: -22 + (i % 2) * 3, heading: i, follows: true, role: 'bored', color: [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0x9fd18f, 0xc7b5e0, 0xf29e7a][i] })),
  defense: false,
  parTime: 300,
};

/** People gazing at the harbour with their backs to the quay (north is -z, so facing the sea means heading PI). */
const sea = (x: number, z: number, color: number, tag: string) => ({ x, z, heading: Math.PI, ice: true, holdTag: tag, stationary: true, color });

/**
 * M3. Honk!: the new verb. Tap T for a loud honk: people who have their backs to you jump out of their skin and drop what they
 * hold. Approach from behind, honk, take what falls.
 */
export const HONK: LevelDef = {
  id: 'honk',
  name: 'M3. Honk!',
  start: { x: 0, z: -22 }, // behind the tourists, who face the sea
  blurb: 'Tap T. Watch grown adults drop their ice creams.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'honkchain',
      title: 'Honk!',
      teaser: 'Give four tourists the fright of their lives.',
      timed: false,
      chain: true,
      objectives: [
        {
          id: 'honk',
          text: 'Honk at two people who have their backs to you',
          kind: 'event',
          event: 'honkDrop',
          count: 2,
          hint: 'The tourists on the quay are looking at the harbour. Land behind them, a few metres away, and TAP T (a quick press; holding it is a taunt). Someone looking at you only flinches.',
          markers: [{ x: 0, z: -10, r: 9, label: 'Tourists' }],
        },
        { id: 'take', text: 'Take what they dropped', kind: 'event', event: 'grab:honkCone', after: 'honk', hint: 'It lies where they stood. Grab it before they calm down.' },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'take', hint: 'Keep it and stay far from everyone until the bar fills.' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [sea(-9, -9, 0xf7a1c4, 'honkCone'), sea(-3, -9.5, 0x9ec9f0, 'honkCone'), sea(3, -9, 0xffd36e, 'honkCone'), sea(9, -9.5, 0x9fd18f, 'honkCone'), { x: -24, z: -20, heading: 0.6, ice: true, color: 0xc7b5e0 }],
  defense: false,
  parTime: 180,
};

/**
 * M4. Splash Landing: the cheap new verb. A hard dive into the harbour makes a wave that soaks everyone on the quay edge: they
 * drop their ice creams and run.
 */
export const SPLASH_LANDING: LevelDef = {
  id: 'splash-landing',
  name: 'M4. Splash Landing',
  blurb: 'Dive into the harbour. Soak everyone on the pier.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'cannon',
      title: 'Splash Landing',
      teaser: 'Make a wave and soak the pier.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'splash', text: 'Dive into the harbour right beside the people on the pier', kind: 'event', event: 'cannon1', hint: 'Fly high over the water in front of them, then DIVE (Shift) straight down into the sea. A hard dive makes a big wave.', markers: [{ x: 0, z: -3.5, r: 6, label: 'Dive here' }] },
        { id: 'three', text: 'Soak three people with one splash', kind: 'event', event: 'cannon3', after: 'splash', hint: 'The higher you start and the faster you dive, the wider the wave. Aim for the middle of the group.' },
        { id: 'take', text: 'Take a dropped ice cream', kind: 'event', event: 'grab:splashCone', after: 'three', hint: 'They dropped everything on the quay.' },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'take', hint: 'Keep it and stay far from everyone until the bar fills.' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [-6, -3, 0, 3, 6].map((x, i) => sea(x, -6.8, [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0x9fd18f, 0xc7b5e0][i], 'splashCone')),
  defense: false,
  parTime: 200,
};
