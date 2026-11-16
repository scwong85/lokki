import type { LevelDef } from './types';
import { restY } from '../props';
import { SENATE_START } from './senate';
import { TRAM_LINE } from '../../world/roads';

/** The emperor's statue (Senate Square): centre, and how high things are on it (see the `emperor` landmark). */
export const EMPEROR = { x: -156.5, z: -300, plinthTop: 3.4, headTop: 5.8 };
/** The tram track runs east-west just south of the statue. */
export const TRAM = { ...TRAM_LINE, stopX: -156.5, length: 14, width: 2.6, roofY: 3.3 };

const snap = (minY: number, maxY: number) => ({ minX: EMPEROR.x - 1.6, maxX: EMPEROR.x + 1.6, minZ: EMPEROR.z - 1.6, maxZ: EMPEROR.z + 1.6, minY, maxY });

/**
 * Senate Square, level 4: Tram Surfing. Headline puzzle ("Lunch Express"): the driver guards his lunch next to the stop. Drop a
 * bottle on the track ahead of the tram: it halts, the driver climbs out to clear it, and his lunch is yours.
 */
export const TRAM_SURFING: LevelDef = {
  id: 'tram-surfing',
  name: 'S4. Tram Surfing',
  blurb: 'Stop the tram, take the lunch, ride the roof.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'ding-dong',
  tram: TRAM,
  quests: [],
  extraQuests: [
    {
      id: 'lunch',
      title: 'Lunch Express',
      teaser: 'Stop the tram and take the driver\'s lunch.',
      timed: false,
      objectives: [
        { id: 'stop', text: 'Make the tram stop: drop a bottle on the track ahead of it', kind: 'event', event: 'tramBlocked', hint: 'Pick up a bottle (E), fly over the rails (the tram is on the street south of the statue) and put it down in front of the tram.', markers: [{ x: -135, z: TRAM.z, r: 6, label: 'Track' }] },
        { id: 'lunch', text: 'Grab the driver\'s lunch while he is away', kind: 'event', event: 'grab:lunch', after: 'stop', hint: 'The driver walks out to clear the track. His lunch is beside the stop.', markers: [{ x: -172, z: -272, r: 3, label: 'Lunch' }] },
      ],
    },
    {
      id: 'surf',
      title: 'Surf\'s up',
      teaser: 'Ride on the roof.',
      timed: false,
      objectives: [{ id: 'ride', text: 'Stand on the moving tram roof for eight seconds', kind: 'event', event: 'tramRide', hint: 'Land on the roof when the tram sets off (it rings its bell) and stay put.', markers: [{ x: TRAM.stopX, z: TRAM.z, r: 4, y: TRAM.roofY, label: 'Tram roof' }] }],
    },
    {
      id: 'twice',
      title: 'Frequent flyer',
      timed: false,
      objectives: [{ id: 'board', text: 'Hop on the tram roof two separate times', kind: 'event', event: 'tramBoard', count: 2, hint: 'Hop off and on again.' }],
    },
  ],
  secret: ['twice'],
  coopQuests: [{ id: 'duoTram', title: 'Double lunch', timed: false, objectives: [{ id: 'duoTram', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: -172, z: -273.5, heading: 0, role: 'driver', stationary: true, color: 0x6a8fd1 },
    { x: -150, z: -285, heading: 1.0, ice: true, color: 0xffc971 },
  ],
  extraProps: [
    { type: 'bun', x: -172.5, y: restY('bun', 0.9), z: -272, tag: 'lunch' },
    { type: 'bottle', x: -160, y: restY('bottle'), z: -291 },
    { type: 'bottle', x: -152, y: restY('bottle'), z: -291 },
  ],
  defense: false,
  parTime: 300,
  reward: 'flock',
};

/**
 * Senate Square, level 5: Turf War. The Pigeon Gang chases lone gulls off the statue. Two ways in ("Statue Diplomacy"): feed them
 * a bun (they make you an honorary pigeon) or drop salmiakki (they hate it and scatter). Then land on the emperor's head.
 */
export const TURF_WAR: LevelDef = {
  id: 'turf-war',
  name: 'S5. Turf War',
  blurb: 'The pigeons own the statue. Win them over, or scare them off.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'tram-surfing',
  pigeons: { x: EMPEROR.x, z: EMPEROR.z },
  quests: [],
  extraQuests: [
    {
      id: 'diplomacy',
      title: 'Statue Diplomacy',
      teaser: 'Make peace with the pigeons, or scatter them, then take the statue.',
      timed: false,
      objectives: [
        { id: 'peace', text: 'Bring the pigeons a bun (friends) or drop salmiakki (they scatter)', kind: 'event', event: 'pigeonsSettled', hint: 'Put a bun or the salmiakki down near the statue. A bun makes friends. Salmiakki makes them flee.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 8, label: 'Pigeon Gang' }] },
        { id: 'head', text: 'Perch on the emperor\'s head', kind: 'event', event: 'emperorHead', after: 'peace', hint: 'Land on the top of the statue and stay a moment.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 3, y: EMPEROR.headTop, label: 'Head' }] },
      ],
    },
    {
      id: 'ices',
      title: 'Dessert first',
      timed: false,
      objectives: [{ id: 'ice', text: 'Snatch an ice cream', kind: 'event', event: 'snatch', hint: 'A tourist near the fountain has one.' }],
    },
    {
      id: 'both',
      title: 'Forgive and forget',
      timed: false,
      objectives: [
        { id: 'friends', text: 'Win the pigeons over', kind: 'event', event: 'pigeonsFriends', hint: 'A bun does it.' },
        { id: 'scatter', text: '...and then scatter them with salmiakki', kind: 'event', event: 'pigeonsScattered', after: 'friends', hint: 'They forgive you.' },
      ],
    },
  ],
  secret: ['both'],
  coopQuests: [{ id: 'duoTurf', title: 'Pigeon bombers', timed: false, objectives: [{ id: 'duoTurf', text: 'Both gulls splat someone within five seconds', kind: 'event', event: 'coop:poopNpc', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'emperorHead', kind: 'gullInZone', event: 'emperorHead', zone: snap(EMPEROR.headTop - 0.6, EMPEROR.headTop + 2.5), grounded: true }],
  tourists: [],
  extraTourists: [
    { x: -140, z: -296, heading: 0.8, holds: 'bun', role: 'picnic', color: 0xf7a1c4 },
    { x: -172, z: -290, heading: 0.2, ice: true, color: 0xffc971 },
    { x: -142, z: -312, heading: -0.6, ice: true, color: 0x9ec9f0 },
  ],
  extraProps: [
    { type: 'salmiakki', x: -150, y: restY('salmiakki'), z: -286 },
    { type: 'bun', x: -166, y: restY('bun'), z: -286 },
  ],
  defense: false,
  parTime: 300,
  reward: 'disguise',
};

/**
 * Senate Square, level 6: The Emperor's New Look. Headline puzzle ("Statue Makeover"): dress the emperor: a top hat on his head,
 * sunglasses on his face, a bouquet in his hand and a scarf around his neck. Each spot is a big zone.
 */
export const NEW_LOOK: LevelDef = {
  id: 'new-look',
  name: 'S6. The Emperor\'s New Look',
  blurb: 'Statue makeover: hat, shades, bouquet, scarf.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'turf-war',
  quests: [],
  extraQuests: [
    {
      id: 'makeover',
      title: 'Statue Makeover',
      teaser: 'Give the emperor a full outfit.',
      timed: false,
      objectives: [
        { id: 'hat', text: 'Top hat on his head', kind: 'event', event: 'outfitHat', hint: 'Carry the top hat to the statue and let it go over his head.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 3, y: EMPEROR.headTop + 1, label: 'Head' }] },
        { id: 'shades', text: 'Sunglasses on his face', kind: 'event', event: 'outfitGlasses', hint: 'Drop them in front of his face, a little under the hat.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 3, y: EMPEROR.headTop - 0.8, label: 'Face' }] },
        { id: 'flowers', text: 'Bouquet in his hand', kind: 'event', event: 'outfitFlowers', hint: 'The florist near the steps has one. Drop it at the statue\'s chest.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 3, y: 4.1, label: 'Hand' }] },
        { id: 'scarf', text: 'A scarf around his neck', kind: 'event', event: 'outfitScarf', hint: 'A tourist holds one.', markers: [{ x: EMPEROR.x, z: EMPEROR.z, r: 3, y: 5, label: 'Neck' }] },
      ],
    },
    {
      id: 'workers',
      title: 'Hard hat area',
      timed: false,
      objectives: [{ id: 'splat', text: 'Splat a worker on his break', kind: 'event', event: 'poopNpc:worker', hint: 'Two workers are having coffee by the scaffolding.' }],
    },
    {
      id: 'photo',
      title: 'Emperor\'s polaroid',
      timed: false,
      objectives: [{ id: 'head', text: 'Perch on the finished statue\'s head', kind: 'event', event: 'emperorHead', hint: 'Land on top.' }],
    },
  ],
  secret: ['photo'],
  coopQuests: [{ id: 'duoLook', title: 'Dressing room', timed: false, objectives: [{ id: 'duoLook', text: 'One gull drops an item, the other picks it up', kind: 'event', event: 'coop:handover', hint: 'Pass it.' }] }],
  triggers: [],
  extraTriggers: [
    { id: 'outfitHat', kind: 'propInZone', event: 'outfitHat', propType: 'tophat', zone: snap(EMPEROR.headTop, EMPEROR.headTop + 2.4) },
    { id: 'outfitGlasses', kind: 'propInZone', event: 'outfitGlasses', propType: 'glasses', zone: snap(EMPEROR.headTop - 1.4, EMPEROR.headTop) },
    { id: 'outfitFlowers', kind: 'propInZone', event: 'outfitFlowers', propType: 'flowers', zone: snap(EMPEROR.plinthTop + 0.2, EMPEROR.plinthTop + 1.4) },
    { id: 'outfitScarf', kind: 'propInZone', event: 'outfitScarf', propType: 'scarf', zone: snap(EMPEROR.plinthTop + 1.4, EMPEROR.headTop - 1) },
    { id: 'emperorHead', kind: 'gullInZone', event: 'emperorHead', zone: snap(EMPEROR.headTop - 0.6, EMPEROR.headTop + 2.5), grounded: true },
  ],
  tourists: [],
  extraTourists: [
    { x: -146, z: -292, heading: 0.5, holds: 'scarf', role: 'tourist', color: 0xe86a8a },
    { x: -168, z: -303, heading: 1.2, holds: 'flowers', role: 'florist', stationary: true, color: 0x9bd8b0 },
    { x: -164, z: -310, heading: 0.0, hat: 'cap', hatColor: 0xffc400, role: 'worker', stationary: true, color: 0xf2a35e },
    { x: -162, z: -311.5, heading: 0.4, hat: 'cap', hatColor: 0xffc400, role: 'worker', stationary: true, color: 0xf2a35e },
  ],
  extraProps: [
    { type: 'tophat', x: -150, y: restY('tophat'), z: -290 },
    { type: 'glasses', x: -163, y: restY('glasses'), z: -290 },
  ],
  defense: false,
  parTime: 330,
};
