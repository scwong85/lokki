import type { LevelDef } from './types';
import { restY } from '../props';
import { FERRY } from '../places';

/** The child's message bottle lies on the quay, near the start. */
export const BOTTLE_SPOT = { x: -6, z: -8 };
/** Where the current carries it: the hull of the ferry. */
export const FERRY_HULL_POINT = { x: FERRY.x, z: FERRY.z - 3 };

/**
 * Level 8: Harbour Day. Swimming, floating and the ferry. Headline puzzle ("Message in a Bottle"): a child on the ferry
 * dropped a note in a bottle on the quay. Drop the bottle in the harbour: the current carries it to the ferry, but the
 * ferry horn is going to blow, so be quick.
 */
export const HARBOUR_DAY: LevelDef = {
  id: 'harbour-day',
  sky: 'morning',
  name: '8. Harbour Day',
  blurb: 'Float a message to the ferry before the horn.',
  district: 'kauppatori',
  requires: 'the-warden',
  quests: ['map'],
  extraQuests: [
    {
      id: 'bottle',
      title: 'Message in a Bottle',
      teaser: 'Get the child\'s note to the ferry before the horn.',
      timed: true,
      timeKey: 'bottleTime',
      startOn: ['grab:note'],
      startMarkers: [{ x: BOTTLE_SPOT.x, z: BOTTLE_SPOT.z, r: 3, label: 'Message bottle' }],
      objectives: [
        { id: 'sea', text: 'Drop the bottle in the harbour', kind: 'event', event: 'noteInSea', hint: 'Fly out over the water and let go (E). Things float, and the current carries a bottle.' },
        { id: 'ferry', text: 'Let the current carry it to the ferry', kind: 'event', event: 'noteDelivered', after: 'sea', hint: 'It drifts toward the ferry by itself. Just wait (and keep it from the horn).', markers: [{ x: FERRY_HULL_POINT.x, z: FERRY_HULL_POINT.z, r: 5, label: 'Ferry' }] },
      ],
    },
    {
      id: 'duck',
      title: 'Quack',
      timed: false,
      objectives: [{ id: 'swim', text: 'Paddle in the harbour for eight seconds', kind: 'event', event: 'paddled', hint: 'Land on the water and swim around: a gull among the ducks.' }],
    },
  ],
  secret: ['duck'],
  coopQuests: [
    {
      id: 'duoHarbour',
      title: 'Synchronised swimming',
      timed: false,
      objectives: [{ id: 'duoHarbour', text: 'Both gulls snatch within five seconds', kind: 'event', event: 'coop:snatch', hint: 'One gull each.' }],
    },
  ],
  triggers: ['mapInSea'],
  extraTriggers: [
    { id: 'noteInSea', kind: 'propInZone', event: 'noteInSea', propType: 'bottle', tag: 'note', zone: 'sea' },
    { id: 'noteDelivered', kind: 'propInZone', event: 'noteDelivered', propType: 'bottle', tag: 'note', zone: { minX: FERRY.x - 20, maxX: FERRY.x + 20, minZ: FERRY.z - 5.5, maxZ: FERRY.z + 5.5, maxY: 2 } },
    { id: 'paddled', kind: 'swim', event: 'paddled', seconds: 8 },
  ],
  tourists: [],
  extraTourists: [
    { x: 36, z: -24, heading: 2.2, holds: 'map', color: 0xf7a1c4 },
    { x: -20, z: -18, heading: 0.6, ice: true, color: 0x7fd1ae },
  ],
  extraProps: [{ type: 'bottle', x: BOTTLE_SPOT.x, y: restY('bottle'), z: BOTTLE_SPOT.z, tag: 'note' }],
  defense: false,
  drift: FERRY_HULL_POINT,
  parTime: 240,
  reward: 'flock',
};
