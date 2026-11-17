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

/**
 * M5. Tug of War: two ways to take something from a person's hand. A bowl held in both hands cannot be snatched from the air:
 * walk up, hold E and tug (mash E to pull harder). A balloon held high cannot be tugged: dive at it. A bun can be done either
 * way, but the tug is slow, and the vendor next door will spray a gull that stays within reach of him.
 */
export const TUG_OF_WAR: LevelDef = {
  id: 'tug-of-war',
  name: 'M5. Tug of War',
  blurb: 'Hold E and pull. Some things you tug, some you snatch.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'tugchain',
      title: 'Tug of War',
      teaser: 'Take a bowl, a balloon and a bun, each the right way.',
      timed: false,
      chain: true,
      objectives: [
        {
          id: 'soup',
          text: 'Take the soup from the man on the quay (tug it)',
          kind: 'event',
          event: 'grab:tugSoup',
          hint: 'A bowl in two hands cannot be snatched from the air. Land beside him and HOLD E; mash E to pull harder. A honk makes him let go.',
          markers: [{ x: 8, z: -18, r: 4, label: 'Soup' }],
        },
        {
          id: 'balloon',
          text: 'Take the balloon (snatch it from the air)',
          kind: 'event',
          event: 'grab:tugBalloon',
          after: 'soup',
          hint: 'It is held high, out of reach of a tug. Dive at it (Shift).',
          markers: [{ x: 20, z: -15, r: 4, label: 'Balloon' }],
        },
        {
          id: 'bun',
          text: 'Take the bun from the man by the vendor',
          kind: 'event',
          event: 'grab:tugBun',
          after: 'balloon',
          hint: 'Snatch it from the air (safe), or tug it on the ground (the vendor sprays a gull that stays too close, and you lose the tug).',
          markers: [{ x: -29, z: -17, r: 4, label: 'Bun' }],
        },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'bun', hint: 'Keep it and stay far from everyone until the bar fills.' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: 8, z: -18, heading: 0, holds: 'soup', holdTag: 'tugSoup', role: 'soupman', stationary: true, color: 0xe8d5c0 },
    { x: 20, z: -15, heading: Math.PI / 2, holds: 'balloon', holdTag: 'tugBalloon', role: 'balloonman', stationary: true, color: 0xf7a1c4 },
    { x: -29, z: -17, heading: -Math.PI / 2, holds: 'bun', holdTag: 'tugBun', role: 'bunman', stationary: true, color: 0xffd36e },
    { x: -10, z: -22, heading: 0.6, ice: true, color: 0x9ec9f0 },
  ],
  defense: true,
  deploy: ['vendors'],
  parTime: 300,
};

const queue = (n: number, x0: number, z: number, dx: number, role: string, tag: string, colors: number[], heading = Math.PI) =>
  Array.from({ length: n }, (_, i) => ({ x: x0 + i * dx, z, heading, ice: true, holdTag: tag, role, stationary: true, color: colors[i % colors.length] }));

/**
 * M6. Rush Hour (contagion): a fright spreads person to person. Splat one in the queue and the whole line panics.
 */
export const RUSH_HOUR: LevelDef = {
  id: 'rush-hour',
  name: 'M6. Rush Hour',
  blurb: 'Panic is catching. Splat one person in the queue.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'rushchain',
      title: 'Rush Hour',
      teaser: 'Start a panic in the ice cream queue, and take a dropped cone.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'splat', text: 'Splat the first person in the queue', kind: 'event', event: 'poopNpc:queuer', hint: 'Poop (Q) on someone in the line on the quay. Everyone near them will jump too.', markers: [{ x: -5, z: -11, r: 6, label: 'Queue' }] },
        { id: 'spread', text: 'Make the panic spread to five people', kind: 'event', event: 'spread:5', after: 'splat', hint: 'A fright jumps to people standing close. Splat another one if it stops.' },
        { id: 'cone', text: 'Take a cone the crowd dropped', kind: 'event', event: 'grab:rushCone', after: 'spread', hint: 'They dropped their ice creams. Grab one with E.' },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'cone', hint: 'Keep it and stay far from everyone until the bar fills.' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: queue(7, -9, -11, 1.4, 'queuer', 'rushCone', [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0xb8e0c8]),
  defense: false,
  start: { x: -5, z: -30 },
  parTime: 240,
};

/**
 * M7. Strike! (slam): a fast dive bowls a person over, and they knock over the next, like skittles.
 */
export const STRIKE: LevelDef = {
  id: 'strike',
  name: 'M7. Strike!',
  blurb: 'Dive fast through the line. Watch them fall like skittles.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'strikechain',
      title: 'Strike!',
      teaser: 'Knock four people down with one dive, and take a cone.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'slam', text: 'Bowl someone over with a fast dive', kind: 'event', event: 'slammed', hint: 'Hold Shift and dive hard at the end of the line, low and fast.', markers: [{ x: -26, z: -14, r: 6, label: 'The line' }] },
        { id: 'strike', text: 'Knock down four people with one dive', kind: 'event', event: 'knockdown:4', after: 'slam', hint: 'Fallen people knock over their neighbours. Hit the line near one end.' },
        { id: 'cone', text: 'Take a cone that went flying', kind: 'event', event: 'grab:strikeCone', after: 'strike', hint: 'They dropped their ice creams. Grab one with E.' },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'cone', hint: 'Keep it and stay far from everyone until the bar fills.' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: queue(6, -30, -14, 1.2, 'bowler', 'strikeCone', [0xf7a1c4, 0x9ec9f0, 0xffd36e], 0).map((t, i) => ({ ...t, x: -26 + i * 1.2, heading: Math.PI })),
  defense: false,
  start: { x: -26, z: -34 },
  parTime: 240,
};

/**
 * M8. Jukebox Hero (peck): peck the jukebox and everyone nearby dances, too happy to guard their ice cream.
 */
export const JUKEBOX_HERO: LevelDef = {
  id: 'jukebox-hero',
  name: 'M8. Jukebox Hero',
  blurb: 'Peck the jukebox. Nobody guards an ice cream while dancing.',
  district: 'kauppatori',
  series: 'Mischief (new)',
  quests: [],
  extraQuests: [
    {
      id: 'jukechain',
      title: 'Jukebox Hero',
      teaser: 'Start the music, then take a dancer\'s ice cream.',
      timed: false,
      chain: true,
      objectives: [
        { id: 'peck', text: 'Peck the jukebox (E)', kind: 'event', event: 'pecked:juke', hint: 'Land next to the jukebox and press E.', markers: [{ x: -6, z: -18, r: 4, label: 'Jukebox' }] },
        { id: 'dance', text: 'Get four people dancing', kind: 'event', event: 'dancers:4', after: 'peck', hint: 'Stay near the people. Peck it again if they stop.' },
        { id: 'cone', text: 'Take a dancer\'s ice cream', kind: 'event', event: 'grab:danceCone', after: 'dance', hint: 'Dancers are too happy to guard. Grab the cone with E.' },
        { id: 'escape', text: 'Get away with it', kind: 'escape', after: 'cone', hint: 'Keep it and stay far from everyone until the bar fills.' },
      ],
    },
  ],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: -10, z: -21, heading: 0.4, ice: true, holdTag: 'danceCone', role: 'dancer', stationary: true, color: 0xf7a1c4 },
    { x: -2, z: -21, heading: -0.4, ice: true, holdTag: 'danceCone', role: 'dancer', stationary: true, color: 0x9ec9f0 },
    { x: -9, z: -14, heading: 0.9, ice: true, holdTag: 'danceCone', role: 'dancer', stationary: true, color: 0xffd36e },
    { x: -3, z: -14, heading: -0.9, ice: true, holdTag: 'danceCone', role: 'dancer', stationary: true, color: 0xb8e0c8 },
  ],
  switches: [{ id: 'juke', x: -6, z: -18, label: 'jukebox', effect: 'dance', cooldown: 6 }],
  defense: false,
  start: { x: -6, z: -34 },
  parTime: 240,
};
