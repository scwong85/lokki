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
  requires: 'snack-attack',
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
  requires: 'snack-attack',
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
