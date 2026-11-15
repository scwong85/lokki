import type { LevelDef } from './types';
import { STATUE } from '../places';

/** Free play: today's full Market Square (the eight-quest pack, the extras, the finale). */
export const SANDBOX: LevelDef = {
  id: 'sandbox',
  name: 'Free play',
  blurb: 'The whole Market Square: every quest, the finale and the city at full alert.',
  district: 'kauppatori',
  sandbox: true,
  quests: ['icecream', 'swap', 'cap', 'bun', 'map', 'date', 'toy', 'finale', 'extras', 'bonus'],
  triggers: ['capDelivered', 'mapInSea', 'finaleStart', 'bunRing'],
  tourists: 'all',
  defense: true,
};

/**
 * A first small level to prove the framework (M12). M13 replaces it with the real "Snack Attack" from
 * `docs/design/levels-kauppatori.md`.
 */
export const SNACK_STUB: LevelDef = {
  id: 'snack-stub',
  name: '1. Snack Attack (preview)',
  blurb: 'Your first snack, a victory perch, and something to discover.',
  district: 'kauppatori',
  quests: ['icecream'],
  extraQuests: [
    {
      id: 'statuePerch',
      title: 'Victory perch',
      teaser: 'Land on top of the Havis Amanda statue.',
      timed: false,
      objectives: [
        {
          id: 'perch',
          text: 'Land on top of the Havis Amanda statue',
          kind: 'event',
          event: 'statuePerch',
          hint: 'The statue is at the west end of the square; land on the very top.',
          markers: [{ x: STATUE.x, z: STATUE.z, r: 2, y: 6.5, label: 'Statue' }],
        },
      ],
    },
    {
      id: 'firstSplat',
      title: 'Bombs away',
      timed: false,
      objectives: [{ id: 'splat', text: 'Splat a tourist from above', kind: 'event', event: 'poopNpc' }],
    },
  ],
  secret: ['firstSplat'],
  triggers: [],
  extraTriggers: [{ id: 'statuePerch', kind: 'gullInZone', event: 'statuePerch', zone: { minX: STATUE.x - 1.6, maxX: STATUE.x + 1.6, minZ: STATUE.z - 1.6, maxZ: STATUE.z + 1.6, minY: 4.6 }, grounded: true }],
  tourists: ['any'],
  defense: false,
  parTime: 150,
  reward: 'flight',
};

export const LEVELS: LevelDef[] = [SNACK_STUB, SANDBOX];

export const levelById = (id: string | null | undefined): LevelDef => LEVELS.find((l) => l.id === id) ?? SANDBOX;
