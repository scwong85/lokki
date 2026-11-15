import type { LevelDef } from './types';
import { SNACK_ATTACK } from './snackAttack';
import { BOMBS_AWAY } from './bombsAway';
import { NOSY_PARKERS } from './nosyParkers';
import { BUTTERFINGERS } from './butterfingers';

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

export { SNACK_ATTACK, BOMBS_AWAY, NOSY_PARKERS, BUTTERFINGERS };

export const LEVELS: LevelDef[] = [SNACK_ATTACK, BOMBS_AWAY, NOSY_PARKERS, BUTTERFINGERS, SANDBOX];

export const levelById = (id: string | null | undefined): LevelDef => LEVELS.find((l) => l.id === id) ?? SANDBOX;
