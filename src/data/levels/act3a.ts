import type { LevelDef } from './types';
import { restY } from '../props';
import { STATUE, FERRY } from '../places';
import { LUNCH_BENCH } from './theWarden';

/** The students fill the square in white caps. */
const students = Array.from({ length: 14 }, (_, i) => ({
  x: -22 + (i % 7) * 7.5,
  z: -24 + Math.floor(i / 7) * 9,
  heading: i * 0.9,
  hat: 'cap' as const,
  hatColor: 0xffffff,
  role: 'student',
  color: [0xf7a1c4, 0x9ec9f0, 0xffd36e, 0x9fd18f, 0xc7b5e0, 0xf29e7a, 0x7fd1ae][i % 7],
}));

/**
 * Level 15: Vappu Eve (30 April). The square is full of students in white caps and balloons. Headline puzzle ("Cap Race"):
 * the students are about to cap Havis Amanda. Beat them to it: take the cap from the statue and put it on the Warden instead
 * (drop it by his bench while he eats his lunch).
 */
export const BENCH_ZONE = { minX: LUNCH_BENCH.x - 3.5, maxX: LUNCH_BENCH.x + 3.5, minZ: LUNCH_BENCH.z - 3.5, maxZ: LUNCH_BENCH.z + 3.5, maxY: 3 };
export const VAPPU_EVE: LevelDef = {
  id: 'vappu-eve',
  name: '15. Vappu Eve',
  blurb: 'Students, balloons, and a cap that belongs on the wrong head.',
  district: 'kauppatori',
  requires: 'thermal-express',
  quests: [],
  extraQuests: [
    {
      id: 'caprace',
      title: 'Cap Race',
      teaser: 'Put the statue\'s cap on the Warden.',
      timed: false,
      objectives: [
        { id: 'take', text: 'Take the student cap from the statue', kind: 'event', event: 'grab:statueCap', hint: 'Havis Amanda stands far to the west. The cap lies on her plinth: land and press E.', markers: [{ x: STATUE.x, z: STATUE.z, r: 4, y: 3, label: 'Student cap' }] },
        { id: 'warden', text: 'Put it on the Warden (drop it by his lunch bench)', kind: 'event', event: 'capOnWarden', after: 'take', hint: 'He sits on his bench at lunch (a banner tells you). Carry the cap there and let go.', markers: [{ x: LUNCH_BENCH.x, z: LUNCH_BENCH.z, r: 4, label: 'The Warden' }] },
      ],
    },
    {
      id: 'balloons',
      title: 'Pop the party',
      teaser: 'Pop three balloons.',
      timed: false,
      objectives: [{ id: 'pop', text: 'Pop three balloons (poop on them)', kind: 'event', event: 'balloonPop', count: 3, hint: 'They float over the square. Aim a poop at one.' }],
    },
    {
      id: 'capsnatch',
      title: 'Hats off',
      timed: false,
      objectives: [{ id: 'snatch', text: 'Snatch a cap right off a student', kind: 'event', event: 'snatch:cap', hint: 'One student is holding his cap in his hand.' }],
    },
  ],
  secret: ['capsnatch'],
  coopQuests: [{ id: 'duoVappu', title: 'Double cap', timed: false, objectives: [{ id: 'duoVappu', text: 'Both gulls poop on people within five seconds', kind: 'event', event: 'coop:poopNpc', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'capOnWarden', kind: 'propInZone', event: 'capOnWarden', tag: 'statueCap', zone: BENCH_ZONE }],
  tourists: [],
  extraTourists: [...students, { x: -6, z: -16, heading: 1.2, holds: 'cap', color: 0x9ec9f0, hat: 'cap', hatColor: 0xffffff, role: 'student' }],
  extraProps: Array.from({ length: 7 }, (_, i) => ({ type: 'balloon' as const, x: -16 + i * 6, y: 2.6 + (i % 3) * 0.7, z: -20 + (i % 2) * 7 })),
  defense: true,
  deploy: ['warden'],
  wardenLunch: { at: 4, duration: 75, x: LUNCH_BENCH.x, z: LUNCH_BENCH.z, repeat: 110 },
  parTime: 330,
  reward: 'quickpoop',
};

/**
 * Level 16: Herring Market (autumn). Headline puzzle ("Grandma Wins"): the herring contest jury tastes jars. The arrogant
 * champion's jar is on the judge's table. Take it away and leave grandma's jar (the sweet one) for the judge to taste.
 */
export const JUDGE = { x: 10, z: -18 };
export const HERRING_MARKET: LevelDef = {
  id: 'herring-market',
  name: '16. Herring Market',
  blurb: 'Swap the jars so grandma beats the champion.',
  district: 'kauppatori',
  requires: 'vappu-eve',
  quests: [],
  extraQuests: [
    {
      id: 'jars',
      title: 'Grandma Wins',
      teaser: 'Swap the champion\'s jar for grandma\'s.',
      timed: false,
      objectives: [
        { id: 'take', text: 'Take the champion\'s jar from the judges\' table', kind: 'event', event: 'grab:champJar', hint: 'The judge is looking at it: wait until he looks away (a noise helps).', markers: [{ x: JUDGE.x - 1.5, z: JUDGE.z, r: 3, label: 'Champion\'s jar' }] },
        { id: 'swap', text: 'Leave grandma\'s jar for the judge to taste', kind: 'event', event: 'tookItem:soup', after: 'take', hint: 'Grandma\'s jar is by her stall to the west. Drop it near the judge.', markers: [{ x: -8, z: -15, r: 3, label: 'Grandma\'s jar' }, { x: JUDGE.x, z: JUDGE.z, r: 3, label: 'Judge' }] },
      ],
    },
    {
      id: 'fisher',
      title: 'Fisherman\'s lunch',
      teaser: 'Steal a fish from the fisherman.',
      timed: false,
      objectives: [{ id: 'fish', text: 'Snatch the fisherman\'s fish', kind: 'event', event: 'snatch:fish', hint: 'He is on the quay, east of the square.', markers: [{ x: 30, z: -8, r: 3, label: 'Fisherman' }] }],
    },
    {
      id: 'sour',
      title: 'Not the sweet one',
      timed: false,
      objectives: [{ id: 'yuck', text: 'Make the judge say yuck', kind: 'event', event: 'yuck', hint: 'Bags of salmiakki are around the stalls.' }],
    },
  ],
  secret: ['sour'],
  coopQuests: [{ id: 'duoJar', title: 'Jar relay', timed: false, objectives: [{ id: 'duoJar', text: 'One gull drops it, the other grabs it', kind: 'event', event: 'coop:handover', hint: 'Pass a jar.' }] }],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: JUDGE.x, z: JUDGE.z, heading: Math.PI / 2, role: 'judge', stationary: true, wants: ['soup', 'salmiakki'], hat: 'top', hatColor: 0x2a2a35, color: 0x7a3f3f },
    { x: 30, z: -8, heading: 0, holds: 'fish', role: 'fisher', stationary: true, color: 0x4a6fa5 },
    { x: -4, z: -22, heading: 0.6, ice: true, color: 0x7fd1ae },
  ],
  extraProps: [
    { type: 'herring', x: JUDGE.x - 1.5, y: restY('herring', 0.75), z: JUDGE.z, tag: 'champJar' },
    { type: 'crate', x: JUDGE.x - 1.5, y: restY('crate'), z: JUDGE.z },
    { type: 'soup', x: -8, y: restY('soup'), z: -15, tag: 'grannyJar' },
    { type: 'salmiakki', x: -2, y: restY('salmiakki'), z: -12 },
  ],
  defense: false,
  parTime: 300,
  reward: 'fatbird',
};

/**
 * Level 17: Wedding Bells. A good-bird level. Headline puzzle ("Something Borrowed"): the ring bearer lost the ring box; it
 * lies on the ferry's roof (it is shiny). Bring it to the groom at the altar.
 */
export const ALTAR = { x: -20, z: -14 };
export const WEDDING_BELLS: LevelDef = {
  id: 'wedding-bells',
  name: '17. Wedding Bells',
  blurb: 'A wedding, a lost ring, and a very helpful gull.',
  district: 'kauppatori',
  requires: 'herring-market',
  quests: [],
  extraQuests: [
    {
      id: 'ring',
      title: 'Something Borrowed',
      teaser: 'Bring the lost ring to the groom.',
      timed: false,
      objectives: [
        { id: 'find', text: 'Find the ring box (shiny things catch a gull\'s eye)', kind: 'event', event: 'grab:ring', hint: 'It fell on the ferry\'s roof.', markers: [{ x: FERRY.x - 5, z: FERRY.z, r: 5, y: 9, label: 'Ring box' }] },
        { id: 'give', text: 'Give it to the groom', kind: 'event', event: 'tookItem:ring', after: 'find', hint: 'He waits at the altar. Drop it at his feet.', markers: [{ x: ALTAR.x, z: ALTAR.z, r: 4, label: 'Groom' }] },
      ],
    },
    {
      id: 'bouquet',
      title: 'Catch the bouquet',
      teaser: 'Snatch the bride\'s bouquet.',
      timed: false,
      objectives: [{ id: 'bq', text: 'Snatch the bouquet', kind: 'event', event: 'snatch:flowers', hint: 'Chaos option: the bride holds it.' }],
    },
    {
      id: 'photo',
      title: 'Wedding crasher',
      timed: false,
      objectives: [{ id: 'pb', text: 'Be in the wedding photo', kind: 'event', event: 'photobomb', hint: 'The photographer counts 3, 2, 1: stand in front of her phone.' }],
    },
  ],
  secret: ['photo'],
  coopQuests: [{ id: 'duoWed', title: 'Best gulls', timed: false, objectives: [{ id: 'duoWed', text: 'Both gulls stand in the photo', kind: 'event', event: 'coop:photobomb', hint: 'Both in front of her phone at the click.' }] }],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: ALTAR.x, z: ALTAR.z, heading: Math.PI / 2, role: 'groom', stationary: true, wants: ['ring'], color: 0x2f3a55 },
    { x: ALTAR.x + 3.2, z: ALTAR.z, heading: -Math.PI / 2, holds: 'flowers', role: 'bride', stationary: true, color: 0xffffff },
    { x: ALTAR.x - 6, z: ALTAR.z + 8, heading: 0, ice: true, role: 'selfie', stationary: true, color: 0xff8fa3 },
    { x: -6, z: -22, heading: 0.4, color: 0xffc971 },
  ],
  extraProps: [{ type: 'ring', x: FERRY.x - 5, y: restY('ring', 9.0), z: FERRY.z, tag: 'ring' }],
  defense: false,
  parTime: 270,
  reward: 'quickpoop',
};

/**
 * Level 18: Frozen Harbour (winter). The harbour has frozen: you walk on the ice instead of swimming, and it snows. Headline
 * puzzle ("Polar Plunge"): the winter swimmers leave their warm doughnuts by the ice holes. Take three while they look at the water.
 */
export const FROZEN_HARBOUR: LevelDef = {
  id: 'frozen-harbour',
  name: '18. Frozen Harbour',
  blurb: 'The sea is ice. Doughnuts are warm.',
  district: 'kauppatori',
  requires: 'wedding-bells',
  winter: true,
  quests: [],
  extraQuests: [
    {
      id: 'plunge',
      title: 'Polar Plunge',
      teaser: 'Take the swimmers\' doughnuts.',
      timed: false,
      objectives: [{ id: 'munkki', text: 'Take three warm doughnuts from the ice', kind: 'event', event: 'grab:munkki', count: 3, hint: 'The swimmers stand by their ice holes on the harbour ice, south of the quay.', markers: [{ x: -8, z: 2, r: 4, label: 'Doughnut' }, { x: 8, z: 3, r: 4, label: 'Doughnut' }, { x: 2, z: 10, r: 4, label: 'Doughnut' }] }],
    },
    {
      id: 'ice',
      title: 'Walk on water',
      teaser: 'Cross the ice on foot.',
      timed: false,
      objectives: [{ id: 'walk', text: 'Walk on the ice for ten seconds', kind: 'event', event: 'iceWalk', hint: 'Land on the harbour and walk (no flying).' }],
    },
    {
      id: 'splash',
      title: 'Cold shower',
      timed: false,
      objectives: [{ id: 'splash', text: 'Poop on a winter swimmer', kind: 'event', event: 'poopNpc:swimmer', hint: 'They are wrapped in towels, watching the ice hole.' }],
    },
  ],
  secret: ['splash'],
  coopQuests: [{ id: 'duoIce', title: 'Ice dance', timed: false, objectives: [{ id: 'duoIce', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'iceWalk', kind: 'swim', event: 'iceWalk', seconds: 10 }],
  tourists: [],
  extraTourists: [
    { x: -10, z: 4, heading: 1.6, role: 'swimmer', stationary: true, color: 0xe8d5c0 },
    { x: 10, z: 5, heading: -1.6, role: 'swimmer', stationary: true, color: 0xe8d5c0 },
    { x: 0, z: 12, heading: 3.1, role: 'swimmer', stationary: true, color: 0xe8d5c0 },
  ],
  extraProps: [
    { type: 'bun', x: -8, y: restY('bun'), z: 2, tag: 'munkki' },
    { type: 'bun', x: 8, y: restY('bun'), z: 3, tag: 'munkki' },
    { type: 'bun', x: 2, y: restY('bun'), z: 10, tag: 'munkki' },
  ],
  defense: false,
  parTime: 270,
  reward: 'quickpoop',
};
