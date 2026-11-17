import type { LevelDef } from './types';
import { restY } from '../props';
import { LUNCH_BENCH } from './theWarden';
import { treatChain, stallGoods } from './chains';

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
/** The bun stall on the south row of the market (customers come from the quay side). */
export const BUN_STALL = { id: 'bunStall', x: 8, z: -27, r: 5, sells: 'bun' as const, goods: { dz: -3, y: 1.0 } };
export const VAPPU_EVE: LevelDef = {
  id: 'vappu-eve',
  sky: 'golden',
  name: '15. Vappu Eve',
  blurb: 'Students, balloons, and one very annoyed young man.',
  district: 'kauppatori',
  requires: 'thermal-express',
  quests: [],
  extraQuests: [
    treatChain({
      id: 'caprace',
      title: 'Cap Race',
      teaser: 'Wind a student up, then spoil his day with a bun.',
      role: 'lars',
      provoke: 'splat',
      provokeText: 'Splat the student with the cap in his hand, twice',
      provokeHint: 'The student by the fountain holds his cap. One splat annoys him, a second one within half a minute makes him furious.',
      provokeMarker: { x: -6, z: -16, r: 4, label: 'Student with a cap' },
      station: BUN_STALL,
      stallName: 'bun stall',
      goodsText: 'a cinnamon bun',
    }),
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
  stations: [BUN_STALL],
  tourists: [],
  extraTourists: [...students, { x: -6, z: -16, heading: 1.2, holds: 'cap', craves: 'bun', color: 0x9ec9f0, hat: 'cap', hatColor: 0xffffff, role: 'lars' }],
  extraProps: [...Array.from({ length: 7 }, (_, i) => ({ type: 'balloon' as const, x: -16 + i * 6, y: 2.6 + (i % 3) * 0.7, z: -20 + (i % 2) * 7 })), ...stallGoods(BUN_STALL)],
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
/** The soup stall on the south row of the market. */
export const SOUP_STALL = { id: 'soupStall', x: 16, z: -27, r: 5, sells: 'soup' as const, goods: { dz: -3, y: 1.0 } };
export const HERRING_MARKET: LevelDef = {
  id: 'herring-market',
  sky: 'morning',
  name: '16. Herring Market',
  blurb: 'A fisherman, a stolen fish and a bowl of soup.',
  district: 'kauppatori',
  requires: 'vappu-eve',
  quests: [],
  extraQuests: [
    treatChain({
      id: 'jars',
      title: 'A Good Soup',
      teaser: 'Rob the fisherman, then cheer him up with soup, then rob him again.',
      role: 'fisher',
      provoke: 'snatch',
      provokeText: 'Snatch the fisherman\'s fish',
      provokeHint: 'He is on the quay, east of the square. Dive on it, or wait until he looks away.',
      provokeMarker: { x: 30, z: -8, r: 3, label: 'Fisherman' },
      station: SOUP_STALL,
      stallName: 'soup stall',
      goodsText: 'a bowl of soup',
    }),
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
    { x: 30, z: -8, heading: 0, holds: 'fish', craves: 'soup', role: 'fisher', stationary: true, color: 0x4a6fa5 },
    { x: -4, z: -22, heading: 0.6, ice: true, color: 0x7fd1ae },
  ],
  stations: [SOUP_STALL],
  extraProps: [
    ...stallGoods(SOUP_STALL),
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
/** The flower stall on the south row of the market. */
export const FLOWER_STALL = { id: 'flowerStall', x: -24, z: -27, r: 5, sells: 'flowers' as const, goods: { dz: -3, y: 1.0 } };
export const WEDDING_BELLS: LevelDef = {
  id: 'wedding-bells',
  sky: 'noon',
  name: '17. Wedding Bells',
  blurb: 'A wedding, a stolen bouquet, and a flower stall.',
  district: 'kauppatori',
  requires: 'herring-market',
  quests: [],
  extraQuests: [
    treatChain({
      id: 'ring',
      title: 'Bouquet Blues',
      teaser: 'Spoil the bride\'s bouquet, then sell her another.',
      role: 'bride',
      provoke: 'snatch',
      provokeText: 'Snatch the bride\'s bouquet',
      provokeHint: 'She holds it by the altar. Dive on it, or wait until she looks at the groom.',
      provokeMarker: { x: ALTAR.x + 3.2, z: ALTAR.z, r: 3, label: 'Bride' },
      station: FLOWER_STALL,
      stallName: 'flower stall',
      goodsText: 'a new bouquet',
    }),
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
    { x: ALTAR.x + 3.2, z: ALTAR.z, heading: -Math.PI / 2, holds: 'flowers', craves: 'flowers', role: 'bride', stationary: true, color: 0xffffff },
    { x: ALTAR.x - 6, z: ALTAR.z + 8, heading: 0, ice: true, role: 'selfie', stationary: true, color: 0xff8fa3 },
    { x: -6, z: -22, heading: 0.4, color: 0xffc971 },
  ],
  stations: [FLOWER_STALL],
  extraProps: stallGoods(FLOWER_STALL),
  defense: false,
  parTime: 270,
  reward: 'quickpoop',
};

/**
 * Level 18: Frozen Harbour (winter). The harbour has frozen: you walk on the ice instead of swimming, and it snows. Headline
 * puzzle ("Polar Plunge"): the winter swimmers leave their warm doughnuts by the ice holes. Take three while they look at the water.
 */
/** The doughnut stand on the ice. */
export const MUNKKI_STAND = { id: 'munkkiStand', x: 0, z: 7, r: 5, sells: 'bun' as const, goods: { dz: 0 } };
export const FROZEN_HARBOUR: LevelDef = {
  id: 'frozen-harbour',
  name: '18. Frozen Harbour',
  blurb: 'The sea is ice. Swimmers are grumpy. Doughnuts are warm.',
  district: 'kauppatori',
  requires: 'wedding-bells',
  winter: true,
  quests: [],
  extraQuests: [
    treatChain({
      id: 'plunge',
      title: 'Polar Plunge',
      teaser: 'Wind a swimmer up, then lure them to the doughnut stand.',
      role: 'plunger',
      provoke: 'splat',
      provokeText: 'Splat the swimmer by the west ice hole, twice',
      provokeHint: 'One splat annoys, a second within half a minute makes them furious. They are wrapped in towels by the ice.',
      provokeMarker: { x: -10, z: 4, r: 4, label: 'Swimmer' },
      station: MUNKKI_STAND,
      stallName: 'doughnut stand',
      goodsText: 'a warm doughnut',
    }),
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
    { x: -10, z: 4, heading: 1.6, craves: 'bun', role: 'plunger', stationary: true, color: 0xe8d5c0 },
    { x: 10, z: 5, heading: -1.6, role: 'swimmer', stationary: true, color: 0xe8d5c0 },
    { x: 0, z: 12, heading: 3.1, role: 'swimmer', stationary: true, color: 0xe8d5c0 },
  ],
  stations: [MUNKKI_STAND],
  extraProps: stallGoods(MUNKKI_STAND, 'munkki'),
  defense: false,
  parTime: 270,
  reward: 'quickpoop',
};
