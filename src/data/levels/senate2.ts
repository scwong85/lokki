import type { LevelDef } from './types';
import { restY } from '../props';
import { SENATE_START } from './senate';
import { TRAM_LINE } from '../../world/roads';

/** The emperor's statue (Senate Square): centre, and how high things are on it (see the `emperor` landmark). */
export const EMPEROR = { x: -156.5, z: -300, plinthTop: 3.4, headTop: 5.8 };
/** The tram track runs east-west just south of the statue. */
export const TRAM = { ...TRAM_LINE, stopX: -156.5, length: 14, width: 2.6, roofY: 3.3 };


/**
 * Senate Square, level 4: Tram Surfing. Headline puzzle ("Lunch Express"): the driver guards his lunch next to the stop. Drop a
 * bottle on the track ahead of the tram: it halts, the driver climbs out to clear it, and his lunch is yours.
 */
export const TRAM_SURFING: LevelDef = {
  id: 'tram-surfing',
  name: 'S4. Tram Surfing',
  blurb: 'Stop the tram, take the driver\'s lunch.',
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
  ],
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
 * Senate Square, level 6: The Emperor's New Look. Headline task ("Wardrobe raid"): collect the emperor's outfit: a top hat, sunglasses, a bouquet and a scarf.
 * (The statue makeover itself, dropping each item on a spot of the statue, was too fiddly and was removed.)
 */
export const NEW_LOOK: LevelDef = {
  id: 'new-look',
  name: 'S6. The Emperor\'s New Look',
  blurb: 'Raid the wardrobe: hat, shades, bouquet, scarf.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'turf-war',
  quests: [],
  extraQuests: [
    {
      id: 'wardrobe',
      title: 'Wardrobe raid',
      teaser: 'Collect the emperor\'s new outfit.',
      timed: false,
      objectives: [
        { id: 'hat', text: 'Get hold of a top hat', kind: 'event', event: 'grab:tophat', hint: 'There is one lying near the statue.' },
        { id: 'shades', text: 'Sunglasses', kind: 'event', event: 'grab:glasses', hint: 'Near the steps.' },
        { id: 'flowers', text: 'A bouquet', kind: 'event', event: 'grab:flowers', hint: 'The florist near the steps has one.' },
        { id: 'scarf', text: 'A scarf', kind: 'event', event: 'grab:scarf', hint: 'A tourist holds one.' },
      ],
    },
    {
      id: 'workers',
      title: 'Hard hat area',
      timed: false,
      objectives: [{ id: 'splat', text: 'Splat a worker on his break', kind: 'event', event: 'poopNpc:worker', hint: 'Two workers are having coffee by the scaffolding.' }],
    },
  ],
  coopQuests: [{ id: 'duoLook', title: 'Dressing room', timed: false, objectives: [{ id: 'duoLook', text: 'One gull drops an item, the other picks it up', kind: 'event', event: 'coop:handover', hint: 'Pass it.' }] }],
  triggers: [],
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
