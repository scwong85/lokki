import type { NpcSpawn } from '../gameplay/npc';
import { CHILD_SPOT, CLOCK } from './places';

/** Tourists on the market square (local metres; north = -Z). Four of them hold an ice cream. */
export const TOURIST_SPAWNS: NpcSpawn[] = [
  { x: -22, z: -20, heading: 0.6, ice: true, color: 0xff8fa3 },
  { x: -10, z: -26, heading: 3.0, ice: true, color: 0x7fd1ae },
  { x: 14, z: -22, heading: -1.2, ice: true, color: 0xffc971 },
  { x: 28, z: -18, heading: 1.5, ice: true, color: 0x9ec9f0 },
  // the lilac tourist loves sweets (salmiakki swap): she picks up and eats sweets lying near her
  { x: -30, z: -14, heading: 0.2, holds: 'candy', wants: ['candy', 'salmiakki'], look: 'f', color: 0xc9a7f0 },
  // the pink tourist at the east side is holding a map (map sabotage)
  { x: 36, z: -24, heading: 2.2, holds: 'map', look: 'm', color: 0xf7a1c4 },
  // the blind date at the clock: he holds the bouquet, they wait in place, facing each other
  // (3.4 m from the pole so the clock never blocks a dive onto them)
  { x: CLOCK.x + 3.4, z: CLOCK.z, heading: Math.PI / 2, holds: 'flowers', role: 'dater', look: 'm', stationary: true, color: 0x4a5a8a },
  { x: CLOCK.x - 3.4, z: CLOCK.z + 0.2, heading: -Math.PI / 2, role: 'dater', look: 'f', stationary: true, color: 0xe0607e },
  // the child who lost the teddy waits on the quay; bring it back and they pick it up
  { x: CHILD_SPOT.x, z: CHILD_SPOT.z, heading: 0, role: 'child', stationary: true, wants: ['toy'], scale: 0.65, color: 0x7ec8ff },
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
