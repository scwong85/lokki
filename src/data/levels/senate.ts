import type { LevelDef } from './types';
import { restY } from '../props';
import { STEPS } from '../../world/landmarks';

/** The Cathedral steps: bottom centre, the three lanes, the landing at the top, the statue and the hot-dog cart. */
export const STEPS_X = -156.5;
export const STEPS_BOTTOM_Z = -326;
export const STEPS_COUNT = 40;
export const LANDING_Z = STEPS_BOTTOM_Z - STEPS_COUNT * STEPS.depth - STEPS.landing / 2;
export const LANDING_Y = STEPS_COUNT * STEPS.rise;
export const LANE3_X = STEPS_X + STEPS.laneOffset;
export const SENATE_START = { x: STEPS_X, z: -290 };
/** Top of the SE corner tower of the cathedral (the bell rope). */
export const BELL_TOWER = { x: -138.95, z: -370.49 };

/**
 * Senate Square, level 1: Cheese Run. The Cathedral steps are three lanes with low rails. Headline puzzle ("Leipäjuusto
 * Downhill"): a round bread cheese sits on the landing at the top. Roll it down the right-hand lane into the hot-dog cart.
 */
export const CHEESE_RUN: LevelDef = {
  id: 'cheese-run',
  name: 'S1. Cheese Run',
  blurb: 'Senate Square: roll the cheese down the right lane.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'harbour-day',
  quests: [],
  extraQuests: [
    {
      id: 'cheese',
      title: 'Leipäjuusto Downhill',
      teaser: 'Roll the round cheese into the hot-dog cart.',
      timed: false,
      objectives: [
        { id: 'take', text: 'Pick up the round cheese on the landing at the top of the steps', kind: 'event', event: 'grab:cheese', hint: 'Fly up the Cathedral steps (the white stairway) and grab it with E.', markers: [{ x: LANE3_X, z: LANDING_Z, r: 4, y: LANDING_Y, label: 'Cheese' }] },
        { id: 'roll', text: 'Roll it down the right-hand lane into the hot-dog cart', kind: 'event', event: 'cheeseCart', after: 'take', hint: 'Put it down at the top of the right lane (E) and let it roll. Low rails keep it in the lane. Missed? Pick it up again.', markers: [{ x: LANE3_X, z: STEPS_BOTTOM_Z + 3.8, r: 3, label: 'Hot-dog cart' }] },
      ],
    },
    {
      id: 'dropped',
      title: 'Dropped ice cream',
      teaser: 'Snatch the ice cream lying on the steps.',
      timed: false,
      objectives: [{ id: 'ice', text: 'Grab the ice cream a tourist dropped on the steps', kind: 'event', event: 'grab:stepIce', hint: 'On the steps in the middle lane.', markers: [{ x: STEPS_X, z: STEPS_BOTTOM_Z - 20 * STEPS.depth, r: 3, y: 3.4, label: 'Ice cream' }] }],
    },
    {
      id: 'vendor',
      title: 'Hot-dog hazard',
      timed: false,
      objectives: [{ id: 'splat', text: 'Splat the hot-dog vendor', kind: 'event', event: 'poopNpc:hotdog', hint: 'He is by the cart at the foot of the steps.' }],
    },
  ],
  secret: ['vendor'],
  coopQuests: [{ id: 'duoCheese', title: 'Relay race', timed: false, objectives: [{ id: 'duoCheese', text: 'One gull drops the cheese, the other grabs it', kind: 'event', event: 'coop:handover', hint: 'Pass it.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'cheeseCart', kind: 'propInZone', event: 'cheeseCart', propType: 'cheese', zone: { minX: LANE3_X - 3, maxX: LANE3_X + 3, minZ: STEPS_BOTTOM_Z + 0.5, maxZ: STEPS_BOTTOM_Z + 7, maxY: 2 } }],
  tourists: [],
  extraTourists: [
    { x: LANE3_X - 2.8, z: STEPS_BOTTOM_Z + 3.8, heading: Math.PI / 2, role: 'hotdog', stationary: true, color: 0xf2c14e },
    { x: -170, z: -298, heading: 0.8, ice: true, color: 0x7fd1ae },
    { x: -143, z: -296, heading: -0.8, ice: true, color: 0xffc971 },
  ],
  extraProps: [
    { type: 'cheese', x: LANE3_X, y: restY('cheese', LANDING_Y), z: LANDING_Z, tag: 'cheese' },
    { type: 'icecream', x: STEPS_X, y: restY('icecream', 21 * STEPS.rise), z: STEPS_BOTTOM_Z - 20.5 * STEPS.depth, tag: 'stepIce' },
  ],
  defense: false,
  parTime: 300,
  reward: 'quickpoop',
};

/**
 * Senate Square, level 2: Say Pigeon! Graduation photographers at the foot of the steps count 3, 2, 1. Headline puzzle
 * ("Class of 2026"): be in the picture at the click, three times (use the countdown over their heads).
 */
export const SAY_PIGEON: LevelDef = {
  id: 'say-pigeon',
  name: 'S2. Say Pigeon!',
  blurb: 'Graduation photos. Be in all of them.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'cheese-run',
  quests: [],
  extraQuests: [
    {
      id: 'photos',
      title: 'Class of 2026',
      teaser: 'Ruin three graduation photos.',
      timed: false,
      objectives: [{ id: 'bomb', text: 'Be in the photo at the click (three times)', kind: 'event', event: 'photobomb', count: 3, hint: 'A photographer counts 3, 2, 1 over her head. Stand right in front of her phone at the click.', markers: [{ x: -168, z: -308, r: 3, label: 'Photographer' }, { x: -156.5, z: -311, r: 3, label: 'Photographer' }, { x: -145, z: -308, r: 3, label: 'Photographer' }] }],
    },
    {
      id: 'caps',
      title: 'Cap toss',
      teaser: 'Steal a graduate\'s cap.',
      timed: false,
      objectives: [{ id: 'cap', text: 'Snatch a cap from a graduate', kind: 'event', event: 'snatch:cap', hint: 'A few graduates hold their white caps in their hands.' }],
    },
    {
      id: 'shutterbug',
      title: 'Camera shy',
      timed: false,
      objectives: [{ id: 'splat', text: 'Splat a photographer', kind: 'event', event: 'poopNpc:selfie', hint: 'From above, between photos.' }],
    },
  ],
  secret: ['shutterbug'],
  coopQuests: [{ id: 'duoPigeon', title: 'Double bomb', timed: false, objectives: [{ id: 'duoPigeon', text: 'Both gulls in the same photo', kind: 'event', event: 'coop:photobomb', hint: 'Both in front of her phone at the click.' }] }],
  triggers: [],
  tourists: [],
  extraTourists: [
    { x: -168, z: -308, heading: 0, ice: true, role: 'selfie', stationary: true, color: 0xff8fa3 },
    { x: -156.5, z: -312, heading: 0, role: 'selfie', stationary: true, color: 0x9ec9f0 },
    { x: -145, z: -308, heading: 0, role: 'selfie', stationary: true, color: 0xc7b5e0 },
    { x: -162, z: -316, heading: 0.4, holds: 'cap', hat: 'cap', hatColor: 0xffffff, role: 'graduate', color: 0x2f3a55 },
    { x: -150, z: -316, heading: -0.4, holds: 'cap', hat: 'cap', hatColor: 0xffffff, role: 'graduate', color: 0x2f3a55 },
    { x: -172, z: -296, heading: 1.0, ice: true, color: 0xffc971 },
  ],
  defense: false,
  parTime: 300,
  reward: 'quickpoop',
};

/**
 * Senate Square, level 3: Ding Dong. The cathedral bell rings every half minute; while it rings, everyone looks up at the tower.
 * Headline puzzle ("Bell Heist"): two picnickers guard their sandwiches. Snatch both while the bell rings. Land on the tower's bell
 * rope to ring it yourself for an extra window.
 */
export const DING_DONG: LevelDef = {
  id: 'ding-dong',
  name: 'S3. Ding Dong',
  blurb: 'When the bell rings, nobody is looking.',
  district: 'senaatintori',
  start: SENATE_START,
  requires: 'say-pigeon',
  bells: { x: BELL_TOWER.x, z: BELL_TOWER.z, first: 8, every: 28, duration: 6 },
  quests: [],
  extraQuests: [
    {
      id: 'bell',
      title: 'Bell Heist',
      teaser: 'Take both sandwiches while the bell rings.',
      timed: false,
      objectives: [{ id: 'both', text: 'Snatch two sandwiches while the bell is ringing', kind: 'event', event: 'bellSnatch', count: 2, hint: 'The bell rings every half minute and everybody looks up at the tower for about six seconds. Be near the picnickers when it starts.', markers: [{ x: -164, z: -314, r: 4, label: 'Picnickers' }] }],
    },
    {
      id: 'rope',
      title: 'Ring it yourself',
      teaser: 'Land on the bell rope.',
      timed: false,
      objectives: [{ id: 'ring', text: 'Land on the cathedral\'s corner tower (the bell rope)', kind: 'event', event: 'bellRung', hint: 'The south-east tower of the Cathedral. It rings the bell at once.', markers: [{ x: BELL_TOWER.x, z: BELL_TOWER.z, r: 5, y: 24, label: 'Bell rope' }] }],
    },
    {
      id: 'ringer',
      title: 'Bell ringer',
      timed: false,
      objectives: [{ id: 'three', text: 'Ring the bell yourself three times', kind: 'event', event: 'bellRung', count: 3, hint: 'Take off and land on the tower again.' }],
    },
  ],
  secret: ['ringer'],
  coopQuests: [{ id: 'duoDing', title: 'Chime and dash', timed: false, objectives: [{ id: 'duoDing', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }] }],
  triggers: [],
  extraTriggers: [{ id: 'bellRung', kind: 'gullInZone', event: 'bellRung', zone: { minX: BELL_TOWER.x - 4, maxX: BELL_TOWER.x + 4, minZ: BELL_TOWER.z - 4, maxZ: BELL_TOWER.z + 4, minY: 21 }, grounded: true, repeat: true }],
  tourists: [],
  extraTourists: [
    { x: -164, z: -314, heading: 0, holds: 'bun', role: 'picnic', color: 0xf7a1c4 },
    { x: -161, z: -314.5, heading: 0.3, holds: 'bun', role: 'picnic', color: 0x9ec9f0 },
    { x: -148, z: -300, heading: 1.0, ice: true, color: 0xffc971 },
  ],
  defense: false,
  parTime: 300,
  reward: 'mimic',
};
