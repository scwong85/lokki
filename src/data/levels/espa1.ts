import type { LevelDef } from './types';
import { restY } from '../props';

/** The Esplanadi park runs west from Havis Amanda along z = -65. */
export const ESPA_START = { x: -148, z: -65 };
export const POET = { x: -200, z: -65, headTop: 4.4 };

const zone = (x: number, z: number, r: number, minY: number, maxY: number) => ({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, minY, maxY });

/** Sunbathers' towel centres on the north lawn. The head end points north (-z); strawberries lie by each head. */
export const TOWELS = [
  { x: -170, z: -82 },
  { x: -181, z: -84 },
  { x: -192, z: -82 },
  { x: -213, z: -83 },
];

/**
 * Esplanadi, level 1: Don't Block My Sun. Headline puzzle ("Strawberry Raid"): sunbathers lie with their eyes shut and wake when
 * YOUR SHADOW crosses their face. The shadow falls north-west of you, longer the higher you are; high up it fades away. Steal three
 * punnets of strawberries without waking anyone (or deal with the swatting).
 */
export const DONT_BLOCK_MY_SUN: LevelDef = {
  id: 'dont-block-my-sun',
  name: 'E1. Don\'t Block My Sun',
  blurb: 'Your shadow wakes sleepers. Steal the strawberries.',
  district: 'esplanadi',
  start: ESPA_START,
  requires: 'key-to-the-city',
  sunbathers: TOWELS,
  quests: [],
  extraQuests: [
    {
      id: 'berries',
      title: 'Strawberry Raid',
      teaser: 'Steal three punnets of strawberries without waking anyone.',
      timed: false,
      objectives: [{ id: 'take', text: 'Take three punnets of strawberries from the sunbathers', kind: 'event', event: 'grab:berry', count: 3, hint: 'Your shadow falls to the north-west of you and shrinks the higher you fly. Come in from the south-east, keep your shadow off their faces, or walk in low.', markers: TOWELS.map((t) => ({ x: t.x, z: t.z - 1.4, r: 3, label: 'Berries' })) }],
    },
    {
      id: 'sunscreen',
      title: 'Sunscreen swap',
      teaser: 'Put the sunscreen on the poet\'s nose.',
      timed: false,
      objectives: [
        { id: 'take', text: 'Take the sunscreen from the bench', kind: 'event', event: 'grab:sunscreen', hint: 'It is on the park bench by the east end.', markers: [{ x: -160, z: -60, r: 3, label: 'Sunscreen' }] },
        { id: 'nose', text: 'Drop it on the poet\'s head', kind: 'event', event: 'sunscreenNose', after: 'take', hint: 'The poet statue in the middle of the park. Let it go over his head.', markers: [{ x: POET.x, z: POET.z, r: 3, y: POET.headTop, label: 'Poet' }] },
      ],
    },
    {
      id: 'wake',
      title: 'Synchronised screaming',
      timed: false,
      objectives: [{ id: 'all', text: 'Wake all four sunbathers at the same time', kind: 'event', event: 'allAwake', hint: 'One low, noisy flyover along the whole row. They stay awake 12 seconds.' }],
    },
  ],
  secret: ['wake'],
  coopQuests: [{ id: 'duoSun', title: 'Sun block', timed: false, objectives: [{ id: 'duoSun', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'sunscreenNose', kind: 'propInZone', event: 'sunscreenNose', propType: 'sunscreen', zone: zone(POET.x, POET.z, 1.8, 3.0, 6) }],
  tourists: [],
  extraTourists: [
    { x: -150, z: -50, heading: 0.6, ice: true, color: 0xffc971 },
    { x: -230, z: -60, heading: 2.0, color: 0x9ec9f0 },
  ],
  extraProps: [
    ...TOWELS.map((t) => ({ type: 'berries' as const, x: t.x + 0.4, y: restY('berries'), z: t.z - 1.2, tag: 'berry' })),
    { type: 'sunscreen', x: -160, y: restY('sunscreen', 0.5), z: -60, tag: 'sunscreen' },
  ],
  defense: false,
  parTime: 300,
  reward: 'cloudglide',
};

/**
 * Esplanadi, level 2: Who's a Good Boy? Headline puzzle ("Fetch!"): a picnic with sausages. Take the dog's ball from its owner
 * and throw it far west, past the blanket. The dog runs straight across the picnic to fetch it: food flies and you take a sausage
 * in the chaos. Dogs chase gulls on the ground, never in the air.
 */
export const GOOD_BOY: LevelDef = {
  id: 'good-boy',
  name: 'E2. Who\'s a Good Boy?',
  blurb: 'Throw the ball across the picnic.',
  district: 'esplanadi',
  start: ESPA_START,
  requires: 'dont-block-my-sun',
  dogs: [{ x: -178, z: -55, ownerX: -194, ownerZ: -49 }],
  quests: [],
  extraQuests: [
    {
      id: 'fetch',
      title: 'Fetch!',
      teaser: 'Send the dog through the picnic and take a sausage.',
      timed: false,
      objectives: [
        { id: 'ball', text: 'Take the ball from the dog\'s owner and drop or throw it west of the picnic', kind: 'event', event: 'dogScatter', hint: 'Snatch the ball (E), fly over the blanket and let it go beyond it (E or Q to toss). The dog runs straight back across the blanket with it.', markers: [{ x: -196, z: -49, r: 3, label: 'Ball' }, { x: -190, z: -52, r: 4, label: 'Picnic' }] },
        { id: 'sausage', text: 'Grab a sausage in the chaos', kind: 'event', event: 'grab:sausage', after: 'ball', hint: 'The sausages fly. Grab one.' },
      ],
    },
    {
      id: 'hat',
      title: 'Fetch a hat',
      teaser: 'Get the dog to fetch a tourist\'s hat.',
      timed: false,
      objectives: [
        { id: 'take', text: 'Snatch the tourist\'s top hat', kind: 'event', event: 'grab:tophat', hint: 'The man by the east end holds one.' },
        { id: 'fetch', text: 'Drop it where the dog can see it', kind: 'event', event: 'dogFetchedHat', after: 'take', hint: 'The dog fetches hats too.' },
      ],
    },
    {
      id: 'again',
      title: 'Throw it again',
      timed: false,
      objectives: [{ id: 'three', text: 'Play fetch three times', kind: 'event', event: 'dogFetched', count: 3, hint: 'He brings it back to the owner each time. Take it and throw it again.' }],
    },
  ],
  secret: ['again'],
  coopQuests: [{ id: 'duoDog', title: 'Two throwers', timed: false, objectives: [{ id: 'duoDog', text: 'One gull drops the ball, the other picks it up', kind: 'event', event: 'coop:handover', hint: 'Pass it.' }] }],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: -194, z: -49, heading: 0.5, holds: 'ball', role: 'owner', stationary: true, color: 0x9ec9f0 },
    { x: -188, z: -49, heading: -0.4, role: 'picnic', stationary: true, color: 0xf7a1c4 },
    { x: -156, z: -52, heading: 1.0, holds: 'tophat', color: 0x4a5a8a },
  ],
  extraProps: [
    { type: 'sausage', x: -190.4, y: restY('sausage'), z: -52 },
    { type: 'sausage', x: -189.6, y: restY('sausage'), z: -52.4 },
    { type: 'sausage', x: -190.0, y: restY('sausage'), z: -51.4 },
    { type: 'sausage', x: -191.0, y: restY('sausage'), z: -52.8 },
  ],
  defense: false,
  parTime: 300,
};

/** Spray zones and the valve of the E3 lawn. */
export const SPRAY = { zones: [{ x: -170, z: -48, r: 7 }, { x: -184, z: -48, r: 7 }], valve: { x: -152, z: -44, r: 2.5 } };

/**
 * Esplanadi, level 3: Splash Zone. Headline puzzle ("Clear the Lawn"): a family has spread a birthday picnic with a cake on the
 * one lawn that has sprinklers. Stand on the valve box to start them: everyone flees the spray and leaves the cake for you.
 */
export const SPLASH_ZONE: LevelDef = {
  id: 'splash-zone',
  name: 'E3. Splash Zone',
  blurb: 'Start the sprinklers. Everyone runs. Cake!',
  district: 'esplanadi',
  start: ESPA_START,
  requires: 'good-boy',
  sprinklers: SPRAY,
  quests: [],
  extraQuests: [
    {
      id: 'clear',
      title: 'Clear the Lawn',
      teaser: 'Start the sprinklers and take the cake.',
      timed: false,
      objectives: [
        { id: 'valve', text: 'Peck the valve box to start the sprinklers', kind: 'event', event: 'sprinklersOn', hint: 'Walk or land on the little grey box at the east end of the lawn.', markers: [{ x: SPRAY.valve.x, z: SPRAY.valve.z, r: 3, label: 'Valve' }] },
        { id: 'cake', text: 'Take the birthday cake', kind: 'event', event: 'grab:cake', after: 'valve', hint: 'The family runs from the spray. The cake is on the blanket.', markers: [{ x: -177, z: -48, r: 4, label: 'Cake' }] },
      ],
    },
    {
      id: 'soak',
      title: 'Wet look',
      teaser: 'Soak three people.',
      timed: false,
      objectives: [{ id: 'three', text: 'Make three people flee the spray', kind: 'event', event: 'sprinkled', count: 3, hint: 'Anyone standing on the lawn when the sprinklers run.' }],
    },
    {
      id: 'everyone',
      title: 'Wet blanket',
      timed: false,
      objectives: [{ id: 'six', text: 'Soak six people in one level', kind: 'event', event: 'sprinkled', count: 6, hint: 'Start the sprinklers again after they have all drifted back.' }],
    },
  ],
  secret: ['everyone'],
  coopQuests: [{ id: 'duoSplash', title: 'Double valve', timed: false, objectives: [{ id: 'duoSplash', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: -176, z: -50, heading: 1.0, role: 'picnic', color: 0xf7a1c4 },
    { x: -173, z: -47, heading: -1.0, role: 'picnic', color: 0x9ec9f0 },
    { x: -180, z: -46, heading: 2.0, role: 'picnic', color: 0xffc971 },
    { x: -168, z: -51, heading: 0.0, role: 'picnic', color: 0xc7b5e0 },
    { x: -186, z: -45, heading: 1.5, role: 'picnic', color: 0x9bd8b0 },
  ],
  extraProps: [{ type: 'bun', x: -177, y: restY('bun', 0.1), z: -48, tag: 'cake' }],
  defense: false,
  parTime: 300,
};
