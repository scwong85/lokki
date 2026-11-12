import type { NpcSpawn } from '../gameplay/npc';

/** Tourists on the market square (local metres; north = -Z). Four of them hold an ice cream. */
export const TOURIST_SPAWNS: NpcSpawn[] = [
  { x: -22, z: -20, heading: 0.6, ice: true, color: 0xff8fa3 },
  { x: -10, z: -26, heading: 3.0, ice: true, color: 0x7fd1ae },
  { x: 14, z: -22, heading: -1.2, ice: true, color: 0xffc971 },
  { x: 28, z: -18, heading: 1.5, ice: true, color: 0x9ec9f0 },
  { x: -30, z: -14, heading: 0.2, ice: false, color: 0xc9a7f0 },
  { x: 36, z: -24, heading: 2.2, ice: false, color: 0xf7a1c4 },
];

/** Reaction table of a tourist, documented as data (what it cares about and how it reacts). */
export const TOURIST_REACTIONS = {
  cares: ['edible held in hand', 'staying clean'],
  senses: ['sight cone (reduced while eating, blind overhead)', 'hearing (clatter, crash, tipped bins)'],
  reacts: {
    seesGull: 'notice -> shield the ice cream (body between gull and hand)',
    noise: 'turn towards it: the hand stays put, so the far side opens up',
    snatched: 'chase the gull for a few seconds, then sulk',
    pooped: 'panic and run, then sulk',
  },
} as const;
