import type { LevelDef } from './types';
import { restY } from '../props';
import { counter } from '../places';
import { QUESTS } from '../quests';

/** Kalle's perch, on the east quay. */
export const KALLE_PERCH = { x: 30, z: -12 };

/**
 * Level 19: The Rival. Kalle, a rival gull, wants the same snacks: he flies to the nearest free one, carries it to his perch
 * and eats it. First to three wins. Dive near him while he carries and he drops it.
 */
export const THE_RIVAL: LevelDef = {
  id: 'the-rival',
  sky: 'golden',
  name: '19. The Rival',
  blurb: 'Another gull wants your snacks. First to three.',
  district: 'kauppatori',
  requires: 'frozen-harbour',
  quests: [],
  extraQuests: [
    {
      id: 'duel',
      title: 'Snack Duel',
      teaser: 'Get three snacks before Kalle does.',
      timed: false,
      objectives: [{ id: 'snacks', text: 'Take three snacks before Kalle gets his three', kind: 'event', event: 'snack', count: 3, hint: 'Grab free snacks lying around (E). Kalle goes for the nearest one: dive near him while he carries and he drops it.' }],
    },
    {
      id: 'frame',
      title: 'Frame him',
      teaser: 'Make Kalle drop a snack.',
      timed: false,
      objectives: [{ id: 'drop', text: 'Dive near Kalle while he carries a snack', kind: 'event', event: 'kalleDrop', hint: 'Fly at him from above, fast.' }],
    },
    {
      id: 'visit',
      title: 'Home turf',
      timed: false,
      objectives: [{ id: 'perch', text: 'Land on Kalle\'s perch', kind: 'event', event: 'kallePerch', hint: 'The east quay.' }],
    },
  ],
  secret: ['visit'],
  coopQuests: [{ id: 'duoRival', title: 'Two against one', timed: false, objectives: [{ id: 'duoRival', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'kallePerch', kind: 'gullInZone', event: 'kallePerch', zone: { minX: KALLE_PERCH.x - 3, maxX: KALLE_PERCH.x + 3, minZ: KALLE_PERCH.z - 3, maxZ: KALLE_PERCH.z + 3, maxY: 2 }, grounded: true }],
  tourists: [],
  extraTourists: [{ x: -14, z: -26, heading: 0.6, ice: true, color: 0x7fd1ae }],
  extraProps: [
    { type: 'bun', x: -10, y: restY('bun'), z: -14 },
    { type: 'fish', x: 0, y: restY('fish'), z: -20 },
    { type: 'herring', x: 8, y: restY('herring'), z: -16 },
    { type: 'candy', x: 16, y: restY('candy'), z: -22 },
    { type: 'bun', x: 22, y: restY('bun'), z: -10 },
    { type: 'fish', x: -4, y: restY('fish'), z: -10 },
    { type: 'soup', x: 12, y: restY('soup'), z: -12 },
    { type: 'bun', x: -18, y: restY('bun'), z: -20 },
  ],
  defense: false,
  kalle: { x: KALLE_PERCH.x, z: KALLE_PERCH.z, goal: 3 },
  parTime: 270,
  reward: 'quickpoop',
};

/**
 * Level 20: Night Market. Dusk, fewer tourists, sleepy vendors. Headline puzzle ("Midnight Snack"): take a thing from each of three
 * stalls without waking anyone: vendors wake at a loud noise nearby or a gull right beside them, and doze off again when it is quiet.
 */
export const NIGHT_MARKET: LevelDef = {
  id: 'night-market',
  name: '20. Night Market',
  blurb: 'Dusk. Sleeping vendors. Quiet feet.',
  district: 'kauppatori',
  requires: 'the-rival',
  quests: [],
  extraQuests: [
    {
      id: 'midnight',
      title: 'Midnight Snack',
      teaser: 'A little something from each stall.',
      timed: false,
      objectives: [
        { id: 'a', text: 'Take the bun from the west stall', kind: 'event', event: 'grab:nightA', hint: 'Vendors sleep until something loud happens nearby (a clatter, a splat) or you land right next to them.', markers: [{ ...counter(2, 2), r: 3, label: 'Bun' }] },
        { id: 'b', text: 'Take the fish from the middle stall', kind: 'event', event: 'grab:nightB', markers: [{ ...counter(4, 2), r: 3, label: 'Fish' }] },
        { id: 'c', text: 'Take the sweets from the east stall', kind: 'event', event: 'grab:nightC', markers: [{ ...counter(6, 2), r: 3, label: 'Sweets' }] },
      ],
    },
    {
      id: 'dreams',
      title: 'Sweet dreams',
      teaser: 'Poop on a sleeping vendor.',
      timed: false,
      objectives: [{ id: 'poop', text: 'Poop on a vendor', kind: 'event', event: 'poopVendor', hint: 'From above, quietly.' }],
    },
    {
      id: 'alarm',
      title: 'Rise and shine',
      timed: false,
      objectives: [{ id: 'wake', text: 'Wake a vendor up', kind: 'event', event: 'vendorWoke', hint: 'Make a racket.' }],
    },
  ],
  secret: ['alarm'],
  coopQuests: [{ id: 'duoNight', title: 'Night shift', timed: false, objectives: [{ id: 'duoNight', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  tourists: [],
  extraProps: [
    { type: 'bun', x: counter(2, 2).x, y: restY('bun', 1.0), z: counter(2, 2).z, tag: 'nightA' },
    { type: 'fish', x: counter(4, 2).x, y: restY('fish', 1.0), z: counter(4, 2).z, tag: 'nightB' },
    { type: 'candy', x: counter(6, 2).x, y: restY('candy', 1.0), z: counter(6, 2).z, tag: 'nightC' },
  ],
  defense: true,
  deploy: ['vendors'],
  sleepingVendors: true,
  night: true,
  parTime: 270,
  reward: 'disguise',
};

/**
 * Level 21: The Drone. The city's last deterrent: a drone follows the gull and dives at it. Its battery runs down (a dive straight
 * at it drains it faster). When it lands, steal the battery.
 */
export const THE_DRONE: LevelDef = {
  id: 'the-drone',
  name: '21. The Drone',
  blurb: 'It follows you. Its battery does not last.',
  district: 'kauppatori',
  requires: 'night-market',
  quests: [],
  extraQuests: [
    {
      id: 'battery',
      title: 'Battery Low',
      teaser: 'Outlast the drone and take its battery.',
      timed: false,
      objectives: [{ id: 'battery', text: 'Wear the drone out and steal its battery', kind: 'event', event: 'grab:droneBattery', hint: 'It dives after a short warning: fly sideways to dodge. When its battery runs out it lands: grab the battery (E).' }],
    },
    {
      id: 'dodge',
      title: 'Evasive manoeuvres',
      teaser: 'Dodge the drone three times.',
      timed: false,
      objectives: [{ id: 'dodge', text: 'Dodge the drone\'s dive three times', kind: 'event', event: 'droneDodged', count: 3, hint: 'Move away after the red light flashes (it aims, then dives).' }],
    },
    {
      id: 'bonk',
      title: 'Bonk',
      timed: false,
      objectives: [{ id: 'bonk', text: 'Dive-bomb the drone', kind: 'event', event: 'droneBonk', hint: 'A fast dive straight at it drains the battery.' }],
    },
  ],
  secret: ['bonk'],
  coopQuests: [{ id: 'duoDrone', title: 'Decoy and strike', timed: false, objectives: [{ id: 'duoDrone', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  tourists: [],
  extraTourists: [{ x: -12, z: -16, heading: 0.6, ice: true, color: 0x7fd1ae }, { x: 12, z: -20, heading: -1.2, ice: true, color: 0xffc971 }],
  defense: true,
  drone: { x: 0, z: -52 },
  parTime: 300,
  reward: 'hawkeye',
};

/** The sandbox finale, but as a level: no seven quests to clear first. */
const FINALE = { ...QUESTS.find((q) => q.id === 'finale')!, requires: undefined };

/**
 * Level 22: Grand Finale, the Great Kauppatori Heist. The city at maximum alert: ring the ferry horn (land on the ferry's cabin
 * roof), then wreck the market before time runs out: collapse the chair stack, swipe the pastry, poop on the Warden.
 */
export const GRAND_FINALE: LevelDef = {
  id: 'grand-finale',
  sky: 'dusk',
  name: '22. The Great Kauppatori Heist',
  blurb: 'Everything you learned. The city at full alert.',
  district: 'kauppatori',
  requires: 'the-drone',
  quests: [],
  extraQuests: [
    FINALE,
    {
      id: 'warmup',
      title: 'Warm-up',
      teaser: 'Splat three people while you are at it.',
      timed: false,
      objectives: [{ id: 'three', text: 'Poop on three people', kind: 'event', event: 'poopNpc', count: 3, hint: 'Tourists, vendors, anyone.' }],
    },
    {
      id: 'dodgeSwats',
      title: 'Untouchable',
      timed: false,
      objectives: [{ id: 'swats', text: 'Dodge two of the Warden\'s swats', kind: 'event', event: 'dodge:warden', count: 2, hint: 'Fly sideways just after his umbrella goes up.' }],
    },
  ],
  secret: ['dodgeSwats'],
  coopQuests: [{ id: 'duoFinale', title: 'Partners in crime', timed: false, objectives: [{ id: 'duoFinale', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: ['finaleStart'],
  tourists: 'all',
  defense: true,
  deploy: ['vendors', 'lines', 'nets', 'warden'],
  startHeat: 60,
  endingNote: 'The city makes you the official market mascot. (Gulls everywhere approve.)',
  parTime: 360,
  reward: 'flock',
};
